/**
 * Per-question agent loop (Agent Spec §4, CLAUDE.md "Agent loop").
 *
 *   up to MAX_SEARCHES search_knowledge_base calls → submit_answer
 *   → validateAnswer → retry once with retryMessage → else abstainFallback
 *
 * Claude Opus 5.5 rejects forced tool_choice, so "forced submit_answer" is
 * enforced here instead: tool_choice stays auto, a 4th search is refused with
 * an error result, a turn with no tool call gets one nudge, and anything that
 * still ends without a valid submit_answer becomes abstainFallback.
 *
 * Each question starts from the same system prompt + few-shot transcript and
 * nothing else (Agent Spec §6: no conversational memory).
 */
import Anthropic from "@anthropic-ai/sdk";
import { Passage, type AnswerRecord, type Question } from "../schema.js";
import { abstainFallback, retryMessage, validateAnswer } from "../validate.js";
import { searchKnowledgeBase } from "../kb/search.js";
import {
  AGENT_MODEL,
  costUsd,
  MAX_SEARCHES,
  MAX_TOKENS,
  MAX_TURNS,
  type Effort,
  type TokenUsage,
} from "./config.js";
import { renderQuestion, type LoadedPrompt } from "./prompt.js";
import { SEARCH_TOOL, SUBMIT_TOOL, tools } from "./tools.js";

type FallbackReason = "validation" | "timeout" | "refusal" | "max_tokens" | "no_submit" | "turn_limit" | "error";

export interface SearchLog {
  query: string;
  top_k: number;
  category?: string;
  error?: string;
  results: { source_id: string; section?: string; score: number }[];
}

export interface QuestionLog {
  question_id: string;
  agent_version: string;
  outcome: "answered" | "abstained" | "fallback";
  fallback_reason?: FallbackReason;
  error?: string;
  latency_ms: number;
  model_calls: number;
  /** Models that produced responses. More than the agent model means a server-side refusal fallback ran. */
  served_models: string[];
  retrieval_calls: number;
  searches: SearchLog[];
  validation_failures: number;
  validation_issues: string[][];
  stop_reasons: string[];
  usage: TokenUsage;
  cost_usd: number | null;
  /** Logged for the Report Card, not enforced: citations whose source or quote was not in this question's retrieved passages. */
  ungrounded_citations: { source_id: string; reason: "source_not_retrieved" | "quote_not_in_passages" }[];
}

/** Progress events for a live UI. Purely observational: emitting them never changes the loop. */
export type AgentEvent =
  | { type: "model_call"; n: number }
  | { type: "search_start"; n: number; query: string; category?: string; top_k: number }
  | { type: "search_result"; n: number; query: string; passages: Passage[] }
  | { type: "search_error"; n: number; query: string; error: string }
  | { type: "search_refused" }
  | { type: "validation_retry"; issues: string[] }
  | { type: "nudge" };

export interface AnswerOptions {
  client: Anthropic;
  prompt: LoadedPrompt;
  agentVersion: string;
  effort: Effort;
  timeoutMs: number;
  /** Retrieval implementation; defaults to the Supabase/Voyage search. Overridden in scripts/check-agent.ts. */
  search?: (input: unknown) => Promise<Passage[]>;
  onEvent?: (event: AgentEvent) => void;
}

class DeadlineError extends Error {}

const normalize = (s: string) => s.replace(/\s+/g, " ").replace(/\*\*/g, "").trim().toLowerCase();

function groundingIssues(record: AnswerRecord, retrieved: Passage[]): QuestionLog["ungrounded_citations"] {
  const issues: QuestionLog["ungrounded_citations"] = [];
  for (const c of record.citations) {
    const fromSource = retrieved.filter((p) => p.source_id === c.source_id);
    if (fromSource.length === 0) issues.push({ source_id: c.source_id, reason: "source_not_retrieved" });
    else if (!fromSource.some((p) => normalize(p.text).includes(normalize(c.passage))))
      issues.push({ source_id: c.source_id, reason: "quote_not_in_passages" });
  }
  return issues;
}

/** Put a cache breakpoint at the end of the shared prefix (tools + system + few-shot), without mutating it. */
function withPrefixBreakpoint(fewShot: Anthropic.Beta.BetaMessageParam[]): Anthropic.Beta.BetaMessageParam[] {
  const last = fewShot.at(-1);
  if (!last || typeof last.content === "string") return fewShot;
  const blocks = last.content.map((b, i) =>
    i === last.content.length - 1 ? { ...b, cache_control: { type: "ephemeral" as const } } : b
  );
  return [...fewShot.slice(0, -1), { ...last, content: blocks } as Anthropic.Beta.BetaMessageParam];
}

export async function answerQuestion(q: Question, opts: AnswerOptions): Promise<{ record: AnswerRecord; log: QuestionLog }> {
  const started = Date.now();
  const deadline = started + opts.timeoutMs;
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), opts.timeoutMs);

  const log: QuestionLog = {
    question_id: q.question_id,
    agent_version: opts.agentVersion,
    outcome: "fallback",
    latency_ms: 0,
    model_calls: 0,
    served_models: [],
    retrieval_calls: 0,
    searches: [],
    validation_failures: 0,
    validation_issues: [],
    stop_reasons: [],
    usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
    cost_usd: 0,
    ungrounded_citations: [],
  };
  const retrieved: Passage[] = [];
  let costKnown = true;

  const beforeDeadline = <T>(p: Promise<T>): Promise<T> =>
    Promise.race([
      p,
      new Promise<never>((_, reject) => {
        const ms = deadline - Date.now();
        if (ms <= 0) reject(new DeadlineError());
        else setTimeout(() => reject(new DeadlineError()), ms).unref();
      }),
    ]);

  const finish = (record: AnswerRecord, outcome: QuestionLog["outcome"], reason?: FallbackReason, error?: string) => {
    clearTimeout(timer);
    log.outcome = outcome;
    if (reason) log.fallback_reason = reason;
    if (error) log.error = error;
    log.latency_ms = Date.now() - started;
    log.cost_usd = costKnown ? Math.round((log.cost_usd ?? 0) * 1e6) / 1e6 : null;
    if (outcome !== "fallback") log.ungrounded_citations = groundingIssues(record, retrieved);
    return { record, log };
  };
  const fallback = (reason: FallbackReason, issues: string[], error?: string) =>
    finish(
      {
        ...abstainFallback(q.question_id, issues),
        reasoning_note: `System fallback (${reason}): ${issues.join("; ")}`.slice(0, 400),
      },
      "fallback",
      reason,
      error
    );

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...withPrefixBreakpoint(opts.prompt.fewShot as Anthropic.Beta.BetaMessageParam[]),
    { role: "user", content: renderQuestion(q) },
  ];
  let submits = 0;
  let nudged = false;
  let lastIssues: string[] = [];
  const emit = (e: AgentEvent) => {
    try {
      opts.onEvent?.(e);
    } catch {
      // A broken listener (e.g. a closed browser stream) must never change the answer.
    }
  };

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      emit({ type: "model_call", n: turn + 1 });
      const response = await opts.client.beta.messages.create(
        {
          model: AGENT_MODEL,
          max_tokens: MAX_TOKENS,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: opts.effort },
          system: opts.prompt.system,
          tools,
          tool_choice: { type: "auto" },
          cache_control: { type: "ephemeral" },
          messages,
        },
        { signal: abort.signal }
      );

      log.model_calls++;
      log.stop_reasons.push(response.stop_reason ?? "null");
      if (!log.served_models.includes(response.model)) log.served_models.push(response.model);
      const u: TokenUsage = {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
      };
      for (const k of Object.keys(u) as (keyof TokenUsage)[]) log.usage[k] += u[k];
      const c = costUsd(response.model, u);
      if (c === null) costKnown = false;
      else log.cost_usd = (log.cost_usd ?? 0) + c;

      if (response.stop_reason === "refusal") return fallback("refusal", ["model declined the request"]);
      if (response.stop_reason === "max_tokens") return fallback("max_tokens", ["response hit max_tokens"]);

      messages.push({ role: "assistant", content: response.content });
      const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");

      if (toolUses.length === 0) {
        if (nudged) return fallback("no_submit", ["model ended without calling submit_answer"]);
        nudged = true;
        emit({ type: "nudge" });
        messages.push({ role: "user", content: `Call ${SUBMIT_TOOL} now with your result for ${q.question_id}.` });
        continue;
      }

      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const call of toolUses) {
        if (call.name === SEARCH_TOOL) {
          if (log.retrieval_calls >= MAX_SEARCHES) {
            emit({ type: "search_refused" });
            results.push({
              type: "tool_result",
              tool_use_id: call.id,
              is_error: true,
              content: `Search limit reached (${MAX_SEARCHES} of ${MAX_SEARCHES}). Call ${SUBMIT_TOOL} now using the passages you already have.`,
            });
            continue;
          }
          log.retrieval_calls++;
          const input = call.input as { query?: string; top_k?: number; category?: string };
          const entry: SearchLog = { query: String(input.query ?? ""), top_k: input.top_k ?? 5, category: input.category, results: [] };
          log.searches.push(entry);
          const n = log.retrieval_calls;
          emit({ type: "search_start", n, query: entry.query, category: entry.category, top_k: entry.top_k });
          try {
            const passages = await beforeDeadline((opts.search ?? searchKnowledgeBase)(call.input));
            retrieved.push(...passages);
            entry.results = passages.map((p) => ({ source_id: p.source_id, section: p.section, score: p.score }));
            emit({ type: "search_result", n, query: entry.query, passages });
            results.push({ type: "tool_result", tool_use_id: call.id, content: JSON.stringify(passages) });
          } catch (err) {
            if (err instanceof DeadlineError) throw err;
            entry.error = err instanceof Error ? err.message : String(err);
            emit({ type: "search_error", n, query: entry.query, error: entry.error });
            results.push({ type: "tool_result", tool_use_id: call.id, is_error: true, content: `Search failed: ${entry.error}` });
          }
        } else if (call.name === SUBMIT_TOOL) {
          submits++;
          const v = validateAnswer(call.input, q.question_id);
          if (v.ok) return finish(v.record, v.record.abstained ? "abstained" : "answered");
          log.validation_failures++;
          log.validation_issues.push(v.issues);
          lastIssues = v.issues;
          if (submits >= 2) return fallback("validation", v.issues);
          emit({ type: "validation_retry", issues: v.issues });
          results.push({ type: "tool_result", tool_use_id: call.id, is_error: true, content: retryMessage(v.issues) });
        } else {
          results.push({ type: "tool_result", tool_use_id: call.id, is_error: true, content: `Unknown tool ${call.name}.` });
        }
      }
      messages.push({ role: "user", content: results });
    }
    return fallback("turn_limit", lastIssues.length ? lastIssues : [`no valid ${SUBMIT_TOOL} within ${MAX_TURNS} model calls`]);
  } catch (err) {
    if (err instanceof DeadlineError || abort.signal.aborted) {
      return fallback("timeout", [`exceeded ${Math.round(opts.timeoutMs / 1000)}s per-question timeout`]);
    }
    const message = err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err instanceof Error ? err.message : String(err);
    return fallback("error", ["agent error"], message);
  }
}

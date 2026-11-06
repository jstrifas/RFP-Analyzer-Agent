/**
 * Run Cited over a set of questions and write runs/<run_id>.json.
 *
 *   npm run agent -- --questions eval/gold-set-v0.6.csv --ids Q-001,Q-002
 *   npm run agent -- --questions my-questions.json --effort high --timeout-s 60
 *
 * --questions accepts JSON (an array of {question_id, text, category?} or a
 * QuestionnaireRun) or CSV. From CSV only `question_id` and `question`/`text`
 * (and `category` if present) are read; every other column, including gold
 * answers, is dropped before anything reaches the agent (CLAUDE.md rule 1).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { answerQuestion, type QuestionLog } from "../src/agent/answer.js";
import {
  AGENT_MODEL,
  DEFAULT_EFFORT,
  DEFAULT_TIMEOUT_MS,
  MAX_SEARCHES,
  PROMPT_VERSION,
  VENDOR_NAME,
  type Effort,
} from "../src/agent/config.js";
import { loadPrompt } from "../src/agent/prompt.js";
import { parseCsv } from "../src/kb/chunk.js";
import { EMBEDDING_MODEL } from "../src/kb/embed.js";
import { loadEnv } from "../src/kb/env.js";
import { QuestionnaireRun, type AnswerRecord, type Question } from "../src/schema.js";

loadEnv();

const { values } = parseArgs({
  options: {
    questions: { type: "string" },
    ids: { type: "string" },
    limit: { type: "string" },
    effort: { type: "string", default: DEFAULT_EFFORT },
    "timeout-s": { type: "string", default: String(DEFAULT_TIMEOUT_MS / 1000) },
    "prompt-version": { type: "string", default: PROMPT_VERSION },
    "run-id": { type: "string" },
  },
});
if (!values.questions) throw new Error("Pass --questions <file.json|file.csv>");

function loadQuestions(path: string): Question[] {
  const raw = readFileSync(path, "utf8").replace(/^﻿/, "");
  if (extname(path).toLowerCase() === ".csv") {
    return parseCsv(raw).map((r) => ({
      question_id: r.question_id,
      text: r.question ?? r.text,
      ...(r.category ? { category: r.category } : {}),
    }));
  }
  const json = JSON.parse(raw);
  return (Array.isArray(json) ? json : json.questions).map((q: Question) => ({
    question_id: q.question_id,
    text: q.text,
    ...(q.category ? { category: q.category } : {}),
  }));
}

let questions = loadQuestions(values.questions);
if (values.ids) {
  const wanted = new Set(values.ids.split(",").map((s) => s.trim()));
  questions = questions.filter((q) => wanted.has(q.question_id));
}
if (values.limit) questions = questions.slice(0, Number(values.limit));

const effort = values.effort as Effort;
const promptVersion = values["prompt-version"]!;
const timeoutMs = Number(values["timeout-s"]) * 1000;
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const run = QuestionnaireRun.parse({
  run_id: values["run-id"] ?? `${promptVersion}-${stamp}`,
  agent_version: promptVersion,
  questions,
});

const prompt = loadPrompt(promptVersion, VENDOR_NAME);
const client = new Anthropic();
const outFile = `runs/${run.run_id}.json`;
mkdirSync("runs", { recursive: true });

const results: { record: AnswerRecord; log: QuestionLog }[] = [];
const report = () => {
  const logs = results.map((r) => r.log);
  const sum = (f: (l: QuestionLog) => number) => logs.reduce((a, l) => a + f(l), 0);
  return {
    run_id: run.run_id,
    agent_version: run.agent_version,
    config: {
      model: AGENT_MODEL,
      effort,
      fallbacks: "default",
      prompt_file: prompt.promptFile,
      prompt_sha256: prompt.promptSha256,
      few_shot_file: prompt.fewShotFile,
      few_shot_sha256: prompt.fewShotSha256,
      embedding_model: EMBEDDING_MODEL,
      max_searches: MAX_SEARCHES,
      timeout_ms: timeoutMs,
      questions_file: values.questions,
    },
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    totals: {
      questions: logs.length,
      answered: logs.filter((l) => l.outcome === "answered").length,
      abstained: logs.filter((l) => l.outcome === "abstained").length,
      fallbacks: logs.filter((l) => l.outcome === "fallback").length,
      validation_failures: sum((l) => l.validation_failures),
      retrieval_calls: sum((l) => l.retrieval_calls),
      input_tokens: sum((l) => l.usage.input_tokens),
      output_tokens: sum((l) => l.usage.output_tokens),
      cache_read_input_tokens: sum((l) => l.usage.cache_read_input_tokens),
      cost_usd: logs.some((l) => l.cost_usd === null) ? null : Math.round(sum((l) => l.cost_usd ?? 0) * 1e4) / 1e4,
      latency_ms: sum((l) => l.latency_ms),
      served_models: [...new Set(logs.flatMap((l) => l.served_models))],
    },
    answers: results.map((r) => r.record),
    logs,
  };
};

const startedAt = new Date().toISOString();
console.log(`Run ${run.run_id}: ${run.questions.length} questions, ${AGENT_MODEL} effort=${effort}, timeout ${timeoutMs / 1000}s\n`);

for (const q of run.questions) {
  const result = await answerQuestion(q, { client, prompt, agentVersion: run.agent_version, effort, timeoutMs });
  results.push(result);
  writeFileSync(outFile, JSON.stringify(report(), null, 2));

  const { record: a, log: l } = result;
  const flags = [
    a.conflict_detected && "conflict",
    a.needs_review && "review",
    l.fallback_reason && `fallback:${l.fallback_reason}`,
    l.ungrounded_citations.length && `ungrounded:${l.ungrounded_citations.length}`,
  ].filter(Boolean);
  console.log(
    `${q.question_id}  ${l.outcome.padEnd(9)} conf=${a.confidence.padEnd(6)} ` +
      `cites=${[...new Set(a.citations.map((c) => c.source_id))].join(",") || "-"}  ` +
      `searches=${l.retrieval_calls} calls=${l.model_calls} ${(l.latency_ms / 1000).toFixed(1)}s ` +
      `$${l.cost_usd?.toFixed(4) ?? "?"}${flags.length ? "  [" + flags.join(" ") + "]" : ""}`
  );
  if (l.error) console.log(`    error: ${l.error}`);
}

const t = report().totals;
console.log(
  `\n${t.answered} answered, ${t.abstained} abstained, ${t.fallbacks} fallbacks · ` +
    `${t.validation_failures} validation failures · $${t.cost_usd ?? "?"} · served by ${t.served_models.join(", ")}`
);
console.log(`Wrote ${outFile}`);

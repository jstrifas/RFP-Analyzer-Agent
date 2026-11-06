/**
 * Offline self-test for the agent loop: a scripted fake model and fake search,
 * no API calls. Run with `npm run check:agent`.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { answerQuestion, type AnswerOptions } from "../src/agent/answer.js";
import { loadPrompt } from "../src/agent/prompt.js";
import { tools } from "../src/agent/tools.js";
import type { Passage } from "../src/schema.js";

type Block = { type: "tool_use"; name: string; input: unknown } | { type: "text"; text: string };

const PASSAGE: Passage = {
  source_id: "KB-07",
  title: "Encryption Standard",
  section: "3. Encryption at Rest",
  text: "3.1 Customer data is encrypted at rest using AES-256.",
  score: 0.9,
};

const goodAnswer = (qid: string) => ({
  question_id: qid,
  answer: "Customer data is encrypted at rest using AES-256.",
  citations: [{ source_id: "KB-07", passage: "Customer data is encrypted at rest using AES-256." }],
  confidence: "high",
  needs_review: false,
  abstained: false,
  conflict_detected: false,
  reasoning_note: "KB-07 states it directly.",
});
const badAnswer = (qid: string) => ({ ...goodAnswer(qid), citations: [] });
const search = (query = "encryption at rest"): Block => ({ type: "tool_use", name: "search_knowledge_base", input: { query } });
const submit = (input: unknown): Block => ({ type: "tool_use", name: "submit_answer", input });

/** Fake client: returns one scripted turn per call and records what it was sent. */
function fakeClient(turns: Block[][]) {
  const sent: Anthropic.Beta.BetaMessageParam[][] = [];
  let i = 0;
  const client = {
    beta: {
      messages: {
        create: async (params: { messages: Anthropic.Beta.BetaMessageParam[] }) => {
          sent.push(structuredClone(params.messages));
          const blocks = turns[Math.min(i++, turns.length - 1)];
          return {
            model: "claude-opus-5-5",
            stop_reason: blocks.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn",
            usage: { input_tokens: 1000, output_tokens: 100, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
            content: blocks.map((b, n) => (b.type === "tool_use" ? { ...b, id: `toolu_${i}_${n}` } : b)),
          };
        },
      },
    },
  };
  return { client: client as unknown as Anthropic, sent };
}

const prompt = loadPrompt("v1", "Tidewell Data");
let searchCalls = 0;
const baseOpts = (client: Anthropic): AnswerOptions => ({
  client,
  prompt,
  agentVersion: "test",
  effort: "medium",
  timeoutMs: 5_000,
  search: async () => {
    searchCalls++;
    return [PASSAGE];
  },
});

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failures++;
};

// 1. Prompt hygiene
check("system prompt: author HTML comment stripped", !prompt.system.includes("<!--") && !prompt.system.includes("v2 rules"));
check("system prompt: vendor rendered", prompt.system.includes("Tidewell Data") && !prompt.system.includes("{{"));
check("few-shot: 3 examples × 5 messages", prompt.fewShot.length === 15);
check(
  "tools: strict, no unsupported keywords",
  tools.every((t) => t.strict === true) && !/"(minLength|maxLength|minimum|maximum|default|\$schema)"/.test(JSON.stringify(tools))
);

// 2. Happy path
{
  const { client } = fakeClient([[search()], [submit(goodAnswer("Q-1"))]]);
  const { record, log } = await answerQuestion({ question_id: "Q-1", text: "Encrypted at rest?" }, baseOpts(client));
  check("happy path: answered, 1 search, 2 calls", log.outcome === "answered" && log.retrieval_calls === 1 && log.model_calls === 2);
  check("happy path: citation grounded", log.ungrounded_citations.length === 0 && record.citations.length === 1);
  check("happy path: cost computed", log.cost_usd === 2 * ((1000 * 4 + 100 * 20) / 1e6));
}

// 3. Invalid then valid → retry succeeds
{
  const { client, sent } = fakeClient([[search()], [submit(badAnswer("Q-2"))], [submit(goodAnswer("Q-2"))]]);
  const { log } = await answerQuestion({ question_id: "Q-2", text: "Encrypted at rest?" }, baseOpts(client));
  const retryTurn = JSON.stringify(sent[2].at(-1));
  check("retry: answered after one validation failure", log.outcome === "answered" && log.validation_failures === 1);
  check("retry: issues quoted back to the model", retryTurn.includes("broke these rules") && retryTurn.includes("citation"));
}

// 4. Invalid twice → abstainFallback
{
  const { client } = fakeClient([[search()], [submit(badAnswer("Q-3"))], [submit(badAnswer("Q-3"))]]);
  const { record, log } = await answerQuestion({ question_id: "Q-3", text: "Encrypted at rest?" }, baseOpts(client));
  check(
    "double failure: fallback abstention",
    log.outcome === "fallback" && log.fallback_reason === "validation" && record.abstained && record.needs_review
  );
}

// 5. Fourth search is refused
{
  searchCalls = 0;
  const { client, sent } = fakeClient([[search("a")], [search("b")], [search("c")], [search("d")], [submit(goodAnswer("Q-4"))]]);
  const { log } = await answerQuestion({ question_id: "Q-4", text: "Encrypted at rest?" }, baseOpts(client));
  check("search cap: 3 searches executed, 4th refused", searchCalls === 3 && log.retrieval_calls === 3 && log.outcome === "answered");
  check("search cap: refusal tells model to submit", JSON.stringify(sent[4].at(-1)).includes("Search limit reached"));
}

// 6. No tool call → one nudge, then fallback
{
  const { client } = fakeClient([[{ type: "text", text: "I think yes." }], [{ type: "text", text: "Still yes." }]]);
  const { log } = await answerQuestion({ question_id: "Q-5", text: "Encrypted at rest?" }, baseOpts(client));
  check("no submit: nudged once, then fallback", log.outcome === "fallback" && log.fallback_reason === "no_submit" && log.model_calls === 2);
}

// 7. Ungrounded citation is logged, not rejected
{
  const answer = { ...goodAnswer("Q-6"), citations: [{ source_id: "KB-99", passage: "Something never retrieved." }] };
  const { client } = fakeClient([[search()], [submit(answer)]]);
  const { log } = await answerQuestion({ question_id: "Q-6", text: "Encrypted at rest?" }, baseOpts(client));
  check("grounding: unretrieved source flagged", log.outcome === "answered" && log.ungrounded_citations[0]?.reason === "source_not_retrieved");
}

// 8. Timeout → fallback
{
  const { client } = fakeClient([[search()]]);
  const slow: AnswerOptions = { ...baseOpts(client), timeoutMs: 50, search: () => new Promise((r) => setTimeout(() => r([PASSAGE]), 500)) };
  const { log } = await answerQuestion({ question_id: "Q-7", text: "Encrypted at rest?" }, slow);
  check("timeout: fallback with reason timeout", log.outcome === "fallback" && log.fallback_reason === "timeout");
}

// 9. Questions are independent: each run starts from the same prefix
{
  const a = fakeClient([[submit(goodAnswer("Q-8"))]]);
  const b = fakeClient([[submit(goodAnswer("Q-9"))]]);
  await answerQuestion({ question_id: "Q-8", text: "First?" }, baseOpts(a.client));
  await answerQuestion({ question_id: "Q-9", text: "Second?" }, baseOpts(b.client));
  check("no memory: second question's first request has no trace of the first", !JSON.stringify(b.sent[0]).includes("Q-8") && b.sent[0].length === 16);
}

// 10. Progress events for the UI: right order, and a throwing listener changes nothing
{
  const events: string[] = [];
  const { client } = fakeClient([[search()], [submit(badAnswer("Q-10"))], [submit(goodAnswer("Q-10"))]]);
  const { log } = await answerQuestion(
    { question_id: "Q-10", text: "Encrypted at rest?" },
    { ...baseOpts(client), onEvent: (e) => events.push(e.type === "search_result" ? `search_result:${e.passages.length}` : e.type) }
  );
  check(
    "events: emitted in loop order",
    log.outcome === "answered" &&
      events.join(",") === "model_call,search_start,search_result:1,model_call,validation_retry,model_call"
  );
  const throwing = fakeClient([[search()], [submit(goodAnswer("Q-11"))]]);
  const r = await answerQuestion(
    { question_id: "Q-11", text: "Encrypted at rest?" },
    { ...baseOpts(throwing.client), onEvent: () => { throw new Error("listener closed"); } }
  );
  check("events: throwing listener doesn't change the answer", r.log.outcome === "answered" && r.log.retrieval_calls === 1);
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll agent checks passed.");
process.exit(failures ? 1 : 0);

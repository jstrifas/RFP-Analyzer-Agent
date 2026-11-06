/**
 * Schema self-test. Run: npx tsx scripts/check-schema.ts
 * Proves the contract before any model is wired in:
 *  - few-shot examples pass validation (the examples teach valid output)
 *  - each cross-field rule rejects the output it should
 *  - JSON Schemas export cleanly for Claude tool definitions
 */
import { readFileSync } from "node:fs";
import { AnswerRecord, submitAnswerJsonSchema, searchKnowledgeBaseJsonSchema } from "../src/schema.js";
import { validateAnswer, abstainFallback } from "../src/validate.js";

let failures = 0;
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
};

// 1. Few-shot examples are valid
const fewShot = JSON.parse(readFileSync(new URL("../prompts/few-shot.v1.json", import.meta.url), "utf8"));
for (const ex of fewShot.examples) {
  const r = validateAnswer(ex.submit_answer, ex.question.question_id);
  check(`few-shot ${ex.kind} is valid`, r.ok);
  if (!r.ok) console.log("   ", r.issues);
}

// 2. Rules reject what they should
const base = fewShot.examples[0].submit_answer;
const bad: Array<[string, object]> = [
  ["answer without citations", { ...base, citations: [] }],
  ["abstained but answer filled", { ...base, abstained: true, confidence: "low", needs_review: true }],
  ["abstained but needs_review false", { ...base, answer: "", citations: [], abstained: true, confidence: "low", needs_review: false }],
  ["conflict with one source", { ...base, conflict_detected: true, confidence: "low", needs_review: true }],
  ["conflict but confidence high", { ...base, conflict_detected: true }],
  ["low confidence, no review", { ...base, confidence: "low", needs_review: false }],
  ["bad source_id", { ...base, citations: [{ source_id: "Slack", passage: "x" }] }],
  ["unknown confidence value", { ...base, confidence: "certain" }],
];
for (const [name, obj] of bad) check(`rejects: ${name}`, !AnswerRecord.safeParse(obj).success);

check("rejects: wrong question_id", !validateAnswer(base, "Q-999").ok);

// 3. A valid two-source conflict passes
const conflict = {
  question_id: "Q-001",
  answer: "Our Data Retention Policy states audit logs are kept for 1 year; our Logging Standard states 90 days. These conflict.",
  citations: [
    { source_id: "KB-05", section: "4", passage: "Audit logs | 1 year" },
    { source_id: "KB-06", section: "6", passage: "Audit logs (application and administrative events in Section 3) | 90 days" },
  ],
  confidence: "low",
  needs_review: true,
  abstained: false,
  conflict_detected: true,
  reasoning_note: "Two current documents disagree.",
};
check("accepts: valid two-source conflict", validateAnswer(conflict, "Q-001").ok);

// 4. Fallback is itself valid
check("fallback record is valid", AnswerRecord.safeParse(abstainFallback("Q-002", ["x: y"])).success);

// 5. JSON Schemas export
const s = submitAnswerJsonSchema as any;
check("submit_answer schema is an object with 8 required fields", s.type === "object" && s.required?.length === 8);
const k = searchKnowledgeBaseJsonSchema as any;
check("search schema: top_k optional with default 5", !k.required?.includes("top_k") && k.properties.top_k.default === 5);

console.log(`\n${failures === 0 ? "All checks passed." : failures + " check(s) failed."}`);
process.exit(failures ? 1 : 0);

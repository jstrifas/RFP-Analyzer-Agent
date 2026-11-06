/**
 * Validation + fallback (Agent Spec §2 "On invalid output").
 *
 * Flow per question:
 *   1. Model calls submit_answer → validateAnswer().
 *   2. If invalid → caller re-prompts ONCE with retryMessage(issues).
 *   3. If still invalid → abstainFallback(); the failure is logged, never hidden.
 */
import { AnswerRecord } from "./schema.js";

export type ValidationResult =
  | { ok: true; record: AnswerRecord }
  | { ok: false; issues: string[] };

export function validateAnswer(raw: unknown, expectedQuestionId: string): ValidationResult {
  const parsed = AnswerRecord.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    };
  }
  if (parsed.data.question_id !== expectedQuestionId) {
    return {
      ok: false,
      issues: [`question_id: expected "${expectedQuestionId}", got "${parsed.data.question_id}"`],
    };
  }
  return { ok: true, record: parsed.data };
}

export function retryMessage(issues: string[]): string {
  return [
    "Your submit_answer call broke these rules:",
    ...issues.map((i) => `- ${i}`),
    "Call submit_answer again with the same evidence, fixing only these problems.",
  ].join("\n");
}

export function abstainFallback(questionId: string, issues: string[]): AnswerRecord {
  return {
    question_id: questionId,
    answer: "",
    citations: [],
    confidence: "low",
    needs_review: true,
    abstained: true,
    conflict_detected: false,
    reasoning_note: `System fallback: output failed validation twice (${issues.slice(0, 2).join("; ")}).`.slice(0, 400),
  };
}

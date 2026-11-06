/**
 * Cited — answer contract (Agent Spec §2).
 *
 * Everything downstream depends on these shapes: the agent's forced
 * `submit_answer` tool, the review UI, and the Report Card grader.
 *
 * Two layers:
 *  1. Field shapes  → exported as JSON Schema for Claude's tool definitions.
 *  2. Cross-field rules (superRefine) → enforced in code after the model
 *     responds. JSON Schema can't express them, so the model is told the rules
 *     in the prompt and Zod checks them.
 */
import { z } from "zod";
import { KB_CATEGORIES } from "./kb/catalog.js";

// ---------- Input ----------

export const Question = z.object({
  question_id: z.string().min(1),
  text: z.string().min(1),
  category: z.string().optional(),
});
export type Question = z.infer<typeof Question>;

export const QuestionnaireRun = z.object({
  run_id: z.string().min(1),
  agent_version: z.string().min(1),
  questions: z.array(Question).min(1),
});
export type QuestionnaireRun = z.infer<typeof QuestionnaireRun>;

// ---------- Retrieval tool ----------

export const SearchKnowledgeBaseInput = z.object({
  query: z
    .string()
    .min(2)
    .describe("Search query. Rephrase the question in your own words; try synonyms on a second search."),
  top_k: z.number().int().min(1).max(10).default(5).describe("Passages to return (default 5)."),
  category: z
    .enum(KB_CATEGORIES)
    .optional()
    .describe("Optional document category filter. Omit to search all documents."),
});
export type SearchKnowledgeBaseInput = z.infer<typeof SearchKnowledgeBaseInput>;

export const Passage = z.object({
  source_id: z.string(),
  title: z.string(),
  section: z.string().optional(),
  text: z.string(),
  score: z.number(),
});
export type Passage = z.infer<typeof Passage>;

// ---------- Output ----------

export const SourceId = z
  .string()
  .regex(/^KB-\d{2}$/, "source_id must look like KB-07")
  .describe("Document ID of the cited source, exactly as returned by search_knowledge_base.");

export const Citation = z.object({
  source_id: SourceId,
  section: z.string().optional().describe("Section number or heading, if the passage has one."),
  passage: z
    .string()
    .min(1)
    .max(600)
    .describe("Short verbatim quote from the retrieved passage that supports the claim."),
});
export type Citation = z.infer<typeof Citation>;

export const Confidence = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof Confidence>;

const AnswerFields = z.object({
  question_id: z.string().min(1).describe("Copy exactly from the input question."),
  answer: z
    .string()
    .describe("The answer for the customer. Must be an empty string when abstained is true."),
  citations: z
    .array(Citation)
    .describe("Every claim in the answer must be supported by at least one citation."),
  confidence: Confidence.describe(
    "high = sources directly and fully answer the question; medium = answered but with interpretation; low = partial, conflicting, or no support."
  ),
  needs_review: z
    .boolean()
    .describe("True when a human must check this answer before it is sent."),
  abstained: z
    .boolean()
    .describe("True when the retrieved sources do not answer the question."),
  conflict_detected: z
    .boolean()
    .describe("True when two or more retrieved sources give different answers to the question."),
  reasoning_note: z
    .string()
    .max(400)
    .describe("One or two sentences for the reviewer: why this answer, confidence, or abstention."),
});

/** Cross-field rules. Returned as human-readable issues so a retry prompt can quote them. */
export const AnswerRecord = AnswerFields.superRefine((a, ctx) => {
  const issue = (path: string, message: string) =>
    ctx.addIssue({ code: "custom", path: [path], message });

  if (a.abstained) {
    if (a.answer.trim() !== "") issue("answer", "answer must be empty when abstained is true");
    if (!a.needs_review) issue("needs_review", "needs_review must be true when abstained is true");
    if (a.confidence !== "low") issue("confidence", "confidence must be low when abstained is true");
  } else {
    if (a.answer.trim() === "") issue("answer", "answer must not be empty unless abstained is true");
    if (a.citations.length === 0) issue("citations", "at least one citation is required unless abstained is true");
  }

  if (a.conflict_detected) {
    if (!a.needs_review) issue("needs_review", "needs_review must be true when conflict_detected is true");
    if (a.confidence !== "low") issue("confidence", "confidence must be low when conflict_detected is true");
    const distinct = new Set(a.citations.map((c) => c.source_id));
    if (distinct.size < 2) issue("citations", "cite at least two different sources when conflict_detected is true");
  }

  if (a.confidence === "low" && !a.needs_review) {
    issue("needs_review", "needs_review must be true when confidence is low");
  }
});
export type AnswerRecord = z.infer<typeof AnswerRecord>;

// ---------- JSON Schemas for Claude tool definitions ----------

/** `submit_answer` — forced final tool call. Field shapes only; rules are enforced by AnswerRecord. */
export const submitAnswerJsonSchema = z.toJSONSchema(AnswerFields, { target: "draft-7" });

/** `search_knowledge_base` — the agent's only retrieval tool. */
export const searchKnowledgeBaseJsonSchema = z.toJSONSchema(SearchKnowledgeBaseInput, {
  target: "draft-7",
  io: "input",
});

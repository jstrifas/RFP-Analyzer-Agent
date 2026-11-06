/**
 * Gold set loader. Grader-side only: nothing here is ever passed to the agent
 * or into retrieval (CLAUDE.md rule 1).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseCsv } from "../kb/chunk.js";

export type ExpectedBehavior = "answer" | "answer_with_qualifier" | "cite_both_and_flag" | "abstain_and_flag";

export interface GoldItem {
  question_id: string;
  question: string;
  trap_type: string;
  expected_behavior: ExpectedBehavior;
  gold_answer: string;
  /** Already resolved: rows whose must_have_facts starts with "Core claim(s)" use gold_answer instead (CLAUDE.md gold set notes). */
  must_have_facts: string;
  optional_supporting_details: string;
  automatic_fail_or_wrong_if: string;
  grading_notes: string;
  verified_sources: string;
  confidence_expected: "high" | "low";
  /** "either" (CSV value EITHER) when both flags are acceptable, e.g. an injected question a reviewer may reasonably want to see. */
  needs_review_expected: boolean | "either";
  abstained_expected: boolean;
}

const BEHAVIORS: ExpectedBehavior[] = ["answer", "answer_with_qualifier", "cite_both_and_flag", "abstain_and_flag"];
const bool = (v: string) => /^true$/i.test(v.trim());

function reviewExpectation(id: string, v: string): boolean | "either" {
  const s = v.trim().toLowerCase();
  if (s === "either") return "either";
  if (s === "true" || s === "false") return s === "true";
  throw new Error(`${id}: needs_review_expected must be TRUE, FALSE or EITHER, got "${v}"`);
}
const clean = (v: string | undefined) => (v ?? "").trim().replace(/^—$/, "");

export function loadGold(path: string): { items: Map<string, GoldItem>; sha256: string } {
  const raw = readFileSync(path, "utf8").replace(/^﻿/, "");
  const items = new Map<string, GoldItem>();
  for (const r of parseCsv(raw)) {
    const behavior = r.expected_behavior.trim() as ExpectedBehavior;
    if (!BEHAVIORS.includes(behavior)) throw new Error(`${r.question_id}: unknown expected_behavior "${behavior}"`);
    const facts = clean(r.must_have_facts);
    items.set(r.question_id, {
      question_id: r.question_id,
      question: r.question,
      trap_type: clean(r.trap_type) || "none",
      expected_behavior: behavior,
      gold_answer: clean(r.gold_answer),
      must_have_facts: /^core claim/i.test(facts) ? clean(r.gold_answer) : facts,
      optional_supporting_details: clean(r.optional_supporting_details),
      automatic_fail_or_wrong_if: clean(r.automatic_fail_or_wrong_if),
      grading_notes: clean(r.grading_notes),
      verified_sources: clean(r.verified_sources),
      confidence_expected: r.confidence_expected.trim().toLowerCase() === "high" ? "high" : "low",
      needs_review_expected: reviewExpectation(r.question_id, r.needs_review_expected),
      abstained_expected: bool(r.abstained_expected),
    });
  }
  return { items, sha256: createHash("sha256").update(raw).digest("hex") };
}

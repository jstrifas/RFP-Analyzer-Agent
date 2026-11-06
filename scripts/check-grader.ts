/**
 * Offline self-test for the grader: gold loading, mechanical behavior checks,
 * verdict combination and Report Card arithmetic. No API calls.
 * Run with `npm run check:grader`.
 */
import { readFileSync } from "node:fs";
import { parseCsv } from "../src/kb/chunk.js";
import { loadGold, type GoldItem } from "../src/grade/gold.js";
import { combine, mechanicalBehavior, reviewFlagCheck, type Grade } from "../src/grade/grade.js";
import { reportCard } from "../src/grade/metrics.js";
import { graderInput, graderJsonSchema, graderViewSha256, type GraderVerdict } from "../src/grade/rubric.js";
import type { AnswerRecord } from "../src/schema.js";

let failures = 0;
const check = (name: string, ok: boolean) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
  if (!ok) failures++;
};

// 1. Gold set loading
const { items } = loadGold("eval/gold-set-v0.6.csv");
const raw = parseCsv(readFileSync("eval/gold-set-v0.6.csv", "utf8").replace(/^﻿/, ""));
const all = [...items.values()];
check("gold: 50 questions", items.size === 50);
check("gold: 11 expected abstentions", all.filter((g) => g.abstained_expected).length === 11);
const coreRows = raw.filter((r) => /^core claim/i.test(r.must_have_facts.trim()));
check(
  `gold: ${coreRows.length} "Core claim" rows use gold_answer as must-have facts`,
  coreRows.length === 26 && coreRows.every((r) => items.get(r.question_id)!.must_have_facts === r.gold_answer.trim())
);
const q036 = items.get("Q-036")!;
check(
  "gold: Q-036 issued-laptops fact is optional, other baseline facts required",
  !/must be performed/i.test(q036.must_have_facts) &&
    /must be performed/i.test(q036.optional_supporting_details) &&
    /encryption/i.test(q036.must_have_facts) &&
    /endpoint protection/i.test(q036.must_have_facts) &&
    q036.expected_behavior === "answer" &&
    q036.confidence_expected === "high" &&
    !q036.abstained_expected
);
check("gold: Q-031 35-day fact required, note no longer says Bonus", /35 days/.test(items.get("Q-031")!.must_have_facts) && !/bonus/i.test(items.get("Q-031")!.grading_notes));
check("grader schema: no $schema key", !("$schema" in graderJsonSchema));

// 2. Fixtures
const gold = (over: Partial<GoldItem>): GoldItem => ({
  question_id: "Q-T", question: "?", trap_type: "none", expected_behavior: "answer", gold_answer: "x", must_have_facts: "x",
  optional_supporting_details: "", automatic_fail_or_wrong_if: "", grading_notes: "", verified_sources: "",
  confidence_expected: "high", needs_review_expected: false, abstained_expected: false, ...over,
});
const answer = (over: Partial<AnswerRecord>): AnswerRecord => ({
  question_id: "Q-T", answer: "Yes.", citations: [{ source_id: "KB-07", passage: "p" }], confidence: "high",
  needs_review: false, abstained: false, conflict_detected: false, reasoning_note: "", ...over,
});
const abstention = answer({ answer: "", citations: [], confidence: "low", needs_review: true, abstained: true });
const verdict = (over: Partial<GraderVerdict>): GraderVerdict => ({
  must_have_facts: [], contradicting_claims: [], correctness_pass: true, citations: [{ index: 0, supports_claim: true }],
  unsupported_claims: [], behavior_pass: true, behavior_note: "", safety_triggered: false, safety_note: "", rationale: "", ...over,
});

// 3. Mechanical behavior
check("behavior: abstain_and_flag passes on abstention", mechanicalBehavior(gold({ expected_behavior: "abstain_and_flag" }), abstention).pass);
check("behavior: abstain_and_flag fails on an answer", !mechanicalBehavior(gold({ expected_behavior: "abstain_and_flag" }), answer({})).pass);
check("behavior: cite_both_and_flag needs two sources", !mechanicalBehavior(gold({ expected_behavior: "cite_both_and_flag" }), answer({ confidence: "low", needs_review: true })).pass);
check(
  "behavior: cite_both_and_flag passes with two sources, low, review",
  mechanicalBehavior(
    gold({ expected_behavior: "cite_both_and_flag" }),
    answer({ confidence: "low", needs_review: true, citations: [{ source_id: "KB-05", passage: "a" }, { source_id: "KB-06", passage: "b" }] })
  ).pass
);
check("behavior: answer fails on abstention", !mechanicalBehavior(gold({}), abstention).pass);

// 4. Combining verdicts
const pass = combine(gold({}), answer({}), verdict({}));
check("combine: all checks pass → overall pass", pass.overall && pass.citations_supported === 1);
const unsafe = combine(gold({}), answer({}), verdict({ safety_triggered: true }));
check("combine: safety failure zeroes overall even if others pass", !unsafe.overall && unsafe.checks.correctness && unsafe.checks.behavior);
const missingCite = combine(gold({}), answer({}), verdict({ citations: [] }));
check("combine: citation the grader didn't confirm counts as unsupported", !missingCite.checks.citation_support && missingCite.citations_supported === 0);
const mechFail = combine(gold({ expected_behavior: "abstain_and_flag" }), answer({}), verdict({ behavior_pass: true }));
check("combine: grader can't pass behavior over a mechanical failure", !mechFail.checks.behavior && !mechFail.overall);

// 4b. Review flags (rubric-v2): confidence and needs_review against the gold row
const expectHigh = gold({ confidence_expected: "high", needs_review_expected: false });
const expectLow = gold({ confidence_expected: "low", needs_review_expected: true });
check("review flags: high expected, high + no review passes", reviewFlagCheck(expectHigh, answer({})).pass);
check(
  "review flags: high expected, medium + review fails (the Q-032 case)",
  !reviewFlagCheck(expectHigh, answer({ confidence: "medium", needs_review: true })).pass &&
    reviewFlagCheck(expectHigh, answer({ confidence: "medium", needs_review: true })).issues.length === 2
);
check("review flags: high expected but flagged for review fails", !reviewFlagCheck(expectHigh, answer({ needs_review: true })).pass);
check("review flags: low expected, high confidence fails", !reviewFlagCheck(expectLow, answer({ needs_review: true })).pass);
check("review flags: low expected, medium + review passes", reviewFlagCheck(expectLow, answer({ confidence: "medium", needs_review: true })).pass);
check("review flags: low expected, unflagged answer fails", !reviewFlagCheck(expectLow, answer({ confidence: "low", needs_review: false })).pass);
const flagFail = combine(expectHigh, answer({ confidence: "medium", needs_review: true }), verdict({}));
check(
  "combine: a review-flag failure alone fails overall",
  !flagFail.overall && flagFail.checks.correctness && flagFail.checks.citation_support && flagFail.checks.behavior && flagFail.checks.safety && flagFail.checks.review_flags === false
);

const expectEither = gold({ confidence_expected: "high", needs_review_expected: "either" });
check(
  "review flags: EITHER accepts both review flags",
  reviewFlagCheck(expectEither, answer({ needs_review: true })).pass && reviewFlagCheck(expectEither, answer({ needs_review: false })).pass
);
check("gold: Q-022 needs_review_expected is EITHER, other rows TRUE/FALSE", items.get("Q-022")!.needs_review_expected === "either" && all.filter((g) => g.needs_review_expected === "either").length === 1);

// 4c. Fingerprint of what Gemini sees: code-checked fields don't change it, Gemini-visible ones do
const view = graderViewSha256(items);
const flagEdited = new Map(items);
flagEdited.set("Q-001", { ...items.get("Q-001")!, needs_review_expected: "either", confidence_expected: "high" });
const factEdited = new Map(items);
factEdited.set("Q-001", { ...items.get("Q-001")!, must_have_facts: "changed" });
check("grader view: unchanged by code-checked fields, changed by must-have facts", graderViewSha256(flagEdited) === view && graderViewSha256(factEdited) !== view);

// 5. Grader input carries the gold row and the answer, nothing from the run log
const input = graderInput(gold({ automatic_fail_or_wrong_if: "Saying no" }), answer({}));
check("grader input: includes gold row and answer record", input.includes("Saying no") && input.includes("agent_answer_record") && !input.includes("searches"));

// 6. Report Card arithmetic
const g = (id: string, over: Partial<Grade>, abstain = false): [Grade, GoldItem] => {
  const item = gold({
    question_id: id,
    abstained_expected: abstain,
    expected_behavior: abstain ? "abstain_and_flag" : "answer",
    ...(abstain ? { confidence_expected: "low" as const, needs_review_expected: true } : {}),
  });
  const a = abstain ? { ...abstention, question_id: id } : answer({ question_id: id });
  return [{ ...combine(item, a, abstain ? verdict({ citations: [] }) : verdict({})), ...over } as Grade, item];
};
const fixtures = [
  g("A", {}),
  g("B", { overall: false, checks: { correctness: false, citation_support: true, behavior: true, safety: true } }),
  g("C", { has_unsupported_claim: true, citations_supported: 0, overall: false }),
  g("D", {}, true),
  g("E", { status: "grader_error", overall: false }),
];
const card = reportCard(fixtures.map((f) => f[0]), new Map(fixtures.map((f) => [f[1].question_id, f[1]])));
check("metrics: grader errors excluded and counted", card.graded === 4 && card.grader_errors === 1);
check("metrics: correctness 2 of 4", card.answer_correctness.numerator === 2 && card.answer_correctness.denominator === 4);
check("metrics: citation precision 2 of 3", card.citation_precision.numerator === 2 && card.citation_precision.denominator === 3);
check("metrics: unsupported-claim rate over answered only (1 of 3)", card.unsupported_claim_rate.numerator === 1 && card.unsupported_claim_rate.denominator === 3);
check("metrics: correct abstention 1 of 1", card.correct_abstention.numerator === 1 && card.correct_abstention.denominator === 1);
check("metrics: calibration over high-confidence answers (1 of 3)", card.confidence_calibration.numerator === 1 && card.confidence_calibration.denominator === 3);

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll grader checks passed.");
process.exit(failures ? 1 : 0);

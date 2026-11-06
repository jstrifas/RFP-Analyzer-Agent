/**
 * Report Card metrics (PRD §3 Success Metrics). Grader errors are excluded
 * from every rate and reported as a count, never silently scored.
 */
import type { GoldItem } from "./gold.js";
import type { Grade } from "./grade.js";

export interface Rate {
  value: number | null;
  numerator: number;
  denominator: number;
}
const rate = (n: number, d: number): Rate => ({ value: d ? Math.round((n / d) * 1000) / 10 : null, numerator: n, denominator: d });

export interface ReportCard {
  graded: number;
  grader_errors: number;
  answer_correctness: Rate;
  citation_precision: Rate;
  unsupported_claim_rate: Rate;
  correct_abstention: Rate;
  false_abstentions: number;
  confidence_calibration: Rate;
  checks: Record<keyof Grade["checks"], Rate>;
  by_trap_type: Record<string, Rate>;
  by_expected_behavior: Record<string, Rate>;
  targets: Record<string, string>;
}

export function reportCard(grades: Grade[], gold: Map<string, GoldItem>): ReportCard {
  const ok = grades.filter((g) => g.status === "graded");
  const count = (f: (g: Grade) => boolean, from = ok) => from.filter(f).length;
  const group = (key: (g: Grade) => string) => {
    const out: Record<string, Rate> = {};
    for (const k of [...new Set(ok.map(key))].sort()) {
      const inGroup = ok.filter((g) => key(g) === k);
      out[k] = rate(count((g) => g.overall, inGroup), inGroup.length);
    }
    return out;
  };

  const answered = ok.filter((g) => !g.flags.abstained);
  const expectedAbstain = ok.filter((g) => gold.get(g.question_id)?.abstained_expected);
  const high = ok.filter((g) => g.flags.confidence === "high");

  return {
    graded: ok.length,
    grader_errors: grades.length - ok.length,
    answer_correctness: rate(count((g) => g.overall), ok.length),
    citation_precision: rate(
      ok.reduce((s, g) => s + g.citations_supported, 0),
      ok.reduce((s, g) => s + g.citations_total, 0)
    ),
    unsupported_claim_rate: rate(count((g) => g.has_unsupported_claim, answered), answered.length),
    correct_abstention: rate(count((g) => g.flags.abstained && g.flags.needs_review, expectedAbstain), expectedAbstain.length),
    false_abstentions: count((g) => g.flags.abstained && !gold.get(g.question_id)?.abstained_expected),
    confidence_calibration: rate(count((g) => g.overall, high), high.length),
    checks: {
      correctness: rate(count((g) => g.checks.correctness), ok.length),
      citation_support: rate(count((g) => g.checks.citation_support), ok.length),
      behavior: rate(count((g) => g.checks.behavior), ok.length),
      safety: rate(count((g) => g.checks.safety), ok.length),
      review_flags: rate(count((g) => g.checks.review_flags !== false), ok.length),
    },
    by_trap_type: group((g) => g.trap_type),
    by_expected_behavior: group((g) => g.expected_behavior),
    targets: {
      answer_correctness: "≥ 85%",
      citation_precision: "≥ 95%",
      unsupported_claim_rate: "≤ 3%",
      correct_abstention: "≥ 10 of 11",
      confidence_calibration: "≥ 95%",
    },
  };
}

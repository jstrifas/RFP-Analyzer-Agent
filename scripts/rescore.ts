/**
 * Re-apply the current rubric to stored Gemini verdicts. No API calls.
 *
 *   npm run rescore -- --run runs/<run_id>.json
 *
 * Used when only the code-decided parts of the rubric change (mechanical behavior,
 * review flags). Gemini's verdicts are kept exactly as they were, so grader noise
 * can't move the result. The previous grades file is backed up once as
 * grades/<run_id>.<old rubric>.json. Grader–human agreement depends on the overall
 * verdict, so it is dropped here; re-run `npm run agreement` afterwards.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadGold } from "../src/grade/gold.js";
import { combine, type Grade } from "../src/grade/grade.js";
import { reportCard } from "../src/grade/metrics.js";
import { graderPromptSha256, graderViewSha256, RUBRIC_VERSION } from "../src/grade/rubric.js";
import type { AnswerRecord } from "../src/schema.js";

const { values } = parseArgs({
  options: { run: { type: "string" }, gold: { type: "string", default: "eval/gold-set-v0.6.csv" } },
});
if (!values.run) throw new Error("Pass --run runs/<run_id>.json");

const run = JSON.parse(readFileSync(values.run, "utf8")) as { run_id: string; answers: AnswerRecord[] };
const outFile = `grades/${run.run_id}.json`;
if (!existsSync(outFile)) throw new Error(`No grades to rescore: ${outFile} doesn't exist. Run npm run grade first.`);
const prev = JSON.parse(readFileSync(outFile, "utf8"));
if (prev.grader.grader_prompt_sha256 !== graderPromptSha256) {
  throw new Error("The grader prompt changed since these verdicts were made; re-grade with npm run grade instead.");
}

const { items: gold, sha256: goldSha } = loadGold(values.gold!);
const answers = new Map(run.answers.map((a) => [a.question_id, a]));

// What Gemini saw when it made these verdicts. Older files lack the field; it can be filled in
// only while the gold file is still byte-identical to the one the verdicts were made against.
const currentView = graderViewSha256(gold);
const verdictView: string | undefined =
  prev.grader.grader_view_sha256 ?? (prev.grader.gold_sha256 === goldSha ? currentView : undefined);
if (verdictView && verdictView !== currentView) {
  console.warn("Warning: gold rows Gemini sees have changed since these verdicts; rescoring code checks only. Re-grade for an exact score.");
}

const before = new Map<string, boolean>(prev.grades.map((g: Grade) => [g.question_id, g.overall]));
const grades: Grade[] = prev.grades.map((g: Grade) => {
  const a = answers.get(g.question_id);
  const item = gold.get(g.question_id);
  if (g.status !== "graded" || !g.verdict || !a || !item) return g;
  return { ...combine(item, a, g.verdict), grader_model_version: g.grader_model_version, tokens: g.tokens };
});

const backup = `grades/${run.run_id}.${prev.grader.rubric_version ?? "rubric-v1"}.json`;
if (!existsSync(backup)) copyFileSync(outFile, backup);

const card = reportCard(grades, gold);
writeFileSync(
  outFile,
  JSON.stringify(
    {
      ...prev,
      grader: {
        ...prev.grader,
        ...(verdictView ? { grader_view_sha256: verdictView } : {}),
        rubric_version: RUBRIC_VERSION,
        rescored: {
          at: new Date().toISOString(),
          from_rubric: prev.grader.rubric_version ?? "rubric-v1",
          // Gemini verdicts belong to grader.gold_sha256; the code-decided checks used this copy.
          mechanical_gold_sha256: goldSha,
          backup,
        },
      },
      report_card: card,
      grades,
    },
    null,
    2
  )
);

const flipped = grades.filter((g) => before.get(g.question_id) !== g.overall);
console.log(`${run.run_id}: rescored ${grades.length} grades with ${RUBRIC_VERSION} (no API calls). Backup: ${backup}`);
console.log(`Correctness ${prev.report_card.answer_correctness.value}% → ${card.answer_correctness.value}% · calibration ${prev.report_card.confidence_calibration.value}% → ${card.confidence_calibration.value}%`);
for (const g of flipped) {
  console.log(`  ${g.question_id} [${g.trap_type}] ${before.get(g.question_id) ? "pass → fail" : "fail → pass"}: ${g.review_flag_check?.issues.join("; ") || g.mechanical_behavior.issues.join("; ")}`);
}
if (prev.report_card.grader_human_agreement) console.log("Grader–human agreement was cleared; re-run: npm run agreement -- --grades " + outFile);

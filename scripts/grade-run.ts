/**
 * Grade an agent run against the gold set and write the Report Card.
 *
 *   npm run grade -- --run runs/v1-gold-2026-11-03.json
 *
 * Writes grades/<run_id>.json and, if it doesn't exist yet, a blind 20-answer
 * sample for human grading: grades/<run_id>.human-sample.csv (PRD P0-6).
 * An existing sample is never overwritten, so human grades can't be lost.
 *
 *   npm run grade -- --run runs/<run_id>.json --retry-errors
 *
 * re-grades only the answers whose grade is `grader_error` in the existing
 * grades file and keeps every other verdict as it is.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { GoogleGenAI } from "@google/genai";
import { loadEnv } from "../src/kb/env.js";
import { GRADER_MODEL, HUMAN_SAMPLE_SIZE } from "../src/grade/config.js";
import { loadGold } from "../src/grade/gold.js";
import { gradeAnswer, type Grade } from "../src/grade/grade.js";
import { reportCard, type Rate } from "../src/grade/metrics.js";
import { graderPromptSha256, graderViewSha256, RUBRIC_VERSION } from "../src/grade/rubric.js";
import type { AnswerRecord } from "../src/schema.js";

loadEnv();

const { values } = parseArgs({
  options: {
    run: { type: "string" },
    gold: { type: "string", default: "eval/gold-set-v0.6.csv" },
    model: { type: "string" },
    concurrency: { type: "string", default: "2" },
    "retry-errors": { type: "boolean", default: false },
    /** Skip the human-grading sample (for small variance runs that aren't Report Card runs). */
    "no-sample": { type: "boolean", default: false },
  },
});
if (!values.run) throw new Error("Pass --run runs/<run_id>.json");
const model = values.model ?? GRADER_MODEL;
if (!model) throw new Error("No grader model pinned: set GRADER_MODEL in src/grade/config.ts or pass --model");
if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");

const run = JSON.parse(readFileSync(values.run, "utf8")) as {
  run_id: string;
  agent_version: string;
  config: Record<string, unknown>;
  answers: AnswerRecord[];
};
const { items: gold, sha256: goldSha } = loadGold(values.gold!);
const missing = run.answers.filter((a) => !gold.has(a.question_id)).map((a) => a.question_id);
if (missing.length) throw new Error(`Answers with no gold row: ${missing.join(", ")}`);

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const outFile = `grades/${run.run_id}.json`;

const grades: Grade[] = new Array(run.answers.length);
let todo = run.answers.map((_, i) => i);
if (values["retry-errors"]) {
  if (!existsSync(outFile)) throw new Error(`--retry-errors needs an existing ${outFile}`);
  const prev = JSON.parse(readFileSync(outFile, "utf8"));
  if (
    prev.grader.model !== model ||
    prev.grader.grader_prompt_sha256 !== graderPromptSha256 ||
    prev.grader.gold_sha256 !== goldSha ||
    (prev.grader.rubric_version ?? "rubric-v1") !== RUBRIC_VERSION
  ) {
    throw new Error("--retry-errors: grader model, prompt, rubric or gold file changed since the first pass; re-grade the whole run instead");
  }
  const byId = new Map<string, Grade>(prev.grades.map((g: Grade) => [g.question_id, g]));
  run.answers.forEach((a, i) => {
    const g = byId.get(a.question_id);
    if (g && g.status === "graded") grades[i] = g;
  });
  todo = todo.filter((i) => !grades[i]);
}
console.log(`Grading ${todo.length} of ${run.answers.length} answers from ${run.run_id} with ${model} (${RUBRIC_VERSION})\n`);

let next = 0;
await Promise.all(
  Array.from({ length: Number(values.concurrency) }, async () => {
    while (next < todo.length) {
      const i = todo[next++];
      const a = run.answers[i];
      grades[i] = await gradeAnswer(ai, model, gold.get(a.question_id)!, a);
      const g = grades[i];
      const failed = (Object.keys(g.checks) as (keyof Grade["checks"])[]).filter((k) => !g.checks[k]);
      console.log(
        `${g.question_id}  ${g.status === "grader_error" ? "ERROR" : g.overall ? "PASS " : "FAIL "} ${g.trap_type.padEnd(12)} ` +
          (g.status === "grader_error" ? g.error : failed.length ? `failed: ${failed.join(", ")}` : "")
      );
    }
  })
);

const card = reportCard(grades, gold);
const versions = [...new Set(grades.map((g) => g.grader_model_version).filter(Boolean))];
mkdirSync("grades", { recursive: true });
writeFileSync(
  outFile,
  JSON.stringify(
    {
      run_id: run.run_id,
      agent_version: run.agent_version,
      graded_at: new Date().toISOString(),
      grader: {
        model,
        model_versions_reported: versions,
        rubric_version: RUBRIC_VERSION,
        grader_prompt_sha256: graderPromptSha256,
        gold_file: values.gold,
        gold_sha256: goldSha,
        grader_view_sha256: graderViewSha256(gold),
      },
      agent_config: run.config,
      report_card: card,
      grades,
    },
    null,
    2
  )
);

// Blind human sample: no grader verdicts, seeded by run_id so it is reproducible.
const sampleFile = `grades/${run.run_id}.human-sample.csv`;
if (!values["no-sample"] && !existsSync(sampleFile)) {
  const seeded = run.answers
    .map((a) => ({ a, key: createHash("sha256").update(run.run_id + a.question_id).digest("hex") }))
    .sort((x, y) => x.key.localeCompare(y.key))
    .slice(0, HUMAN_SAMPLE_SIZE)
    .map((x) => x.a)
    .sort((x, y) => x.question_id.localeCompare(y.question_id));
  const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const header = [
    "question_id", "question", "expected_behavior", "gold_answer", "must_have_facts", "automatic_fail_or_wrong_if",
    "agent_answer", "agent_citations", "agent_flags",
    "human_correctness", "human_citation_support", "human_behavior", "human_safety", "human_overall", "human_notes",
  ];
  const rows = seeded.map((a) => {
    const g = gold.get(a.question_id)!;
    return [
      a.question_id, g.question, g.expected_behavior, g.gold_answer, g.must_have_facts, g.automatic_fail_or_wrong_if,
      a.answer || "(abstained)",
      a.citations.map((c) => `${c.source_id}${c.section ? " " + c.section : ""}: ${c.passage}`).join(" | "),
      `confidence=${a.confidence} needs_review=${a.needs_review} abstained=${a.abstained} conflict=${a.conflict_detected}`,
      "", "", "", "", "", "",
    ].map(esc).join(",");
  });
  writeFileSync(sampleFile, "﻿" + [header.join(","), ...rows].join("\r\n") + "\r\n");
  console.log(`\nWrote blind human-grading sample: ${sampleFile} (fill human_* columns with pass/fail)`);
}

const fmt = (r: Rate, unit = "%") => (r.value === null ? "n/a" : `${r.value}${unit} (${r.numerator}/${r.denominator})`);
console.log(`\n=== Report Card: ${run.run_id} · grader ${versions.join(", ") || model}`);
console.log(`Answer correctness       ${fmt(card.answer_correctness).padEnd(18)} target ${card.targets.answer_correctness}`);
console.log(`Citation precision       ${fmt(card.citation_precision).padEnd(18)} target ${card.targets.citation_precision}`);
console.log(`Unsupported-claim rate   ${fmt(card.unsupported_claim_rate).padEnd(18)} target ${card.targets.unsupported_claim_rate}`);
console.log(`Correct abstention       ${`${card.correct_abstention.numerator} of ${card.correct_abstention.denominator}`.padEnd(18)} target ${card.targets.correct_abstention}  (false abstentions: ${card.false_abstentions})`);
console.log(`Confidence calibration   ${fmt(card.confidence_calibration).padEnd(18)} target ${card.targets.confidence_calibration}`);
console.log(`Checks: ${Object.entries(card.checks).map(([k, r]) => `${k} ${fmt(r)}`).join(" · ")}`);
console.log(`By trap type: ${Object.entries(card.by_trap_type).map(([k, r]) => `${k} ${r.numerator}/${r.denominator}`).join(" · ")}`);
if (card.grader_errors) console.log(`Grader errors (excluded): ${card.grader_errors}`);
console.log(`\nWrote ${outFile}`);

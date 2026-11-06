/**
 * Grader–human agreement (PRD P0-6, target ≥ 85%).
 *
 *   npm run agreement -- --grades grades/<run_id>.json
 *
 * Reads grades/<run_id>.human-sample.csv (human_* columns filled with pass/fail),
 * compares with the Gemini grades, and records the result in the grades file.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { parseCsv } from "../src/kb/chunk.js";
import type { Grade } from "../src/grade/grade.js";

const { values } = parseArgs({ options: { grades: { type: "string" }, sample: { type: "string" } } });
if (!values.grades) throw new Error("Pass --grades grades/<run_id>.json");
const sampleFile = values.sample ?? values.grades.replace(/\.json$/, ".human-sample.csv");

const file = JSON.parse(readFileSync(values.grades, "utf8"));
const byId = new Map<string, Grade>(file.grades.map((g: Grade) => [g.question_id, g]));
const rows = parseCsv(readFileSync(sampleFile, "utf8").replace(/^﻿/, ""));

const toBool = (v: string): boolean | undefined =>
  /^(pass|p|true|yes|y|1)$/i.test(v.trim()) ? true : /^(fail|f|false|no|n|0)$/i.test(v.trim()) ? false : undefined;

const fields = [
  ["overall", "human_overall"],
  ["correctness", "human_correctness"],
  ["citation_support", "human_citation_support"],
  ["behavior", "human_behavior"],
  ["safety", "human_safety"],
] as const;

const result: Record<string, { agree: number; total: number; value: number | null }> = {};
const disagreements: string[] = [];
for (const [check, col] of fields) {
  let agree = 0;
  let total = 0;
  for (const r of rows) {
    const human = toBool(r[col] ?? "");
    const g = byId.get(r.question_id);
    if (human === undefined || !g || g.status !== "graded") continue;
    const grader = check === "overall" ? g.overall : g.checks[check];
    total++;
    if (human === grader) agree++;
    else if (check === "overall") disagreements.push(`${r.question_id}: human ${human ? "pass" : "fail"}, grader ${grader ? "pass" : "fail"}`);
  }
  result[check] = { agree, total, value: total ? Math.round((agree / total) * 1000) / 10 : null };
}

if (result.overall.total === 0) {
  console.log(`No human_overall grades found in ${sampleFile}. Fill the human_* columns with pass/fail first.`);
  process.exit(1);
}

file.report_card.grader_human_agreement = { ...result, sample_file: sampleFile, target: "≥ 85%", computed_at: new Date().toISOString() };
writeFileSync(values.grades, JSON.stringify(file, null, 2));

console.log(`Grader–human agreement (overall): ${result.overall.value}% (${result.overall.agree}/${result.overall.total}) · target ≥ 85%`);
for (const [check] of fields.slice(1)) {
  const r = result[check];
  if (r.total) console.log(`  ${check}: ${r.value}% (${r.agree}/${r.total})`);
}
if (disagreements.length) console.log(`Disagreements:\n  ${disagreements.join("\n  ")}`);
console.log(`Recorded in ${values.grades}`);

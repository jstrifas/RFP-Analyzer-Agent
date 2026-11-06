/**
 * Demo sample questions (server-only). From the gold set only question_id and
 * question text are read; gold answers never leave the grader side.
 */
import { readFileSync } from "node:fs";
import { parseCsv } from "../../src/kb/chunk.js";

export interface Sample {
  question_id: string;
  text: string;
  shows: string;
  source: "test set" | "new";
}

const ASK_SAMPLES: { id: string; shows: string }[] = [
  { id: "SMOKE-1", shows: "Straight answer" },
  { id: "Q-006", shows: "An outdated policy disagrees" },
  { id: "Q-001", shows: "Two current policies conflict" },
  { id: "Q-022", shows: "Question hides an instruction" },
  { id: "Q-050", shows: "Not in the documents" },
];

const QUESTIONNAIRE_SAMPLE = ["Q-001", "Q-006", "Q-012", "Q-018", "Q-022", "Q-031", "Q-036", "Q-050", "SMOKE-1", "SMOKE-2", "SMOKE-3"];

function allQuestions(): Map<string, { text: string; source: Sample["source"] }> {
  const out = new Map<string, { text: string; source: Sample["source"] }>();
  const gold = parseCsv(readFileSync("eval/gold-set-v0.6.csv", "utf8").replace(/^﻿/, ""));
  for (const r of gold) out.set(r.question_id, { text: r.question, source: "test set" });
  const smoke = JSON.parse(readFileSync("samples/smoke-questions.json", "utf8")) as { questions: { question_id: string; text: string }[] };
  for (const q of smoke.questions) out.set(q.question_id, { text: q.text, source: "new" });
  return out;
}

export function askSamples(): Sample[] {
  const all = allQuestions();
  return ASK_SAMPLES.flatMap(({ id, shows }) => {
    const q = all.get(id);
    return q ? [{ question_id: id, text: q.text, shows, source: q.source }] : [];
  });
}

export function questionnaireSample(): { question_id: string; text: string }[] {
  const all = allQuestions();
  return QUESTIONNAIRE_SAMPLE.flatMap((id) => {
    const q = all.get(id);
    return q ? [{ question_id: id, text: q.text }] : [];
  });
}

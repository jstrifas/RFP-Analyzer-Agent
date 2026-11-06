/**
 * Report Card data (server-only): reads runs/ and grades/ from disk.
 * Gold rows are shown to the human reader here; they are never sent to the agent.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import type { QuestionLog } from "../../src/agent/answer.js";
import { KB_CATALOG } from "../../src/kb/catalog.js";
import { loadGold, type GoldItem } from "../../src/grade/gold.js";
import type { Grade } from "../../src/grade/grade.js";
import type { Rate, ReportCard } from "../../src/grade/metrics.js";
import { graderViewSha256 } from "../../src/grade/rubric.js";
import type { AnswerRecord } from "../../src/schema.js";

export const GOLD_FILE = "eval/gold-set-v0.6.csv";

/**
 * Every graded version. `shown` picks the ones the demo Report Card displays (baseline and final, matching
 * the one-pager); hidden versions keep their runs and grades on disk but have no page.
 */
export const VERSIONS = [
  { id: "v1", label: "Baseline", shown: true, run: "v1-gold-2026-11-03", change: "General baseline: answer only from passages, cite them, abstain rather than guess." },
  { id: "v2", label: "v2", shown: false, run: "v2-gold-2026-11-03", change: "Prefer current, authoritative sources. Related context isn't a partial answer." },
  { id: "v3", label: "v3", shown: false, run: "v3-gold-2026-11-03", change: "Every specific detail needs a quote." },
  {
    id: "v4",
    label: "Final",
    shown: true,
    run: "v4-gold-2026-11-05",
    change: "After four prompt versions: current sources over outdated ones, a quote for every detail, a sharper abstain test, complete answers.",
  },
] as const;
export type VersionId = (typeof VERSIONS)[number]["id"];

export interface Agreement {
  overall: { agree: number; total: number; value: number | null };
}

export interface VersionData {
  id: VersionId;
  label: string;
  change: string;
  runId: string;
  card: ReportCard & { grader_human_agreement?: Agreement };
  grades: Grade[];
  answers: AnswerRecord[];
  logs: QuestionLog[];
  costUsd: number | null;
  graderModel: string;
  /** False when the version was graded against an earlier copy of the gold set. */
  gradedOnCurrentGold: boolean;
}

export function currentGold(): { items: Map<string, GoldItem>; sha256: string } {
  return loadGold(GOLD_FILE);
}

export function loadVersion(id: string): VersionData | null {
  const v = VERSIONS.find((x) => x.id === id);
  if (!v || !v.shown) return null;
  const gradesFile = `grades/${v.run}.json`;
  const runFile = `runs/${v.run}.json`;
  if (!existsSync(gradesFile) || !existsSync(runFile)) return null;
  const g = JSON.parse(readFileSync(gradesFile, "utf8"));
  const r = JSON.parse(readFileSync(runFile, "utf8"));
  return {
    id: v.id,
    label: v.label,
    change: v.change,
    runId: v.run,
    card: g.report_card,
    grades: g.grades,
    answers: r.answers,
    logs: r.logs,
    costUsd: r.totals?.cost_usd ?? null,
    graderModel: (g.grader.model_versions_reported?.[0] as string) ?? g.grader.model,
    // Current if the gold file is unchanged, or if only fields Gemini doesn't see changed (then a rescore suffices).
    gradedOnCurrentGold:
      g.grader.gold_sha256 === currentGold().sha256 || g.grader.grader_view_sha256 === graderViewSha256(currentGold().items),
  };
}

let titles: Record<string, string> | undefined;

/** Document titles by source_id, for labelling citations from past runs (kb/ is the agent's own corpus, not eval data). */
export function docTitles(): Record<string, string> {
  if (titles) return titles;
  const out: Record<string, string> = {};
  for (const f of readdirSync("kb")) {
    const id = f.match(/^(KB-\d{2})-/)?.[1];
    if (!id) continue;
    const fromCatalog = KB_CATALOG[id]?.title;
    const fromFile = f.endsWith(".md") ? readFileSync(`kb/${f}`, "utf8").match(/^# (.+)$/m)?.[1]?.trim() : undefined;
    out[id] = fromCatalog ?? fromFile ?? id;
  }
  return (titles = out);
}

export function loadAll(): VersionData[] {
  return VERSIONS.map((v) => loadVersion(v.id)).filter((x): x is VersionData => x !== null);
}

export const TRAP_GROUPS: { label: string; what: string; match: (t: string) => boolean }[] = [
  { label: "Superseded documents", what: "An older version of a policy says something different", match: (t) => t.startsWith("T1") },
  { label: "Contradictions", what: "Two current documents disagree", match: (t) => t === "T2" },
  { label: "Terminology drift", what: "The question uses different words than the documents", match: (t) => t === "T4" },
  { label: "Injection", what: "Instructions hidden in a question or document", match: (t) => t === "T5" },
  { label: "Plan-tier qualifiers", what: "True only on some plans", match: (t) => t === "T6" },
  { label: "Non-authoritative source", what: "A chat export, not a policy", match: (t) => t === "T7" },
  { label: "Planned gaps", what: "Not in the documents: should abstain", match: (t) => t.startsWith("Gap") },
  { label: "Clean controls", what: "No trap", match: (t) => t === "none" },
];

export const trapLabel = (t: string) => TRAP_GROUPS.find((g) => g.match(t))?.label ?? t;

export function groupRate(grades: Grade[], match: (t: string) => boolean): Rate {
  const inGroup = grades.filter((g) => g.status === "graded" && match(g.trap_type));
  const pass = inGroup.filter((g) => g.overall).length;
  return { value: inGroup.length ? Math.round((pass / inGroup.length) * 1000) / 10 : null, numerator: pass, denominator: inGroup.length };
}

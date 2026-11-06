import Link from "next/link";
import type { Rate } from "../../src/grade/metrics.js";
import { ArrowRightIcon } from "../_components/Icons";
import { groupRate, loadAll, TRAP_GROUPS, type VersionData } from "../_lib/report";

export const dynamic = "force-dynamic";

type Row = {
  label: string;
  sub?: string;
  target: string;
  /** Where the target sits on a 0–100 bar; omitted for lower-is-better rows, which show no bar. */
  tick?: number;
  meets: (r: Rate) => boolean;
  get: (v: VersionData) => Rate | null;
  format?: (r: Rate) => string;
  share?: (r: Rate) => number;
};

const pct = (r: Rate) => (r.value === null ? "n/a" : `${r.value}%`);

const ROWS: Row[] = [
  { label: "Answer correctness", sub: "Passes all five rubric checks", target: "≥ 85%", tick: 85, meets: (r) => (r.value ?? 0) >= 85, get: (v) => v.card.answer_correctness },
  { label: "Citation precision", sub: "Citations that support their claim", target: "≥ 95%", tick: 95, meets: (r) => (r.value ?? 0) >= 95, get: (v) => v.card.citation_precision },
  { label: "Unsupported-claim rate", sub: "Answers with a claim no quote covers", target: "≤ 3%", meets: (r) => (r.value ?? 100) <= 3, get: (v) => v.card.unsupported_claim_rate },
  {
    label: "Correct abstention",
    sub: "Unanswerable questions sent to a human",
    target: "≥ 10 of 11",
    tick: (10 / 11) * 100,
    meets: (r) => r.numerator >= 10,
    get: (v) => v.card.correct_abstention,
    format: (r) => `${r.numerator} of ${r.denominator}`,
    share: (r) => (r.numerator / Math.max(r.denominator, 1)) * 100,
  },
  { label: "Confidence calibration", sub: "High-confidence answers that pass", target: "≥ 95%", tick: 95, meets: (r) => (r.value ?? 0) >= 95, get: (v) => v.card.confidence_calibration },
  {
    label: "Grader–human agreement",
    sub: "Same overall verdict on 20 hand-graded answers",
    target: "≥ 85%",
    tick: 85,
    meets: (r) => (r.value ?? 0) >= 85,
    get: (v) => {
      const a = v.card.grader_human_agreement?.overall;
      return a ? { value: a.value, numerator: a.agree, denominator: a.total } : null;
    },
    format: (r) => `${r.value}% (${r.numerator}/${r.denominator})`,
  },
];

function Cell({ row, rate }: { row: Row; rate: Rate | null }) {
  if (!rate) {
    return (
      <td className="score-cell">
        <span className="na">not measured</span>
      </td>
    );
  }
  const ok = row.meets(rate);
  const share = row.share ? row.share(rate) : rate.value ?? 0;
  return (
    <td className={`score-cell ${ok ? "meets" : "misses"}`}>
      {row.format ? row.format(rate) : pct(rate)}
      <span className="visually-hidden">{ok ? ", meets target" : ", misses target"}</span>
      {row.tick !== undefined && (
        <span className="bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, share)}%` }} />
          <i style={{ left: `calc(${row.tick}% - 1px)` }} />
        </span>
      )}
    </td>
  );
}

function Cols({ count }: { count: number }) {
  return (
    <colgroup>
      <col className="c-metric" />
      <col className="c-target" />
      {Array.from({ length: count }, (_, i) => (
        <col key={i} />
      ))}
    </colgroup>
  );
}

export default function ReportPage() {
  const versions = loadAll();
  if (!versions.length) {
    return (
      <>
        <h1>Report Card</h1>
        <p className="lede">
          No graded runs yet. Run the agent on the gold set with <span className="mono">npm run agent</span>, grade it with{" "}
          <span className="mono">npm run grade</span>, and the results appear here.
        </p>
      </>
    );
  }
  const first = versions[0];
  const last = versions.at(-1)!;
  const gain = (last.card.answer_correctness.value ?? 0) - (first.card.answer_correctness.value ?? 0);
  const reviewFlags = (v: VersionData) => v.answers.filter((a) => a.needs_review).length;
  const p50Seconds = (() => {
    const lat = last.logs.map((l) => l.latency_ms).sort((a, b) => a - b);
    return lat.length ? Math.round(lat[Math.floor(lat.length / 2)] / 1000) : null;
  })();

  return (
    <>
      <h1>
        Correctness went from {first.card.answer_correctness.value}% to {last.card.answer_correctness.value}% in four prompt versions
      </h1>
      <p className="lede">
        Every version answered the same 50-question gold set: 39 answerable questions with planted traps, and 11 that should be
        abstained on. Each answer was graded by {last.graderModel}, a different model family from the agent, on five checks:
        correctness, citation support, behavior, safety, and review flags. Each prompt change was made only after the previous
        Report Card showed a failure.
      </p>

      <ol className="versions" aria-label="Baseline and final versions" style={{ gridTemplateColumns: `repeat(${versions.length}, minmax(0, 1fr))` }}>
        {versions.map((v, i) => {
          const c = v.card.answer_correctness;
          return (
            <li key={v.id} style={{ position: "relative" }}>
              <Link href={`/report/${v.id}`} className="version">
                <span className="version-top">
                  <span className="version-id">
                    {v.label} <span className="mono muted small">({v.id})</span>
                  </span>
                  <span className={`version-score ${(c.value ?? 0) >= 85 ? "meets" : "misses"}`}>
                    {c.value}%<span className="visually-hidden"> correct</span>
                  </span>
                </span>
                <p className="version-change">{v.change}</p>
              </Link>
              {i < versions.length - 1 && (
                <span className="version-arrow" aria-hidden="true">
                  <ArrowRightIcon size={18} />
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <section className="sheet" aria-labelledby="metrics-h">
        <div className="sheet-head">
          <div>
            <h2 id="metrics-h">Results against the PRD&apos;s targets: baseline vs. final</h2>
            <p className="section-note">All runs on the 50-question tuning set. Green meets the target. Select a version above to see every graded answer.</p>
          </div>
          <span className="legend">
            <span>
              <i />
              target
            </span>
          </span>
        </div>
        <div className="table-wrap">
          <table className="matrix">
            <Cols count={versions.length} />
            <thead>
              <tr>
                <th scope="col">Metric</th>
                <th scope="col">Target</th>
                {versions.map((v) => (
                  <th scope="col" key={v.id}>
                    <Link href={`/report/${v.id}`}>
                      {v.label} ({v.id})
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row">
                    {row.label}
                    {row.sub && <span className="row-sub">{row.sub}</span>}
                  </th>
                  <td className="target">{row.target}</td>
                  {versions.map((v) => (
                    <Cell key={v.id} row={row} rate={row.get(v)} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="lede small" style={{ marginTop: 14 }}>
          <b>
            {gain >= 0 ? "+" : ""}
            {gain} points
          </b>{" "}
          on correctness against a +15 target, measured on the tuning set. Four prompt versions; each rule was added only after the
          Report Card measured a failure. Answers flagged for human review fell from {reviewFlags(first)} to {reviewFlags(last)}.
          {p50Seconds !== null && last.costUsd !== null && (
            <>
              {" "}
              About {p50Seconds} seconds per question and ${Math.round(last.costUsd)} per 50-question run.
            </>
          )}
        </p>
      </section>

      <section className="sheet" aria-labelledby="traps-h">
        <div className="sheet-head">
          <div>
            <h2 id="traps-h">Where each version passed, by trap type</h2>
            <p className="section-note">Questions passing all five rubric checks</p>
          </div>
        </div>
        <div className="table-wrap">
          <table className="matrix">
            <Cols count={versions.length} />
            <thead>
              <tr>
                <th scope="col">Trap</th>
                <th scope="col">Questions</th>
                {versions.map((v) => (
                  <th scope="col" key={v.id}>
                    {v.label} ({v.id})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRAP_GROUPS.map((g) => {
                const total = groupRate(last.grades, g.match).denominator;
                return (
                  <tr key={g.label}>
                    <th scope="row">
                      {g.label}
                      <span className="row-sub">{g.what}</span>
                    </th>
                    <td className="target">{total}</td>
                    {versions.map((v) => {
                      const r = groupRate(v.grades, g.match);
                      const full = r.denominator > 0 && r.numerator === r.denominator;
                      const weak = r.numerator / Math.max(r.denominator, 1) < 0.5;
                      return (
                        <td key={v.id} className={`score-cell ${full ? "meets" : weak ? "misses" : ""}`}>
                          {r.numerator}/{r.denominator}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sheet" aria-labelledby="limits-h">
        <h2 id="limits-h">Honest limits</h2>
        <ul className="caveats">
          <li>Prompts were revised against these 50 questions, so the final score is optimistic. A held-out set is next.</li>
          <li>Re-grading the same answers moved one verdict: a fair range for the final version is 98–100%.</li>
          <li>
            Knowledge base generated with Claude; gold answers drafted by human and corrected by me; graded by Gemini. No model
            grades its own output. All data is fictional.
          </li>
        </ul>
      </section>
    </>
  );
}

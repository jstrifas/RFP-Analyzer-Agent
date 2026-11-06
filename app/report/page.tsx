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
  const stale = versions.filter((v) => !v.gradedOnCurrentGold).map((v) => v.id);
  const agreement = versions.reduce(
    (acc, v) => {
      const a = v.card.grader_human_agreement?.overall;
      if (!a) return acc;
      return { agree: acc.agree + a.agree, total: acc.total + a.total, versions: [...acc.versions, v.id] };
    },
    { agree: 0, total: 0, versions: [] as string[] }
  );

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

      <ol className="versions" aria-label="Prompt versions, in order">
        {versions.map((v, i) => {
          const c = v.card.answer_correctness;
          return (
            <li key={v.id} style={{ position: "relative" }}>
              <Link href={`/report/${v.id}`} className="version">
                <span className="version-top">
                  <span className="version-id">{v.id}</span>
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
            <h2 id="metrics-h">Metrics against the PRD targets</h2>
            <p className="section-note">Green meets the target. Select a version above to see every graded answer.</p>
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
                    <Link href={`/report/${v.id}`}>{v.id}</Link>
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
              <tr>
                <th scope="row">
                  Answers sent for human review
                  <span className="row-sub">Fewer is better, if the right ones are sent</span>
                </th>
                <td className="target">reported</td>
                {versions.map((v) => (
                  <td key={v.id} className="score-cell">
                    {v.answers.filter((a) => a.needs_review).length} of {v.answers.length}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">
                  Cost per 50-question run
                </th>
                <td className="target">reported</td>
                {versions.map((v) => (
                  <td key={v.id} className="score-cell">
                    {v.costUsd === null ? "?" : `$${v.costUsd.toFixed(2)}`}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
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
                    {v.id}
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

      <section className="sheet" aria-labelledby="care-h">
        <h2 id="care-h">Read these numbers with care</h2>
        <ul className="caveats">
          <li>
            Versions 2 to 4 were diagnosed and tuned on these same 50 questions, and there is no held-out set yet, so the latest
            score is optimistic.
          </li>
          <li>
            Grading the same v4 answers twice changed one verdict (a borderline citation), so a fair range for v4&apos;s
            correctness is 98–100%. Repeat runs of v2 and v3 showed a few points of run-to-run variation.
          </li>
          {agreement.total > 0 && (
            <li>
              A human graded {agreement.total} answers across {agreement.versions.join(", ")} and agreed with the grader&apos;s overall
              verdict on {agreement.agree === agreement.total ? `all ${agreement.total}` : agreement.agree}. That is with the fifth
              check (review flags), which was added after the grader passed an over-cautious answer the human had failed.
            </li>
          )}
          {stale.length > 0 && (
            <li>
              Gemini graded {stale.join(", ")} before the Q-036 gold-set edit (Nov 5), so a Q-036 answer missing the now-optional
              fact counted as a failure there. Later edits that only affect code-decided checks (such as Q-022&apos;s review flag)
              are applied to every version by rescoring.
            </li>
          )}
        </ul>
      </section>
    </>
  );
}

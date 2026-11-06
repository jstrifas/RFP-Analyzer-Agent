import Link from "next/link";
import { notFound } from "next/navigation";
import { AnswerCard } from "../../../_components/AnswerCard";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CrossIcon } from "../../../_components/Icons";
import { currentGold, docTitles, loadVersion, trapLabel } from "../../../_lib/report";

export const dynamic = "force-dynamic";

const CHECK_NAMES: Record<string, string> = {
  correctness: "Correctness",
  citation_support: "Citation support",
  behavior: "Behavior",
  safety: "Safety",
  review_flags: "Review flags",
};

export default async function GradedAnswerPage({ params }: { params: Promise<{ version: string; qid: string }> }) {
  const { version, qid } = await params;
  const v = loadVersion(version);
  const grade = v?.grades.find((g) => g.question_id === qid);
  const record = v?.answers.find((a) => a.question_id === qid);
  if (!v || !grade || !record) notFound();
  const log = v.logs.find((l) => l.question_id === qid);
  const gold = currentGold().items.get(qid);
  const verdict = grade.verdict;

  // Same order as the version list: failures first, then by ID.
  const order = [...v.grades]
    .sort((a, b) => Number(a.overall) - Number(b.overall) || a.question_id.localeCompare(b.question_id))
    .map((g) => g.question_id);
  const at = order.indexOf(qid);
  const prev = order[at - 1];
  const next = order[at + 1];

  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="crumbs">
          <li>
            <Link href="/report">Report Card</Link>
          </li>
          <li>
            <Link href={`/report/${v.id}`}>{v.id}</Link>
          </li>
          <li aria-current="page" className="mono">
            {qid}
          </li>
        </ol>
      </nav>
      <h1>{gold?.question}</h1>
      <p className="lede">
        <span className={`pill ${grade.overall ? "pill-pass" : "pill-fail"}`}>{grade.overall ? "Passed" : "Failed"}</span>{" "}
        {trapLabel(grade.trap_type)} · expected behavior <span className="mono">{grade.expected_behavior}</span>
      </p>

      <div className="two-col">
        <section className="sheet" aria-labelledby="answer-h">
          <h2 id="answer-h" style={{ marginBottom: 14 }}>
            What the agent answered
          </h2>
          <AnswerCard record={record} log={log} titles={docTitles()} />
        </section>

        <div>
          <section className="sheet" aria-labelledby="verdict-h">
            <div className="panel-head">
              <h2 id="verdict-h">Grader verdict</h2>
              <span className="small muted">{v.graderModel}</span>
            </div>
            <ul className="checks">
              {Object.entries(grade.checks).map(([k, ok]) => (
                <li className="check" key={k}>
                  <span>{CHECK_NAMES[k] ?? k}</span>
                  <span className={`pill ${ok ? "pill-pass" : "pill-fail"}`}>
                    {ok ? <CheckIcon size={12} /> : <CrossIcon size={12} />}
                    {ok ? "pass" : "fail"}
                  </span>
                </li>
              ))}
            </ul>
            {verdict && (
              <>
                <p className="verdict-text">{verdict.rationale}</p>
                {verdict.must_have_facts.length > 0 && (
                  <>
                    <h3 style={{ marginTop: 16 }}>Must-have facts</h3>
                    <ul className="facts">
                      {verdict.must_have_facts.map((m, i) => (
                        <li key={i}>
                          {m.present ? <CheckIcon className="yes" label="present" /> : <CrossIcon className="no" label="missing" />}
                          <span>{m.fact}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {verdict.unsupported_claims.length > 0 && (
                  <>
                    <h3 style={{ marginTop: 16 }}>Claims no citation supports</h3>
                    <ul className="caveats">
                      {verdict.unsupported_claims.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </>
                )}
                {grade.mechanical_behavior.issues.length > 0 && (
                  <p className="small" style={{ marginTop: 14 }}>
                    <b>Rule check:</b> {grade.mechanical_behavior.issues.join("; ")}
                  </p>
                )}
                {grade.review_flag_check && !grade.review_flag_check.pass && (
                  <p className="small" style={{ marginTop: 8 }}>
                    <b>Review flags:</b> {grade.review_flag_check.issues.join("; ")}
                  </p>
                )}
                {verdict.safety_triggered && (
                  <p className="small" style={{ marginTop: 8 }}>
                    <b>Safety:</b> {verdict.safety_note}
                  </p>
                )}
              </>
            )}
          </section>

          {gold && (
            <section className="sheet" aria-labelledby="gold-h">
              <h2 id="gold-h">Gold answer</h2>
              <p className="section-note">Written by a human. The agent never sees it.</p>
              <dl className="kv">
                <dt>Answer</dt>
                <dd>{gold.gold_answer}</dd>
                <dt>Must-have facts</dt>
                <dd>{gold.must_have_facts}</dd>
                {gold.optional_supporting_details && (
                  <>
                    <dt>Optional</dt>
                    <dd>{gold.optional_supporting_details}</dd>
                  </>
                )}
                {gold.automatic_fail_or_wrong_if && (
                  <>
                    <dt>Fails if</dt>
                    <dd>{gold.automatic_fail_or_wrong_if}</dd>
                  </>
                )}
                {gold.grading_notes && (
                  <>
                    <dt>Grading notes</dt>
                    <dd>{gold.grading_notes}</dd>
                  </>
                )}
                <dt>Sources</dt>
                <dd className="mono">{gold.verified_sources || "none"}</dd>
              </dl>
              {!v.gradedOnCurrentGold && qid === "Q-036" && (
                <p className="small muted" style={{ marginTop: 12 }}>
                  This version was graded before the Nov 5 edit to this row, which made &quot;work must be done on Tidewell-issued
                  laptops&quot; optional. The row above is the current one.
                </p>
              )}
            </section>
          )}
        </div>
      </div>

      <nav className="pager" aria-label="Other answers in this version">
        {prev ? (
          <Link href={`/report/${v.id}/${prev}`}>
            <ArrowLeftIcon /> <span className="mono">{prev}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/report/${v.id}/${next}`}>
            <span className="mono">{next}</span> <ArrowRightIcon />
          </Link>
        )}
      </nav>
    </>
  );
}

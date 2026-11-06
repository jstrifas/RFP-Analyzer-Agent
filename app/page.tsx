import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "./_components/Icons";
import { humanAgreementTotal, loadAll } from "./_lib/report";

export const dynamic = "force-dynamic";

const REPO = "https://github.com/jstrifas/RFP-Analyzer-Agent";

/** Landing page: what Cited is, who it's for, the problem, and the proof, before anyone enters the app. */
export default function LandingPage() {
  const versions = loadAll();
  const base = versions[0];
  const final = versions.at(-1);
  const proof =
    base && final && base !== final
      ? [
          { label: "Answers that pass every check", from: `${base.card.answer_correctness.value}%`, to: `${final.card.answer_correctness.value}%` },
          { label: "Answers with a claim no quote covers", from: `${base.card.unsupported_claim_rate.value}%`, to: `${final.card.unsupported_claim_rate.value}%` },
          {
            label: "Unanswerable questions correctly refused",
            from: `${base.card.correct_abstention.numerator} of ${base.card.correct_abstention.denominator}`,
            to: `${final.card.correct_abstention.numerator} of ${final.card.correct_abstention.denominator}`,
          },
          {
            label: "Answers sent to a human for review",
            from: `${base.answers.filter((a) => a.needs_review).length}`,
            to: `${final.answers.filter((a) => a.needs_review).length}`,
          },
        ]
      : [];
  const agreement = humanAgreementTotal();

  return (
    <>
      <section className="hero" aria-labelledby="hero-h">
        <div className="hero-copy">
          <h1 id="hero-h" className="hero-title">
            Security questionnaire answers you can <span className="hero-mark">prove</span>.
          </h1>
          <p className="hero-lede">
            Cited drafts each answer from the vendor&apos;s own policy documents, highlights the exact words behind every claim, and
            says &quot;not in our documents&quot; instead of guessing. A Report Card measures whether those answers can be trusted.
          </p>
          <div className="cta-row">
            <Link href="/ask" className="btn btn-lg">
              Begin <ArrowRightIcon />
            </Link>
            <Link href="/report" className="btn btn-quiet btn-lg">
              See the Report Card
            </Link>
          </div>
          <p className="hint">A working demo on a fictional vendor, Tidewell Data, and its 32 policy documents.</p>
        </div>

        <figure className="hero-example" aria-label="Example answer from the agent">
          <div className="sheet">
            <span className="status status-ok">Ready to send</span>
            <p className="answer-q">Is customer data encrypted at rest, and with what algorithm?</p>
            <p className="hero-answer">
              Yes. All Restricted and Confidential data at rest is encrypted using AES-256 or an equivalent-strength algorithm
              approved by Security Engineering, and keys are managed through AWS KMS.
            </p>
            <div className="signals signals-ok" role="group" aria-label="Review flags: no review needed">
              <span className="signals-verdict">
                <CheckIcon size={15} />
                No review needed
              </span>
              <ul className="signals-list">
                <li className="signal signal-ok">
                  <CheckIcon size={12} />
                  confidence: <b>high</b>
                </li>
                <li className="signal signal-ok">
                  <CheckIcon size={12} />
                  needs_review: <b>false</b>
                </li>
              </ul>
            </div>
            <ol className="cites reveal" aria-label="Citations">
              <li className="cite">
                <div className="cite-source">
                  <span className="docid">KB-07</span>
                  <span>Encryption Standard</span>
                  <span>› 3. Encryption at Rest</span>
                </div>
                <p className="cite-quote">
                  <mark>All Restricted and Confidential data at rest must be encrypted using AES-256</mark> or an equivalent-strength
                  algorithm approved by Security Engineering.
                </p>
              </li>
              <li className="cite">
                <div className="cite-source">
                  <span className="docid">KB-07</span>
                  <span>Encryption Standard</span>
                  <span>› 5. Key Management</span>
                </div>
                <p className="cite-quote">
                  <mark>Encryption keys for data at rest are managed through AWS Key Management Service (KMS).</mark>
                </p>
              </li>
            </ol>
          </div>
          <figcaption className="hint">An answer from the agent. Every highlighted quote comes straight from the source document.</figcaption>
        </figure>
      </section>

      <section className="band" aria-labelledby="problem-h">
        <h2 id="problem-h">The problem</h2>
        <div className="band-grid">
          <p className="band-lede">
            Before an enterprise buys software, its security team sends the vendor a questionnaire. AI can now draft the answers in
            minutes. The hard part has moved from <i>writing</i> answers to <i>trusting</i> them.
          </p>
          <ul className="facts-list">
            <li>
              <b>100–300 questions</b> per questionnaire, often on a deal&apos;s critical path.
            </li>
            <li>
              <b>Days of work</b> pulled from sales engineers and security staff.
            </li>
            <li>
              <b>One wrong answer</b> is a legal and trust risk, so teams can&apos;t accept AI drafts blindly.
            </li>
            <li>
              <b>Most AI tools sell speed.</b> Few show evidence that their answers are right.
            </li>
          </ul>
        </div>
      </section>

      <section className="band" aria-labelledby="who-h">
        <h2 id="who-h">Who it&apos;s for</h2>
        <div className="two-col">
          <div>
            <h3>Proposal and sales-engineering managers</h3>
            <p className="muted">
              Return a complete, accurate questionnaire without stalling the deal. Cited drafts every answer with its sources and
              flags the ones that need you, so review time goes where it matters.
            </p>
          </div>
          <div>
            <h3>AI platform owners and reviewers</h3>
            <p className="muted">
              Decide whether an agent is reliable enough to trust, and catch regressions when prompts or models change. The Report
              Card scores every version against a fixed test set.
            </p>
          </div>
        </div>
      </section>

      <section className="band" aria-labelledby="how-h">
        <h2 id="how-h">How it works</h2>
        <ol className="steps">
          <li>
            <span className="step-n">1</span>
            <h3>Ask one question, or upload a questionnaire</h3>
            <p className="muted">Paste questions or a CSV. Each question is answered on its own.</p>
          </li>
          <li>
            <span className="step-n">2</span>
            <h3>Cited searches the vendor&apos;s documents</h3>
            <p className="muted">
              It answers only from what it finds, quotes the passages that back each claim, and refuses when the documents don&apos;t
              say.
            </p>
          </li>
          <li>
            <span className="step-n">3</span>
            <h3>You review what&apos;s flagged</h3>
            <p className="muted">
              Each answer carries a confidence level and a review flag. Conflicting sources and unanswerable questions go to a
              human.
            </p>
          </li>
        </ol>
      </section>

      {proof.length > 0 && (
        <section className="band" aria-labelledby="proof-h">
          <h2 id="proof-h">Proof, not promises</h2>
          <p className="band-lede">
            Every version of the agent answered the same 50-question test set: 39 answerable questions with planted traps, like
            outdated policies and hidden instructions, and 11 it should refuse. A different model family grades each answer
            {agreement.total > 0 ? `, and that grader agreed with human grading on ${agreement.agree} of ${agreement.total} answers` : ""}.
          </p>
          <table className="proof">
            <thead>
              <tr>
                <th scope="col">On the 50-question test set</th>
                <th scope="col">Baseline</th>
                <th scope="col">Final</th>
              </tr>
            </thead>
            <tbody>
              {proof.map((p) => (
                <tr key={p.label}>
                  <th scope="row">{p.label}</th>
                  <td>{p.from}</td>
                  <td className="proof-final">{p.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint" style={{ marginTop: 10 }}>
            Measured on the set the prompts were tuned against, so the final score is optimistic.{" "}
            <Link href="/report">See the full Report Card</Link>
          </p>
        </section>
      )}

      <section className="band" aria-labelledby="try-h">
        <h2 id="try-h">What you can try</h2>
        <ul className="try-list">
          <li>
            <Link href="/ask">
              <b>Ask</b>
              <span className="muted">Ask one question and watch the agent search, cite and decide, live.</span>
              <ArrowRightIcon />
            </Link>
          </li>
          <li>
            <Link href="/questionnaire">
              <b>Questionnaire</b>
              <span className="muted">Answer a whole questionnaire at once, then review the flagged answers.</span>
              <ArrowRightIcon />
            </Link>
          </li>
          <li>
            <Link href="/report">
              <b>Report Card</b>
              <span className="muted">Every graded answer, the grader&apos;s reasoning, and the human-written gold answer.</span>
              <ArrowRightIcon />
            </Link>
          </li>
        </ul>
      </section>

      <section className="closing" aria-labelledby="close-h">
        <h2 id="close-h">See it answer a question</h2>
        <Link href="/ask" className="btn btn-lg">
          Begin <ArrowRightIcon />
        </Link>
      </section>

      <p className="fineprint">
        Tidewell Data, its documents and the buyer scenario are fictional. Built by John Strifas as a portfolio project.{" "}
        <a href={REPO}>Source on GitHub</a>
      </p>
    </>
  );
}

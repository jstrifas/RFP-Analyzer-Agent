import Link from "next/link";
import { notFound } from "next/navigation";
import { currentGold, loadVersion, trapLabel } from "../../_lib/report";

export const dynamic = "force-dynamic";

const CHECK_LABELS: Record<string, string> = {
  correctness: "correctness",
  citation_support: "citation support",
  behavior: "behavior",
  safety: "safety",
  review_flags: "review flags",
};

export default async function VersionPage({ params }: { params: Promise<{ version: string }> }) {
  const { version } = await params;
  const v = loadVersion(version);
  if (!v) notFound();
  const gold = currentGold().items;
  const failed = v.grades.filter((g) => !g.overall).length;
  const rows = [...v.grades].sort((a, b) => Number(a.overall) - Number(b.overall) || a.question_id.localeCompare(b.question_id));

  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol className="crumbs">
          <li>
            <Link href="/report">Report Card</Link>
          </li>
          <li aria-current="page">{v.id}</li>
        </ol>
      </nav>
      <h1>
        {v.label} ({v.id}): {v.card.answer_correctness.numerator} of {v.card.answer_correctness.denominator} answers passed
      </h1>
      <p className="lede">
        {v.change} Graded by {v.graderModel}
        {failed > 0 ? `. The ${failed} that failed are listed first.` : "."}
      </p>

      <section className="sheet" style={{ marginTop: 24 }} aria-label={`Graded answers for ${v.id}`}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Result</th>
                <th scope="col">Question</th>
                <th scope="col">Trap</th>
                <th scope="col">Failed checks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => {
                const failedChecks = Object.entries(g.checks).filter(([, ok]) => ok === false).map(([k]) => CHECK_LABELS[k] ?? k);
                const href = `/report/${v.id}/${g.question_id}`;
                return (
                  <tr key={g.question_id}>
                    <td className="id mono">
                      <Link href={href}>{g.question_id}</Link>
                    </td>
                    <td>
                      <span className={`pill ${g.overall ? "pill-pass" : "pill-fail"}`}>{g.overall ? "pass" : "fail"}</span>
                    </td>
                    <td>
                      <Link href={href} className="row-link">
                        {gold.get(g.question_id)?.question}
                      </Link>
                    </td>
                    <td className="small muted">{trapLabel(g.trap_type)}</td>
                    <td>
                      {failedChecks.length ? (
                        <span className="chips">
                          {failedChecks.map((c) => (
                            <span key={c} className="chip">
                              {c}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="small muted">none</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

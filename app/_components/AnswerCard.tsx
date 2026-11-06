import type { QuestionLog } from "../../src/agent/answer.js";
import type { AnswerRecord, Passage } from "../../src/schema.js";
import { displayText } from "../_lib/highlight";
import { AlertIcon, CheckIcon } from "./Icons";

export type Tone = "ok" | "review" | "stop";

type FlagTone = Tone | "off";
const RANK: Record<FlagTone, number> = { off: 0, ok: 1, review: 2, stop: 3 };

/**
 * Each contract flag, colored by what it asks of the reviewer. Color is never the only cue: icon and text carry it too.
 * Red is reserved for abstention (no answer to send); low confidence also accompanies every conflict and partial
 * answer, which need a check, not a new answer, so it is amber.
 */
function reviewFlags(r: AnswerRecord): { name: string; value: string; tone: FlagTone }[] {
  return [
    { name: "confidence", value: r.confidence, tone: r.confidence === "high" ? "ok" : "review" },
    { name: "needs_review", value: String(r.needs_review), tone: r.needs_review ? "review" : "ok" },
    { name: "abstained", value: String(r.abstained), tone: r.abstained ? "stop" : "off" },
    { name: "conflict_detected", value: String(r.conflict_detected), tone: r.conflict_detected ? "review" : "off" },
  ];
}

const BAND_TEXT: Record<Tone, string> = {
  ok: "No review needed",
  review: "Check this before it's sent",
  stop: "A human must answer this",
};

function ReviewFlags({ record }: { record: AnswerRecord }) {
  const flags = reviewFlags(record);
  const worst = flags.reduce<FlagTone>((w, f) => (RANK[f.tone] > RANK[w] ? f.tone : w), "off");
  const tone: Tone = worst === "off" ? "ok" : worst;
  return (
    <div className={`signals signals-${tone}`} role="group" aria-label={`Review flags: ${BAND_TEXT[tone]}`}>
      <span className="signals-verdict">
        {tone === "ok" ? <CheckIcon size={15} /> : <AlertIcon size={15} />}
        {BAND_TEXT[tone]}
      </span>
      <ul className="signals-list">
        {flags.map((f) => (
          <li key={f.name} className={`signal signal-${f.tone}`}>
            {f.tone === "ok" && <CheckIcon size={12} />}
            {(f.tone === "review" || f.tone === "stop") && <AlertIcon size={12} />}
            {f.name}: <b>{f.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function statusOf(record: AnswerRecord, log?: Pick<QuestionLog, "outcome" | "fallback_reason">): { label: string; tone: Tone } {
  if (log?.outcome === "fallback") return { label: `System fallback (${log.fallback_reason ?? "error"}): needs a human`, tone: "stop" };
  if (record.abstained) return { label: "Not in our documents: needs a human", tone: "stop" };
  if (record.conflict_detected) return { label: "Sources disagree: needs review", tone: "review" };
  if (record.needs_review) return { label: "Needs review", tone: "review" };
  return { label: "Ready to send", tone: "ok" };
}

export function Status({ record, log }: { record: AnswerRecord; log?: Pick<QuestionLog, "outcome" | "fallback_reason"> }) {
  const s = statusOf(record, log);
  return <span className={`status status-${s.tone}`}>{s.label}</span>;
}

/** Placeholder with the answer card's shape while the agent works. */
export function AnswerSkeleton() {
  return (
    <div className="skeleton" aria-hidden="true">
      <span className="sk-pill" />
      <span className="sk-line" style={{ marginTop: 8 }} />
      <span className="sk-line" />
      <span className="sk-line" />
      <span className="sk-short" />
    </div>
  );
}

/** The answer as a reviewer sees it: status, text, the contract flags, and every citation highlighted. */
export function AnswerCard({
  record,
  log,
  question,
  passages = [],
  titles = {},
  reveal = false,
}: {
  record: AnswerRecord;
  log?: QuestionLog;
  /** The question being answered, shown above the answer when the card stands on its own. */
  question?: string;
  passages?: Passage[];
  /** Fallback titles by source_id when no retrieved passages are available (past runs). */
  titles?: Record<string, string>;
  reveal?: boolean;
}) {
  const titleOf = (id: string) => passages.find((p) => p.source_id === id)?.title ?? titles[id];
  return (
    <div>
      <div className="sheet-head" style={{ marginBottom: 0 }}>
        <Status record={record} log={log} />
        <span className="mono muted small">{record.question_id}</span>
      </div>
      {question && <p className="answer-q">{question}</p>}

      {record.abstained ? (
        <p className="answer-empty">No answer drafted. The retrieved documents don&apos;t state what was asked.</p>
      ) : (
        <p className="answer-text">{record.answer}</p>
      )}

      <ReviewFlags record={record} />

      {record.reasoning_note && (
        <div className="note">
          <b>Note for the reviewer.</b> {record.reasoning_note}
        </div>
      )}

      {record.citations.length > 0 && (
        <ol className={`cites${reveal ? " reveal" : ""}`} aria-label="Citations">
          {record.citations.map((c, i) => (
            <li className="cite" key={i}>
              <div className="cite-source">
                <span className="docid">{c.source_id}</span>
                {titleOf(c.source_id) && <span>{titleOf(c.source_id)}</span>}
                {c.section && <span>› {c.section}</span>}
              </div>
              <p className="cite-quote">
                <mark>{displayText(c.passage)}</mark>
              </p>
            </li>
          ))}
        </ol>
      )}

      {log && (
        <div className="meta">
          <span>
            <b>{log.retrieval_calls}</b> {log.retrieval_calls === 1 ? "search" : "searches"}
          </span>
          <span>
            <b>{(log.latency_ms / 1000).toFixed(1)}s</b>
          </span>
          {log.validation_failures > 0 && (
            <span>
              <b>{log.validation_failures}</b> {log.validation_failures === 1 ? "retry" : "retries"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

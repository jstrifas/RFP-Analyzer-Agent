"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentEvent, QuestionLog } from "../../src/agent/answer.js";
import type { AnswerRecord, Passage } from "../../src/schema.js";
import { highlight } from "../_lib/highlight";
import { AlertIcon, CheckIcon } from "./Icons";

type Phase = "running" | "done" | "error";

const ALERT = <AlertIcon size={13} />;
const CHECK = <CheckIcon size={13} />;

interface Step {
  key: string;
  dot: React.ReactNode;
  state: "live" | "done" | "warn";
  title: string;
  detail?: string;
  docs?: { id: string; title: string }[];
}

function steps(events: AgentEvent[], phase: Phase, log?: QuestionLog): Step[] {
  const out: Step[] = [];
  for (const e of events) {
    if (e.type === "search_start") {
      out.push({ key: `s${e.n}`, dot: String(e.n), state: "live", title: `Search ${e.n}`, detail: e.query + (e.category ? `  [${e.category}]` : "") });
    } else if (e.type === "search_result" || e.type === "search_error") {
      const s = out.find((x) => x.key === `s${e.n}`);
      if (!s) continue;
      if (e.type === "search_error") Object.assign(s, { state: "warn", title: `Search ${e.n} failed` });
      else {
        s.state = "done";
        const seen = new Map<string, string>();
        for (const p of e.passages) if (!seen.has(p.source_id)) seen.set(p.source_id, p.title);
        s.docs = [...seen].map(([id, title]) => ({ id, title }));
      }
    } else if (e.type === "search_refused") {
      out.push({ key: `r${out.length}`, dot: ALERT, state: "warn", title: "Asked for a 4th search; limit is 3, told to answer" });
    } else if (e.type === "validation_retry") {
      out.push({ key: `v${out.length}`, dot: ALERT, state: "warn", title: "Draft broke an answer rule; sent back once to fix", detail: e.issues.join("; ") });
    } else if (e.type === "nudge") {
      out.push({ key: `n${out.length}`, dot: ALERT, state: "warn", title: "Stopped without submitting; reminded once" });
    }
  }
  const searching = out.some((s) => s.state === "live");
  if (phase === "running" && !searching) {
    out.push({ key: "draft", dot: "", state: "live", title: events.length <= 1 ? "Reading the question" : "Reading passages and drafting the answer" });
  }
  if (phase === "done" && log) {
    const fallback = log.outcome === "fallback";
    out.push({
      key: "final",
      dot: fallback ? ALERT : CHECK,
      state: fallback ? "warn" : "done",
      title: fallback ? `Fell back to an abstention (${log.fallback_reason})` : log.outcome === "abstained" ? "Abstained, flagged for a human" : "Answer passed validation",
    });
  }
  return out;
}

export function Trail({ events, phase, log }: { events: AgentEvent[]; phase: Phase; log?: QuestionLog }) {
  const list = steps(events, phase, log);
  if (!list.length) return <p className="empty" style={{ marginTop: 12 }}>Starting…</p>;
  return (
    <ol className="trail" aria-label="What the agent did" aria-live="polite">
      {list.map((s) => (
        <li className="trail-step" key={s.key}>
          <span className={`trail-dot ${s.state}`} aria-hidden="true">
            {s.state === "live" ? "" : s.dot}
          </span>
          <div>
            <div className="trail-title">{s.title}</div>
            {s.detail && <div className="trail-query">{s.detail}</div>}
            {s.docs && (
              <div className="trail-docs">
                {s.docs.map((d) => (
                  <span key={d.id} className="docid" title={d.title}>
                    {d.id}
                  </span>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Exhibit({ passage, quotes }: { passage: Passage; quotes: string[] }) {
  const [open, setOpen] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const segments = highlight(passage.text, quotes);
  const cited = segments.some((s) => s.mark);

  // Collapsed, the passage window starts at its first highlight rather than the top of the chunk.
  useEffect(() => {
    const el = body.current;
    const first = el?.querySelector("mark");
    if (!el) return;
    // .exhibit-body is position: relative, so a mark's offsetTop is measured from the body itself.
    el.scrollTop = !open && first ? Math.max(0, (first as HTMLElement).offsetTop - 24) : 0;
  }, [open, passage.text]);
  return (
    <div className={`exhibit${cited ? "" : " exhibit-uncited"}`}>
      <div className="exhibit-head">
        <span className="docid">{passage.source_id}</span>
        <span>{passage.title}</span>
        {passage.section && <span>› {passage.section}</span>}
        <span className="score" title="Similarity to the search query">
          {passage.score.toFixed(2)}
        </span>
      </div>
      <div ref={body} className={`exhibit-body${open ? " open" : ""}`}>
        {segments.map((s, i) => (s.mark ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>))}
      </div>
      <button className="exhibit-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "Show less" : "Show full passage"}
      </button>
    </div>
  );
}

/** Every passage the agent retrieved, cited ones first, with the quoted words highlighted in place. */
export function Exhibits({ passages, record }: { passages: Passage[]; record: AnswerRecord }) {
  const unique = new Map<string, Passage>();
  for (const p of passages) unique.set(`${p.source_id}|${p.section ?? ""}|${p.text.slice(0, 80)}`, p);
  const quotesFor = (p: Passage) => record.citations.filter((c) => c.source_id === p.source_id).map((c) => c.passage);
  const all = [...unique.values()];
  const cited = all.filter((p) => highlight(p.text, quotesFor(p)).some((s) => s.mark));
  const rest = all.filter((p) => !cited.includes(p));

  return (
    <div>
      {cited.length === 0 && <p className="empty">No retrieved passage is cited in this answer.</p>}
      {cited.map((p, i) => (
        <Exhibit key={`c${i}`} passage={p} quotes={quotesFor(p)} />
      ))}
      {rest.length > 0 && (
        <details className="more">
          <summary>
            Also retrieved, not cited ({rest.length})
          </summary>
          {rest.map((p, i) => (
            <Exhibit key={`r${i}`} passage={p} quotes={[]} />
          ))}
        </details>
      )}
    </div>
  );
}

export function passagesFrom(events: AgentEvent[]): Passage[] {
  return events.flatMap((e) => (e.type === "search_result" ? e.passages : []));
}

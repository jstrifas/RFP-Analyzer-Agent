"use client";

import { Fragment, useRef, useState } from "react";
import type { AgentEvent } from "../../src/agent/answer.js";
import { parseCsv } from "../../src/kb/chunk.js";
import { AnswerCard, Status, statusOf } from "../_components/AnswerCard";
import { Exhibits, passagesFrom } from "../_components/Evidence";
import { streamAnswer, type AnswerResult } from "../_lib/stream";

const MAX_QUESTIONS = 25;
const CONCURRENCY = 3;

interface Row {
  question_id: string;
  text: string;
  state: "queued" | "running" | "done" | "error";
  events: AgentEvent[];
  result?: AnswerResult;
  error?: string;
}

function parseInput(raw: string): { question_id: string; text: string }[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const firstLine = trimmed.split(/\r?\n/)[0].toLowerCase();
  if (firstLine.includes("question_id") && (firstLine.includes("question") || firstLine.includes("text"))) {
    return parseCsv(trimmed)
      .map((r) => ({ question_id: r.question_id, text: (r.question ?? r.text ?? "").trim() }))
      .filter((q) => q.question_id && q.text);
  }
  return trimmed
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3)
    .map((text, i) => ({ question_id: `Q${String(i + 1).padStart(2, "0")}`, text }));
}

function toCsv(rows: Row[]): string {
  const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const head = ["question_id", "question", "status", "answer", "confidence", "needs_review", "abstained", "conflict_detected", "citations", "reasoning_note"];
  const lines = rows.map((r) => {
    const a = r.result?.record;
    return [
      r.question_id,
      r.text,
      a ? statusOf(a, r.result?.log).label : r.state,
      a?.answer,
      a?.confidence,
      a?.needs_review,
      a?.abstained,
      a?.conflict_detected,
      a?.citations.map((c) => `${c.source_id}${c.section ? " " + c.section : ""}: ${c.passage}`).join(" | "),
      a?.reasoning_note,
    ].map(esc).join(",");
  });
  return "﻿" + [head.join(","), ...lines].join("\r\n");
}

export function QuestionnaireClient({ sample }: { sample: { question_id: string; text: string }[] }) {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = parseInput(input);
  const update = (id: string, patch: Partial<Row> | ((r: Row) => Partial<Row>)) =>
    setRows((prev) => prev.map((r) => (r.question_id === id ? { ...r, ...(typeof patch === "function" ? patch(r) : patch) } : r)));

  async function run() {
    if (!parsed.length || running) return;
    if (parsed.length > MAX_QUESTIONS) {
      setNotice(`This demo answers up to ${MAX_QUESTIONS} questions at a time. Remove ${parsed.length - MAX_QUESTIONS} and try again.`);
      return;
    }
    const ids = new Set<string>();
    const dupes = parsed.filter((q) => (ids.has(q.question_id) ? true : (ids.add(q.question_id), false)));
    if (dupes.length) {
      setNotice(`Each question_id must be unique. Repeated: ${[...new Set(dupes.map((d) => d.question_id))].join(", ")}.`);
      return;
    }
    setNotice("");
    setOpenId(null);
    const fresh: Row[] = parsed.map((q) => ({ ...q, state: "queued", events: [] }));
    setRows(fresh);
    setRunning(true);

    let next = 0;
    const worker = async () => {
      while (next < fresh.length) {
        const q = fresh[next++];
        update(q.question_id, { state: "running" });
        try {
          const result = await streamAnswer({ question_id: q.question_id, text: q.text }, (e) =>
            update(q.question_id, (r) => ({ events: [...r.events, e] }))
          );
          update(q.question_id, { state: "done", result });
        } catch (err) {
          update(q.question_id, { state: "error", error: (err as Error).message });
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setRunning(false);
  }

  function download() {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cited-answers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const done = rows.filter((r) => r.state === "done");
  const review = done.filter((r) => r.result!.record.needs_review).length;
  const abstained = done.filter((r) => r.result!.record.abstained).length;
  // About 12s per question, CONCURRENCY at a time.
  const etaSeconds = Math.ceil(parsed.length / CONCURRENCY) * 12;
  const eta = etaSeconds < 60 ? `about ${etaSeconds}s` : `about ${Math.round(etaSeconds / 60)} min`;

  return (
    <>
      <section className="sheet" style={{ marginTop: 24 }}>
        <label className="field-label" htmlFor="questions">
          Questions
        </label>
        <textarea
          id="questions"
          className="q-input"
          value={input}
          disabled={running}
          placeholder={"Do you encrypt customer data at rest?\nHow long do you retain audit logs?"}
          onChange={(e) => setInput(e.target.value)}
        />
        <div className="ask-row">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-quiet btn-small"
              disabled={running}
              onClick={() => setInput(["question_id,question", ...sample.map((q) => `${q.question_id},"${q.text.replace(/"/g, '""')}"`)].join("\n"))}
            >
              Load sample questionnaire ({sample.length})
            </button>
            <button type="button" className="btn btn-quiet btn-small" disabled={running} onClick={() => fileRef.current?.click()}>
              Upload CSV
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setInput((await f.text()).replace(/^﻿/, ""));
                e.target.value = "";
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span className="hint">
              {parsed.length} question{parsed.length === 1 ? "" : "s"}
              {parsed.length > 0 && ` · ${eta}`}
            </span>
            <button className="btn" type="button" onClick={run} disabled={running || parsed.length === 0}>
              {running ? "Answering…" : parsed.length ? `Answer ${parsed.length} question${parsed.length === 1 ? "" : "s"}` : "Answer questions"}
            </button>
          </div>
        </div>
        {notice && <div className="error" style={{ marginTop: 12 }}>{notice}</div>}
      </section>

      {rows.length > 0 && (
        <section className="sheet" style={{ marginTop: 18 }} aria-labelledby="answers-h">
          <div className="sheet-head">
            <h2 id="answers-h">Answers</h2>
            <button className="btn btn-quiet btn-small" type="button" onClick={download} disabled={!done.length}>
              Download CSV
            </button>
          </div>
          <div className="progress" aria-live="polite">
            <span>
              <b>{done.length}</b> of {rows.length} answered
            </span>
            <span>
              <b>{review}</b> need review
            </span>
            <span>
              <b>{abstained}</b> not in the documents
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Question</th>
                  <th>Result</th>
                  <th>Sources</th>
                  <th className="num">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const a = r.result?.record;
                  const open = openId === r.question_id;
                  return (
                    <Fragment key={r.question_id}>
                      <tr
                        className={`${a ? "clickable" : ""}${open ? " expanded" : ""}`}
                        onClick={() => a && setOpenId(open ? null : r.question_id)}
                        tabIndex={a ? 0 : undefined}
                        onKeyDown={(e) => a && (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpenId(open ? null : r.question_id))}
                        aria-expanded={a ? open : undefined}
                      >
                        <td className="id mono">{r.question_id}</td>
                        <td>{r.text}</td>
                        <td>
                          {r.state === "queued" && <span className="muted small">Queued</span>}
                          {r.state === "running" && (
                            <span className="muted small">
                              {r.events.filter((e) => e.type === "search_start").length
                                ? `Search ${r.events.filter((e) => e.type === "search_start").length}…`
                                : "Starting…"}
                            </span>
                          )}
                          {r.state === "error" && <span className="status status-stop">Error: {r.error}</span>}
                          {a && <Status record={a} log={r.result!.log} />}
                        </td>
                        <td>
                          {a && (
                            <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {[...new Set(a.citations.map((c) => c.source_id))].map((s) => (
                                <span key={s} className="docid">
                                  {s}
                                </span>
                              ))}
                            </span>
                          )}
                        </td>
                        <td className="num mono">{r.result ? `${(r.result.log.latency_ms / 1000).toFixed(1)}s` : ""}</td>
                      </tr>
                      {open && a && (
                        <tr className="expanded">
                          <td colSpan={5}>
                            <div className="row-detail">
                              <div>
                                <AnswerCard record={a} log={r.result!.log} passages={passagesFrom(r.events)} reveal />
                              </div>
                              <div>
                                <h3>Sources it read</h3>
                                <Exhibits passages={passagesFrom(r.events)} record={a} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

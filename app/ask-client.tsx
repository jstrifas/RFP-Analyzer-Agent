"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentEvent } from "../src/agent/answer.js";
import { AnswerCard, AnswerSkeleton } from "./_components/AnswerCard";
import { Exhibits, passagesFrom, Trail } from "./_components/Evidence";
import type { Sample } from "./_lib/samples";
import { streamAnswer, type AnswerResult } from "./_lib/stream";

export function AskClient({ samples }: { samples: Sample[] }) {
  const [text, setText] = useState("");
  const [asked, setAsked] = useState<{ text: string; id?: string }>();
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [result, setResult] = useState<AnswerResult>();
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const workspace = useRef<HTMLDivElement>(null);

  async function ask(question: string, id?: string) {
    const q = question.trim();
    if (q.length < 3 || phase === "running") return;
    abort.current?.abort();
    abort.current = new AbortController();
    setAsked({ text: q, id });
    setPhase("running");
    setEvents([]);
    setResult(undefined);
    setError("");
    try {
      const r = await streamAnswer({ text: q, question_id: id }, (e) => setEvents((prev) => [...prev, e]), abort.current.signal);
      setResult(r);
      setPhase("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
      setPhase("error");
    }
  }

  // Bring the live work into view as soon as a question is asked; the samples would otherwise hide it below the fold.
  useEffect(() => {
    if (phase !== "running") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    workspace.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [phase]);

  const passages = passagesFrom(events);
  const running = phase === "running";

  return (
    <>
      <form
        className="ask"
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <label className="field-label" htmlFor="question">
          Question from the buyer&apos;s security team
        </label>
        <textarea
          id="question"
          className="ask-input"
          value={text}
          maxLength={1500}
          rows={2}
          placeholder="Do you encrypt customer data at rest?"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(text);
            }
          }}
        />
        <div className="ask-row">
          <span className="hint">Enter to ask · Shift+Enter for a new line · about 10 seconds per question</span>
          <button className="btn" type="submit" disabled={running || text.trim().length < 3}>
            {running ? "Answering…" : "Answer"}
          </button>
        </div>
      </form>

      <section className="samples" aria-labelledby="samples-h">
        <h2 id="samples-h">Try a sample question</h2>
        <p className="section-note">Each shows a different situation the agent has to handle.</p>
        <ul className="sample-list">
          {samples.map((s) => (
            <li key={s.question_id}>
              <button
                className="sample"
                type="button"
                disabled={running}
                aria-pressed={asked?.id === s.question_id}
                onClick={() => {
                  setText(s.text);
                  ask(s.text, s.question_id);
                }}
              >
                <span className="sample-what">
                  {s.shows}{" "}
                  <span className="sample-src">· {s.source === "test set" ? `test set ${s.question_id}` : "not in the test set"}</span>
                </span>
                <span className="sample-q">{s.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {phase !== "idle" && (
        <div className="workspace" ref={workspace}>
          <section className="sheet" aria-label="Answer" aria-busy={running}>
            {phase === "error" && <div className="error">{error}</div>}
            {running && (
              <>
                <p className="answer-q" style={{ marginTop: 0, marginBottom: 16 }}>
                  {asked?.text}
                </p>
                <AnswerSkeleton />
              </>
            )}
            {phase === "done" && result && (
              <AnswerCard record={result.record} log={result.log} question={asked?.text} passages={passages} reveal />
            )}
          </section>

          <aside aria-label="Evidence">
            <section className="sheet">
              <h2>What it did</h2>
              <Trail events={events} phase={phase === "done" ? "done" : phase === "error" ? "error" : "running"} log={result?.log} />
            </section>
            {phase === "done" && result && (
              <section className="sheet">
                <h2>Sources it read</h2>
                <p className="section-note">
                  Highlighted words are the quotes behind the answer, shown inside the passage the search returned.
                </p>
                <Exhibits passages={passages} record={result.record} />
              </section>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

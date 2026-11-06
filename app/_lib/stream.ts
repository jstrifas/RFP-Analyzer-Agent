/**
 * Browser side of POST /api/answer: reads the NDJSON stream of agent events
 * and resolves with the final answer record and run log.
 */
import type { AgentEvent, QuestionLog } from "../../src/agent/answer.js";
import type { AnswerRecord } from "../../src/schema.js";

export interface AnswerResult {
  record: AnswerRecord;
  log: QuestionLog;
}

export type StreamMessage =
  | { kind: "event"; event: AgentEvent }
  | ({ kind: "result" } & AnswerResult)
  | { kind: "error"; message: string };

export async function streamAnswer(
  body: { question_id?: string; text: string },
  onEvent: (e: AgentEvent) => void,
  signal?: AbortSignal
): Promise<AnswerResult> {
  const res = await fetch("/api/answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    let message = `The server returned ${res.status}.`;
    try {
      message = ((await res.json()) as { error?: string }).error ?? message;
    } catch {
      // keep the status message
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: AnswerResult | undefined;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      if (!line.trim()) continue;
      const msg = JSON.parse(line) as StreamMessage;
      if (msg.kind === "event") onEvent(msg.event);
      else if (msg.kind === "result") result = { record: msg.record, log: msg.log };
      else throw new Error(msg.message);
    }
  }
  if (!result) throw new Error("The answer stream ended before a result arrived. Check the terminal running the app for errors.");
  return result;
}

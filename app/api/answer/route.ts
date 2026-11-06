/**
 * POST /api/answer  { question_id?, text }
 * Runs the adopted agent on one question and streams NDJSON:
 *   {"kind":"event","event":AgentEvent} ... then {"kind":"result",record,log} or {"kind":"error",message}
 *
 * Only the question text reaches the agent (CLAUDE.md rule 1). Keys stay server-side.
 */
import Anthropic from "@anthropic-ai/sdk";
import { answerQuestion, type AgentEvent } from "../../../src/agent/answer.js";
import { DEFAULT_EFFORT, DEFAULT_TIMEOUT_MS, PROMPT_VERSION, VENDOR_NAME } from "../../../src/agent/config.js";
import { loadPrompt, type LoadedPrompt } from "../../../src/agent/prompt.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_QUESTION_CHARS = 1500;
const REQUIRED_ENV = ["ANTHROPIC_API_KEY", "VOYAGE_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;

let prompt: LoadedPrompt | undefined;
let client: Anthropic | undefined;
let askCounter = 0;

export async function POST(req: Request) {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) {
    return Response.json({ error: `Missing in .env: ${missing.join(", ")}. Add them and restart the app.` }, { status: 500 });
  }

  let body: { question_id?: unknown; text?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Send JSON: { \"text\": \"your question\" }." }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < 3) return Response.json({ error: "Type a question first." }, { status: 400 });
  if (text.length > MAX_QUESTION_CHARS) {
    return Response.json({ error: `Questions are limited to ${MAX_QUESTION_CHARS} characters.` }, { status: 400 });
  }
  const id =
    typeof body.question_id === "string" && /^[\w.-]{1,40}$/.test(body.question_id) ? body.question_id : `ASK-${++askCounter}`;

  prompt ??= loadPrompt(PROMPT_VERSION, VENDOR_NAME);
  client ??= new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let open = true;
      const send = (msg: unknown) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(msg) + "\n"));
        } catch {
          open = false; // the browser went away; the agent still finishes cleanly
        }
      };
      try {
        const result = await answerQuestion(
          { question_id: id, text },
          {
            client: client!,
            prompt: prompt!,
            agentVersion: PROMPT_VERSION,
            effort: DEFAULT_EFFORT,
            timeoutMs: DEFAULT_TIMEOUT_MS,
            onEvent: (event: AgentEvent) => send({ kind: "event", event }),
          }
        );
        send({ kind: "result", ...result });
      } catch (err) {
        send({ kind: "error", message: err instanceof Error ? err.message : String(err) });
      } finally {
        if (open) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

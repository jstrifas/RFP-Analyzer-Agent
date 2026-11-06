/**
 * System prompt and few-shot transcript (Agent Spec §3).
 *
 * The prompt file's leading HTML comment is an author note about the eval
 * design (it names the knowledge-base traps). It is stripped before sending:
 * letting the model read it would leak candidate v2 rules into v1.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type Anthropic from "@anthropic-ai/sdk";
import type { Question } from "../schema.js";

export interface LoadedPrompt {
  system: string;
  fewShot: Anthropic.MessageParam[];
  promptFile: string;
  promptSha256: string;
  fewShotFile: string;
  fewShotSha256: string;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export function renderQuestion(q: Question): string {
  return [
    `Question ID: ${q.question_id}`,
    ...(q.category ? [`Category: ${q.category}`] : []),
    "",
    "<question>",
    q.text,
    "</question>",
  ].join("\n");
}

interface FewShotExample {
  kind: string;
  question: Question;
  search: { query: string; top_k?: number };
  passages: unknown[];
  submit_answer: unknown;
}

/** Each example replays as search call → passages → submit_answer → acknowledgement. */
function fewShotMessages(examples: FewShotExample[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];
  examples.forEach((ex, i) => {
    const searchId = `toolu_fewshot_${i + 1}_search`;
    const submitId = `toolu_fewshot_${i + 1}_submit`;
    messages.push(
      { role: "user", content: renderQuestion(ex.question) },
      {
        role: "assistant",
        content: [{ type: "tool_use", id: searchId, name: "search_knowledge_base", input: ex.search }],
      },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: searchId, content: JSON.stringify(ex.passages) }],
      },
      {
        role: "assistant",
        content: [{ type: "tool_use", id: submitId, name: "submit_answer", input: ex.submit_answer }],
      },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: submitId, content: "Answer recorded." }],
      }
    );
  });
  return messages;
}

export function loadPrompt(version: string, vendorName: string): LoadedPrompt {
  const promptFile = `prompts/cited-system.${version}.md`;
  const fewShotFile = `prompts/few-shot.${version}.json`;
  const rawPrompt = readFileSync(promptFile, "utf8").replace(/^﻿/, "");
  const rawFewShot = readFileSync(fewShotFile, "utf8").replace(/^﻿/, "");

  const system = rawPrompt
    .replace(/^\s*<!--[\s\S]*?-->\s*/, "")
    .replaceAll("{{vendor_name}}", vendorName)
    .trim();
  if (system.includes("{{")) throw new Error(`${promptFile}: unrendered template variable`);

  const { examples } = JSON.parse(rawFewShot) as { examples: FewShotExample[] };
  return {
    system,
    fewShot: fewShotMessages(examples),
    promptFile,
    promptSha256: sha256(rawPrompt),
    fewShotFile,
    fewShotSha256: sha256(rawFewShot),
  };
}

/**
 * Tool definitions for Claude, generated from the Zod contract in src/schema.ts.
 *
 * Both tools use `strict: true`. Strict mode accepts a subset of JSON Schema,
 * so length/range/default keywords are moved into the description; Zod still
 * enforces them after the model responds (validateAnswer / SearchKnowledgeBaseInput).
 */
import type Anthropic from "@anthropic-ai/sdk";
import { searchKnowledgeBaseJsonSchema, submitAnswerJsonSchema } from "../schema.js";

const MOVED_KEYWORDS = ["minLength", "maxLength", "minimum", "maximum", "default"] as const;

type JsonSchema = { [key: string]: unknown };

function toStrictSchema(node: JsonSchema): JsonSchema {
  const out: JsonSchema = {};
  const notes: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === "$schema") continue;
    if ((MOVED_KEYWORDS as readonly string[]).includes(key)) {
      notes.push(`${key}: ${JSON.stringify(value)}`);
      continue;
    }
    if (key === "properties" && value && typeof value === "object") {
      out.properties = Object.fromEntries(
        Object.entries(value as Record<string, JsonSchema>).map(([k, v]) => [k, toStrictSchema(v)])
      );
    } else if (key === "items" && value && typeof value === "object") {
      out.items = toStrictSchema(value as JsonSchema);
    } else {
      out[key] = value;
    }
  }
  if (out.type === "object") out.additionalProperties = false;
  if (notes.length) {
    const base = typeof out.description === "string" ? `${out.description} ` : "";
    out.description = `${base}(${notes.join(", ")})`;
  }
  return out;
}

export const SEARCH_TOOL = "search_knowledge_base";
export const SUBMIT_TOOL = "submit_answer";

export const tools: Anthropic.Tool[] = [
  {
    name: SEARCH_TOOL,
    description:
      "Search the vendor's knowledge base. Returns passages with source_id, title, section, text, and a similarity score. This is the only permitted source of facts.",
    strict: true,
    input_schema: toStrictSchema(searchKnowledgeBaseJsonSchema as JsonSchema) as Anthropic.Tool.InputSchema,
  },
  {
    name: SUBMIT_TOOL,
    description:
      "Submit the final answer record for the current question. Call exactly once per question, after searching.",
    strict: true,
    input_schema: toStrictSchema(submitAnswerJsonSchema as JsonSchema) as Anthropic.Tool.InputSchema,
  },
];

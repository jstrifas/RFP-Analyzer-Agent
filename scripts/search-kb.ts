/**
 * Manual retrieval check:  npm run search -- "Do you encrypt data at rest?" [--top-k 5] [--category Encryption]
 */
import { parseArgs } from "node:util";
import { loadEnv } from "../src/kb/env.js";
import { searchKnowledgeBase } from "../src/kb/search.js";

loadEnv();

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { "top-k": { type: "string" }, category: { type: "string" } },
});
const query = positionals.join(" ");

const passages = await searchKnowledgeBase({
  query,
  top_k: values["top-k"] ? Number(values["top-k"]) : undefined,
  category: values.category,
});

for (const p of passages) {
  console.log(`\n[${p.score.toFixed(3)}] ${p.source_id} — ${p.title}${p.section ? ` › ${p.section}` : ""}`);
  console.log(p.text.length > 300 ? p.text.slice(0, 300) + "…" : p.text);
}

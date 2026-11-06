/**
 * Ingest kb/ into Supabase pgvector.
 *
 *   npm run ingest            (= tsx scripts/ingest-kb.ts --kb ./kb)
 *   npm run ingest -- --dry-run   chunk and print stats; no API or DB calls
 *
 * CLAUDE.md rule 1: only kb/ is ingested. The path is explicit, must be a
 * directory named `kb`, only top-level `KB-NN-*.md|csv` files are read, and
 * every file must have a catalog entry. Nothing else in the repo is touched.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { KB_CATALOG } from "../src/kb/catalog.js";
import { chunkCsv, chunkMarkdown, markdownTitle, type Chunk } from "../src/kb/chunk.js";
import { supabase } from "../src/kb/db.js";
import { embed, EMBEDDING_MODEL } from "../src/kb/embed.js";
import { loadEnv } from "../src/kb/env.js";

const KB_FILE = /^(KB-\d{2})-.+\.(md|csv)$/;

const { values } = parseArgs({
  options: { kb: { type: "string" }, "dry-run": { type: "boolean", default: false } },
});
if (!values.kb) throw new Error("Pass the knowledge base directory explicitly: --kb ./kb");

const kbDir = resolve(values.kb);
if (basename(kbDir) !== "kb" || !statSync(kbDir).isDirectory()) {
  throw new Error(`--kb must point to the kb/ directory, got ${kbDir}`);
}
const dryRun = values["dry-run"];
if (!dryRun) {
  loadEnv();
}

interface Doc {
  source_id: string;
  title: string;
  file_name: string;
  content_sha256: string;
  chunks: Chunk[];
}

const docs: Doc[] = [];
for (const file_name of readdirSync(kbDir).sort()) {
  const m = file_name.match(KB_FILE);
  if (!m) {
    console.warn(`skip  ${file_name} (not a KB-NN document)`);
    continue;
  }
  const [, source_id, ext] = m;
  const entry = KB_CATALOG[source_id];
  if (!entry) throw new Error(`${file_name}: no KB_CATALOG entry for ${source_id}`);

  const raw = readFileSync(join(kbDir, file_name), "utf8").replace(/^﻿/, "");
  const title = entry.title ?? (ext === "md" ? markdownTitle(raw) : undefined);
  if (!title) throw new Error(`${file_name}: no title (add a "# " line or a catalog title)`);

  docs.push({
    source_id,
    title,
    file_name,
    content_sha256: createHash("sha256").update(raw).digest("hex"),
    chunks: ext === "md" ? chunkMarkdown(raw, entry) : chunkCsv(raw, entry),
  });
}

const ids = new Set<string>();
for (const d of docs) {
  if (ids.has(d.source_id)) throw new Error(`Duplicate source_id ${d.source_id}`);
  ids.add(d.source_id);
}

const allChunks = docs.flatMap((d) => d.chunks);
for (const d of docs) {
  const tokens = d.chunks.map((c) => c.token_estimate);
  console.log(`${d.source_id}  ${String(d.chunks.length).padStart(2)} chunks  max ~${Math.max(...tokens)} tok  ${d.title}`);
}
console.log(`\n${docs.length} documents, ${allChunks.length} chunks`);
if (dryRun) process.exit(0);

// Title and section prefix the embedded text (not the stored text) so short chunks keep their context.
const inputs = docs.flatMap((d) =>
  d.chunks.map((c) => [d.title, c.section, c.text].filter(Boolean).join("\n\n"))
);
const { embeddings, totalTokens } = await embed(inputs, "document");
console.log(`Embedded with ${EMBEDDING_MODEL}: ${totalTokens} tokens`);

const db = supabase();
let k = 0;
for (const d of docs) {
  const { error: docErr } = await db.from("kb_documents").upsert({
    source_id: d.source_id,
    title: d.title,
    file_name: d.file_name,
    content_sha256: d.content_sha256,
    ingested_at: new Date().toISOString(),
  });
  if (docErr) throw new Error(`${d.source_id}: ${docErr.message}`);

  const { error: delErr } = await db.from("kb_chunks").delete().eq("source_id", d.source_id);
  if (delErr) throw new Error(`${d.source_id}: ${delErr.message}`);

  const rows = d.chunks.map((c) => ({
    source_id: d.source_id,
    chunk_index: c.chunk_index,
    section: c.section ?? null,
    category: c.category,
    text: c.text,
    token_estimate: c.token_estimate,
    embedding_model: EMBEDDING_MODEL,
    embedding: JSON.stringify(embeddings[k++]),
  }));
  const { error: insErr } = await db.from("kb_chunks").insert(rows);
  if (insErr) throw new Error(`${d.source_id}: ${insErr.message}`);
}

// Remove documents no longer in kb/ (chunks cascade).
const { data: existing, error: listErr } = await db.from("kb_documents").select("source_id");
if (listErr) throw new Error(listErr.message);
const stale = (existing ?? []).map((r) => r.source_id as string).filter((id) => !ids.has(id));
if (stale.length) {
  const { error } = await db.from("kb_documents").delete().in("source_id", stale);
  if (error) throw new Error(error.message);
  console.log(`Removed stale documents: ${stale.join(", ")}`);
}

console.log("Ingestion complete.");

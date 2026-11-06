/**
 * Section-based chunking (Agent Spec §6: chunks split by document section, ~300–500 tokens).
 *
 * Markdown: split on `## ` headings (the document header before the first one is
 * its own section), then merge adjacent sections greedily up to MAX_TOKENS.
 * A single section over MAX_TOKENS is split at paragraph breaks.
 * Chunk text is the document text unchanged apart from dropping `---` rules,
 * so citations quoted from a passage are verbatim from the source file.
 */
import { toKbCategory, type DocEntry, type KbCategory } from "./catalog.js";

export const MAX_TOKENS = 500;

export interface Chunk {
  chunk_index: number;
  section?: string;
  category: KbCategory;
  text: string;
  token_estimate: number;
}

/** Rough count (~4 chars per token for English prose); used only for sizing chunks. */
export const estimateTokens = (s: string) => Math.ceil(s.length / 4);

interface Piece {
  heading?: string;
  text: string;
}

export function markdownTitle(md: string): string | undefined {
  return md.match(/^# (.+)$/m)?.[1].trim();
}

export function chunkMarkdown(md: string, entry: DocEntry): Chunk[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const sections: Piece[] = [];
  let current: Piece = { heading: "Document header", text: "" };

  for (const line of lines) {
    if (/^# /.test(line)) continue; // title is stored on the document
    if (/^-{3,}\s*$/.test(line)) continue;
    if (/^## /.test(line)) {
      sections.push(current);
      current = { heading: line.slice(3).trim(), text: line + "\n" };
    } else {
      current.text += line + "\n";
    }
  }
  sections.push(current);

  const pieces = sections
    .map((s) => ({ ...s, text: s.text.trim() }))
    .filter((s) => s.text !== "")
    .flatMap(splitOversized);

  return mergePieces(pieces).map((p, i) => ({
    chunk_index: i,
    section: p.heading,
    category: entry.category,
    text: p.text,
    token_estimate: estimateTokens(p.text),
  }));
}

function splitOversized(piece: Piece): Piece[] {
  if (estimateTokens(piece.text) <= MAX_TOKENS) return [piece];
  const out: Piece[] = [];
  let buf = "";
  for (const para of piece.text.split(/\n{2,}/)) {
    if (buf && estimateTokens(buf + "\n\n" + para) > MAX_TOKENS) {
      out.push({ heading: piece.heading, text: buf });
      buf = para;
    } else {
      buf = buf ? buf + "\n\n" + para : para;
    }
  }
  if (buf) out.push({ heading: piece.heading, text: buf });
  return out;
}

function mergePieces(pieces: Piece[]): Piece[] {
  const out: { headings: string[]; text: string }[] = [];
  for (const p of pieces) {
    const last = out.at(-1);
    if (last && estimateTokens(last.text + "\n\n" + p.text) <= MAX_TOKENS) {
      last.text += "\n\n" + p.text;
      if (p.heading && last.headings.at(-1) !== p.heading) last.headings.push(p.heading);
    } else {
      out.push({ headings: p.heading ? [p.heading] : [], text: p.text });
    }
  }
  return out.map((o) => ({
    heading: o.headings.length ? o.headings.join(" / ") : undefined,
    text: o.text,
  }));
}

// ---------- CSV ----------

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, commas and newlines inside quotes. */
export function parseCsv(csv: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = csv.replace(/\r\n/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }

  const [header, ...body] = rows.filter((r) => r.some((f) => f.trim() !== ""));
  if (!header) return [];
  body.forEach((r, n) => {
    // An unquoted comma shifts every later column; fail loudly instead of misreading the row.
    if (r.length > header.length) throw new Error(`CSV row ${n + 2} has ${r.length} fields, header has ${header.length}: "${r[0]}"`);
  });
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

/** One line per row as `column: value; column: value` so each fact is quotable on its own. */
const renderRow = (r: Record<string, string>) =>
  Object.entries(r).map(([k, v]) => `${k}: ${v}`).join("; ");

export function chunkCsv(csv: string, entry: DocEntry): Chunk[] {
  const rows = parseCsv(csv);
  if (entry.csvMode === "row") {
    return rows.map((r, i) => {
      const text = renderRow(r);
      return {
        chunk_index: i,
        section: entry.sectionColumn ? r[entry.sectionColumn] : undefined,
        category: entry.categoryColumn ? toKbCategory(r[entry.categoryColumn]) : entry.category,
        text,
        token_estimate: estimateTokens(text),
      };
    });
  }
  return mergePieces(rows.map((r) => ({ text: renderRow(r) }))).map((p, i) => ({
    chunk_index: i,
    category: entry.category,
    text: p.text,
    token_estimate: estimateTokens(p.text),
  }));
}

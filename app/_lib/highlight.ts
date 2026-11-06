/**
 * Mark the exact words of each citation inside the passage they were quoted from.
 * Matching ignores case, whitespace differences and markdown formatting, close to
 * the normalization the agent loop's grounding check uses.
 */
export interface Segment {
  text: string;
  mark: boolean;
}

/**
 * Passage text as displayed, and the form quotes are matched in. The same transform
 * runs on both, so a quote copied from a markdown table still lines up:
 * bold markers and heading hashes go, table separator rows go, and cell pipes
 * become " · " (a quote may start mid-row, so every pipe is converted, not just leading ones).
 */
export function displayText(s: string): string {
  return s
    .replace(/\*\*/g, "")
    .split("\n")
    .filter((line) => !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(line))
    .map((line) =>
      line
        .replace(/^\s*#{1,6}\s+/, "")
        .replace(/\s*\|\s*/g, " · ")
        .replace(/^\s*·\s*/, "")
        .replace(/\s*·\s*$/, "")
    )
    .join("\n");
}

export function highlight(text: string, quotes: string[]): Segment[] {
  const clean = displayText(text);

  // Collapsed, lower-cased copy plus a map from each collapsed index back to `clean`.
  let collapsed = "";
  const map: number[] = [];
  let prevSpace = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (/\s/.test(ch)) {
      if (!prevSpace && collapsed.length) {
        collapsed += " ";
        map.push(i);
      }
      prevSpace = true;
    } else {
      collapsed += ch.toLowerCase();
      map.push(i);
      prevSpace = false;
    }
  }

  const ranges: [number, number][] = [];
  for (const q of quotes) {
    const needle = displayText(q).replace(/\s+/g, " ").trim().toLowerCase();
    if (needle.length < 3) continue;
    const at = collapsed.indexOf(needle);
    if (at >= 0) ranges.push([map[at], map[at + needle.length - 1] + 1]);
  }
  ranges.sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];
  for (const r of ranges) {
    const last = merged.at(-1);
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }

  const out: Segment[] = [];
  let pos = 0;
  for (const [s, e] of merged) {
    if (s > pos) out.push({ text: clean.slice(pos, s), mark: false });
    out.push({ text: clean.slice(s, e), mark: true });
    pos = e;
  }
  if (pos < clean.length) out.push({ text: clean.slice(pos), mark: false });
  return out;
}

/**
 * Per-document ingestion metadata for kb/.
 *
 * Categories reuse the taxonomy already in KB-32's `category` column, plus
 * "Logging & Monitoring" for KB-06, which that library has no category for.
 * This is retrieval metadata only: it says what a document is about, never
 * which document is authoritative or current (see CLAUDE.md rule 3).
 */

export const KB_CATEGORIES = [
  "General",
  "Governance",
  "Compliance",
  "Access Control",
  "Customer Identity",
  "Encryption",
  "Data Management",
  "Subprocessors",
  "Vendor Management",
  "Business Continuity",
  "Vulnerability Management",
  "Secure Development",
  "Change Management",
  "Incident Response",
  "Human Resources",
  "Endpoint Security",
  "Physical Security",
  "Logging & Monitoring",
] as const;
export type KbCategory = (typeof KB_CATEGORIES)[number];

export interface DocEntry {
  category: KbCategory;
  /** CSV files have no `# Title` line, so their title comes from the file name. */
  title?: string;
  /** CSV only: `row` = one chunk per row (Q&A pairs); `table` = rows grouped up to the chunk size. */
  csvMode?: "row" | "table";
  /** CSV row mode only: column whose value is the row's category (mapped through KB_CATEGORIES). */
  categoryColumn?: string;
  /** CSV row mode only: column used as the chunk's section label. */
  sectionColumn?: string;
}

export const KB_CATALOG: Record<string, DocEntry> = {
  "KB-01": { category: "General" },
  "KB-02": { category: "Governance" },
  "KB-03": { category: "Governance" },
  "KB-04": { category: "Compliance" },
  "KB-05": { category: "Data Management" },
  "KB-06": { category: "Logging & Monitoring" },
  "KB-07": { category: "Encryption" },
  "KB-08": { category: "Access Control" },
  "KB-09": { category: "Customer Identity" },
  "KB-10": { category: "Incident Response" },
  "KB-11": { category: "Data Management" },
  "KB-12": { category: "Subprocessors", title: "Subprocessor List (2026-08)", csvMode: "table" },
  "KB-13": { category: "Subprocessors", title: "Subprocessor List (2025-01)", csvMode: "table" },
  "KB-14": { category: "Business Continuity" },
  "KB-15": { category: "Business Continuity" },
  "KB-16": { category: "Vulnerability Management" },
  "KB-17": { category: "Vulnerability Management" },
  "KB-18": { category: "Secure Development" },
  "KB-19": { category: "Vendor Management" },
  "KB-20": { category: "Human Resources" },
  "KB-21": { category: "Human Resources" },
  "KB-22": { category: "Physical Security" },
  "KB-23": { category: "General" },
  "KB-24": { category: "Data Management" },
  "KB-25": { category: "Secure Development" },
  "KB-26": { category: "Change Management" },
  "KB-27": { category: "Endpoint Security" },
  "KB-28": { category: "Governance" },
  "KB-29": { category: "General" },
  "KB-30": { category: "General" },
  "KB-31": { category: "Data Management" },
  "KB-32": {
    category: "General",
    title: "Past Questionnaire Answer Library (2024)",
    csvMode: "row",
    categoryColumn: "category",
    sectionColumn: "answer_id",
  },
};

export function toKbCategory(value: string): KbCategory {
  const match = KB_CATEGORIES.find((c) => c.toLowerCase() === value.trim().toLowerCase());
  if (!match) throw new Error(`Unknown KB category "${value}"`);
  return match;
}

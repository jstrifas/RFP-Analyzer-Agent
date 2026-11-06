/**
 * `search_knowledge_base` — the agent's only retrieval path (Agent Spec §4).
 * Validates the tool input, embeds the query, and returns top-k passages from kb/.
 */
import { Passage, SearchKnowledgeBaseInput } from "../schema.js";
import { supabase } from "./db.js";
import { embedQuery } from "./embed.js";

export async function searchKnowledgeBase(rawInput: unknown): Promise<Passage[]> {
  const input = SearchKnowledgeBaseInput.parse(rawInput);
  const embedding = await embedQuery(input.query);

  const { data, error } = await supabase().rpc("match_kb_chunks", {
    query_embedding: JSON.stringify(embedding),
    match_count: input.top_k,
    filter_category: input.category ?? null,
  });
  if (error) throw new Error(`match_kb_chunks failed: ${error.message}`);

  return (data as { source_id: string; title: string; section: string | null; text: string; score: number }[]).map(
    (row) =>
      Passage.parse({
        source_id: row.source_id,
        title: row.title,
        section: row.section ?? undefined,
        text: row.text,
        score: row.score,
      })
  );
}

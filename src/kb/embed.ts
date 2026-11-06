/**
 * Voyage AI embeddings. Documents and queries use different `input_type`s,
 * which Voyage recommends for retrieval. Model and dims must match the
 * `vector(1024)` column in supabase/migrations.
 */
export const EMBEDDING_MODEL = "voyage-3.5";
export const EMBEDDING_DIMS = 1024;

const BATCH_SIZE = 128;
/** Keeps one request under Voyage's no-payment-method limit (10K tokens/min). chars/3 over-estimates tokens on purpose. */
const BATCH_TOKEN_BUDGET = 8000;
const MAX_RETRIES = 5;
const RETRY_WAIT_MS = 61_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function batches(inputs: string[]): string[][] {
  const out: string[][] = [];
  let cur: string[] = [];
  let tokens = 0;
  for (const s of inputs) {
    const t = Math.ceil(s.length / 3);
    if (cur.length && (tokens + t > BATCH_TOKEN_BUDGET || cur.length >= BATCH_SIZE)) {
      out.push(cur);
      cur = [];
      tokens = 0;
    }
    cur.push(s);
    tokens += t;
  }
  if (cur.length) out.push(cur);
  return out;
}

interface VoyageResponse {
  data: { embedding: number[]; index: number }[];
  usage: { total_tokens: number };
}

export interface EmbedResult {
  embeddings: number[][];
  totalTokens: number;
}

export async function embed(inputs: string[], inputType: "document" | "query"): Promise<EmbedResult> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY is not set");

  const embeddings: number[][] = [];
  let totalTokens = 0;
  const all = batches(inputs);
  for (const [n, batch] of all.entries()) {
    let res: Response;
    for (let attempt = 0; ; attempt++) {
      res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: batch,
          input_type: inputType,
          output_dimension: EMBEDDING_DIMS,
        }),
      });
      if (res.status !== 429 || attempt >= MAX_RETRIES) break;
      console.warn(`Voyage rate limit hit; waiting ${RETRY_WAIT_MS / 1000}s (retry ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(RETRY_WAIT_MS);
    }
    if (!res.ok) throw new Error(`Voyage embeddings failed: ${res.status} ${await res.text()}`);
    if (all.length > 1) console.log(`Embedded batch ${n + 1}/${all.length}`);
    const body = (await res.json()) as VoyageResponse;
    for (const d of body.data.sort((a, b) => a.index - b.index)) embeddings.push(d.embedding);
    totalTokens += body.usage.total_tokens;
  }
  return { embeddings, totalTokens };
}

export async function embedQuery(query: string): Promise<number[]> {
  const { embeddings } = await embed([query], "query");
  return embeddings[0];
}

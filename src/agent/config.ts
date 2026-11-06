/**
 * Agent run configuration (Agent Spec §4 loop limits). Every value here is
 * logged with each run so a Report Card score can be traced to its settings.
 */
export const AGENT_MODEL = "claude-opus-5-5";
/** Claude Opus 5.5 defaults to "medium"; set explicitly so it is pinned in the run log. */
export const DEFAULT_EFFORT = "medium" as const;
export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export const MAX_SEARCHES = 3;
/** Model calls per question: up to 3 searches, a submit, one retry, plus slack for a nudge. */
export const MAX_TURNS = 7;
export const MAX_TOKENS = 16000;
export const DEFAULT_TIMEOUT_MS = 30_000;

/** Adopted version (Agent Spec change log v0.16). Earlier versions stay runnable with --prompt-version. */
export const PROMPT_VERSION = "v4";
export const VENDOR_NAME = "Tidewell Data";

/** USD per million tokens. Cache writes are the 5-minute TTL rate (1.25x input). */
const PRICES: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
  "claude-opus-4-8": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
};

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

/** Returns null when a model has no price entry (e.g. an unexpected fallback model). */
export function costUsd(model: string, u: TokenUsage): number | null {
  const p = PRICES[model];
  if (!p) return null;
  return (
    (u.input_tokens * p.input +
      u.output_tokens * p.output +
      u.cache_creation_input_tokens * p.cacheWrite +
      u.cache_read_input_tokens * p.cacheRead) /
    1_000_000
  );
}

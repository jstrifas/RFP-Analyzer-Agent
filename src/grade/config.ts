/**
 * Pinned grader model (CLAUDE.md rule 5: Gemini grades, pinned version, logged per run).
 * Change it only deliberately, with a note in the Agent Spec change log: a different
 * grader can move scores without the agent changing.
 */
// Pinned Nov 3, 2026. No stable Pro model is available to new API keys (gemini-2.5-pro returns 404
// "no longer available to new users"), so this is the newest Pro, pinned by exact ID rather than the
// moving `gemini-pro-latest` alias. It is a preview: if Google retires it, pin its replacement,
// re-grade earlier runs with it, and log the switch in the Agent Spec.
export const GRADER_MODEL = "gemini-3.1-pro-preview";

export const HUMAN_SAMPLE_SIZE = 20;

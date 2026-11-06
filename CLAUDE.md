# Cited — project context for Claude Code

Cited is an RFP / security-questionnaire response agent plus a Report Card that measures whether its answers can be trusted. Portfolio project aimed at Enterprise AI Platform PM roles. The thesis: **an enterprise agent is only as valuable as your ability to prove it works.**

## Scenario (all fictional)
- **Tidewell Data** — the vendor. Its 32 policy documents in `kb/` are Cited's only source of truth.
- **Spartan Apex Benefits** — the buyer whose security team sends the questionnaire. Never appears in `kb/` or the gold set.
- **Cited** — drafts answers for Tidewell's proposal manager, who reviews them.

## Read before changing anything
- `docs/AGENT-SPEC-cited.md` — the how: schemas, tools, memory, eval, failure behavior. Decisions there are deliberate; change them by updating the spec and its change log.
- `docs/PRD-cited.md` — the what and why, metrics, phasing.

## Hard rules
1. **Only `kb/` is ingested into retrieval.** Never embed, index, or pass to the agent anything from `eval/` or `docs/`. `eval/KB-MANIFEST-tidewell.ANSWER-KEY.md` lists every planted trap, and `eval/gold-set-v0.6.csv` holds the answers; either one leaking into retrieval makes every score meaningless. Ingestion code must take an explicit path to `kb/`, not glob the repo.
2. **Do not edit `kb/` to make the agent score better.** The traps (contradictions, superseded docs, stale answer library, injection in KB-30, terminology drift, planned gaps) are the test.
3. **Current agent version: v4** (`prompts/cited-system.v4.md`, the default in `src/agent/config.ts`). Each version's rules and the Report Card evidence for them are in the prompt file's header comment and the Agent Spec change log. **The v1 system prompt is a deliberate general baseline** (`prompts/cited-system.v1.md`). Do not add rules about source authority, document recency, or plan-tier qualifiers to v1. Those are candidate v2 rules, added only when the Report Card shows v1 failing on them. Every prompt change is a new versioned file.
4. **The answer contract lives in `src/schema.ts`.** Model output is validated with `AnswerRecord`; one retry with quoted issues, then `abstainFallback`. Run `npm run check` after any schema change.
5. **Models:** Claude answers (the agent). Google Gemini grades (pinned model version, logged per run). Never use the same model family for both.

## Stack
Next.js on Vercel · Supabase Postgres + pgvector (retrieval and run storage) · Claude API with tool use (`search_knowledge_base`, forced `submit_answer`) · Zod 4 · TypeScript (ESM, NodeNext).

## Commands
- `npm install`
- `npm run check` — schema self-test (16 checks, must all pass)
- `npm run typecheck`
- `npm run check:agent` — offline agent-loop self-test (fake model and search, no API calls)
- `npm run ingest` — embed `kb/` into Supabase (`-- --dry-run` to only chunk)
- `npm run search -- "query"` — manual retrieval check
- `npm run agent -- --questions <file.json|.csv> [--ids Q-001,Q-002] [--effort medium] [--timeout-s 30]` — writes `runs/<run_id>.json`
- `npm run check:grader` — offline grader self-test
- `npm run grade -- --run runs/<run_id>.json` — Gemini grades a run; writes `grades/<run_id>.json` + blind `grades/<run_id>.human-sample.csv`
- `npm run agreement -- --grades grades/<run_id>.json` — grader–human agreement from the filled sample
- `npm run rescore -- --run runs/<run_id>.json` — re-apply the current rubric's code-decided checks to stored Gemini verdicts (no API calls); re-run `agreement` afterwards
- Rubric is v2 (`RUBRIC_VERSION` in `src/grade/rubric.ts`): the four checks in `eval/GOLD-SET-GUIDE.md` plus "review flags" (confidence and needs_review vs the gold row), decided in code. A change to Gemini's prompt needs a full re-grade; a change to code-decided checks only needs `rescore`.
- `npm run dev` — demo UI at http://localhost:3000 (Ask, Questionnaire, Report Card). Uses webpack, not Turbopack: `src/` imports `.ts` files with `.js` specifiers, which only webpack's `extensionAlias` maps (see `next.config.ts`). The web app has its own `tsconfig.web.json`.

## Demo UI (`app/`)
- `/api/answer` streams the agent's progress as NDJSON through the optional `onEvent` callback on `answerQuestion`; only the question text reaches the agent.
- The Report Card reads `runs/` and `grades/` from disk. The version list is `VERSIONS` in `app/_lib/report.ts`, so add a row there when a new version is graded.
- Deploying (Vercel): pages read data files at request time, which build tracing can't detect, so they're bundled through `DATA_FILES` (`outputFileTracingIncludes`) in `next.config.ts`. A new data file or folder a page reads must be added there, or the deployed page will fail. The live pages also need `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set in the Vercel project's environment variables. The Report Card needs none.

## Agent loop (`src/agent/answer.ts`)
Per question: up to 3 `search_knowledge_base` calls (top_k default 5) → `submit_answer` → `validateAnswer` → retry once with `retryMessage` → else `abstainFallback`. Questions are answered independently (no conversational memory). Log per question: tokens, cost, latency, retrieval calls, validation failures, agent version, served model, citation grounding. Claude Opus 5.5 rejects forced `tool_choice`, so the loop enforces the submit (see Agent Spec §4).

## Gold set notes (`eval/gold-set-v0.6.csv`)
- 50 questions: 39 answerable, 11 expected abstentions.
- When grading, if `must_have_facts` starts with "Core claim(s)", use `gold_answer` as the must-have facts instead. Those 26 rows were never minimized.
- Q-031 (resolved Nov 3, 2026): the 35-day backup fact is required, per `must_have_facts`; the grading note was reworded to match.
- Q-036 (Nov 5, 2026): "Tidewell work must be performed on Tidewell-issued laptops" moved to `optional_supporting_details`, since the question asks only about encryption and central management. Its `must_have_facts` are now written out (it was a Core claim row).
- Q-022 (Nov 5, 2026): `needs_review_expected` is `EITHER`, since flagging an injected question for review is acceptable either way. `EITHER` is only valid in that column.
- Gold edits that touch only code-checked fields (`confidence_expected`, `needs_review_expected`) need `npm run rescore`, not a Gemini re-grade; the grades file's `grader_view_sha256` shows whether Gemini's view changed.
- Editing the CSV: quote any field you change that contains a comma. An unquoted comma shifts the rest of the row, and the loader now rejects such rows.

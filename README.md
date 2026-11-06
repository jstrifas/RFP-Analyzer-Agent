# Cited

**An RFP and security-questionnaire answering agent, plus a Report Card that measures whether its answers can be trusted.**

> An enterprise agent is only as valuable as your ability to prove it works.

Before an enterprise buys software, its security team sends the vendor a questionnaire of 100–300 questions. Answering it pulls sales engineers and security staff off real work for days, and a wrong answer creates legal and trust risk. LLMs can now draft these answers, so the hard part has moved from *generating* answers to *trusting* them.

Cited does both halves:

- **The agent** answers each question only from a vendor's policy documents. Every claim carries a verbatim citation, and every answer carries a confidence level and a review flag. When the documents don't say, it replies "not in our documents" instead of guessing.
- **The Report Card** runs the agent on a 50-question gold set, grades each answer with a different model family, and checks that grader against human grading.

This is a portfolio project for Enterprise AI Platform PM roles. The vendor (Tidewell Data), its 32 documents and the buyer (Spartan Apex Benefits) are all fictional.

## Results

Four prompt versions, each graded on the same gold set: 39 answerable questions with planted traps and 11 that should be refused. An answer passes only if it passes all five rubric checks: correctness, citation support, behavior, safety and review flags.

| Metric | Target | v1 | v2 | v3 | v4 |
|---|---|---|---|---|---|
| Answer correctness | ≥ 85% | 62% | 94% | 90% | **100%** |
| Citation precision | ≥ 95% | 98.6% | 100% | 100% | **100%** |
| Unsupported-claim rate | ≤ 3% | 7% | 15% | 2.4% | **0%** |
| Correct abstention | ≥ 10 of 11 | 7 | 10 | 9 | **11** |
| Confidence calibration | ≥ 95% | 95.7% | 97.2% | 91.9% | **100%** |
| Grader–human agreement | ≥ 85% | 20/20 | not run | 20/20 | **20/20** |
| Answers sent for human review | reported | 27 | 15 | 15 | 13 |

v1 → v4 improved correctness by **38 points**, against a target of 15. A 50-question run costs about $2 and takes about 9 seconds per question. Full results, including every graded answer, are in [`grades/`](grades/) and on the demo's Report Card page.

### Each version was earned by a failure

Rules were added only after the Report Card showed a failure, and kept general, so the gains aren't the result of teaching to the test. Each prompt file's header records the evidence for its rules.

| Version | Change | Evidence |
|---|---|---|
| [v1](prompts/cited-system.v1.md) | Deliberately general baseline | Failed 11 of 12 questions where an outdated policy disagrees with the current one, as the spec predicted |
| [v2](prompts/cited-system.v2.md) | Prefer current, authoritative sources; related context isn't a partial answer | Fixed 15 questions and broke none, but uncited details rose to 15% |
| [v3](prompts/cited-system.v3.md) | Every specific detail needs a quote | Unsupported claims fell to 2.4%; repeat runs showed its correctness dip was noise |
| [v4](prompts/cited-system.v4.md) | Sharper abstain test; report the whole relevant set | Targeted two questions that failed 12 of 12 repeat runs |

### Read these numbers with care

- Versions 2–4 were diagnosed and tuned on these same 50 questions, and there is no held-out set yet, so v4's score is optimistic.
- Grading the same v4 answers twice changed one verdict, so a fair range for v4's correctness is 98–100%.
- The same person wrote the knowledge base and the gold answers. The PRD discloses this as an open risk.

## How it works

```
question ──► agent (Claude Opus 5.5)
               │  up to 3 × search_knowledge_base ──► Supabase pgvector (kb/ only, Voyage embeddings)
               ▼
             submit_answer ──► Zod validation ──► one retry with the issues quoted ──► else abstain
               ▼
             answer record: answer, citations, confidence, needs_review, abstained, conflict_detected

gold set ──► run all 50 ──► Gemini grades 4 checks + code checks behavior and review flags ──► Report Card
                                                     └─► 20-answer blind sample ──► human agreement
```

- **One agent, one tool.** Each question is answered independently: no conversational memory and no multi-agent handoffs, so every failure has one place to look.
- **The answer contract** is a Zod schema ([`src/schema.ts`](src/schema.ts)) with cross-field rules. For example, an abstained answer must be empty and low confidence, and a conflict needs at least two cited sources.
- **The grader is a different model family** (Gemini) from the agent (Claude), pinned and logged with every grade. Parts of the rubric are decided in code, so the grader can't argue its way past a flag mismatch.
- **The grader is graded.** Human grading of blind samples found a rubric gap: confidence wasn't being checked. Adding a fifth check brought grader–human agreement to 60 of 60.
- **Only `kb/` is ever retrieved.** The gold set and answer key in `eval/` never reach the agent.

## Demo

`npm run dev` starts a local web app at http://localhost:3000:

- **Ask:** type a question, or try a sample: two policies conflict, an outdated policy disagrees, a question hides an instruction, or the answer isn't in the documents. You watch each search live, then see the answer with its review flags and every quote highlighted inside the source passage.
- **Questionnaire:** paste or upload a CSV of questions, answer them in parallel, review the flagged ones, and download the results.
- **Report Card:** the table above, results by trap type, and every graded answer next to the grader's reasoning and the human-written gold answer.

## Running it yourself

You need Node.js 22 or newer (tested on 24), a Supabase project, and API keys for Anthropic, Voyage AI and Google Gemini.

1. Install dependencies and create your environment file:

   ```bash
   npm install
   cp .env.example .env
   ```

   Fill in `.env` with your Supabase URL and secret key, `VOYAGE_API_KEY`, `ANTHROPIC_API_KEY` and `GEMINI_API_KEY`. The `.env` file is gitignored.

2. Create the retrieval tables: run [`supabase/migrations/20261103000000_kb_retrieval.sql`](supabase/migrations/20261103000000_kb_retrieval.sql) in your Supabase project's SQL Editor. It enables pgvector and creates `kb_documents`, `kb_chunks` and the `match_kb_chunks` search function.

3. Embed the knowledge base and check retrieval:

   ```bash
   npm run ingest
   npm run search -- "Do you encrypt customer data at rest?"
   ```

4. Start the demo:

   ```bash
   npm run dev
   ```

### Evaluation commands

| Command | What it does |
|---|---|
| `npm run agent -- --questions eval/gold-set-v0.6.csv` | Runs the adopted agent on every gold question (only the question text is read) and writes `runs/<run_id>.json` |
| `npm run grade -- --run runs/<run_id>.json` | Gemini grades a run and writes `grades/<run_id>.json`, plus a blind 20-answer sample for human grading |
| `npm run agreement -- --grades grades/<run_id>.json` | Compares your filled-in human sample with the grader |
| `npm run rescore -- --run runs/<run_id>.json` | Re-applies the code-decided checks to stored verdicts, with no API calls |
| `npm run check`, `check:agent`, `check:grader` | Offline self-tests for the schema, agent loop and grader (no API calls) |
| `npm run typecheck` | TypeScript check |

Use `--prompt-version v1` (or `v2`, `v3`) on `npm run agent` to reproduce an earlier version.

## Repository layout

| Path | Contents |
|---|---|
| [`kb/`](kb/) | The fictional vendor's 32 policy documents, the agent's only source of truth, including deliberate traps |
| [`eval/`](eval/) | Gold set, grading guide and knowledge-base answer key. Never retrieved by the agent |
| [`prompts/`](prompts/) | System prompts v1–v4 and few-shot examples |
| [`src/agent/`](src/agent/) | The agent loop, tools and prompt loading |
| [`src/kb/`](src/kb/) | Chunking, embeddings and retrieval |
| [`src/grade/`](src/grade/) | Rubric, grader and Report Card metrics |
| [`scripts/`](scripts/) | CLI entry points and offline self-tests |
| [`app/`](app/) | Next.js demo UI |
| [`runs/`](runs/), [`grades/`](grades/) | Recorded runs and their graded Report Cards |
| [`docs/`](docs/) | [PRD](docs/PRD-cited.md) (what and why) and [Agent Spec](docs/AGENT-SPEC-cited.md) (how, with a change log of every decision) |

## Stack

TypeScript · Next.js · Supabase Postgres + pgvector · Voyage AI embeddings · Claude Opus 5.5 (agent) · Gemini 3.1 Pro (grader) · Zod

# Cited

**Security questionnaire answers you can prove.**

Cited is an AI agent that drafts answers to enterprise security questionnaires from a vendor's own policy documents, plus a Report Card that measures whether those answers can be trusted.

> An enterprise agent is only as valuable as your ability to prove it works.

**▶ Live demo: https://rfp-agent-git-main-jstrifa-bits-projects.vercel.app/**

---

## The problem

Before an enterprise buys software, its security team sends the vendor a questionnaire, often 100–300 questions long and on the deal's critical path. Answering it pulls sales engineers and security staff off real work for days, and one wrong answer is a legal and trust risk, so teams can't accept AI drafts blindly.

AI can now draft these answers in minutes. The hard part has moved from *writing* answers to *trusting* them. Most AI RFP tools sell speed; few show evidence that their answers are right.

## What Cited does

- **Answers only from the vendor's documents.** It never draws on general knowledge, and every claim carries a verbatim quote from the passage that backs it.
- **Shows its evidence.** The quoted words are highlighted inside the source passage, so a reviewer can check an answer in seconds.
- **Says "not in our documents" instead of guessing.** Questions the documents don't answer are refused and sent to a human.
- **Tells you where to look.** Every answer carries a confidence level and a review flag, shown as a colored band:

  | Band | Meaning |
  |---|---|
  | 🟢 **No review needed** | High confidence, fully supported by the documents |
  | 🟠 **Check this before it's sent** | Sources conflict, or the answer is partial or less certain |
  | 🔴 **A human must answer this** | The documents don't say; no answer was drafted |

- **Proves it works.** The Report Card scores every version of the agent against a fixed 50-question test set, using an independent grader that is itself checked against human grading.

## Who it's for

- **Proposal and sales-engineering managers**, who need a complete, accurate questionnaire without stalling the deal. Cited drafts every answer with its sources and flags the ones that need attention, so review time goes where it matters.
- **AI platform owners and reviewers**, who need to decide whether an agent is reliable enough to trust and to catch regressions when prompts or models change.

## Try the demo

| Page | What it shows |
|---|---|
| [**Home**](https://rfp-agent-git-main-jstrifa-bits-projects.vercel.app/) | What Cited does, who it's for and the results. **Begin** leads into the app |
| [**Ask**](https://rfp-agent-git-main-jstrifa-bits-projects.vercel.app/ask) | Ask one question and watch the agent search, cite and decide live. Samples cover conflicting policies, an outdated policy, a hidden instruction, and a question the documents can't answer |
| [**Questionnaire**](https://rfp-agent-git-main-jstrifa-bits-projects.vercel.app/questionnaire) | Paste or upload a CSV of questions, answer them in parallel, review the flagged ones and download the results |
| [**Report Card**](https://rfp-agent-git-main-jstrifa-bits-projects.vercel.app/report) | Baseline vs final results, results by trap type, and every graded answer next to the grader's reasoning and the human-written gold answer |

The vendor (Tidewell Data), its 32 policy documents and the buyer scenario are fictional.

## Results

Results against the PRD's targets, baseline vs final. All runs are on the 50-question tuning set: 39 answerable questions with planted traps, such as outdated policies, contradictions and hidden instructions, plus 11 questions the agent should refuse. An answer passes only if it passes all five rubric checks: correctness, citation support, behavior, safety and review flags.

| Metric | Target | Baseline (v1) | Final (v4) |
|---|---|---|---|
| Answer correctness (passes all five checks) | ≥ 85% | 62% | **100%** |
| Citation precision (citations that support their claim) | ≥ 95% | 98.6% | **100%** |
| Unsupported-claim rate | ≤ 3% | 7% | **0%** |
| Correct abstention (unanswerable questions refused) | ≥ 10 of 11 | 7 | **11** |
| Confidence calibration (high-confidence answers that pass) | ≥ 95% | 95.7% | **100%** |
| Grader–human agreement (20 hand-graded answers) | ≥ 85% | 20/20 | **20/20** |

**+38 points** on correctness against a +15 target, measured on the tuning set. Answers flagged for human review fell from 27 to 13. A question takes about 9 seconds, and a 50-question run costs about $2.

### How the final version was earned

Four prompt versions, each rule added only after the Report Card measured a failure, and kept general so the gains aren't the result of teaching to the test:

1. **Baseline (v1):** a deliberately general prompt. It failed 11 of 12 questions where an outdated policy disagrees with the current one.
2. **Prefer current, authoritative sources** fixed those, but answers began stating details their quotes didn't cover.
3. **Every specific detail needs a quote** brought unsupported claims back down.
4. **Final (v4):** a sharper test for when to refuse, and complete answers, aimed at two questions that failed in every one of 12 repeat runs.

Each prompt file in [`prompts/`](prompts/) records the evidence behind its rules in its header.

### Honest limits

- Prompts were revised against these 50 questions, so the final score is optimistic. A held-out set is next.
- Re-grading the same answers moved one verdict: a fair range for the final version is 98–100%.
- Knowledge base generated with Claude; gold answers drafted by human and corrected by me; graded by Gemini. No model grades its own output. All data is fictional.

## How it works

```
question ──► agent (Claude Opus 5.5)
               │  up to 3 × search_knowledge_base ──► Supabase pgvector (kb/ only, Voyage embeddings)
               ▼
             submit_answer ──► Zod validation ──► one retry with the issues quoted ──► else abstain
               ▼
             answer: text, citations, confidence, needs_review, abstained, conflict_detected

test set ──► run all 50 ──► Gemini grades + code checks behavior and review flags ──► Report Card
                                             └─► blind 20-answer sample ──► human agreement
```

Key product decisions:

- **Abstention is a feature.** "I can't answer this" is tested as hard as a correct answer.
- **The grader is graded.** Gemini, a different model family from the agent, grades every answer. Human review of blind samples found a rubric gap (confidence wasn't being checked); adding a fifth check brought grader–human agreement to 60 of 60.
- **One agent, one tool.** Each question is answered independently, with no conversational memory, so every failure has one place to look.
- **A strict answer contract.** A Zod schema ([`src/schema.ts`](src/schema.ts)) enforces cross-field rules. For example, a refused answer must be empty, and a conflict must cite at least two sources.
- **Prompts, not fine-tuning,** so every change stays explainable.
- **Only `kb/` is ever retrieved.** The test set and answer key in `eval/` never reach the agent.

## Running it yourself

You need Node.js 22 or newer (tested on 24), a Supabase project, and API keys for Anthropic, Voyage AI and Google Gemini (Gemini only for grading).

1. Install dependencies and create your environment file:

   ```bash
   npm install
   cp .env.example .env
   ```

   Fill in `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VOYAGE_API_KEY`, `ANTHROPIC_API_KEY` and `GEMINI_API_KEY`. The `.env` file is gitignored.

2. Create the retrieval tables: run [`supabase/migrations/20261103000000_kb_retrieval.sql`](supabase/migrations/20261103000000_kb_retrieval.sql) in your Supabase project's SQL Editor. It enables pgvector and creates `kb_documents`, `kb_chunks` and the `match_kb_chunks` search function.

3. Embed the knowledge base and check retrieval:

   ```bash
   npm run ingest
   npm run search -- "Do you encrypt customer data at rest?"
   ```

4. Start the demo at http://localhost:3000:

   ```bash
   npm run dev
   ```

### Evaluation commands

| Command | What it does |
|---|---|
| `npm run agent -- --questions eval/gold-set-v0.6.csv` | Runs the agent on every test question (only the question text is read) and writes `runs/<run_id>.json`. Add `--prompt-version v1` to reproduce the baseline |
| `npm run grade -- --run runs/<run_id>.json` | Gemini grades a run and writes `grades/<run_id>.json`, plus a blind 20-answer sample for human grading |
| `npm run agreement -- --grades grades/<run_id>.json` | Compares your filled-in human sample with the grader |
| `npm run rescore -- --run runs/<run_id>.json` | Re-applies the code-decided checks to stored verdicts, with no API calls |
| `npm run check`, `check:agent`, `check:grader` | Offline self-tests for the schema, agent loop and grader (no API calls) |

### Deploying to Vercel

Import the repo into Vercel; it builds with `npm run build`. Then:

- Add `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` under **Settings → Environment Variables**, for the **Production** environment, using exactly those names, and redeploy. The Report Card works without them.
- To make the site public, turn off **Vercel Authentication** under **Settings → Deployment Protection**. With the keys set, anyone with the link can run questions on your API accounts.
- Pages read data files at request time, so those files are bundled explicitly in [`next.config.ts`](next.config.ts) (`DATA_FILES`). Add any new data folder there.

## Repository layout

| Path | Contents |
|---|---|
| [`kb/`](kb/) | The fictional vendor's 32 policy documents, the agent's only source of truth, including deliberate traps |
| [`eval/`](eval/) | Test set, grading guide and knowledge-base answer key. Never retrieved by the agent |
| [`prompts/`](prompts/) | System prompts v1–v4 and few-shot examples |
| [`src/agent/`](src/agent/) | The agent loop, tools and prompt loading |
| [`src/kb/`](src/kb/) | Chunking, embeddings and retrieval |
| [`src/grade/`](src/grade/) | Rubric, grader and Report Card metrics |
| [`scripts/`](scripts/) | CLI entry points and offline self-tests |
| [`app/`](app/) | Next.js demo: landing page, Ask, Questionnaire and Report Card |
| [`runs/`](runs/), [`grades/`](grades/) | Recorded runs and their graded Report Cards |
| [`docs/`](docs/) | [PRD](docs/PRD-cited.md) (what and why) and [Agent Spec](docs/AGENT-SPEC-cited.md) (how, with a change log of every decision) |

## Stack

TypeScript · Next.js on Vercel · Supabase Postgres + pgvector · Voyage AI embeddings · Claude Opus 5.5 (agent) · Gemini 3.1 Pro (grader) · Zod

---

Built by John Strifas as a portfolio project for Enterprise AI Platform PM roles.

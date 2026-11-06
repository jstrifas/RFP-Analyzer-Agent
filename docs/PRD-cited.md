# Product Requirements Document: Cited — RFP Response Agent + Agent Report Card

**Author**: John Strifas
**Date**: September 26, 2026
**Status**: Draft (Phase 1 spec)
**Stakeholders**: Portfolio audience — hiring managers for Enterprise AI Platform PM roles
**Target build budget**: 5–10 hours/week, ~6 weeks

---

## 1. Executive Summary

Cited is an AI agent that drafts source-backed answers to enterprise security questionnaires for a B2B SaaS vendor, plus a Report Card that measures whether those answers can be trusted. The agent is the subject; the Report Card is the product thesis: **an enterprise agent is only as valuable as your ability to prove it works.** Phase 1 ships one agent, one gold-standard test set, and a dashboard that shows reliability improving across versions.

## 2. Background & Context

**The problem.** Before an enterprise buys software, its security team sends the vendor a questionnaire, often 100–300 questions (the Cloud Security Alliance's CAIQ is a common public standard). Answering it pulls sales engineers and security staff off real work for days. Wrong answers create legal and trust risk, so teams don't blindly accept AI drafts.

**Why now.** LLMs can now draft these answers well. The bottleneck has moved from *generating* answers to *trusting* them. Most AI RFP tools sell speed; few show evidence of accuracy. That gap — evaluation, confidence, and knowing when to say "I don't know" — is the core problem enterprise AI platform teams are solving right now.

**Portfolio context.** Existing projects (LotPrice, Clinical Transcribe, TelemetrySpend) show the ability to build. Cited demonstrates the judgment an Enterprise AI Platform PM is hired for: defining "good," measuring it, and shipping improvements against evidence rather than vibes.

**Scenario.** The vendor is **Tidewell Data**, a fictional mid-market SaaS data platform. All knowledge-base content is invented and written for this project. No real customer or employer data is used. The buyer is **Spartan Apex Benefits**, a fictional mid-market benefits administration platform that handles health-plan and payroll data. That profile is why its questionnaire asks about HIPAA, PCI DSS, and FedRAMP (the last via a generic questionnaire template). Spartan Apex Benefits never appears in the knowledge base or gold set; it exists only to make the demo scenario concrete.

## 3. Objectives & Success Metrics

**Goals**
1. Draft cited answers to a real-format security questionnaire from a controlled knowledge base.
2. Make the agent say "I can't answer this" instead of guessing when the knowledge base lacks the answer.
3. Measure answer quality automatically, with a grader that is itself validated against human judgment.
4. Show a measurable reliability improvement between v1 and v2 of the agent, driven by Report Card findings.

**Non-Goals**
1. **Multi-agent orchestration** — one agent with retrieval is sufficient; more agents add complexity without improving the story.
2. **Voice, vision, or file types beyond text/PDF/CSV questionnaires** — not relevant to the job.
3. **Auth, multi-tenancy, or real customer onboarding** — this is a proof point, not a SaaS business.
4. **Fine-tuning** — prompt, retrieval, and schema changes only, so improvements are explainable.
5. **Full CAIQ coverage** — a curated subset is enough to prove the method.

**Success Metrics** (measured on the gold set; v1 = first working version)

| Metric | v1 Baseline | Phase 1 Target | Measurement |
|---|---|---|---|
| Answer correctness | Measured at v1 | ≥ 85% | Rubric-graded against gold answers |
| Citation precision | Measured at v1 | ≥ 95% | % of citations that actually support the claim |
| Unsupported-claim rate | Measured at v1 | ≤ 3% | % of answers containing a claim not in the knowledge base |
| Correct abstention | Measured at v1 | ≥ 10 of 11 | 11 deliberately unanswerable questions flagged for review (10 planned gaps + the ISO 27001 injection question) |
| Confidence calibration | Measured at v1 | ≥ 95% | Correctness rate of answers marked "high confidence" |
| Grader–human agreement | — | ≥ 85% | Human grades 20 random answers; compare to automated grader |
| Improvement v1 → v2 | — | ≥ +15 pts on correctness | Report Card version comparison |
| Cost per 50-question run | Measured at v1 | Reported, not targeted | API token cost logged per run |

## 4. Target Users & Segments

**Primary user (in-product): Proposal / sales engineering manager at a mid-market B2B SaaS vendor.**
Job: return a complete, accurate security questionnaire fast enough not to stall the deal. Current workaround: copy-paste from last year's answers and a shared spreadsheet, then chase security staff for gaps. Pain: slow, inconsistent, and risky when old answers are outdated.

**Secondary user (in-product): AI platform owner / reviewer.**
Job: decide whether an agent is reliable enough to trust, and catch regressions when prompts or models change. This user owns the Report Card.

**Evaluating audience (outside product): Hiring managers for Enterprise AI Platform PM roles.**
They judge the case study, not the UI. They should leave with a clear answer to "does this person know how to define, measure, and improve AI quality?"

## 5. User Stories & Requirements

**P0 — Must Have**

| # | User Story | Acceptance Criteria |
|---|---|---|
| P0-1 | As a proposal manager, I upload a questionnaire and get a draft answer for every question. | Accepts CSV (question ID + text). Every question returns a response in the output schema. A 50-question run completes in under 5 minutes. |
| P0-2 | As a proposal manager, I see where each answer came from. | Every answer includes one or more citations linking to a specific knowledge-base passage. Clicking a citation shows the passage. |
| P0-3 | As a proposal manager, I know which answers need my attention. | Each answer has a confidence level (high / medium / low) and a needs-review flag. Unanswerable questions return "Insufficient information" with the flag set, never a guess. |
| P0-4 | As a platform owner, I run the full gold set with one command and get a scored report. | Runner executes all gold questions, grades each on correctness, citation support, and abstention, and stores results with a version tag. |
| P0-5 | As a platform owner, I compare two agent versions side by side. | Dashboard shows each metric from Section 3 per version, plus the list of questions that got better or worse. |
| P0-6 | As a platform owner, I trust the grader. | 20 randomly sampled answers are human-graded; agreement rate with the automated grader is shown on the dashboard. |

**P1 — Should Have**

| # | User Story | Acceptance Criteria |
|---|---|---|
| P1-1 | As a proposal manager, I approve or edit an answer so the agent reuses it next time. | Approved answers are written back to the knowledge base as a new source and are retrievable on the next run. |
| P1-2 | As a platform owner, I see why an answer failed. | Each failed item is tagged with a failure type: retrieval miss, wrong source, unsupported claim, bad abstention, or formatting. |
| P1-3 | As a hiring manager, I can try it without setup. | Public demo with a preloaded sample questionnaire and a read-only Report Card. |

**P2 — Nice to Have / Future**

| # | User Story | Acceptance Criteria |
|---|---|---|
| P2-1 | As a platform owner, I evaluate any agent, not just Cited. | Report Card exposed as an MCP server that accepts an agent endpoint and a gold set. |
| P2-2 | As a platform owner, I'm alerted when a change makes things worse. | A run that drops any P0 metric by more than 5 points is marked as a regression. |
| P2-3 | As a proposal manager, I export the finished questionnaire. | Export to CSV/XLSX in the original question order. |

## 6. Solution Overview

**Build details** (schemas, prompts, tools, memory, evaluation, and failure behavior) live in `AGENT-SPEC-cited.md`. This PRD covers what and why; the spec covers how.

**User flow.** Upload questionnaire → agent retrieves relevant knowledge-base passages per question → returns structured answers → user reviews flagged items → approves or edits. Separately: platform owner runs the gold set → Report Card grades → dashboard compares versions.

**Answer schema (the contract everything depends on):**
`question_id`, `answer`, `citations[]` (source ID + passage), `confidence` (high / medium / low), `needs_review` (boolean), `abstained` (boolean), `reasoning_note` (one line).

**Key design decisions**
- **Abstention is a feature, not a failure.** The agent is instructed and tested to refuse when sources don't support an answer. This is the most important enterprise behavior and the easiest to demo.
- **The grader is graded.** Automated LLM grading is only credible if checked against a human sample. The agreement rate is shown, not hidden.
- **Schema first, eval second, UI last.** The Report Card cannot exist until output is structured.

**Knowledge base.** ~25–40 invented Tidewell Data documents: security policy, SOC 2 summary, data retention policy, incident response plan, subprocessor list, encryption standards, access control policy, and product FAQ. Deliberate gaps are left so some questions are truly unanswerable.

**Gold set.** 50 CAIQ-style questions: 39 answerable (with human-written gold answers and expected sources) and 11 that should be abstained on (10 planned gaps plus the ISO 27001 injection question). See `gold-set/GOLD-SET-cited-v0.1.csv`.

**Technology (proposed).** Next.js on Vercel; Supabase Postgres with pgvector for retrieval and run storage; Claude API for generation and grading; Zod for schema validation; eval runner as a script writing results to Supabase; dashboard as a page in the same app.

**Assumptions (unproven)**
1. An LLM grader with a clear rubric can reach ≥85% agreement with human grading on this task.
2. A curated 50-question gold set is large enough to show a meaningful v1→v2 difference.
3. Hiring managers will spend more time on the Report Card than on the answer UI.
4. Invented documents are realistic enough that the demo reads as credible to someone who has handled real questionnaires.

## 7. Open Questions

| Question | Owner | Deadline |
|---|---|---|
| Circularity risk: the author writes both the knowledge base and the gold answers. Is a second reviewer needed for a sample of gold answers, or is disclosure in the case study enough? | John | Before gold set is finalized (Week 2) |
| ~~Should the grader use a different model than the agent?~~ **Resolved:** Gemini API grades and Claude answers. See the agent spec. | John | Closed |
| Is 11 abstention questions (22% of the set) enough to measure abstention? | John | Week 2 |
| ~~Should the gold set and knowledge base be published openly so others can reproduce the results?~~ **Resolved (Nov 5, 2026):** yes, published with the code in the public repo so the Report Card can be reproduced. The agent never reads the repo, so the scores stay valid. | John | Closed |

## 8. Timeline & Phasing

Relative timeframes, assuming 5–10 hours/week.

| Phase | Weeks | Deliverable | Exit criteria |
|---|---|---|---|
| 1a. Foundation | 1–2 | Tidewell Data knowledge base, gold set (50 Qs), answer schema | Gold set reviewed; schema locked |
| 1b. Agent v1 | 2–3 | Retrieval + structured answers + basic review UI (P0-1 to P0-3) | Full gold set runs end to end |
| 1c. Report Card | 4 | Eval runner, grader, human-agreement check, dashboard (P0-4 to P0-6) | v1 baseline recorded |
| 1d. Agent v2 | 5 | Fixes driven by Report Card failure analysis | Measurable improvement vs. v1 |
| 1e. Ship | 6 | Public demo (P1-3), case study in TelemetrySpend format | Live link + write-up published |

**Dependency rule:** the Report Card does not start until the agent returns schema-valid output for every gold question.

**Phase 2 (not specced):** approval write-back memory (P1-1), failure tagging (P1-2), MCP-exposed Report Card (P2-1), regression alerts (P2-2).

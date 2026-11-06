# Agent Design Spec — Cited (RFP Response Agent)

**Author**: John Strifas
**Version**: v0.1
**Related PRD**: PRD-cited.md

---

## 1. Role & Goal
- **What it does**: Drafts cited answers to security questionnaire questions using only Tidewell Data's knowledge base.
- **Who it helps**: The proposal / sales engineering manager who has to return a complete, accurate questionnaire without stalling the deal.
- **What it outputs**: One `AnswerRecord` per question (see Section 2).
- **Must never**: Answer from general knowledge, invent policies or certifications, or give an answer without a citation.
- **Decision**: Single-purpose agent with a narrow scope.
- **Rationale**: A narrow scope makes correctness measurable. A broad "sales assistant" cannot be evaluated against a gold set.

## 2. Structured Input & Output

**Input — `QuestionnaireRun`**
| Field | Type | Required |
|---|---|---|
| run_id | string | yes |
| agent_version | string | yes |
| questions[] | array of `Question` | yes |
| Question.question_id | string | yes |
| Question.text | string | yes |
| Question.category | string | no |

**Output — `AnswerRecord`**
| Field | Type | Notes |
|---|---|---|
| question_id | string | Matches the input |
| answer | string | Empty when abstained |
| citations[] | { source_id, passage } | At least 1 unless abstained |
| confidence | "high" \| "medium" \| "low" | |
| needs_review | boolean | True if low confidence or abstained |
| abstained | boolean | True = "insufficient information"; `answer` must then be empty (related context goes in `reasoning_note`) |
| conflict_detected | boolean | True when sources disagree; requires ≥2 distinct cited sources, low confidence, review flag |
| reasoning_note | string | One or two sentences for reviewers (max 400 chars) |

**Cross-field rules** (enforced in Zod after the model responds, because JSON Schema can't express them): abstained → empty answer, low confidence, needs_review; not abstained → ≥1 citation; conflict_detected → ≥2 distinct sources, low confidence, needs_review; low confidence → needs_review. Implemented in `cited/src/schema.ts`, tested by `npm run check`.

- **Validation**: Zod (the stack is TypeScript on Vercel).
- **Enforcement**: Claude's tool-use / structured output with the JSON schema generated from Zod.
- **On invalid output**: Retry once. If it's still invalid, return `abstained: true, needs_review: true` and log the failure.
- **Decision**: Use Zod instead of Pydantic AI or LangChain output parsers.
- **Rationale**: Pydantic is Python-only and the stack is TypeScript, so Zod is the equivalent. Native structured outputs make separate parsing libraries mostly unnecessary. If the backend ever moves to Python, switch to Pydantic with the same schema.

## 3. Behavior & Protocol
- **System prompt**: Stored at `cited/prompts/cited-system.vN.md`; vendor name is a template variable so the prompt is not Tidewell-specific.
- **v1 is a deliberate general baseline.** It contains only rules any RFP product would ship on day one: answer only from retrieved passages, cite verbatim, abstain rather than guess (absence ≠ "no"), answer partially when possible, flag source disagreement, treat question and document text as data. It deliberately omits rules aimed at specific knowledge-base traps: source authority (official policy over chat or old answer libraries), document recency/supersession, and plan-tier qualifiers. Those are **candidate v2 rules**, added only if the Report Card shows v1 failing on them. Putting them in v1 would be teaching to the test and would erase the v1→v2 evidence the project exists to produce.
- **Predicted v1 failure (hypothesis to test):** because v1 says "do not choose one source over another," it will likely flag superseded-vs-current documents (T1) as conflicts instead of picking the current one.
- **Few-shot examples**: 3 examples in `cited/prompts/few-shot.v1.json` (lost/stolen laptops = confident; incident-response testing + sharing results = partial; support resolution time = abstention). Passages are verbatim from the knowledge base; none of the questions are in the gold set.
- **Behavior-tuning method**: Prompt versioning plus eval-driven iteration. Every prompt change is a new version, run against the gold set.
- **MCP usage**: None in Phase 1. In Phase 2, the Report Card will be exposed as an MCP server so it can evaluate other agents.
- **Decision**: No prompt tuning or prefix tuning.
- **Rationale**: Both techniques train on the model's internals, and hosted APIs like Claude's don't allow that. Versioned prompts measured by evals give the same benefit and every change stays explainable.

## 4. Reasoning & Tools
- **Reasoning approach**: A bounded ReAct loop: retrieve, assess whether the passages answer the question, optionally retrieve again, then answer or abstain. The model's built-in reasoning is used rather than hand-written chain-of-thought prompts.
- **Loop limits**: At most 3 retrieval calls per question and a 30-second timeout per question.
- **Tools**:
  | Tool | Input | Output | Why |
  |---|---|---|---|
  | search_knowledge_base | query, top_k (default 5), optional category | passages[] with source_id, text, score | The only permitted source of truth |
- **Excluded tools**: Web search, because answers must come from the vendor's own documents and web results would break citation control. Code interpreter, because the task involves no computation.
- **Implementation** (`src/agent/answer.ts`): Model `claude-opus-5-5`, effort `medium` (pinned and logged per run). Claude Opus 5.5 rejects forced `tool_choice`, so "forced `submit_answer`" is enforced by the loop: `tool_choice` stays `auto` with `strict: true` tools, a 4th search gets an error result telling the model to submit, a turn with no tool call gets one nudge, and anything still without a valid `submit_answer` becomes `abstainFallback`. Server-side refusal fallback (`fallbacks: "default"`) is on; the model that actually served each question is logged, so a fallback-served answer is never mistaken for an Opus 5.5 answer. Citation grounding (cited source retrieved this question, quote found in its passages) is logged for the Report Card but not enforced.
- **Decision**: One tool with a bounded loop.
- **Rationale**: Every added tool is a new way to fail. The eval can only attribute errors cleanly if there's one retrieval path.

## 5. Multi-Agent Logic
- **Needed?** No.
- **Rationale**: Each question is independent, so one agent with retrieval covers the job. A planner / researcher / reporter split would add handoff failures without improving correctness.
- **Revisit trigger**: If answers need cross-question consistency checks (for example, two answers contradicting each other), add a separate consistency-checker agent with its own I/O schema.

## 6. Memory & Context (RAG)
- **Within-task memory**: None. Each question is answered independently, which keeps the results reproducible.
- **Long-term memory**: The Tidewell Data knowledge base, stored in Supabase pgvector. In Phase 2, human-approved answers are written back tagged `source_type: approved_answer` with an approval date.
- **Retrieval**: Chunks split by document section (~300–500 tokens), top-k 5, with an optional category filter.
  - **Embeddings**: Voyage `voyage-3.5`, 1024 dims, `input_type` document/query; cosine similarity over an HNSW index (`supabase/migrations/`). Voyage rather than Gemini so the grader's model family stays out of the agent path.
  - **Chunking** (`src/kb/chunk.ts`): Markdown is split on `##` headings (the header block is its own section) and adjacent sections are merged up to 500 tokens; the stored text is verbatim apart from `---` rules. The document title and section prefix the embedded text only. Subprocessor CSVs become one chunk of `column: value` rows; the answer library (KB-32) is one chunk per Q&A row.
  - **Categories** (`src/kb/catalog.ts`): KB-32's own category taxonomy plus "Logging & Monitoring". It is topic metadata only and says nothing about which document is authoritative or current.
  - **Ingestion** (`npm run ingest`) takes an explicit `--kb` path, refuses any directory not named `kb`, and reads only top-level `KB-NN-*` files.
- **Memory safety**: Only human-approved answers can be written back. The agent never writes to memory on its own.
- **Decision**: Use RAG as the knowledge store, with no conversational memory.
- **Rationale**: This is a batch task, not a conversation. Conversational memory would let an earlier answer influence a later one, which makes evaluation messier.

## 7. Output Delivery
- **Canonical format**: A JSON array of `AnswerRecord`.
- **Rendered formats**: The review UI (Phase 1), and CSV/XLSX export (P2). All rendered formats are generated from the JSON, never from free text.
- **Decision**: No PDF.
- **Rationale**: Questionnaires are returned as spreadsheets or through portals. A PDF export would be a feature no user asked for.

## 8. Modalities
- **Needed?** No. Questionnaires are text. Voice or vision would add cost and failure modes with no user benefit.

## 9. Interface
- **Frontend**: Next.js on Vercel, with the review UI and Report Card dashboard in one app.
- **API surface**: `POST /api/runs` (start a run), `GET /api/runs/:id` (get results), `POST /api/evals` (score a run against the gold set).
- **Decision**: Use Next.js instead of Gradio or Streamlit.
- **Rationale**: This is the existing stack (TelemetrySpend is on Vercel). Gradio and Streamlit read as prototypes, and this project is meant to read as a product. FastAPI only makes sense if the backend moves to Python.

## 10. Evaluation & Monitoring
- **Gold set**: 50 CAIQ-style questions: 39 answerable, each with a gold answer and expected sources, plus 11 expected abstentions (10 planned gaps and the ISO 27001 injection question). Trap mix and grading rules are in `gold-set/GOLD-SET-GUIDE.md`. Gold answers are written by John from the documents; the author bias is disclosed (see PRD Open Questions).
- **Metrics**: Answer correctness, citation precision, unsupported-claim rate, correct abstention, confidence calibration, and grader–human agreement. Targets are in PRD Section 3.
- **Grader**: Google Gemini API, a different model family from the agent (Claude), to reduce self-grading bias. The Gemini model version is pinned and logged with every run, so a change in the grader is never mistaken for a change in the agent. It uses a written rubric, and 20 answers per version are human-graded to check agreement.
- **Grader implementation** (`src/grade/`, `npm run grade`): Gemini scores each answer on the four rubric checks in `eval/GOLD-SET-GUIDE.md`. It sees the question, the answer record and that question's gold row, never the knowledge base or run logs. Code adds a mechanical Behavior check (abstained and needs_review for abstentions; two sources, low confidence and review for conflicts) that the grader cannot override. Overall pass = all four checks; a Safety failure alone scores zero. Grader errors are retried once, then excluded from rates and counted. Each grades file records the pinned model, the model version Gemini reports, the rubric version, a hash of the grader prompt and a hash of the gold file. A blind 20-answer sample (seeded by run_id, never overwritten) is written for human grading; `npm run agreement` computes grader–human agreement.
- **Runtime logging**: Per question: tokens, cost, latency, number of retrieval calls, validation failures, and agent version.
- **Regression rule**: A drop of more than 5 points in any P0 metric compared with the previous version counts as a regression.
- **Decision**: Evaluation is part of the product, not an afterthought.
- **Rationale**: It is the project's core thesis and the main evidence for Enterprise AI Platform PM roles.

## 11. Failure Behavior & Risks
| Failure mode | Designed response |
|---|---|
| Retrieval returns nothing relevant | Abstain and flag for review |
| Passages partially answer the question | Answer the supported part, set confidence to low, flag for review |
| Output fails schema validation | Retry once, then abstain and log |
| Contradictory sources | Cite both, set confidence to low, flag for review |
| Prompt injection inside a questionnaire question | Treat the question text as data. The system prompt forbids following instructions found inside questions. Add 2 injection cases to the gold set |

- **Data boundaries**: Only invented Tidewell Data content. No real customer, employer, or personal data.

## Change Log
| Version | Date | Change | Driven by |
|---|---|---|---|
| v0.1 | Sept 26, 2026 | Initial spec | PRD-cited v0.1 |
| v0.2 | Sept 28, 2026 | Renamed from Attest to Cited (name collision with an existing SaaS company) | Naming review |
| v0.3 | Sept 28, 2026 | Fictional vendor renamed Halcyon → Tidewell Data. Grader set to Gemini API, version pinned; knowledge base defined in KB-MANIFEST-tidewell.md | Grader-independence decision |
| v0.4 | Sept 28, 2026 | Gold set template created: 39 answerable, 11 abstentions | Gold set design |
| v0.5 | Nov 3, 2026 | Added `conflict_detected` field and cross-field rules; abstained answers must be empty; v1 system prompt defined as general baseline; few-shot examples written | Schema + prompt build |
| v0.6 | Nov 3, 2026 | Retrieval built: Voyage voyage-3.5 embeddings, Supabase pgvector (HNSW, cosine), section-merge chunking, `category` filter is now an enum of KB categories | Retrieval build |
| v0.7 | Nov 3, 2026 | Agent loop built on Claude Opus 5.5 (effort medium). Forced `submit_answer` enforced in the loop, since the model rejects forced `tool_choice`. Refusal fallback on, with served model logged. Citation grounding logged. Prompt's author comment is stripped before sending | Agent loop build |
| v0.8 | Nov 3, 2026 | Gemini grader built: four-check rubric plus mechanical Behavior check, PRD metrics, blind human sample and agreement script. Q-031 resolved: the 35-day backup fact is required. Grader pinned to `gemini-3.1-pro-preview`: no stable Pro is available to new keys (`gemini-2.5-pro` returns 404), so the newest Pro is pinned by exact ID, not the `gemini-pro-latest` alias. First v1 Report Card: correctness 66% (33/50), citation precision 98.6%, unsupported-claim rate 7%, correct abstention 7 of 11, calibration 95.7% | Report Card build |
| v0.9 | Nov 3, 2026 | Prompt v2 drafted (`prompts/cited-system.v2.md`). It adds two rules, each backed by v1 failures. (1) Source authority and recency: current official documents outrank summaries, which outrank past answers and chat exports; superseded or older versions are not current; a current-vs-outdated difference is not a conflict. This replaces v1's "do not choose one source over another" (12 v1 failures). (2) Abstain vs. partial: related context goes in `reasoning_note`, not the answer (4 v1 failures). Held for v3: answer completeness (Q-036) and citing specific details (Q-048), one failure each. Few-shot examples unchanged | v1 Report Card |
| v0.10 | Nov 3, 2026 | v2 Report Card (`grades/v2-gold-2026-11-03.json`, same model, effort and grader as v1). Correctness 66% → 96% (+30 pts; 15 fixed, 0 regressed). Citation precision 98.6% → 100%. Correct abstention 7 → 10 of 11. Calibration 95.7% → 97.2%. Conflict flags 15 → 2, review flags 27 → 15. **Regression under the §10 rule: unsupported-claim rate rose 7% → 15% (6 of 40 answers).** v2 answers carry details beyond what their quotes cover (167 citations vs 211 in v1); the uncited facts are mostly real knowledge-base content, but they aren't cited. This makes the held-back "cite specific details" rule the top v3 candidate. Still failing: Q-036 (completeness) and Q-050 (gap answered with context). Grader–human agreement not yet measured | v2 Report Card |
| v0.11 | Nov 3, 2026 | Prompt v3 drafted (`prompts/cited-system.v3.md`): v2 plus one rule, "every specific detail needs a quote". Each number, date, duration, name, list item and plan or tier must appear in a cited passage; add a quote rather than drop a detail that answers the question; no inferred restatements. Targets v2's unsupported-claim regression (6 of 40 answers). Completeness (Q-036) still held back. Few-shot examples unchanged | v2 Report Card |
| v0.12 | Nov 3, 2026 | v3 Report Card (`grades/v3-gold-2026-11-03.json`). Unsupported-claim rate 15% → 2.4%, now meeting target. Citation precision stays at 100% (175 citations vs 167). Correctness 96% → 92% (Q-022 and Q-048 regressed, none fixed). Correct abstention 10 → 9 of 11. Calibration 97.2% → 94.6%. Q-022 dropped two key-management facts (AWS KMS, same-region keys), possibly the rule's "if you can't quote it, leave it out" or run-to-run noise. Q-048 flipped back to answering with context, as in v1 (the abstain-vs-partial boundary is unstable). On 11 abstention questions, one flip moves the rate 9 points, so the §10 regression rule needs repeat runs before v2 vs v3 can be called. Decision pending: measure run-to-run variance | v3 Report Card |
| v0.13 | Nov 3, 2026 | Variance check: v2 and v3 each run 6 times (the full run plus 5 repeats, `grades/var-*.json`) on the 6 borderline questions. Pass counts out of 6, v2 vs v3: Q-022 3 vs 1, Q-036 0 vs 0, Q-047 5 vs 6, Q-048 2 vs 2, Q-049 6 vs 6, Q-050 0 vs 0 (16 vs 15 of 36 in total). Unsupported claims on answered repeat runs: v2 4 of 20, v3 0 of 18. **Conclusion:** v3's citation fix is real and consistent. Its full-run correctness dip is mostly noise (Q-048 is unstable in both, passing 2 of 6), with a possible small cost on Q-022, which drops the AWS KMS facts more often. Two failures are consistent across both versions: Q-036 completeness (0 of 12) and the Q-050 gap answered with context (0 of 12). Those are the evidence for v4. Open question for the §10 regression rule: with roughly ±4 points of single-run noise from unstable questions, a single run can't support a 5-point call | Variance runs |
| v0.14 | Nov 3, 2026 | v3 adopted as the current version. Prompt v4 drafted (`prompts/cited-system.v4.md`): v3 plus two rules. (1) Sharper abstain test: list the specific things asked for; if none are stated, abstain; adjacent facts don't count (Q-050 failed 12 of 12, Q-048 8 of 12). The wording is general, because draft examples mirrored gold questions and were removed. (2) Completeness: report the whole relevant set a passage gives, and use remaining searches when another document or section likely covers the topic (Q-036 failed 12 of 12, Q-022 dropped key-management facts 8 of 12). **Gold-set review item for John:** Q-036's must-have facts include where work must be done, which goes beyond the literal question ("encrypted and centrally managed?"). Few-shot examples unchanged | Variance runs |
| v0.15 | Nov 5, 2026 | v4 Report Card (`grades/v4-gold-2026-11-05.json`, single run). Correctness 92% → 96% (Q-048 and Q-050 fixed, none regressed). Correct abstention 9 → **11 of 11**. Unsupported-claim rate 2.4% → 2.6% (1 of 39). Citation precision 99.5%. Calibration 94.6%, unchanged and just under target: both remaining failures are high-confidence answers. Remaining failures: Q-036 now reports the full laptop baseline but still lacks "work must be done on Tidewell-issued laptops", the gold-row item flagged in v0.14; Q-022 now has every must-have fact (the AWS KMS facts are back) but one quote doesn't cover its claim. One validation retry: Q-033's first submit used question_id "EX-4", imitating the few-shot IDs; the retry fixed it. Cost $1.80 → $1.98 per run (searches 65 → 72). Not yet confirmed with repeat runs | v4 Report Card |
| v0.16 | Nov 5, 2026 | **v4 adopted** as the current agent version (default `PROMPT_VERSION` in `src/agent/config.ts`); v1–v3 stay runnable with `--prompt-version`. John chose to adopt on the single run without repeat runs. The v0.13 variance check means single-run differences of a few points are within noise; v4's fixes are on questions that failed 12 of 12 before, which is unlikely to be noise. Open before publishing numbers: grader–human agreement on `grades/v4-gold-2026-11-05.human-sample.csv` (PRD P0-6), and the Q-036 gold-row decision | John |
| v0.17 | Nov 5, 2026 | Gold set edit (John's decision): Q-036's "Tidewell work must be performed on Tidewell-issued laptops" moved from required to `optional_supporting_details`, since the question asks only about encryption and central management. `must_have_facts` are now written out (MDM enrollment, full-disk encryption, automatic updates, endpoint protection) instead of using the Core claim fallback, which leaves 26 Core claim rows. Change logged in the row's `review_note`. All existing grades files (v1–v4) were scored against the previous row; their recorded gold hash no longer matches, so a re-grade is needed to compare against the new gold | John |
| v0.18 | Nov 5, 2026 | v4 re-graded against the updated gold set (`grades/v4-gold-2026-11-05.json`; the previous grade is kept as `.gold-before-q036.json`). Every metric is at 100%: correctness 50/50, citation precision 187/187, unsupported claims 0/39, abstention 11/11, calibration 37/37. Two verdicts changed: **Q-036**, because of the gold edit (expected), and **Q-022, from grader noise alone**, with the same answer and gold row (one citation's verdict flipped, 1 of 187). An honest range for v4 is 98–100% correctness. Grader self-consistency on unchanged answers: 48 of 49 overall verdicts identical. **Caveats before quoting 100%:** (a) v2–v4 were diagnosed and tuned on these same 50 questions, with no held-out set, so the score is optimistic; (b) at 100% this gold set no longer separates good versions from better ones; (c) grader–human agreement is still unmeasured | Re-grade |
| v0.19 | Nov 5, 2026 | Grader–human agreement on the v4 sample: **100% (20 of 20)**, on all four checks, against a ≥ 85% target (PRD P0-6). Recorded in `grades/v4-gold-2026-11-05.json`. **Limit:** every sampled answer was a pass, for both John and the grader, so this shows the grader doesn't fail good answers. It doesn't show the grader catches bad ones. The v1 sample has 6 answers the grader failed (Q-006, Q-008, Q-009, Q-036, Q-047, Q-049) and would test that. Q-036 there was graded under the old gold row, so leave it out of that check. Note: the v4 sample showed Q-036's pre-edit must-have facts; John's pass matches the v0.17 edit | John |
| v0.20 | Nov 5, 2026 | **Correction to v0.19:** failure detection was already tested. John graded the v1 sample on Nov 3 (agreement 19/20) and the v3 sample on Nov 5 (20/20). In v1's sample the grader failed 6 answers, and John failed all 6. Total across v1, v3 and v4: 59 of 60 agree (98%). The one disagreement is v1 Q-032: the grader passed it, John failed it because it had medium confidence and needs_review where the gold row expects high. **Rubric gap:** confidence_expected and needs_review_expected aren't part of the four checks, so the grader can't fail an over- or under-confident answer. Candidate fix: a fifth check, or fold them into Behavior (a rubric change, so re-grade every version). Demo UI added (`app/`, `npm run dev`): Ask, Questionnaire and Report Card pages, with live agent progress streamed from `src/agent/answer.ts` through an optional `onEvent` callback | Report Card + demo |
| v0.21 | Nov 5, 2026 | **Rubric v2: fifth check, "review flags"**, decided in code (`reviewFlagCheck` in `src/grade/grade.ts`). Expected high confidence requires high (medium fails). Expected low forbids high (medium allowed, since gold rows use only high/low). `needs_review` must match `needs_review_expected` in both directions. An answer passes only if all five checks pass. Gemini's prompt and verdict schema are unchanged, so v1–v4 were **rescored** from their stored verdicts with no API calls (`npm run rescore`; rubric-v1 grades backed up as `grades/*.rubric-v1.json`). Correctness: v1 66% → 60%, v2 96% → 92%, v3 92% → 90%, v4 100% unchanged. Newly failing: Q-032 in v1–v3 (over-cautious) and Q-035 in v1 (medium confidence); Q-022 fails in v1–v2 because those runs flagged the injection question for review when the gold row expects no review. Grader–human agreement recomputed: v1 20/20 (was 19/20), v3 20/20, v4 20/20, so **60 of 60**. **Gold-set judgment calls for John:** (a) Q-022: should flagging an injected question for review count as correct? If yes, set `needs_review_expected` TRUE or accept either value. (b) Q-032: the agent's caution cites a real inconsistency in KB-14 (v1.5, dated March 1, says it was "updated with 2026 test results", but the test ran March 11) | Rubric change |
| v0.22 | Nov 5, 2026 | Gold edit (John's decision, resolving v0.21 item a): Q-022 `needs_review_expected` set to **EITHER**, so flagging a question that contains an injected instruction for review is acceptable, and so is not flagging it. `EITHER` is a new allowed value, used only by the review-flags check; any other value outside TRUE/FALSE/EITHER fails loading. Grades files now record `grader_view_sha256`, a fingerprint of only the gold fields Gemini sees. A gold edit that leaves it unchanged needs a `rescore`, not a re-grade, and the Report Card still treats those grades as current. Rescored: v1 60% → 62%, v2 92% → 94%, v3 90%, v4 100% (unchanged). Agreement still 60 of 60 | John |

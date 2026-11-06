# Agent Design Spec — [Agent Name]

**Author**: John Strifas
**Version**: v0.1
**Related PRD**: [link]

> **How to use this template.** The PRD says *what* and *why*. This spec says *how the agent is built*. Every section must end in a **Decision** and a **Rationale**. "N/A" is a valid decision, but it needs a rationale and a trigger for revisiting it. Skipping a section silently is not allowed.

---

## 1. Role & Goal
- **What the agent does** (one sentence, starts with a verb):
- **Who it helps** (the job they're trying to get done):
- **What it outputs** (name the schema from Section 2):
- **What it must never do** (the boundaries):
- **Decision / Rationale:**

## 2. Structured Input & Output
- **Input schema** (fields, types, required/optional):
- **Output schema** (fields, types, required/optional):
- **Validation library** (Zod for TypeScript, Pydantic for Python):
- **Enforcement method** (native structured outputs / tool-use schema):
- **On invalid output** (retry count, then what):
- **Decision / Rationale:**

## 3. Behavior & Protocol
- **System prompt** (role, rules, refusal behavior); stored in the repo and versioned:
- **Few-shot examples** (how many, where they're stored):
- **Behavior-tuning method** (prompt versioning + eval-driven iteration; fine-tuning only when the weights are accessible and evals justify it):
- **MCP usage** (which tools or data are exposed or consumed via MCP, or N/A):
- **Decision / Rationale:**

## 4. Reasoning & Tools
- **Reasoning approach** (single call / ReAct loop / extended thinking):
- **Loop limits** (max tool calls per task, timeout):
- **Tools** (name, input, output, and why the agent needs each one):
- **Tools deliberately excluded** (and why):
- **Decision / Rationale:**

## 5. Multi-Agent Logic
- **Needed?** (Yes / No):
- **If yes:** roles, per-agent I/O schemas, orchestrator, handoff rules:
- **If no:** rationale and the trigger that would change it:
- **Decision / Rationale:**

## 6. Memory & Context (RAG)
- **Within-task memory** (conversation / summary / none):
- **Long-term memory** (vector store, what's written, who can write):
- **Retrieval** (chunking, embedding model, top-k, filters):
- **Memory safety** (what prevents bad data from being written back):
- **Decision / Rationale:**

## 7. Output Delivery
- **Canonical format** (JSON; everything else is rendered from it):
- **Rendered formats** (Markdown / CSV / XLSX / PDF):
- **Decision / Rationale:**

## 8. Modalities (Voice / Vision)
- **Needed?** (Yes / No, with rationale):

## 9. Interface
- **Frontend** (framework, hosting):
- **API surface** (endpoints or MCP server):
- **Decision / Rationale:**

## 10. Evaluation & Monitoring
- **Gold set** (size, composition, who wrote it):
- **Metrics** (with targets):
- **Grader** (method, model, human-agreement check):
- **Runtime logging** (tokens, cost, latency, tool calls, errors):
- **Regression rule** (what counts as "worse"):
- **Decision / Rationale:**

## 11. Failure Behavior & Risks
- **Known failure modes and the designed response to each:**
- **Data and security boundaries:**
- **Decision / Rationale:**

## Change Log
| Version | Date | Change | Driven by (eval finding / decision) |
|---|---|---|---|

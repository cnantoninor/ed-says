---
description: DDD bounded context — LLM Judging (comprehension question generation and rubric-based answer scoring)
globs: src/llmj/**/*.ts
---

# LLM Judging (LLMJ) — Bounded Context

## Subdomain Classification

**Type**: Supporting Domain
**Why**: LLM-based comprehension evaluation amplifies the Core Domain's epistemic debt model but is not itself the formula. It is a sophisticated supporting capability — differentiating in combination with scoring, but replaceable in principle (a different evaluation mechanism could produce `GraspScore` values).

## Purpose

The LLM Judging context uses AI language models to evaluate how well a PR author understands the code they changed. It generates comprehension questions at a specified epistemic level, receives author answers (via GitHub review threads), and scores those answers against a 4-axis rubric. The output is a `GraspScore` that feeds back into the epistemic debt formula.

> **Note**: This entire context is a Phase 3 stub. All service functions currently return placeholder values.

## Ubiquitous Language

| Term | Definition |
| --- | --- |
| **LLMJ** | LLM Judge — the AI-powered component that generates questions and scores answers |
| **Comprehension Question** | A domain-relevant question generated at a specific epistemic level to probe author understanding |
| **Epistemic Level** | The layer of understanding being tested: requirements, specification, implementation, or validation |
| **Author Answer** | The PR author's response to a comprehension question, provided as a GitHub review comment reply |
| **Scoring Prompt** | The prompt sent to the LLM containing the patch, the question, and the author's answer, requesting a rubric evaluation |
| **Question Prompt** | The prompt sent to the LLM to generate N questions for a component at a given level |
| **Rubric Axis** | One of four evaluation dimensions: causality, counterfactuals, edge case awareness, cross-boundary coherence |
| **Axis Score** | An integer 0–4 for one rubric axis |
| **Total Rubric Score** | Sum of all axis scores; maximum 16 |
| **Grasp** | Comprehension score derived from rubric: `(rubricScore / 16) × complexity` |
| **Provider** | The LLM backend: `openai`, `anthropic`, or `ollama` |

## Domain Model

### Entities

_None_ — question and scoring interactions are stateless; state is managed by the GitHub review thread (external system) or the Ledger context.

### Value Objects

| Value Object | Equality | Notes |
| --- | --- | --- |
| `GeneratedQuestion` | By `component` + `level` + `question` text | Immutable; optionally includes `filePath` and `line` for inline placement |
| `ScoringResult` | By `axes[]` + `totalScore` | Immutable; `totalScore` must equal sum of all axis scores |
| `RubricAxisScore` | By `axis` name + integer `score` (0–4) | Bounded: score ∈ [0, 4] |

### Aggregate Roots

_None_ — this context produces value objects consumed by Scoring; no consistency boundary to protect.

### Domain Services

| Service | Location | Responsibility |
| --- | --- | --- |
| `createModel()` | `src/llmj/provider.ts` | **Phase 3 stub** — factory for Vercel AI SDK model instances; supports openai, anthropic, ollama |
| `generateQuestions()` | `src/llmj/questioner.ts` | **Phase 3 stub** — generates N comprehension questions for a `ComponentDiff` at a given `Level` using AI SDK `generateObject()` |
| `scoreAnswer()` | `src/llmj/scorer.ts` | **Phase 3 stub** — evaluates an author's answer against the 4-axis rubric; returns `ScoringResult` |

### Prompt Templates (Domain Knowledge)

| Template | Location | Description |
| --- | --- | --- |
| `SYSTEM_PROMPT` | `src/llmj/prompts.ts` | Defines the LLM's role as "Ed, an epistemic debt analyzer"; establishes rubric axis definitions and 0–4 scoring scale |
| `QUESTION_PROMPT_TEMPLATE` | `src/llmj/prompts.ts` | Parameterized by `component`, `patch`, `level`, `signal`, `count`; requests JSON array of question strings |
| `SCORING_PROMPT_TEMPLATE` | `src/llmj/prompts.ts` | Parameterized by `patch`, `question`, `answer`; requests JSON with axis scores and reasoning |

## Business Rules & Invariants

1. **4 rubric axes, each scored 0–4**: Causality, Counterfactuals, Edge Case Awareness, Cross-Boundary Coherence.
2. **Maximum total rubric score is 16** (4 × 4).
3. **Axis score semantics are fixed**:
   - 0: No evidence of understanding
   - 1: Surface-level (what, not why)
   - 2: Partial understanding with gaps
   - 3: Solid understanding with minor gaps
   - 4: Deep understanding with clear justification
4. **Grasp formula**: `Gc = (rubricScore / 16) × Cs`. A perfect score of 16 means grasp equals complexity (full comprehension).
5. **LLM provider is swappable**: The `createModel()` factory abstracts provider differences; the rest of the context must not contain provider-specific logic.
6. **Question output must be a JSON array of strings**: The question prompt explicitly requests this format for structured parsing.
7. **Scoring output must be JSON with axes and reasoning**: Each axis includes a numeric score and a text reasoning field.
8. **Questions are generated per-level**: The `Level` parameter controls the epistemic focus of generated questions (requirements vs. implementation, etc.).

## Relationships with Other Contexts

| Context | Relationship | Shared Surface |
| --- | --- | --- |
| **Scoring** | Downstream consumer of LLMJ output — `GraspScore` feeds into Grasp formula | `GraspScore`, `RubricAxisScore` |
| **GitHub** | Peer — review threads provide the channel for question delivery and answer collection | `GeneratedQuestion` (file path + line for inline placement) |
| **Core Domain** | Upstream — invokes LLMJ during Phase 3 pipeline | `Level`, `ComponentDiff` |
| **Utils** | Shared Kernel — imports logger | `logger` |

## Implementation Notes

- **Phase 3 (stub — not yet active)**: All functions return placeholder/zero values with "Not yet implemented" notes
- `provider.ts` — will use `@ai-sdk/openai` and `@ai-sdk/anthropic` packages
- `questioner.ts` — will use AI SDK `generateObject()` with a Zod schema for question array validation
- `scorer.ts` — will use AI SDK `generateObject()` with a Zod schema for axis scores + reasoning
- Config fields `llmj.provider`, `llmj.model`, `llmj.temperature`, `llmj.rubricVersion` control runtime behavior

---
description: DDD bounded context — Epistemic Scoring (debt formula, grasp, rubric, aggregation)
globs: src/scoring/**/*.ts
---

# Epistemic Scoring — Bounded Context

## Subdomain Classification

**Type**: Core Domain
**Why**: The epistemic debt formula and rubric-based comprehension model are the intellectual heart of Ed Says. This context encodes the key domain insight — that risk is proportional to both complexity and the team's knowledge gap — and distinguishes this tool from generic complexity analyzers.

## Purpose

The Epistemic Scoring context applies the Ed formula to compute per-component debt, evaluates author comprehension via a 4-axis rubric (Phase 3), aggregates component-level scores into a PR-level result with level-weighting, and classifies the result into severity bands. It is the computational core of the domain.

## Ubiquitous Language

| Term | Definition |
| --- | --- |
| **Epistemic Debt Score** | The numeric risk value for one component: `Cs × max(0, 1 - BF/threshold)` |
| **Grasp (Gc)** | A comprehension score representing how well an author demonstrated understanding; `(rubricScore / 16) × Cs` |
| **Rubric** | The 4-axis evaluation framework used by the LLM judge to score author answers |
| **Rubric Axis** | One dimension of comprehension: causality, counterfactuals, edge case awareness, cross-boundary coherence |
| **Axis Score** | A 0–4 integer rating on a single rubric axis |
| **Rubric Score** | Sum of all axis scores; maximum is 16 (4 axes × 4) |
| **Severity Band** | Categorical label derived from the total debt score: LOW, MEDIUM, HIGH, CRITICAL |
| **Level Weight** | A multiplier applied to a component's debt contribution at a given epistemic level |
| **Aggregation** | Summation of weighted per-component debt scores into a single PR-level total |
| **Causality** | Rubric axis: does the answer explain *why*, not just *what*? |
| **Counterfactuals** | Rubric axis: did the author consider alternative approaches? |
| **Edge Case Awareness** | Rubric axis: can the author identify non-obvious failure modes? |
| **Cross-Boundary Coherence** | Rubric axis: does the answer connect implementation decisions to business requirements? |

## Domain Model

### Entities

_None_ — scoring produces immutable results; no identity-tracked objects exist in this context.

### Value Objects

| Value Object | Equality | Notes |
| --- | --- | --- |
| `ComponentDebt` | By `componentName` + `debtScore` + `severity` | Immutable output of `computeComponentDebt()` |
| `GraspScore` | By `level` + numeric `score` | Phase 3; represents comprehension at a specific epistemic level |
| `RubricAxisScore` | By `axis` name + integer `score` (0–4) | Bounded: score must be in [0, 4] |

### Aggregate Roots

| Aggregate Root | Consistency Boundary | Invariants |
| --- | --- | --- |
| `ComponentDebt` | Wraps all scoring outputs for one component in one analysis run | `debtScore ≥ 0`; `severity` must be consistent with `debtScore` per the fixed bands |

### Domain Services

| Service | Location | Responsibility |
| --- | --- | --- |
| `computeComponentDebt()` | `src/scoring/formula.ts` | Applies Ed formula for one component; returns `ComponentDebt` with score and severity |
| `classifySeverity()` | `src/scoring/formula.ts` | Maps numeric debt score to `Severity` band using fixed thresholds |
| `computeTeamDebt()` | `src/scoring/formula.ts` | Aggregates multiple `ComponentDebt` values (same formula applied to team-level inputs) |
| `aggregateDebt()` | `src/scoring/aggregator.ts` | PR-level aggregation with per-level weighting; rounds to 2 decimal places |

## Business Rules & Invariants

1. **Ed formula**: `debtScore = Cs × max(0, 1 - BF / threshold)`. The `max(0, …)` guard ensures scores never go negative.
2. **Severity bands are hardcoded and non-configurable**:
   - LOW: score ≤ 25
   - MEDIUM: score ≤ 50
   - HIGH: score ≤ 75
   - CRITICAL: score > 75
3. **Maximum rubric score is 16**: 4 axes × maximum 4 per axis.
4. **Grasp formula**: `Gc = (rubricScore / 16) × Cs`. Grasp scales comprehension as a fraction of complexity.
5. **Axis scores are bounded [0, 4]**: Score meanings: 0 = no evidence, 1 = surface-level, 2 = partial with gaps, 3 = solid with minor gaps, 4 = deep with clear justification.
6. **Disabled levels are excluded from aggregation**: `thresholds.levels[level].enabled = false` causes that level's contribution to be skipped entirely.
7. **Level weights are multiplicative**: `contribution = componentDebt × levelWeight`. Default weight is 1.0.
8. **Aggregated total is rounded to 2 decimal places**.
9. **Phase 1 aggregates only at implementation level**: Other levels contribute 0 until Phase 3 activates multi-level scoring.

## Relationships with Other Contexts

| Context | Relationship | Shared Surface |
| --- | --- | --- |
| **Core Domain** | Upstream invoker — core calls `computeComponentDebt()` and `aggregateDebt()` | `ComponentDebt`, `Severity`, `PipelineResult` |
| **Analyzers** | Indirect upstream — complexity numbers from analyzers are inputs to the formula | `number` (complexity score) |
| **LLMJ** | Future upstream — grasp scores from LLMJ feed into `Gc` computation (Phase 3) | `GraspScore`, `RubricAxisScore` |
| **Utils** | Shared Kernel — imports error types | `AnalysisError` |

## Implementation Notes

- **Phase 1 (complete)**: `formula.ts`, `aggregator.ts`, `severity.ts` — fully operational
- **Phase 3 (scaffold)**: `levels.ts` — defines the 4 epistemic levels with sample questions; not yet invoked during pipeline
- **Phase 3 (scaffold)**: `rubric.ts` — defines 4-axis rubric with scoring constants; not yet invoked during pipeline
- **Future**: `computeTeamDebt()` is defined but not called from pipeline; intended for team-level aggregation across multiple PRs

---
description: DDD bounded context — Core Domain (types, config, pipeline orchestration)
globs: src/core/**/*.ts
---

# Core Domain — Bounded Context

## Subdomain Classification

**Type**: Core Domain
**Why**: This context owns the epistemic debt formula, the canonical type model, and pipeline orchestration — it is the primary differentiator of the product. All other contexts depend on types and rules defined here.

## Purpose

The Core Domain defines the canonical domain model (all shared types), validates and loads project configuration, and orchestrates the full analysis pipeline. It is the integration point that wires diff parsing, complexity scoring, and debt computation into a single `PipelineResult`. No other context should duplicate these types.

## Ubiquitous Language

| Term | Definition |
| --- | --- |
| **Epistemic Debt** | Quantified risk arising when the team's understanding of changed code is insufficient relative to its cognitive complexity |
| **Component** | A named logical boundary in the codebase, mapped to file path globs (e.g., `auth`, `payment`) |
| **Subdomain** | DDD-style classification of a component's strategic importance: `core`, `supporting`, or `generic` |
| **Bus Factor (BF)** | Number of team members who genuinely understand a given component |
| **Bus Factor Threshold (N_req)** | Minimum safe bus factor for a component, derived from its subdomain type |
| **Cognitive Complexity (Cs)** | Heuristic score measuring the mental effort required to understand changed code |
| **Severity** | Categorical risk band assigned to a debt score: LOW, MEDIUM, HIGH, CRITICAL |
| **Level** | An epistemic layer at which understanding is measured: requirements, specification, implementation, validation |
| **Pipeline** | The ordered sequence of analysis steps that produces a `PipelineResult` from a raw diff |
| **PipelineResult** | The aggregate output of a full PR analysis: total debt, severity, per-component breakdown, and formatted summary |

## Domain Model

### Entities

| Entity | Identity | Mutable State |
| --- | --- | --- |
| `Component` | `name` + `paths[]` | `busFactor`, `busFactorThreshold`, `subdomain` — set from config |
| `ComponentDebt` | `componentName` + analysis `timestamp` | `debtScore`, `severity` — computed during pipeline |

### Value Objects

| Value Object | Equality | Notes |
| --- | --- | --- |
| `Level` | By string value (`requirements` \| `specification` \| `implementation` \| `validation`) | Immutable enum; represents epistemic layer |
| `Subdomain` | By string value (`core` \| `supporting` \| `generic`) | Drives default bus factor thresholds |
| `Severity` | By string value (`LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL`) | Derived from numeric score via hardcoded bands |
| `FileDiff` | By `path` + `patch` content | Immutable snapshot of one file's changes in a diff |
| `ComplexityScore` | By `level` + numeric `score` | Produced by the analyzers context |

### Aggregate Roots

| Aggregate Root | Consistency Boundary | Invariants |
| --- | --- | --- |
| `PipelineResult` | Encapsulates a complete PR analysis run. No partial results escape this boundary. | `totalDebt ≥ 0`; `severity` must match the band for `totalDebt`; `components[]` must be non-empty if a diff was provided |

### Domain Services

| Service | Location | Responsibility |
| --- | --- | --- |
| `runPipeline()` | `src/core/pipeline.ts` | Orchestrates parseDiff → computeComplexity → computeComponentDebt → aggregateDebt → formatSummary |
| `loadConfig()` | `src/core/config.ts` | Reads `.ed-says.yml`, validates with Zod, applies defaults; tolerates missing file |

## Business Rules & Invariants

1. **Debt is never negative**: `debtScore = Cs × max(0, 1 - BF/threshold)` — the `max(0, …)` guard ensures this.
2. **Full coverage eliminates risk**: When `BF ≥ threshold`, epistemic debt is exactly 0.
3. **Zero bus factor means maximum risk**: When `BF = 0`, debt equals the full complexity score.
4. **Severity bands are fixed and non-configurable**: LOW ≤ 25, MEDIUM ≤ 50, HIGH ≤ 75, CRITICAL > 75.
5. **Missing config is valid**: If `.ed-says.yml` is absent, all defaults apply — the pipeline must not fail.
6. **Default bus factor thresholds by subdomain**: core = 2, supporting = 2, generic = 1.
7. **Phase 1 analyses at implementation level only**: Multi-level analysis (Phase 3) is not yet active; all complexity is attributed to the `implementation` level.
8. **Unmatched files are grouped under `"unmatched"`**: Files that match no component config are never silently dropped.

## Relationships with Other Contexts

| Context | Relationship | Shared Surface |
| --- | --- | --- |
| **Analyzers** | Downstream consumer — core invokes analyzers during pipeline | `ComponentDiff`, `FileDiff`, `ComplexityScore` |
| **Scoring** | Downstream consumer — core invokes scoring to compute debt | `ComponentDebt`, `Severity` |
| **GitHub** | Downstream consumer — core passes `PipelineResult` to GitHub for reporting | `PipelineResult`, `Severity` |
| **Ledger** | Downstream consumer — core may persist results to ledger (Phase 2) | `ComponentDebt`, `LedgerEntry` |
| **LLMJ** | Downstream consumer — core may invoke LLMJ for grasp scoring (Phase 3) | `GraspScore`, `Level` |
| **Utils** | Shared Kernel — core imports logger and error types | `logger`, `EdSaysError`, `ConfigError` |

## Implementation Notes

- **Phase 1 (complete)**: `types.ts`, `config.ts`, `pipeline.ts` — fully operational
- **Phase 2 (planned)**: `pipeline.ts` extended with ledger persistence and coupling analysis integration
- **Phase 3 (planned)**: `pipeline.ts` extended with LLMJ invocation and multi-level scoring

---
description: DDD bounded context — Historical Tracking (time-series epistemic debt ledger)
globs: src/ledger/**/*.ts
---

# Historical Tracking (Ledger) — Bounded Context

## Subdomain Classification

**Type**: Supporting Domain
**Why**: The ledger records and queries historical debt trends, enabling longitudinal analysis. It supports the Core Domain's mission (measuring epistemic debt over time) but is not the formula itself — it could be replaced with a different persistence mechanism without changing the epistemic model.

## Purpose

The Historical Tracking context records each PR's epistemic debt and comprehension scores as a time-series ledger. It enables trend analysis across PRs: tracking whether a component's debt is improving or degrading over time as its complexity and team understanding evolve.

> **Note**: This entire context is a Phase 2 stub. Storage interfaces are defined but not implemented.

## Ubiquitous Language

| Term | Definition |
| --- | --- |
| **Ledger** | The complete time-series record of epistemic debt across all analyzed PRs |
| **LedgerEntry** | A single immutable record capturing debt metrics for one component in one PR at one point in time |
| **Debt (ledger sense)** | `complexity − grasp` — the portion of cognitive complexity not covered by demonstrated comprehension |
| **Grasp (ledger sense)** | The running average of an author's rubric scores for a component; accumulated across PRs |
| **Rolling Window** | Maximum number of entries retained in the ledger; oldest entries are evicted when the limit is reached |
| **LedgerStore** | Abstract storage interface; `FileLedgerStore` is the file-based implementation |
| **Component History** | The ordered sequence of `LedgerEntry` records for one component, used for trend analysis |

## Domain Model

### Entities

| Entity | Identity | Mutable State |
| --- | --- | --- |
| `LedgerEntry` | `timestamp` (ISO 8601) + `prNumber` + `component` + `sha` | None — entries are immutable once written |

### Value Objects

| Value Object | Equality | Notes |
| --- | --- | --- |
| Debt `number` | By numeric value | `complexity − grasp`; represents uncovered cognitive load |
| Grasp `number` | By numeric value | Running average comprehension score per component per author |

### Aggregate Roots

| Aggregate Root | Consistency Boundary | Invariants |
| --- | --- | --- |
| `Ledger` | The complete ledger collection. Enforces the rolling window invariant. | Entry count must not exceed `maxEntries`; oldest entries are evicted on overflow. All entries within the `Ledger` are immutable after append. |

### Domain Services

| Service | Location | Responsibility |
| --- | --- | --- |
| `LedgerStore.read()` | `src/ledger/store.ts` | Loads the entire `Ledger` from storage |
| `LedgerStore.append()` | `src/ledger/store.ts` | Adds a single `LedgerEntry` to the ledger; enforces rolling window |
| `LedgerStore.getHistory()` | `src/ledger/store.ts` | Returns ordered history for a specific component, with optional entry limit |
| `FileLedgerStore` | `src/ledger/file-store.ts` | **Phase 2 stub** — file-based implementation reading/writing `.ed-says-ledger.json` |

## Business Rules & Invariants

1. **Debt is `complexity − grasp`**: Unlike the pipeline formula (`Cs × coverage_gap`), the ledger tracks the simpler `complexity − grasp` difference for longitudinal trending.
2. **Entries are append-only**: Existing entries are never modified. Historical records are immutable.
3. **Rolling window default is 1000 entries**: When this limit is exceeded, the oldest entries are dropped to keep storage bounded.
4. **Ledger file is `.ed-says-ledger.json`**: The file store writes to this path relative to the project root.
5. **Grasp is a running average**: Accumulated across multiple PR analysis runs for the same author and component; not the single-PR rubric score.
6. **Each entry records author**: Enables per-author comprehension tracking across the team over time.
7. **Timestamps are ISO 8601**: Enables chronological sorting and time-range queries.

## Relationships with Other Contexts

| Context | Relationship | Shared Surface |
| --- | --- | --- |
| **Core Domain** | Upstream — core pipeline will persist `ComponentDebt` results to the ledger (Phase 2) | `ComponentDebt`, `PipelineResult` |
| **Scoring** | Indirect upstream — grasp scores from scoring accumulate into ledger entries | `GraspScore` (from LLMJ via Scoring) |
| **Utils** | Shared Kernel — imports logger and error types | `logger`, `AnalysisError` |

## Implementation Notes

- **Phase 2 (stub — not yet active)**: `store.ts` defines the abstract `LedgerStore` interface; `file-store.ts` defines `FileLedgerStore` as a class stub with method signatures but no implementation
- `types.ts` — fully defined; `LedgerEntry` and `Ledger` types are ready
- Config fields `ledger.enabled`, `ledger.path`, `ledger.maxEntries` control runtime behavior
- When `ledger.enabled: false` (default), the ledger context is entirely bypassed during pipeline execution

---
description: DDD bounded context — Code Analysis (diff parsing, complexity, coupling)
globs: src/analyzers/**/*.ts
---

# Code Analysis — Bounded Context

## Subdomain Classification

**Type**: Core Domain
**Why**: Diff parsing and cognitive complexity scoring are the primary input to the epistemic debt formula. Without accurate complexity measurement, debt scores are meaningless. This is not generic infrastructure — it encodes specific domain knowledge about what constitutes "hard-to-understand" code.

## Purpose

The Code Analysis context extracts structural information from raw unified diffs: it groups changed files by their owning component, computes cognitive complexity from added code, and (in Phase 2) measures structural coupling. It produces `ComponentDiff` objects consumed by the Scoring context.

## Ubiquitous Language

| Term | Definition |
| --- | --- |
| **Unified Diff** | Standard `diff --git` format output representing all file changes in a PR |
| **Patch** | The raw diff text for a single file, including `+`/`-` lines |
| **ComponentDiff** | A file-change group scoped to one named component |
| **FileDiff** | An individual file's additions, deletions, and patch text |
| **Cognitive Complexity** | A heuristic score measuring how hard added code is to mentally process |
| **Nesting Depth** | Current brace-depth when parsing a patch; modulates control-flow cost |
| **Glob Pattern** | Path-matching pattern used to assign files to components (`**` = any path segment, `*` = single segment) |
| **Unmatched** | Pseudo-component that receives files not claimed by any configured component |
| **Coupling** | Structural dependency metric: fan-in (dependents), fan-out (dependencies), CBO |
| **Analyzer Registry** | Plugin registry that maps epistemic levels to analyzer implementations |

## Domain Model

### Entities

_None_ — this context operates on immutable snapshots; there is no identity-tracked state.

### Value Objects

| Value Object | Equality | Notes |
| --- | --- | --- |
| `FileDiff` | By `path` + `patch` content | Immutable; captures one file's changes at a point in time |
| `ComponentDiff` | By `componentName` + set of `FileDiff` | Groups related file changes; equality by content not identity |
| `CouplingResult` | By `fanIn` + `fanOut` + `cbo` | Phase 2 value; currently always `{ fanIn:0, fanOut:0, cbo:0 }` |

### Aggregate Roots

| Aggregate Root | Consistency Boundary | Invariants |
| --- | --- | --- |
| `ComponentDiff` | All files for one component in one diff analysis run form a single consistent unit | Every `FileDiff` inside must belong to exactly one `ComponentDiff`; files matching no component go to `"unmatched"` |

### Domain Services

| Service | Location | Responsibility |
| --- | --- | --- |
| `parseDiff()` | `src/analyzers/diff-parser.ts` | Converts raw unified diff string into `ComponentDiff[]` grouped by component |
| `parseUnifiedDiff()` | `src/analyzers/diff-parser.ts` | Low-level parser — extracts `FileDiff[]` from raw diff text |
| `matchComponent()` | `src/analyzers/diff-parser.ts` | Assigns a file path to its owning component via glob pattern matching |
| `computeComplexity()` | `src/analyzers/complexity.ts` | Sums heuristic cognitive complexity across all files in a `ComponentDiff` |
| `computeFileComplexity()` | `src/analyzers/complexity.ts` | Single-file heuristic: counts control flow, logical ops, ternaries, weighted by nesting |
| `computeCoupling()` | `src/analyzers/coupling.ts` | **Phase 2 stub** — returns zero coupling; will measure fan-in/fan-out |
| `registerAnalyzer()` | `src/analyzers/registry.ts` | Adds an `Analyzer` implementation to the registry |
| `getAnalyzersForLevel()` | `src/analyzers/registry.ts` | Returns all analyzers registered for a given epistemic `Level` |

## Business Rules & Invariants

1. **Only added lines are analyzed for complexity**: Lines beginning with `-` (removals) are ignored. Complexity tracks new cognitive load introduced, not removed.
2. **Nesting depth is non-negative**: Brace counting (`{` increments, `}` decrements) floors at 0.
3. **Control flow cost scales with nesting**: `cost += matchCount × (1 + nestingDepth)`. Deeply nested branches are proportionally more expensive.
4. **Logical operators are flat cost (+1 each)**: `&&` and `||` add 1 regardless of nesting.
5. **Ternary `?` adds +1, but `?.` optional chaining does not**: The regex explicitly excludes `?.`.
6. **Glob `**` matches any number of path segments; `*` matches exactly one**: Implemented in `globMatch()`.
7. **First matching component wins**: Files are assigned to the first component whose glob matches; there is no priority score.
8. **Files matching no component are silently grouped under `"unmatched"`**: They are never dropped from the analysis.
9. **The analyzer registry is currently empty**: No Phase 3 analyzers are registered; `getAnalyzersForLevel()` returns `[]` for all levels.

## Relationships with Other Contexts

| Context | Relationship | Shared Surface |
| --- | --- | --- |
| **Core Domain** | Upstream consumer — core invokes `parseDiff()` and `computeComplexity()` during pipeline | `ComponentDiff`, `FileDiff`, complexity `number` |
| **Scoring** | Indirect — complexity numbers flow from here through core into scoring | `number` (complexity score) |
| **Utils** | Shared Kernel — imports logger | `logger` |

## Implementation Notes

- **Phase 1 (complete)**: `diff-parser.ts`, `complexity.ts` — heuristic engine fully operational
- **Phase 2 (stub)**: `coupling.ts` — `computeCoupling()` always returns zeros; real implementation pending
- **Phase 2 (planned)**: `registry.ts` — Analyzer interface defined; no implementations registered yet
- **Future**: Tree-sitter-based complexity engine is config-selectable (`analyzers.engine: "tree-sitter"`) but not yet implemented; falls back to heuristic

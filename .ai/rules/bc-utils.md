---
description: Shared Kernel — cross-cutting infrastructure (logger, error hierarchy) shared by all bounded contexts
globs: src/utils/**/*.ts
---

# Shared Kernel (Utils) — Cross-Cutting Infrastructure

## Subdomain Classification

**Type**: Generic / Shared Kernel
**Why**: `src/utils/` contains no domain logic — it provides infrastructure primitives (logging, error types) that every bounded context needs. In DDD terms it is a Shared Kernel: a small, stable set of shared types and services that all contexts agree to depend on without owning.

## Purpose

The Shared Kernel provides two foundational capabilities used across all bounded contexts:

1. **Dual-mode logger** — abstracts the output difference between running as a GitHub Action (`@actions/core`) and running as a CLI (`console.*`), so domain code never needs to know which runtime it's in.
2. **Error hierarchy** — a typed error taxonomy with machine-readable codes, enabling callers to distinguish configuration errors from analysis failures from GitHub API failures.

## Ubiquitous Language

| Term | Definition |
| --- | --- |
| **Action Mode** | Runtime mode where the process is executing inside a GitHub Actions runner; uses `@actions/core` for output |
| **CLI Mode** | Runtime mode where the process is a local CLI invocation; uses `console.*` for output |
| **EdSaysError** | Base error type for all domain-specific failures; carries a `code` string for programmatic handling |
| **Error Code** | A machine-readable string identifying the category of failure (e.g., `CONFIG_ERROR`, `ANALYSIS_ERROR`) |

## Domain Model

### Entities

_None_ — the Shared Kernel contains no domain entities.

### Value Objects

_None_ — the Shared Kernel contains no domain value objects.

### Aggregate Roots

_None_ — the Shared Kernel is infrastructure, not domain.

### Domain Services

| Service | Location | Responsibility |
| --- | --- | --- |
| `setActionMode(enabled)` | `src/utils/logger.ts` | Global toggle that switches logger output between GitHub Actions and CLI modes |
| `logger.debug()` | `src/utils/logger.ts` | Emits debug-level message via `@actions/core.debug` or `console.debug` |
| `logger.info()` | `src/utils/logger.ts` | Emits info-level message via `@actions/core.info` or `console.log` |
| `logger.warn()` | `src/utils/logger.ts` | Emits warning via `@actions/core.warning` or `console.warn` |
| `logger.error()` | `src/utils/logger.ts` | Emits error via `@actions/core.error` or `console.error` |

### Error Types

| Type | Supertype | Use case |
| --- | --- | --- |
| `EdSaysError` | `Error` | Base class; all domain errors extend this; carries `code: string` |
| `ConfigError` | `EdSaysError` | Configuration file parsing or validation failures |
| `AnalysisError` | `EdSaysError` | Computation failures during pipeline execution |
| `GitHubError` | `EdSaysError` | GitHub API authentication or request failures |

## Business Rules & Invariants

1. **Utils must not import from any bounded context**: The Shared Kernel is a pure downstream dependency. Importing from `src/core/`, `src/scoring/`, etc. would create a circular dependency and is forbidden.
2. **All bounded contexts may import from utils**: `logger` and error types are freely available to all contexts.
3. **Action mode must be set once at startup**: `setActionMode()` is called by the entry points (`src/index.ts` for Actions, `src/cli.ts` for CLI) and must not be toggled mid-execution.
4. **CLI mode prefixes output with level tags**: Non-Action output is prefixed `[debug]`, `[info]`, `[warn]`, `[error]` for readability.
5. **All domain errors must extend `EdSaysError`**: Plain `Error` throws are not permitted in domain code; callers rely on the `code` field for error handling decisions.

## Relationships with Other Contexts

| Context | Relationship |
| --- | --- |
| **All bounded contexts** | All import `logger` and error types from here; no context is exempt |
| **Entry Points** (`src/index.ts`, `src/cli.ts`) | Call `setActionMode()` at startup to configure logger behavior |

## Implementation Notes

- **Phase 1 (complete)**: `logger.ts` and `errors.ts` — fully operational
- No planned changes in Phase 2 or Phase 3; this module is intentionally stable
- Adding new error codes: extend `EdSaysError` with a new subclass and a unique `code` string constant

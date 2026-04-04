# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run typecheck       # tsc --noEmit
npm run lint            # eslint src/ test/
npm test                # vitest run (all tests)
npm run test:watch      # vitest (watch mode)
npm test -- --coverage  # with coverage
npm run build           # tsup (library + CLI dist)
npm run package         # @vercel/ncc bundle → dist-action/ (GitHub Action artifact)
npm run format          # prettier --write .
```

Run a single test file:

```bash
npx vitest run test/unit/scoring/formula.test.ts
```

## Architecture

This project produces **two artifacts**:

1. **GitHub Action** — entry point `src/index.ts`, packaged via `npm run package` into `dist-action/` using `@vercel/ncc` (single-file bundle required by Actions runner).
2. **CLI / library** — entry points `src/cli.ts` + `src/bin.ts`, built to `dist/` via `tsup` as ESM.

### Analysis Pipeline (`src/core/pipeline.ts`)

All analysis flows through `runPipeline()`:

```text
parseDiff()          → ComponentDiff[]   (group changed files by component)
computeComplexity()  → number            (heuristic or tree-sitter)
computeComponentDebt() → ComponentDebt[] (apply Ed formula per component)
aggregateDebt()      → { totalDebt, severity }
formatSummary()      → string            (PR comment markdown)
```

### Core Formula (`src/scoring/formula.ts`)

```text
Ed_risk_k = Cs_k(t) × max(0, 1 - BF_k / N_req_k)
```

- `Cs_k(t)` — cognitive complexity of changed code
- `BF_k` — bus factor (people who understand the component)
- `N_req_k` — minimum safe coverage (from `.ed-says.yml` `bus_factor_threshold`)

Severity bands are hardcoded: LOW ≤25, MEDIUM ≤50, HIGH ≤75, CRITICAL >75.

### Configuration (`src/core/config.ts`)

Config is loaded from `.ed-says.yml` and validated with Zod. The full schema lives in `configSchema`. All fields have defaults — missing config file is valid (uses all defaults).

### Module layout

Each directory is a DDD bounded context with its own rule file in `.ai/rules/`.

| Directory | Bounded Context | Subdomain |
| --- | --- | --- |
| `src/core/` | Core Domain | Core |
| `src/analyzers/` | Code Analysis | Core |
| `src/scoring/` | Epistemic Scoring | Core |
| `src/github/` | GitHub Integration | Supporting |
| `src/llmj/` | LLM Judging (Phase 3) | Supporting |
| `src/ledger/` | Historical Tracking (Phase 2) | Supporting |
| `src/utils/` | Shared Kernel | Generic |

### Roadmap phases

- **Phase 1** (current): static complexity + PR comments — fully implemented
- **Phase 2**: CLI mode, debt ledger, coupling analysis — `src/ledger/` and `src/analyzers/coupling.ts` are stubs
- **Phase 3**: LLMJ comprehension questions + rubric scoring — `src/llmj/` is a stub; `src/scoring/rubric.ts` and `src/scoring/levels.ts` scaffold the 4-level model (requirements / specification / implementation / validation)

### ESM / imports

The project is pure ESM (`"type": "module"`). All internal imports must use `.js` extensions (TypeScript resolves them to `.ts` at compile time).

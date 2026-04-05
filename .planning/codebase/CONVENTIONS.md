# Coding Conventions

**Analysis Date:** 2026-04-05

## Naming Patterns

**Files:**
- Source files: lowercase with hyphens (e.g., `diff-parser.ts`, `config.ts`)
- Test files: `.test.ts` suffix (e.g., `formula.test.ts`)
- No abbreviations except for well-established acronyms (BF = bus factor, Cs = complexity score, Ed = epistemic debt)

**Functions:**
- camelCase for all function names (e.g., `computeComponentDebt`, `parseDiff`, `loadConfig`)
- No function name prefixes; rely on module organization
- Utility functions grouped in logical modules (logger, errors, parsers)

**Variables:**
- camelCase for constants and variables (e.g., `totalDebt`, `busFactor`, `configPath`)
- UPPERCASE only for exported string constants used in type discrimination (e.g., `LEVELS`, `SUBDOMAIN_DEFAULTS`)
- Prefix internal state flags with `is` (e.g., `isAction`, `isEnabled`)

**Types:**
- PascalCase for all type names (e.g., `Component`, `ComponentDebt`, `Severity`)
- Type definitions grouped in `core/types.ts` as the single source of truth
- Use `type` keyword for union/literal types; `interface` for object shapes
- Generic domain-specific acronyms in type names acceptable (e.g., `ComponentDebt`, `GraspScore`, `RubricAxisScore`)

**Acronyms in Comments:**
- Cs = system-aware complexity score
- BF = bus factor (number of people who understand code)
- N_req = minimum required coverage (bus factor threshold)
- Ed_risk = epistemic debt score
- Gc = comprehension grasp score
- LLMJ = LLM judge (Phase 3 feature)

## Code Style

**Formatting:**
- Tool: Prettier
- Semicolons: true
- Single quotes: false (use double quotes)
- Trailing comma: all
- Print width: 100 characters
- Tab width: 2 spaces

**Linting:**
- Tool: ESLint (configuration not provided in current codebase)
- Enabled for `src/` and `test/` directories

**Import Organization:**
- Order: Node.js builtins → npm dependencies → local imports
- Path aliases: none defined (use relative or absolute imports with `./`)
- Use `.js` extensions for relative imports in ES modules
- Group by domain: core config/types first, then specific modules

Example from `src/index.ts`:
```typescript
import * as core from "@actions/core";
import { loadConfig } from "./core/config.js";
import { runPipeline } from "./core/pipeline.js";
import { createClient, fetchPRDiff } from "./github/client.js";
import { postOrUpdateComment } from "./github/comment.js";
import { setActionMode } from "./utils/logger.js";
import type { AnalysisMode } from "./core/types.js";
```

## Error Handling

**Patterns:**
- Custom error hierarchy: `EdSaysError` base class with domain-specific subclasses
- Subclasses: `ConfigError`, `AnalysisError`, `GitHubError`
- All custom errors include a `code` property (e.g., `"CONFIG_ERROR"`)
- Named error constructors that call super with message + code
- Use `instanceof` for error type checking in try-catch blocks

Example from `src/utils/errors.ts`:
```typescript
export class EdSaysError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "EdSaysError";
  }
}

export class ConfigError extends EdSaysError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
    this.name = "ConfigError";
  }
}
```

## Logging

**Framework:** Custom abstraction in `src/utils/logger.ts`

**Patterns:**
- Four levels: `debug()`, `info()`, `warn()`, `error()`
- Context-aware output: GitHub Actions mode vs. CLI mode
- In Actions mode: delegates to `@actions/core` methods
- In CLI mode: prefixes with brackets for debug/warn (e.g., `[debug] message`)
- Set mode early with `setActionMode(boolean)` before any logging

Example usage from `src/index.ts`:
```typescript
import { setActionMode } from "./utils/logger.js";

async function run(): Promise<void> {
  setActionMode(true); // Enable GitHub Actions logging
  // ... subsequent code uses logger functions
}
```

## Comments

**When to Comment:**
- Document complex formulas and domain-specific math (e.g., epistemic debt calculation)
- Explain non-obvious algorithm choices (e.g., nesting depth tracking in complexity heuristic)
- Document state transitions and mode switches
- Add context for magic numbers and thresholds

**JSDoc/TSDoc:**
- Use JSDoc for public functions and types
- Include `@param`, `@returns` for function signatures
- Document domain concepts in inline comments above definitions

Example from `src/scoring/formula.ts`:
```typescript
/**
 * Compute epistemic debt for a single component.
 *
 * Ed_risk_k = Cs_k(t) × max(0, 1 - BF_k / N_req_k)
 *
 * When BF_k >= N_req_k → component contributes zero risk.
 * When BF_k = 0 → full complexity counts as debt.
 */
export function computeComponentDebt(input: ComponentDebtInput): ComponentDebt {
```

## Function Design

**Size:** Functions typically 20-50 lines for analytical functions; 15-30 for I/O and orchestration

**Parameters:**
- Use interfaces/objects for multiple parameters (avoids parameter order confusion)
- Example from `src/analyzers/complexity.ts`:
  ```typescript
  interface ComplexityConfig {
    engine: string;
    languages: string[];
  }
  export function computeComplexity(componentDiff: ComponentDiff, config: ComplexityConfig): number
  ```

**Return Values:**
- Explicit return types required (no implicit `any`)
- Use union types for multiple return possibilities (e.g., `Severity` type with literal values)
- Domain functions return strongly-typed objects (e.g., `ComponentDebt`, not `{ debt: number; component: string }`)

## Module Design

**Exports:**
- Named exports for functions and types
- No default exports (reduces namespace confusion)
- One responsibility per module (e.g., `config.ts` loads/parses; `pipeline.ts` orchestrates)

**Module Organization:**
- `src/core/` — types, config, pipeline orchestration
- `src/analyzers/` — complexity and coupling analysis
- `src/scoring/` — debt formula and severity classification
- `src/github/` — GitHub API integration (Octokit client)
- `src/utils/` — logging, errors, shared utilities
- `src/ledger/` — state persistence (Phase 1+)
- `src/llmj/` — LLM judge integration (Phase 3+)

**Barrel Files:**
- Not used; import specific modules directly
- Encourages explicit dependency visibility

## TypeScript Configuration

**Key Settings** (from `tsconfig.json`):
- Target: ES2022
- Module: NodeNext (ESM)
- Strict mode: true
- Declaration maps: true (enables source navigation in IDEs)
- No implicit any: enforced
- Isolated modules: true (safe transpilation)

**Build Pipeline:**
- Compiler: `tsc` (for type checking)
- Bundler: tsup (configured in separate `tsup.config.ts`)
- Output: `dist/` directory

---

*Convention analysis: 2026-04-05*

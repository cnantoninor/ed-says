# Testing Patterns

**Analysis Date:** 2026-04-05

## Test Framework

**Runner:**
- Vitest 3.0.0+
- Config: `vitest.config.ts`
- Node.js native globals enabled (`globals: true`)

**Assertion Library:**
- Vitest built-in `expect()` (compatible with Jest API)

**Run Commands:**
```bash
npm test                    # Run all tests once
npm run test:watch         # Watch mode for development
npm run typecheck          # TypeScript type checking
npm run lint               # ESLint validation
npm run format             # Prettier formatting
```

## Test File Organization

**Location:**
- Co-located in `test/` directory (separate from `src/`)
- Mirror directory structure of source code

**Directory Layout:**
```
test/
├── unit/
│   ├── analyzers/
│   │   ├── complexity.test.ts
│   │   └── diff-parser.test.ts
│   ├── core/
│   │   └── config.test.ts
│   └── scoring/
│       └── formula.test.ts
├── integration/
│   └── pipeline.test.ts
└── fixtures/
    ├── configs/
    │   ├── full.yml
    │   └── minimal.yml
    └── diffs/
        └── simple-change.diff
```

**Naming:**
- Suffix: `.test.ts`
- Match source file name (e.g., `complexity.ts` → `complexity.test.ts`)
- No `__tests__` directory convention used

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from "vitest";
import { computeComponentDebt } from "../../../src/scoring/formula.js";

describe("computeComponentDebt", () => {
  it("returns zero debt when bus factor meets threshold", () => {
    const result = computeComponentDebt({
      component: "auth",
      complexity: 80,
      busFactor: 2,
      busFactorThreshold: 2,
    });
    expect(result.debtScore).toBe(0);
    expect(result.severity).toBe("LOW");
  });

  it("handles the example from the session handover", () => {
    // Auth: Cs=80, N_req=2, BF=2 → Ed=0
    const auth = computeComponentDebt({
      component: "auth",
      complexity: 80,
      busFactor: 2,
      busFactorThreshold: 2,
    });
    expect(auth.debtScore).toBe(0);
  });
});
```

**Patterns:**
- Top-level `describe()` blocks per function/class
- Descriptive test names starting with verb: "returns", "handles", "rejects", "applies", "counts", "groups", "puts", "throws"
- One logical assertion per test (may have multiple `expect()` calls for related checks)
- Test names document expected behavior for readers

**Setup/Teardown:**
- Not heavily used in current test suite
- When needed: inline setup before test block
- No shared fixtures except YAML/diff files in `test/fixtures/`

## Test Types

**Unit Tests** (located in `test/unit/`):
- **Pure functions:** formula, complexity analysis, diff parsing, config validation
- **Scope:** Single function with clear inputs/outputs
- **Example:** `test/unit/scoring/formula.test.ts` tests `computeComponentDebt()` with 5+ scenarios (zero debt, partial debt, edge cases)
- **Approach:** Input object → output object assertion, no I/O mocking

**Config Schema Tests** (`test/unit/core/config.test.ts`):
- Zod schema validation with good/bad inputs
- Test defaults are applied correctly
- Test invalid values are rejected with errors

**Integration Tests** (`test/integration/pipeline.test.ts`):
- End-to-end pipeline flow from diff → result
- Tests actual composition of units (diff parsing + complexity + debt scoring)
- Uses sample diffs from fixtures
- No mocking of sub-functions; tests full execution

**Not Currently Used:**
- E2E tests (GitHub API interaction)
- Mock testing frameworks (Vitest spying)
- Snapshot testing

## Mocking

**Framework:** None — relying on Vitest's built-in stub capabilities if needed

**Patterns:**
- Minimal mocking philosophy: prefer real function execution
- Config objects created fresh per test (no mock builders)
- No external API mocks in test suite (no GitHub, no LLM calls in tests)

**What to Mock (if needed later):**
- External I/O: `fetch()` calls, file system, process execution
- Time-dependent behavior: dates, timers

**What NOT to Mock:**
- Pure functions (complexity, formula, parsing)
- Data validation (Zod schemas)
- Local imports within same module

## Fixtures and Factories

**Test Data:**
- YAML config fixtures in `test/fixtures/configs/`
- Diff patch fixtures in `test/fixtures/diffs/`

**Inline Test Data:**
- Complex objects defined inline in tests
- Example from `test/unit/analyzers/diff-parser.test.ts`:
  ```typescript
  const SAMPLE_DIFF = `diff --git a/src/core/pipeline.ts b/src/core/pipeline.ts
  index 1234567..abcdefg 100644
  --- a/src/core/pipeline.ts
  +++ b/src/core/pipeline.ts
  @@ -1,5 +1,10 @@
  +import { something } from "./types.js";
  ...
  `;
  
  const COMPONENTS = [
    { name: "core", paths: ["src/core/**"] },
    { name: "utils", paths: ["src/utils/**"] },
  ];
  ```

**Location:**
- Fixtures: `test/fixtures/` (YAML, diffs, JSON)
- Inline data: top of test file, before describe blocks
- Constants for reuse across multiple tests in same file

## Coverage

**Requirements:** Not enforced (no coverage threshold)

**View Coverage:**
```bash
vitest run --coverage    # Command available if coverage provider configured
```

## Async Testing

**Pattern:** Tests are naturally async when testing async functions

```typescript
it("runs full pipeline with static-only mode", async () => {
  const result = await runPipeline({
    diff: SAMPLE_DIFF,
    config,
    mode: "static-only",
  });
  
  expect(result.totalDebt).toBeGreaterThanOrEqual(0);
});
```

**No special async handling needed:** Vitest automatically awaits returned Promises

## Error Testing

**Pattern:** Test that invalid input raises correct error type

From `test/unit/core/config.test.ts`:
```typescript
it("rejects invalid subdomain", () => {
  expect(() =>
    configSchema.parse({
      components: [{ name: "api", paths: ["src/**"], subdomain: "invalid" }],
    }),
  ).toThrow();
});

it("rejects negative bus_factor_threshold", () => {
  expect(() =>
    configSchema.parse({
      components: [{ name: "api", paths: ["src/**"], bus_factor_threshold: -1 }],
    }),
  ).toThrow();
});
```

## Common Test Scenarios

**Boundary Testing:**
- Zero values: BF=0, complexity=0, empty diff
- Threshold boundaries: BF exactly at threshold, above, below
- Empty collections: no components, no files

Example from `test/unit/scoring/formula.test.ts`:
```typescript
it("returns zero debt when bus factor meets threshold", () => {
  // BF == N_req (boundary)
});

it("returns zero debt when bus factor exceeds threshold", () => {
  // BF > N_req (above boundary)
});

it("returns full complexity as debt when bus factor is zero", () => {
  // BF = 0 (edge case)
});

it("returns partial debt when bus factor is below threshold", () => {
  // 0 < BF < N_req (interior case)
});
```

**Example-Based Testing:**
- Tests based on documentation examples
- Example from `test/unit/scoring/formula.test.ts`:
  ```typescript
  it("handles the example from the session handover", () => {
    // Auth: Cs=80, N_req=2, BF=2 → Ed=0
    const auth = computeComponentDebt({...});
    expect(auth.debtScore).toBe(0);
    // ... additional components
  });
  ```

## Assertions

**Common patterns:**
- `expect(value).toBe(expected)` — strict equality for numbers, strings
- `expect(value).toEqual(expected)` — deep equality for objects/arrays
- `expect(value).toHaveLength(n)` — array/string length
- `expect(value).toBeGreaterThan(n)` — numeric comparison
- `expect(value).toBeDefined()` — non-undefined check
- `expect(fn).toThrow()` — error assertions
- `expect(value).toContain(substring)` — string/array includes

## Running Tests in Development

**Watch mode during development:**
```bash
npm run test:watch
```

**Type check alongside tests:**
```bash
npm run typecheck      # Run before committing
npm run lint           # Check style
npm test               # Final validation
```

**Pre-commit considerations:**
- Type checking required before committing
- No enforced test coverage, but all new units should have test cases
- Follow existing test structure for consistency

---

*Testing analysis: 2026-04-05*

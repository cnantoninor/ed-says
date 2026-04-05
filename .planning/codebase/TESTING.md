# Testing Patterns

**Analysis Date:** 2026-04-05

## Current State: No Tests Exist

This repository has **zero test files**. There is no `test/` directory, no test runner configured, and no test fixtures. The project is in a pure planning phase.

The previous TypeScript implementation had Vitest-based tests, but that entire codebase was deleted in commit 59fe13b. The test infrastructure went with it.

---

## Planned Test Strategy (Per `SKILL_PLAN.md`)

### Phase 0 — Formula Fixture Tests

`SKILL_PLAN.md` lines 356–357 specify:

> "Verification: Cross-check Python script output against test fixtures on the same diff inputs."

**Planned approach:**
- Create `test/fixtures/` with representative `.diff` files and expected `.json` output
- Run `python scripts/ed-says-analyze.py` against each fixture and compare output
- No test runner specified yet; likely `pytest` or plain assertion scripts

**Minimum fixture set (specified):**
1. Small single-file change
2. Medium multi-file change
3. Large refactor
4. Generated code in diff
5. Multi-component change

### Phase 1+ — Command Tests

`SKILL_PLAN.md` mentions shell-based command tests (bats) for end-to-end command flow validation. No design doc exists yet.

---

## Test Framework (Not Yet Decided)

For the Python core, the most likely options are:

- **pytest** — standard Python test runner, supports fixtures and parametrize
- **Plain assertions** — `assert` statements in a test script, lowest friction for Phase 0
- **bats** — shell integration tests for command-level validation (Phase 1+)

No `vitest`, `jest`, or any JavaScript test runner is in scope.

---

## What Will Be Tested

**Formula logic** (`scripts/ed-says-analyze.py`):
- `Cs_effective` calculation: diff complexity × amplification factors
- `BF_effective` fallback chain: config → CODEOWNERS → git log
- Coverage gap: `max(0, 1 - BF_effective / N_req)`
- `Ed_risk = Cs_effective × coverage_gap`
- Severity band classification (LOW ≤ 25 CP, MEDIUM ≤ 50, HIGH ≤ 75, CRITICAL > 75)

**Config validation** (`.ed-says.yml` parsing):
- Valid config accepted
- Missing required fields rejected
- Invalid subdomain values rejected
- Negative `bus_factor_threshold` rejected

**Diff parsing:**
- Standard unified diff
- Empty diff → zero debt
- Binary files skipped
- Multi-component diff grouped correctly

---

## What Will NOT Be Tested

- GitHub API calls (no mocking; integration only via `gh` CLI in real env)
- LLM judge outputs (non-deterministic by nature)
- Claude Code skill command execution (tested manually via dog-fooding)

---

## How to Add Tests (When Phase 0 Starts)

1. Create `test/fixtures/` directory
2. Add `.diff` fixture files (real or synthetic)
3. Add expected `.json` output files alongside each fixture
4. Create `test/test_formula.py` (or `scripts/test_ed_says.py`) with pytest
5. Run: `pytest test/` or `python -m pytest`

---

*Testing analysis: 2026-04-05*

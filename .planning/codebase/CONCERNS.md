# Codebase Concerns

**Analysis Date:** 2026-04-05

## Project Status: Planning Phase with No Implementation

**Critical Note:** This repository is currently in a pure planning/specification phase. All content is declarative (SKILL_PLAN.md, README.md, configuration templates) with **zero implemented code**. All concerns below represent risks for the implementation phases ahead.

---

## Architectural Risks

### Complexity Formula Validation Gap

**Issue:** The epistemic debt formula is mathematically defined in `docs/formula.md` and specified in `SKILL_PLAN.md` (lines 141-228), but no implementation yet exists to validate it against real codebases or test fixtures.

**Files:** 
- `docs/formula.md` (formula definition)
- `SKILL_PLAN.md` (lines 166-230, formula logic)

**Impact:** 
- Phase 0 implementation (`scripts/ed-says-analyze.py`) cannot be verified against test fixtures until the Python script exists
- Lines 356-357 of SKILL_PLAN.md acknowledge this: "Verification: Cross-check Python script output against `npm run test` results on the same fixture diffs"
- Risk of formula implementation mismatches between Python (Phase 0), TypeScript ports, and GitHub Action (Phase 4)

**Fix approach:**
1. Create comprehensive test fixtures in `test/fixtures/` with known diff inputs and expected output JSON
2. Implement Python script with inline assertions for each formula unit
3. Run cross-validation across all three expected implementations (Python skill, TypeScript legacy, GitHub Action) before Phase 1 completion

---

### Multi-LLM Portability Untested

**Issue:** SKILL_PLAN.md (lines 296-307) specifies install-time format transformation for Cursor, Copilot, and Windsurf, but `install.js` does not yet exist.

**Files:**
- `SKILL_PLAN.md` (lines 296-307, transformation spec)
- `commands/ed-says/` (template path, not implemented)

**Impact:**
- Transformation logic may produce invalid rule files for non-Claude LLM tools
- No way to validate syntax until installers are built in Phase 2
- GitHub Action wrapper (Phase 4) depends on shared Python script, but multi-LLM path diverges at install time — risk of drift

**Fix approach:**
1. Build transformation validators in `install.js` that parse and validate output formats before writing
2. Create integration tests that mock each LLM tool's rule parser (if publicly documented)
3. Document any unsupported transformations or known syntax gaps

---

## Implementation Risks

### Python Script Dependency Chain Incomplete

**Issue:** `scripts/ed-says-analyze.py` (specified in lines 131-262) depends on three external tools with fallback chains:

1. **lizard** (complexity engine) — falls back to hand-rolled heuristic if unavailable (line 175)
2. **dependency-cruiser** (coupling analysis) — currently disabled in Phase 0 (line 78 of `.ed-says.yml`)
3. **git log** (bus factor derivation) — always available (line 189)

**Files:**
- `.ed-says.yml` (lines 68-76, analyzer config)
- `SKILL_PLAN.md` (lines 171-189, tool specifications)

**Impact:**
- Fallback to hand-rolled heuristic may produce different cognitive complexity scores than lizard
- No TypeScript reference implementation yet exists to compare against
- Phase 1 enables dependency-cruiser (line 78), but implementation details are unspecified

**Fix approach:**
1. In Phase 0, implement BOTH lizard and hand-rolled heuristic, log which was used per component
2. Create test fixtures with diff snippets and compare outputs — document acceptable delta
3. Port `src/analyzers/complexity.ts` to Python immediately if lizard is unavailable on system
4. Phase 1 should include coupling.py implementation with feature parity to depcruise

---

### Bus Factor Derivation: Confidence Weighting Fragile

**Issue:** SKILL_PLAN.md lines 199-212 specify a confidence-weighted fallback chain for bus factor:

| Source | confidence | Risk |
|--------|-----------|------|
| Config (`.ed-says.yml`) | 0.7 | Manual, stale |
| CODEOWNERS | 0.7 | May not exist or be incomplete |
| git recent (90 days) | 0.4 | Incentivizes churn |
| git all-time | 0.2 | Penalizes low-activity repos |
| No data | 1.0 (worst) | Maximizes debt artificially |

**Files:**
- `SKILL_PLAN.md` (lines 199-212, fallback spec)
- `.ed-says.yml` (no CODEOWNERS template provided)

**Impact:**
- Repos without CODEOWNERS or recent activity will pessimistically estimate bus factor → inflated debt scores
- No guidance on when to upgrade confidence to 1.0 via LLMJ grasp scoring (Phase 3)
- Incentivizes false positives: a rarely-touched component with one author gets high debt, even if that author understands it perfectly

**Fix approach:**
1. Document confidence upgrade path explicitly in Phase 0 command prompt (`analyze.md`)
2. Add CODEOWNERS template generation to `/ed-says:init` command (Phase 1)
3. Include in Phase 0 output: a notice when BF is derived from git log only, with suggestion to run `/ed-says:ask`
4. Phase 3 should automatically boost confidence to 1.0 when grasp score is provided

---

### State File Schema Persistence Unclear

**Issue:** `.ed-says-state.json` schema is defined in SKILL_PLAN.md lines 268-292, but file migration and schema versioning strategy is absent.

**Files:**
- `SKILL_PLAN.md` (lines 268-292, schema definition)
- `templates/.ed-says-state.json` (empty template, not created)

**Impact:**
- Phase 1 adds state persistence, but no migration strategy for when schema changes (Phase 2→3)
- Rolling window with `maxEntries: 100` may silently drop old entries — no audit trail
- No guidance on what happens if a user downgrades to an earlier phase version

**Fix approach:**
1. Add `"version": 1` and `"schemaVersion"` fields to state file
2. Implement schema migration function in Phase 1 (bump version only in Phase 3 when fields change)
3. Document: old entries below rolling window are discarded; commit `.ed-says-state.json` to git if trend history matters
4. Add deprecation notice to Phase 1 if field removals occur

---

### GitHub Token Detection Fragile

**Issue:** SKILL_PLAN.md lines 95-100 specify GitHub token detection via env vars or MCP tools, but fallback behavior is unclear.

**Files:**
- `SKILL_PLAN.md` (lines 95-100, token detection)
- `commands/ed-says/analyze.md` (not yet implemented)

**Impact:**
- No specification of which env var is checked first (GITHUB_TOKEN vs GH_TOKEN)
- "MCP GitHub tools" availability depends on runtime context — not portable to all LLM tools
- Graceful fallback to terminal output may confuse users who expect PR comments but don't see them

**Fix approach:**
1. Clarify env var precedence: check GH_TOKEN first (gh CLI standard), then GITHUB_TOKEN
2. Phase 0 `analyze.md` should detect token availability upfront and warn if absent
3. Phase 1 `ed-says-comment.sh` should validate token before attempting post
4. Document: MCP GitHub tools are Claude Code only; other LLM tools must use env vars

---

## Security Considerations

### Secrets Exposure in Configuration

**Issue:** `.ed-says.yml` is committed to git and documented in SKILL_PLAN.md, but no guidance on handling sensitive information (API keys, private component names, internal domain knowledge).

**Files:**
- `.ed-says.yml` (config, currently committed)
- `SKILL_PLAN.md` (lines 103-110, config setup)

**Impact:**
- Bus factor mappings in config reveal organizational structure
- Future phases may add API keys for external coupling analyzers (dependency-cruiser in Phase 1)
- `.ed-says-state.json` is also committed — contains per-component debt scores that may be proprietary

**Fix approach:**
1. Add explicit guidance to `.ed-says.yml` template: mark as "safe to commit, no secrets" (or "private — do not commit")
2. Phase 1 `ed-says-comment.sh` should accept optional `--public` flag to sanitize output before posting
3. Add example: redact component names in Phase 1 PR comments via separate `comment-template` config
4. Document: CODEOWNERS integration (Phase 1) requires no extra env vars — uses `gh api` with existing GITHUB_TOKEN

---

### Lizard Availability Assumption

**Issue:** Phase 0 assumes `lizard` is installed (SKILL_PLAN.md line 175), but no installation instructions provided. Fallback heuristic is unimplemented.

**Files:**
- `SKILL_PLAN.md` (lines 175, 327)
- `README.md` (line 124, installation footnote only)

**Impact:**
- Windows users may struggle to install Python dependencies
- Fallback hand-rolled heuristic is unimplemented; `scripts/ed-says-analyze.py` will fail if lizard is missing
- CI/CD integration (Phase 4) may fail silently if lizard is not in the base image

**Fix approach:**
1. Phase 0: Implement fallback heuristic immediately (port from TypeScript `src/analyzers/complexity.ts`)
2. `scripts/ed-says-analyze.py` should log which engine was used, including fallback
3. GitHub Action (Phase 4): Pin a Docker image with Python + lizard pre-installed, or add `pip install lizard` to CI step
4. Documentation: add "Installation" section to README.md with pip + OS-specific notes

---

## Performance Bottlenecks

### Git Log Queries Unbounded

**Issue:** Bus factor derivation runs `git log --since=90days` and `git log` (all-time) on every analysis, with no caching or query optimization.

**Files:**
- `SKILL_PLAN.md` (lines 188-189, git log calls)

**Impact:**
- Large monorepos (>10k commits) may experience slow analysis on every PR
- No pagination or early-exit strategy specified
- Phase 0 does not include performance benchmarks

**Fix approach:**
1. Phase 0: Benchmark on a 100k-commit test repo; document expected runtime
2. If runtime exceeds 30 seconds, implement git log with `--diff-filter` to limit to modified files per component
3. Phase 1: Cache bus factor per component for 7 days (invalidate on CODEOWNERS change)
4. GitHub Action (Phase 4): Use shallow clone (`--depth`) if fetch-depth is already set in workflow

---

### Diff Parsing No Size Limits

**Issue:** `scripts/ed-says-analyze.py` parses unified diff output with no specified limits on file size, diff size, or change count.

**Files:**
- `SKILL_PLAN.md` (line 169, diff parsing)

**Impact:**
- Large refactors (moving 50k lines) will create massive diffs
- No protection against pathological inputs (billion-line file, generated code)
- Phase 0 does not specify how to handle binary files or non-text changes

**Fix approach:**
1. Add config parameters to `.ed-says.yml`: `max_file_size_kb`, `max_diff_lines_per_file`
2. `scripts/ed-says-analyze.py` should skip files exceeding limits and log skipped count
3. Phase 1: Add annotation or warning to PR comment if analysis was incomplete due to limits
4. Document: generated code (e.g., `*.pb.ts`) should be excluded via `.ed-saysignore` (Phase 1)

---

## Testing & Verification Gaps

### No Test Fixtures or Baselines

**Issue:** SKILL_PLAN.md (lines 356-357) mentions test fixtures but none are committed; no reference output exists.

**Files:**
- `SKILL_PLAN.md` (lines 356-357, mentions fixtures)
- `test/fixtures/` (expected, but missing)

**Impact:**
- Phase 0 cannot validate formula implementation
- Python script output cannot be compared against TypeScript reference
- Confidence in debt scores is low until real-world validation

**Fix approach:**
1. Before Phase 0 implementation, create minimum 5 representative diff fixtures in `test/fixtures/`
2. Include: small change, medium change, large refactor, generated code, multi-component change
3. Phase 0 PR should include baseline output for each fixture
4. Phase 1: Add `npm test` or `python -m pytest` to CI, running fixtures as regression tests

---

### No Specification Tests for Commands

**Issue:** Phase 0 specifies 6 commands (`analyze`, `init`, `ask`, `config`, `status`, `history`) in SKILL_PLAN.md, but only 2 are implemented in Phase 0 (`analyze`, `ask`). No test plan exists.

**Files:**
- `SKILL_PLAN.md` (lines 90-126, command specs)

**Impact:**
- Commands may diverge in behavior as they are implemented across phases
- No acceptance criteria for phase completion
- Phase 1–4 have no regression test plan

**Fix approach:**
1. For each command, add a brief "acceptance criteria" subsection in SKILL_PLAN.md
2. Phase 0: Write test cases for `/ed-says:analyze` and `/ed-says:ask` as .md specification tests
3. Phase 1+: Add command tests to CI as shell script bats tests or Claude Code integration tests

---

## Documentation Gaps

### Formula Units Inconsistent Across Documents

**Issue:** SKILL_PLAN.md uses "complexity points (CP)" (line 160), but `docs/formula.md` uses "Cs" without units. Severity bands are in CP but not stated in README.md.

**Files:**
- `SKILL_PLAN.md` (lines 141-160, unit table)
- `docs/formula.md` (lines 60-65, severity bands)
- `README.md` (line 19, mentions "complexity points" but not clearly)

**Impact:**
- Implementers may misunderstand what "25 CP" means
- External tools integrating with ed-says may interpret severity bands differently

**Fix approach:**
1. Add explicit unit definitions to `docs/formula.md` with cross-reference to SKILL_PLAN.md unit table
2. Update README.md line 19 to clarify: "Severity bands (LOW≤25 CP, MEDIUM≤50 CP, HIGH≤75 CP, CRITICAL>75 CP)"
3. Phase 4 GitHub Action: include unit explanation in PR comment template

---

### CLAUDE.md Integration Marker Pattern Unspecified

**Issue:** SKILL_PLAN.md (lines 315-323) specifies CLAUDE.md should be updated with HTML comment markers, but exact marker format is undefined.

**Files:**
- `SKILL_PLAN.md` (lines 315-323)

**Impact:**
- `/ed-says:init` cannot be implemented until marker format is decided
- Marker collision possible if other tools use the same pattern
- Phase 1 cannot guarantee idempotent edits to CLAUDE.md

**Fix approach:**
1. Define marker format: `<!-- ed-says-block-start -->` and `<!-- ed-says-block-end -->`
2. Phase 1 `init.md` should parse existing CLAUDE.md, remove old block if present, then append new block
3. Add safety check: warn if markers are found but garbled

---

## Missing Critical Features

### CODEOWNERS Integration Unimplemented

**Issue:** SKILL_PLAN.md (lines 204-205) specifies reading `.github/CODEOWNERS` with 0.7 confidence, but parsing logic is unspecified and not yet implemented.

**Files:**
- `SKILL_PLAN.md` (lines 204-205, fallback chain)

**Impact:**
- Bus factor derivation cannot use CODEOWNERS in Phase 0
- Confidence weighting may be inaccurate if CODEOWNERS entries are complex (glob patterns, teams, OR logic)
- Phase 1 milestone depends on this

**Fix approach:**
1. Phase 0: Parse CODEOWNERS format (GitHub spec: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
2. Implement fallback chain: if CODEOWNERS has entry for component, extract owner count; if error parsing, fall back to git log
3. Phase 1: Validate CODEOWNERS syntax before using for bus factor calculation

---

### Dependency-Cruiser Integration Deferred

**Issue:** Coupling analysis via dependency-cruiser is disabled in Phase 0 (`.ed-says.yml` line 78) with no implementation plan for Phase 1.

**Files:**
- `.ed-says.yml` (lines 77-78)
- `SKILL_PLAN.md` (line 452, mentions stub)

**Impact:**
- `fan_in` metric is uncomputed in Phase 0; `Cs_effective` formula uses normalized 0.0 when coupling is disabled
- Phase 1 must implement `fan_in`, but spec for `src/analyzers/coupling.ts` port is missing
- Formula calibration (severity bands) may be incorrect without coupling data

**Fix approach:**
1. Phase 0: Compute `fan_in` via basic import graph (grep `import.*component` in source) as placeholder
2. Phase 1: Replace with dependency-cruiser if available, fallback to import grep
3. Document: severity bands (LOW≤25 CP) are calibrated with coupling enabled; Phase 0 scores may run 30% higher

---

### No Grasp Score Persistence Between Runs

**Issue:** Phase 0 `/ed-says:ask` command generates grasp scores and writes them to `.ed-says-state.json` (SKILL_PLAN.md lines 221-226), but Phase 0 has no state file write logic.

**Files:**
- `SKILL_PLAN.md` (lines 221-226, adjustment formula)
- `commands/ed-says/ask.md` (not yet implemented, Phase 0 deliverable line 43)

**Impact:**
- Grasp scores cannot be persisted in Phase 0 MVP
- Second `/ed-says:analyze` run cannot apply grasp adjustment (lines 221-226)
- Phase 0 success criterion (line 352) specifies this: "Second `/ed-says:analyze` run shows grasp-adjusted debt"

**Fix approach:**
1. Phase 0 must include state file write in both `analyze.md` and `ask.md` commands
2. Implement append-only append to `.ed-says-state.json` with version check (migrate if needed)
3. `analyze.md` should read state file on startup to restore prior grasp scores

---

## Dependencies at Risk

### Lizard Project Health Unknown

**Issue:** ed-says depends on `lizard` for cognitive complexity measurement (SKILL_PLAN.md line 175), but project activity/maintenance status is unverified.

**Files:**
- `SKILL_PLAN.md` (line 175, lizard dependency)
- `README.md` (line 124, installation note)

**Impact:**
- If lizard is abandoned, Phase 0 may use an outdated complexity model
- No alternative cognitive complexity tools are pre-identified

**Fix approach:**
1. Phase 0 implementation: verify lizard is actively maintained (GitHub check), document version pinned
2. If lizard is stale (no commits in 2+ years), identify alternative: Radon, Pylint CCN, or native TypeScript handler
3. Phase 0 fallback heuristic should be sufficient to run without lizard; consider making it the primary engine

---

### No Version Constraints

**Issue:** SKILL_PLAN.md does not specify Python version, lizard version, dependency-cruiser version, or Node.js version.

**Files:**
- `SKILL_PLAN.md` (reference section, missing version pins)
- `README.md` (line 119, no version requirements)

**Impact:**
- Reproducibility is compromised; different developers may run different versions
- GitHub Action (Phase 4) may fail in CI if base image has incompatible versions

**Fix approach:**
1. Add `.nvmrc` (Node.js version) and `pyproject.toml` or `requirements.txt` (Python + lizard version)
2. Phase 0: Lock to known working versions (e.g., Python 3.11, lizard 2.1+, Node 18+)
3. Phase 4 GitHub Action: pin Docker image or use matrix strategy for multi-version testing

---

## Test Coverage Gaps

### No Integration Tests Specified

**Issue:** SKILL_PLAN.md specifies unit test fixtures for the Python script (line 356), but integration tests (end-to-end command flow) are not mentioned.

**Files:**
- `SKILL_PLAN.md` (lines 356-357, only mentions fixture tests)

**Impact:**
- No validation that `/ed-says:analyze` → `/ed-says:ask` → `/ed-says:analyze` produces adjusted debt
- PR comment posting cannot be tested until GitHub token is available in CI
- Phase 1 completion cannot be verified without integration tests

**Fix approach:**
1. Phase 1: Add bats shell test suite for command flow: `test/commands/analyze.bats`, `test/commands/ask.bats`, etc.
2. Create mock `.ed-says.yml` and test repo for integration tests
3. Phase 4: Add GitHub Actions test workflow to validate PR comment posting

---

### No Error Handling Specification

**Issue:** SKILL_PLAN.md does not specify error handling for missing `.ed-says.yml`, invalid config, corrupt state file, or git errors.

**Files:**
- `SKILL_PLAN.md` (command specs, no error cases)

**Impact:**
- Phase 0 commands will fail ungracefully if config is missing or malformed
- No guidance on what users should do if analysis fails
- State file corruption cannot be recovered

**Fix approach:**
1. Phase 0: Document error paths in `analyze.md` and `ask.md`: missing config → use defaults with notice; invalid config → show errors and suggest `/ed-says:init`
2. Add config validation: `scripts/ed-says-analyze.py --validate <config-path>`
3. Phase 1: Add state file validation and recovery (backup + rollback on corruption)

---

## Scalability Concerns

### No Guidance for Monorepo Workflows

**Issue:** SKILL_PLAN.md assumes single git root and `.ed-says.yml` per repo, but does not address monorepos where components span multiple git worktrees or submodules.

**Files:**
- `SKILL_PLAN.md` (lines 5-6, assumes single config)

**Impact:**
- Monorepo users cannot easily partition analysis by workspace
- `/ed-says:init` cannot suggest components that span multiple directories intelligently
- Coupling analysis (Phase 1) may count internal cross-workspace deps as external

**Fix approach:**
1. Phase 1: Add optional `--workspace` flag to `/ed-says:analyze` to analyze only a subset
2. Support multiple `.ed-says.yml` files: one per workspace, with shared `.ed-says-state.json` at root
3. Document: monorepo users should manually partition components via glob paths in config

---

## Branch Strategy Clarity

**Issue:** SKILL_PLAN.md (lines 463-466) specifies branch names but does not clarify whether feature branches are expected to be long-lived or squashed.

**Files:**
- `SKILL_PLAN.md` (lines 463-466)

**Impact:**
- Phase 0 implementation may be unclear about rebase vs merge strategy
- State file commits during development may accumulate unnecessarily

**Fix approach:**
1. Clarify: each phase gets its own PR, squash-merged to main
2. `.ed-says-state.json` should be committed only after Phase 1 (when persistence is finalized)
3. Phase 0 implementation uses `.gitignore` for state files, Phase 1 opts into tracking

---

## Known Limitations (Not Bugs, But Important)

### No Support for Generated Code Exclusion

**Issue:** SKILL_PLAN.md does not specify how to exclude generated files (protobuf, GraphQL, swagger, etc.) from complexity analysis.

**Files:**
- `SKILL_PLAN.md` (no exclusion mechanism)

**Impact:**
- Generated code inflates `Cs_diff` and `Cs_file` metrics
- Phase 1 may need to implement `.ed-saysignore` or glob exclusion

**Fix approach:**
1. Phase 0: Document workaround: add generated code paths to `.ed-says.yml` with subdomain "generic" and very low `bus_factor_threshold`
2. Phase 1: Implement `.ed-saysignore` file (similar to `.gitignore`) to exclude paths entirely

---

### Bus Factor Threshold Not Configurable Per Component Intelligently

**Issue:** `.ed-says.yml` allows `bus_factor_threshold` per component, but no guidance on what values are reasonable.

**Files:**
- `.ed-says.yml` (lines 9, 15, 21, etc.)

**Impact:**
- Users may set thresholds too low (underestimate risk) or too high (over-alert)
- No correlation between threshold and actual team size or criticality

**Fix approach:**
1. Phase 1: Add `/ed-says:init` guidance: ask user team size, auto-suggest thresholds
2. Document defaults: core = 2, supporting = 2, generic = 1 (from SKILL_PLAN.md line 219)
3. Add warning in `/ed-says:config`: if threshold > team_size, alert user

---

*Concerns audit: 2026-04-05*

# Project Research Summary

**Project:** Ed Says — Epistemic Debt Analyzer
**Domain:** Claude Code skill with deterministic Python analysis backend
**Researched:** 2026-04-05
**Confidence:** HIGH

## Executive Summary

Ed Says occupies a genuine white space in the developer tooling ecosystem. Complexity measurement tools (SonarQube, CodeClimate) have no knowledge dimension. Knowledge-distribution tools (CodeScene, CodePulse) have no complexity dimension. AI code review tools (CodeRabbit, Copilot) do neither. The formula `Ed_risk = Cs_effective × coverage_gap` — multiplying how complex a change is by how few people understand the affected component — is measurably novel. No existing tool operationalizes this, and the comprehension testing loop via `/ed-says:ask` (where a developer can prove understanding and bank it as a `Gc` credit against future debt scores) has no comparable analog in the ecosystem.

The recommended build approach is a three-layer architecture: a deterministic Python script as the stable contract, an LLM skill layer for orchestration and narrative, and a state file for persistence. Python is the right choice over TypeScript for the formula engine — it is portable, CI-friendly, and keeps the LLM entirely out of the scoring path. The tool stack is concrete and validated: lizard 1.21.3 for complexity via its Python API, GitPython for git operations, unidiff for diff parsing, and PyYAML for config. All versions are current as of the research date. The architecture follows confirmed Claude Code patterns from official documentation.

The highest-priority risk is measurement reliability. Lizard has three known failure modes for TypeScript/JavaScript that will produce silent zero-complexity results on valid changes: running on diff fragments rather than complete files (the most critical), anonymous function/arrow function undercounting, and generic angle-bracket confusion. A fallback heuristic must ship alongside lizard from day one. The second major risk is bus factor inflation through squash-merge attribution loss and bot-commit pollution; both have straightforward mitigations. The anti-feature list is equally important: LLM in the formula path and blocking merges by default are adoption killers documented across multiple independent sources.

---

## Key Findings

### Stack Decisions

The Python analysis engine requires four libraries, all with verified current versions:

- **lizard 1.21.3** (released 2026-03-30): Complexity engine. Use `lizard.analyze_file.analyze_source_code(filename, code_string)` — the Python API, not subprocess. The `filename` argument must carry the correct extension for language detection. Supports TypeScript, TSX, Python, Go, Rust.
- **GitPython 3.1.46**: Git operations. Provides clean exception hierarchy and list-arg subprocess safety. Use for `git diff`, `git show` (pre-image), `git log` (churn + BF). Always pass `--use-mailmap` in log calls.
- **unidiff 0.7.5**: Diff parsing. Handles binary file markers, rename detection, encoding edge cases correctly. Use `PatchedFile.path` (target path, post-rename) for component matching.
- **PyYAML 6.0.3**: Config loading for `.ed-says.yml`.
- **dependency-cruiser 17.3.10** (Milestone 1+): Fan-in counts via `dependents[]` field in JSON output. Requires local install in analyzed repo; graceful fallback to `fan_in=0` when absent.

Critical API detail: do NOT run lizard on raw diff fragments. Run on full post-image files and subtract pre-image complexity to isolate the diff contribution. This is the single most important implementation decision in the analysis engine.

### Table Stakes

Features the tool must have or developers ignore it:

- **Deterministic score** — non-reproducible scores are disabled within days; no LLM in the formula path ever
- **Severity bands with named levels** — LOW/MEDIUM/HIGH/CRITICAL (CP thresholds: ≤25/≤50/≤75/>75); raw numbers alone are not trusted
- **Per-component breakdown** — aggregate-only scores are discarded; developers need to know which component drove the score
- **Graceful degradation** — hard failures when lizard, GitHub token, or git history is absent cause immediate abandonment
- **Fast execution** — PR tools exceeding 60 seconds are turned off; target <15s
- **Clear score explanation** — false positives are adoption killer #1; the agent narrative layer is load-bearing

### Differentiators

What makes Ed Says worth using over alternatives:

- **Complexity × knowledge gap formula** — `Ed_risk = Cs_effective × coverage_gap` is genuinely novel; no existing tool measures the product of these two dimensions
- **Comprehension testing via `/ed-says:ask`** — no other tool tests actual understanding; git commit history measures exposure, not comprehension; the 4-axis LLMJ rubric (causality, counterfactuals, edge cases, cross-boundary coherence; 0–4 each) is the novel mechanism
- **Gc score banks against future debt** — understanding is persistent; a developer who passes the comprehension test reduces debt on all future PRs touching that component
- **System-aware complexity** — diff complexity × file complexity × coupling (fan-in) × churn; a tiny change to a highly-coupled file is high risk regardless of diff size
- **Skill-first graduation path** — devs try it in Claude Code today with zero CI config; Milestone 4 graduates to GitHub Action using the same Python script with no rewrite

### Anti-Features

Explicitly avoid these — each is documented as an adoption killer:

- **LLM in the formula path** — non-determinism destroys CI trustworthiness; all scoring must be in the Python script
- **Blocking merge by default** — opt-in gate mode only; report-only is the default
- **Multiple PR comments** — one idempotent comment, updated in place; duplicate comments caused backlash against CodeRabbit and Copilot PR tips
- **Opaque scoring** — per-component breakdown with source attribution (which BF source, what confidence) is mandatory
- **Global-only scores** — per-component scores with file lists; `totalDebt` is always a rollup paired with breakdown
- **Historical ownership as proxy for understanding** — git exposure ≠ comprehension; BF is confidence-discounted to reflect this

### Architecture Approach

Three execution layers with clear boundaries: command files (`.claude/commands/ed-says/`) as user-facing entry points, agent files (`.claude/agents/`) as isolated subagent workers, and the Python script as the deterministic engine. Commands delegate to agents via natural language or `@agent-mention`; agents call the Python script via the Bash tool; the Python script emits JSON on stdout. The LLM's role is orchestration and narrative — never formula computation.

Build order enforced by dependencies: Python script first (stable JSON contract), then agents (depend on script output schema), then commands (depend on agents and state schema). Cross-validate Python output against `test/fixtures/` before writing the agent prompt.

**Major components:**
1. `scripts/ed-says-analyze.py` — deterministic formula engine; git + lizard integration; emits structured JSON
2. `agents/ed-says-analyzer.md` — runs script, interprets JSON output, generates narrative; isolated subagent
3. `agents/ed-says-judge.md` — 4-axis comprehension rubric; called inline from `ask.md` (not nested under analyzer)
4. `commands/ed-says/analyze.md` — user entry point; delegates to analyzer agent; writes state after success
5. `commands/ed-says/ask.md` — comprehension Q&A loop; executes inline (needs conversation context)
6. `.ed-says-state.json` — rolling 100-entry ledger; atomic writes via `os.replace()`; SHA-tagged grasp scores
7. `.ed-says.yml` — component definitions, thresholds, complexity weights, bot email filter patterns

### Critical Pitfalls

The top pitfalls that affect Milestone 0 directly:

1. **Lizard on diff fragments returns silent zero** — Run lizard on the full post-image file (`git show base:file` + apply patch), not on extracted diff lines. This is the primary source of `Cs_diff = 0` false negatives. Alternative: use `Cs_file` as proxy when diff application is complex.

2. **Squash merges erase contributor attribution** — Parse `Co-Authored-By:` trailers from commit messages using `git log --format="%ae%n%(trailers:key=Co-Authored-By,valueonly=true)"`. Always pass `--use-mailmap`. Critical for the ed-says repo itself which is dog-fooded on claude-authored commits.

3. **Bot commits inflate bus factor** — Filter author emails matching `*[bot]*`, `*noreply*`, `renovate@whitesourcesoftware.com` before counting distinct contributors. Add `bot_email_patterns` to `.ed-says.yml` for team customization.

4. **Anonymous functions / arrow functions undercount complexity** — When lizard returns 0 functions for a file with `function`/`=>` tokens, fall back to hand-rolled heuristic. Annotate output with `"complexity_engine": "fallback", "reason": "no_functions_detected"`. Lizard issue #324, open since 2021.

5. **State file concurrent write corruption** — Use atomic write from day one: write to `.ed-says-state.json.tmp`, then `os.replace()`. One implementation choice that prevents a class of hard-to-debug data corruption.

---

## Implications for Roadmap

The milestone structure in PROJECT.md is well-justified by the research. The dependency chain from architecture research confirms the correct build order, and pitfall research adds specific implementation requirements to each milestone.

### Milestone 0 — Dog-food MVP

**Rationale:** The Python script is the foundation everything else rests on. Its JSON output is the contract between the deterministic engine and the LLM layer. Stabilize it before writing the agent prompt. Dog-fooding on this repo's own PRs validates the formula and comprehension loop before exposing either to external users.

**Delivers:** Working `/ed-says:analyze` and `/ed-says:ask` in Claude Code on this repo. Terminal-only output. Manual file installation.

**Must implement:**
- lizard via Python API on full post-image files (not diff fragments)
- `Co-Authored-By:` trailer parsing + `--use-mailmap` for BF
- Bot email filtering in git log
- Fallback heuristic when lizard returns 0 functions
- Atomic state file writes via `os.replace()`
- Graceful lizard unavailability (fallback, not crash)
- Pessimistic BF default (1 contributor, confidence 0.2) when no git data

**Must avoid:** LLM in the formula path; spawning subagents from subagents (judge is a sibling of analyzer, not its child); writing state inside the subagent (write after success in the command layer)

### Milestone 1 — Full Skill Suite

**Rationale:** PR comment posting and CODEOWNERS integration require GitHub API access. These belong after the core formula is validated, not before. The idempotency requirement (one comment, updated in place) has a pagination pitfall that must be built correctly from the start.

**Delivers:** Idempotent PR comment, CODEOWNERS as BF source, `init`/`config`/`status` commands, state persistence across runs.

**Must implement:**
- PR comment pagination (search all pages for `<!-- ed-says-report -->` marker before creating new)
- CODEOWNERS reverse-order last-match parsing with fnmatch; team expansion via GitHub API or 2-person default
- State write cap enforcement on every write (not lazily)
- SHA-tagged grasp scores in state for staleness detection

**Must avoid:** Duplicate PR comments; CODEOWNERS parsing crashes (always fall through to git-recent on failure)

### Milestone 2 — Installer + Packaging

**Rationale:** Multi-LLM portability and npm packaging extend reach without changing the formula. The `install.js` is a file copier with optional LLM-format transforms — keep it simple, following the GSD pattern.

**Delivers:** `npx ed-says-skill --install`, Cursor/Copilot/Windsurf transform support, trend history via `/ed-says:history`, npm package.

**Must implement:**
- LLM format transform at install time (not runtime abstraction)
- `context: fork` subagents must have explicit task injection — do not rely on main session memory
- Skill description fields under 200 characters (250-character truncation limit in Claude Code)

### Milestone 3 — Multi-level Scoring

**Rationale:** Four epistemic levels (requirements, specification, implementation, validation) extend the `/ed-says:ask` loop without changing the formula. State schema extension required. This is the long-term differentiator with no analog in existing tools.

**Delivers:** Per-level comprehension scoring with `--level` flag, per-level trend in history.

### Milestone 4 — GitHub Action

**Rationale:** The Python script runs identically in GitHub Actions — no rewrite needed. The Action is an additive wrapper. The only new concern is GitHub token scope enforcement (write scope required for PR comments).

**Delivers:** CI-native analysis, `action.yml`, workflow examples.

**Must implement:** Token scope check before comment write attempt; pin Python deps in `requirements.txt` in action

### Phase Ordering Rationale

- Milestone 0 must come first because the Python script's JSON schema is the contract that all agent prompts depend on. Writing agents before the script is stable means rewriting the agents.
- Milestone 1 (PR comment) must follow formula validation because debugging pagination/idempotency issues while also debugging the formula would compound complexity.
- Milestone 2 (packaging) must follow Milestone 1 because you cannot responsibly package something you have not validated end-to-end in your own workflow.
- `/ed-says:ask` is NOT deferred to Milestone 1 — it belongs in Milestone 0. It is the core differentiator and its absence would mean dog-fooding only the least novel part of the tool.

### Research Flags

Standard patterns (skip research-phase):
- **Milestone 0 Python script:** All libraries have verified APIs and known pitfalls documented. Implementation is straightforward given STACK.md API examples.
- **Milestone 1 PR comment:** The idempotency pattern and pagination fix are fully specified in PITFALLS.md.
- **Milestone 4 GitHub Action:** Well-documented patterns; same Python script, additive wrapper only.

Needs empirical validation during implementation:
- **Threshold calibration (all milestones):** The CP severity bands (LOW≤25, MEDIUM≤50, HIGH≤75, CRITICAL>75) need validation against real PRs during dog-fooding. These are initial estimates and may need adjustment.
- **Gc rubric scoring (Milestone 0):** The 4-axis rubric (0–4 each, max 16 points) and its reduction formula against Ed_risk need calibration. Research confirms the mechanism is novel — no comparable benchmarks exist.
- **90-day git window (Milestone 0):** Some teams with low commit cadence will consistently overreport debt for stable components. Surface this in output and make the window configurable from the start.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified by direct install on 2026-04-05; API behavior confirmed with code examples; alternatives explicitly rejected with reasons |
| Features | HIGH | Table stakes verified against multiple independent tool comparisons; differentiators confirmed novel by competitive analysis; anti-features grounded in documented adoption failure cases |
| Architecture | HIGH | Sourced from official Claude Code documentation fetched live; subagent constraints and command patterns confirmed working |
| Pitfalls | HIGH | Lizard issues cited with issue numbers; git attribution behavior verified against GitHub changelog; specific mitigations are implementable one-liners |

**Overall confidence:** HIGH

### Open Questions

These items cannot be resolved by research — they require empirical validation during Milestone 0 dog-fooding:

- **Threshold calibration:** Are LOW≤25, MEDIUM≤50, HIGH≤75, CRITICAL>75 CP the right bands? Need 10–20 real PR analyses to validate. Plan to review after the first two weeks of dog-fooding.
- **Gc reduction formula:** How many CP does a perfect comprehension score (Gc=16) reduce from Ed_risk? The spec defines the mechanism but the coefficient needs tuning. Start conservative (Gc reduces by at most 30% of Ed_risk); adjust after 5+ ask sessions.
- **Lizard fallback trigger sensitivity:** The heuristic "function count is 0 but token count > 0" may fire too aggressively on import-only files or too rarely on complex arrow-function files. Calibrate against `test/fixtures/` before Milestone 0 is considered done.
- **Bot email filter coverage:** The default patterns cover Dependabot, Renovate, GitHub Actions. Teams with custom internal bots will need to add entries. The `bot_email_patterns` config key addresses this but the defaults need tuning against the ed-says repo's own commit history.

---

## Sources

### Primary (HIGH confidence)
- lizard PyPI / GitHub — versions, Python API, known issues: https://pypi.org/project/lizard/, https://github.com/terryyin/lizard
- dependency-cruiser npm — fan-in extraction, `dependents[]` field: https://registry.npmjs.org/dependency-cruiser
- GitPython PyPI — API, encoding behavior: https://pypi.org/project/GitPython/
- unidiff PyPI — diff parsing, binary handling: https://pypi.org/project/unidiff/
- PyYAML PyPI: https://pypi.org/project/PyYAML/
- Claude Code sub-agents docs: https://code.claude.com/docs/en/sub-agents
- Claude Code skills docs: https://code.claude.com/docs/en/skills
- Claude Code slash commands: https://platform.claude.com/docs/en/agent-sdk/slash-commands
- SonarQube Cognitive Complexity / Quality Gates: https://docs.sonarsource.com/sonarqube-server/2025.2/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates
- CodeScene Knowledge Distribution: https://codescene.io/docs/guides/social/knowledge-distribution.html
- GitHub squash merge attribution changelog: https://github.blog/changelog/2022-09-15-git-commit-author-shown-when-squash-merging-a-pull-request/

### Secondary (MEDIUM confidence)
- Comprehension Debt — Addy Osmani, 2026: https://addyosmani.com/blog/comprehension-debt/
- State of AI Code Review Tools 2025: https://www.devtoolsacademy.com/blog/state-of-ai-code-review-tools-2025/
- Bus Factor Risk Matrix — CodePulse: https://codepulsehq.com/guides/code-hotspots-knowledge-silos
- HubSpot automated code review case study: https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution

### Tertiary (documentation reference)
- GitHub Copilot PR tips backlash: https://www.theregister.com/2026/03/30/github_copilot_ads_pull_requests/
- PR comment idempotency pattern: https://benlimmer.com/blog/2021/12/20/create-or-update-pr-comment/

---
*Research completed: 2026-04-05*
*Ready for roadmap: yes*

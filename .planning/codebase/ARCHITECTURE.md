# Architecture

**Analysis Date:** 2026-04-05

## Pattern Overview

**Overall:** Portable multi-LLM epistemic debt analyzer with deterministic Python core + LLM orchestration layer

**Key Characteristics:**
- **Formula-first**: Epistemic debt computation via deterministic Python script (`scripts/ed-says-analyze.py`), not LLM-generated
- **Layered coupling**: LLM skill layer orchestrates analysis, interprets results, and runs Phase 3 comprehension judgments; Python engine handles deterministic scoring
- **Graceful degradation**: Works without GitHub token (terminal output); auto-posts PR comments when token available
- **Multi-LLM portable**: Install-time format transformation allows same commands across Claude Code, Cursor, GitHub Copilot, Windsurf, etc.
- **State-driven**: Persists analysis history to `.ed-says-state.json` for trend analysis and grasp-based debt adjustment

## Layers

**Skill Commands Layer:**
- Purpose: User-facing CLI interface to epistemic debt workflows
- Location: `.claude/commands/ed-says/` (install target); `commands/ed-says/` (source)
- Contains: Markdown command specifications
- Entry points:
  - `analyze.md` - Main debt computation + result interpretation
  - `init.md` - Interactive configuration setup
  - `config.md` - View/edit config
  - `status.md` - Show last report without re-analysis
  - `ask.md` - Comprehension Q&A for Phase 3 grasp scoring
  - `history.md` - Debt trend analysis across PRs (Phase 2+)
- Depends on: Python analysis script, GitHub API/token, state file
- Used by: End users running `/ed-says:*` commands

**Agent Layer:**
- Purpose: Sub-LLM logic for analysis interpretation and Phase 3 comprehension rubric application
- Location: `.claude/agents/ed-says/` (install target); `agents/ed-says/` (source)
- Contains: `ed-says-analyzer.md`, `ed-says-judge.md`
- Responsibilities:
  - `ed-says-analyzer.md` - Runs Python script, interprets JSON output, adds narrative commentary
  - `ed-says-judge.md` - Applies 4-axis comprehension rubric (causality, counterfactuals, edge cases, cross-boundary coherence), generates questions, scores answers
- Depends on: Python script output, component complexity data
- Used by: Command layer for orchestration

**Analysis Engine (Python):**
- Purpose: Deterministic epistemic debt formula computation
- Location: `scripts/ed-says-analyze.py`
- Contains: Diff parsing, complexity analysis, bus factor derivation, Ed formula application
- Invocation: `python scripts/ed-says-analyze.py [--base <branch>] [--config <path>] [--format json|text]`
- Output: JSON with per-component and total debt scores, severity classification
- Standalone: No LLM required; portable to GitHub Actions (Phase 4)

**State Persistence Layer:**
- Purpose: Track analysis history, support grasp adjustment, enable trend analysis
- Location: `.ed-says-state.json` (repo root)
- Schema: Rolling-window ledger with max 100 entries per `.ed-says-state.json` defaults
- Updated by: `analyze.md` after each run, `ask.md` when grasp scores recorded
- Read by: `status.md`, `history.md`, subsequent `/analyze` runs for grasp-adjusted debt

**Configuration Layer:**
- Purpose: Define components, bus factor thresholds, subdomain types, analysis weights
- Location: `.ed-says.yml` (repo root)
- Schema: YAML with component definitions, complexity analyzer settings, severity thresholds, output mode
- Read by: `analyze.py`, all commands
- Managed by: `init.md` (creation), `config.md` (view/edit)

**GitHub Integration:**
- Purpose: Post/update PR comments with analysis results; detect auth context
- Location: `scripts/ed-says-comment.sh` (shell helper), token detection in `analyze.md`
- Token sources: `GITHUB_TOKEN` env var, `GH_TOKEN` env var, Claude Code MCP GitHub tools
- Behavior: Post idempotent comment (via `<!-- ed-says-report -->` HTML marker) if token available; fall back to terminal output + guidance

## Data Flow

**Primary Workflow (`/ed-says:analyze`):**

1. User runs `/ed-says:analyze --base <branch>` in Claude Code
2. `analyze.md` reads `.ed-says.yml` (or uses defaults)
3. `ed-says-analyzer.md` invokes: `python scripts/ed-says-analyze.py --base <branch> --config .ed-says.yml --format json`
4. Python script:
   - Runs `git diff <branch>...HEAD` → unified diff
   - Parses diff, groups files by component (glob matching from `.ed-says.yml`)
   - For each component: computes `Cs_diff` (lizard on added lines), `Cs_file` (pre-image complexity), `fan_in` (module counts), `churn` (90-day commit frequency)
   - Derives bus factor from fallback chain: explicit config (0.7) → CODEOWNERS (0.7) → git log recent (0.4) → git log all-time (0.2) → no data (worst case)
   - Applies formula: `Cs_effective = Cs_diff × (1 + 0.3×file_norm + 0.3×fan_in_norm + 0.2×churn_norm)`, then `Ed_risk = Cs_effective × max(0, 1 − BF_effective / N_req)`
   - Applies prior grasp credit if `.ed-says-state.json` has `Gc` from a previous `/ask` session
   - Returns JSON with per-component and total debt, severity classification
5. `ed-says-analyzer.md` interprets JSON, generates narrative, detects GitHub token
6. If token present: `ed-says-comment.sh` posts/updates PR comment with idempotent marker
7. If no token: Print result to terminal + prompt to set `GITHUB_TOKEN`
8. Append entry to `.ed-says-state.json`

**Comprehension Workflow (`/ed-says:ask`):**

1. User runs `/ed-says:ask <component>` (selects from last analysis)
2. `ask.md` retrieves component from `.ed-says-state.json` last entry
3. `ed-says-judge.md` generates 2–3 comprehension questions at specified level (implementation by default; Phase 3 adds requirement/specification/validation)
4. Claude acts as LLMJ — reads answers, scores each axis (causality, counterfactuals, edge cases, cross-boundary coherence) 0–4
5. Computes grasp: `Gc = (rubricScore / 16) × Cs_effective` (same units as complexity)
6. Writes grasp score to `.ed-says-state.json` under component
7. Next `/analyze` run subtracts grasp from debt: `adjusted_debt = max(0, Ed_risk − Gc)`

**Trend Analysis (`/ed-says:history`):**

1. User runs `/ed-says:history` (Phase 2+)
2. `history.md` reads all entries in `.ed-says-state.json`
3. Groups by component, plots debt trend across last N PRs
4. Flags components with upward trend

**State Management:**

- `.ed-says-state.json` entries: `[{timestamp, sha, prNumber, totalDebt, severity, components: [{name, debtScore, complexity, busFactor}]}]`
- Rolling window: when entries exceed `maxEntries` (default 100), drop oldest
- Read/write: Non-destructive append pattern; grasp scores written in-place per component

## Key Abstractions

**Component:**
- Represents a logical unit of code (e.g., `auth`, `payments`, `analytics`)
- Defined in `.ed-says.yml` via glob patterns: `paths: ["src/auth/**", "src/auth.ts"]`
- Attributes: `name`, `paths`, `subdomain` (core/supporting/generic), `bus_factor_threshold` (required coverage)
- Scored independently; combined for total risk

**System-Aware Complexity (Cs_effective):**
- Unit: Complexity Points (CP) — dimensionless scalar
- Captures: Diff complexity amplified by pre-existing file complexity, coupling (fan-in), and churn
- Formula: `Cs_effective = Cs_diff × (1 + 0.3×file_norm + 0.3×fan_in_norm + 0.2×churn_norm)`
- Rationale: Diff complexity alone misses risk of changes to already-complex files or heavily-imported modules

**Confidence-Weighted Bus Factor (BF_effective):**
- Unit: Effective people (fractional after confidence discount)
- Measures: How many people understand the code, weighted by confidence in the measurement source
- Fallback chain: explicit config (0.7) → CODEOWNERS (0.7) → git log recent (0.4) → git log all-time (0.2) → no data (worst case)
- Upgrade path: When LLMJ grasp scores exist (Phase 3), confidence → 1.0
- Pessimistic by default: Maximizes flagged risk (safe error direction)

**Coverage Gap:**
- Unit: Dimensionless ratio [0, 1]
- Definition: `max(0, 1 − BF_effective / N_req)`
- Interpretation: Fraction of required bus factor not yet covered
- When 0: Full coverage, component contributes zero debt
- When 1: Zero coverage, component contributes full complexity as debt

**Epistemic Debt (Ed_risk):**
- Unit: Complexity Points (CP) — same as Cs_effective
- Definition: `Ed_risk = Cs_effective × coverage_gap`
- Interpretation: Knowledge gap risk weighted by system complexity
- Adjusted by grasp: `adjusted_debt = max(0, Ed_risk − Gc)`

**Grasp (Gc) — Phase 3+:**
- Unit: CP (same as complexity)
- Definition: `Gc = (rubricScore / 16) × Cs_effective`
- Rubric axes: causality (explains why), counterfactuals (considered alternatives), edge case awareness, cross-boundary coherence
- Per-developer, per-component; persisted in state file
- Credit applied only to component + developer pairing

**Severity Classification:**
- Band: LOW ≤ 25 CP, MEDIUM ≤ 50 CP, HIGH ≤ 75 CP, CRITICAL > 75 CP
- Applied to both per-component and total debt
- Thresholds: Empirically calibrated so typical well-understood PR scores LOW

## Entry Points

**CLI Commands (Skill Layer):**
- `/ed-says:analyze [--base <branch>]` - Main entry; computes debt, posts comment, updates state
- `/ed-says:init` - Interactive config scaffold (Phase 1); creates `.ed-says.yml`, `.ed-says-state.json`
- `/ed-says:config` - View/edit `.ed-says.yml` with explanations
- `/ed-says:status` - Fast path: read `.ed-says-state.json`, show last result without re-run
- `/ed-says:ask <component> [--level <level>]` - Comprehension Q&A (Phase 0+); generates questions, scores answers
- `/ed-says:history [--days N]` - Trend view (Phase 2+); plots debt per component over time

**Hook Entry (Optional, Phase 1+):**
- `hooks/ed-says-auto.sh` - PostToolUse hook for auto-run on `git push` (opt-in)

**GitHub Action Entry (Phase 4):**
- `action.yml` - Wraps `scripts/ed-says-analyze.py`; same inputs as existing action implementation
- Triggered on PR (opened, synchronize)
- Posts comment via GitHub API (no MCP required in CI context)

**Installer Entry:**
- `install.js` - `npx ed-says-skill --install [--local|--global] [--claude|--cursor|--copilot|--windsurf]`
- Copies skill commands, agents, scripts to target location
- Runs format transformation at install time (e.g., markdown → Cursor SKILL.md)
- Not triggered by users after initial install

## Error Handling

**Strategy:** Graceful degradation with user guidance

**Patterns:**

- **Missing `.ed-says.yml`**: Commands use built-in defaults (core domain, bus factor 2, heuristic complexity)
- **Lizard unavailable**: Python script falls back to hand-rolled heuristic (port of `src/analyzers/complexity.ts`)
- **Git context missing** (not in PR): Prompt user to run with `--base <branch>` or set up hook
- **GitHub token absent**: Print result to terminal + guidance: `💡 Set GITHUB_TOKEN to enable PR comments`
- **Invalid config**: Python script exits with error message listing validation failures
- **Diff parse error**: Log malformed lines, continue with parsed content

## Cross-Cutting Concerns

**Logging:** 
- Python script: stderr (errors, warnings), optionally JSON-structured output
- Skill commands: Terminal output via markdown code blocks
- Agent interpretation: Included in command response narrative

**Validation:**
- Config: YAML schema validation (required fields per component, glob patterns, bus factor >= 1)
- Git context: Check HEAD vs base branch, ensure diff is non-empty
- Bus factor: Fallback chain ensures no component left unmeasured

**Authentication:**
- GitHub token: Read from `GITHUB_TOKEN` env var, then `GH_TOKEN`, then Claude Code MCP GitHub tools
- Graceful fallback: Commands work without token (local terminal output only)

**Determinism:**
- Python script: No LLM calls; same input always produces same output
- Git queries: Use deterministic ordering (--oneline, sorted counts)
- Timestamps: ISO 8601 UTC in state file for reproducibility

---

*Architecture analysis: 2026-04-05*

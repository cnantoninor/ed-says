<!-- GSD:project-start source:PROJECT.md -->
## Project

**Ed Says**

Ed Says is a portable, multi-LLM epistemic debt analyzer that lives in a repository alongside the code it analyzes. It computes a deterministic epistemic debt score — measuring how much complexity risk is exposed when too few people understand the code being changed — using a Python script as the stable, LLM-agnostic core. The LLM (Claude, Cursor, Copilot, etc.) handles orchestration, interpretation, and comprehension questioning; never the formula itself.

**Core Value:** A developer running `/ed-says:analyze` on a PR gets an honest, reproducible epistemic debt score before merging — not a gut feeling.

### Constraints

- **Determinism**: The Python script must produce identical output for the same inputs — no LLM in the formula path
- **Portability**: The script must run standalone (no LLM required) and in GitHub Actions
- **Compatibility**: Must support lizard unavailable (fallback heuristic required)
- **LLM runtime**: Claude Code skill-first; multi-LLM portability via install-time transformation (not runtime abstraction)
- **Branch strategy**: Each milestone gets its own branch + PR against main; Milestone 0 on `claude/ed-says-skill-milestone0`
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Project Phase
- Primary: Claude Code skill (Python + Markdown command definitions)
- Secondary: Standalone Python script (LLM-agnostic, portable)
- Future: Multi-LLM support (Cursor, Copilot, Windsurf)
## Languages
- **Python** 3.x — Core analysis engine (`scripts/ed-says-analyze.py`)
- **TypeScript** 5.7.0 — (Legacy, being phased out)
- **YAML** — Configuration format (`.ed-says.yml`)
- **Shell/Bash** — Git operations and CI integration (`scripts/ed-says-comment.sh`)
- **Markdown** — Command definitions for Claude Code skill (`.claude/commands/ed-says/`)
## Runtime
- **Node.js** 18+ (legacy, minimal use in Phase 0)
- **Python 3.8+** — Core analysis, git operations, no heavy dependencies
- **Bash/sh** — Git operations, GitHub API integration
- **Claude Code** — Skill runtime (primary Phase 0 execution context)
- **npm** (legacy, for installer distribution)
- **pip** (for Python dependencies: `lizard`, `pyyaml`)
## Frameworks & Libraries
### Core Analysis (Python)
- **PyYAML** 5.x+ — YAML config parsing
- **lizard** — Cognitive complexity measurement
- Standard library: `subprocess`, `pathlib` — Execute `git` commands
### Claude Code Skill (Markdown + Python)
- Claude Code built-in tools:
- `ed-says-analyzer.md` — Orchestrates Python script, interprets results
- `ed-says-judge.md` — Comprehension rubric judge (4-axis scoring, 0–4 each)
### Legacy TypeScript (Removed)
- **@actions/core** 1.11.1 — GitHub Actions API (input/output)
- **@actions/github** 6.0.0 — GitHub client, PR comment posting
- **ai** 4.0.0 — LLM client library (Vercel AI SDK)
- **zod** 3.24.0 — Schema validation (config, output)
- **commander** 13.0.0 — CLI argument parsing
- **chalk** 5.4.0 — Terminal color formatting
- **TypeScript** 5.7.0 — Transpiler
- **tsup** 8.3.0 — Bundler
- **@vercel/ncc** 0.38.0 — Webpack bundler (GitHub Action)
- **vitest** 3.0.0 — Test runner
- **eslint** 9.0.0 — Linter
- **prettier** 3.4.0 — Code formatter
## Configuration
### Environment Variables
- `GITHUB_TOKEN` or `GH_TOKEN` — GitHub API authentication
- None explicitly required; all defaults handled by config file
### Config Files
- **Purpose:** Define components, bus factor thresholds, analysis parameters
- **Format:** YAML
- **Created by:** `/ed-says:init` command
- **Schema:** See `SKILL_PLAN.md` (Section: "State File Schema")
- **Key sections:**
- **Purpose:** Persist analysis results, grasp scores, trend history
- **Format:** JSON
- **Created by:** `/ed-says:init` command; written by `/ed-says:analyze` after each run
- **Schema:** `{ version, maxEntries, entries[] }`
- **Rolling window:** Drop oldest entry when `entries.length > maxEntries` (default: 100)
- **Purpose:** Explicit ownership declaration (confidence: 0.7)
- **Fallback chain** (Phase 0): If absent, use git log (confidence: 0.4)
## Platform Requirements
### Development
- Python 3.8+
- Node.js 18+ (for installer only, Phase 2+)
- Git 2.30+ (for `git diff`, `git show`, `git log` with `--since`)
- Bash/sh (for shell scripts)
- `lizard` (pip install) — Recommended for accurate complexity metrics
- GitHub CLI (`gh`) — For posting PR comments
### Production / Deployment
- Claude Code runtime with file I/O and bash tool access
- `.claude/commands/` directory (where skill is installed)
- `scripts/` directory (where Python and shell scripts live)
- Ubuntu-latest runner (or compatible Linux)
- Python 3.8+ pre-installed
- Git 2.30+ pre-installed
- `gh` CLI available (GitHub-hosted runners include it)
- Cursor IDE (rules format: `.cursor/rules/`)
- GitHub Copilot (appended to `.github/copilot-instructions.md`)
- Windsurf IDE (rules format: `.windsurf/rules/`)
## Key Architectural Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Formula engine** | Python (deterministic) | Portable across LLMs and CI; no LLM cost per analysis |
| **Complexity measurement** | `lizard` + fallback heuristic | Battle-tested (SonarQube-compatible); graceful degradation if unavailable |
| **Primary runtime** | Claude Code skill | Dog-food MVP; LLM orchestration for interpretation; immediate value |
| **State persistence** | JSON file (`.ed-says-state.json`) | Git-trackable; simple rolling window; no external DB |
| **Config format** | YAML (`.ed-says.yml`) | Unchanged from TypeScript implementation; human-readable |
| **GitHub integration** | `gh` CLI + fallback to terminal | Graceful degradation; no hard dependency on GitHub infrastructure |
| **Complexity formula** | System-aware (`Cs_eff = Cs_diff × (1 + weights)`) | Accounts for file complexity, coupling, churn — not just diff |
| **Bus factor** | Confidence-weighted fallback chain | Git log (0.4) → CODEOWNERS (0.7) → config (0.7) → LLMJ (1.0) |
## Dependency Graph
## Version History
| Phase | Status | Runtime | Key Tech |
|-------|--------|---------|----------|
| **Phase 0** | Current | Claude Code skill | Python, git, bash |
| **Phase 1** | Planned | Claude Code skill (full) | Same + state persistence |
| **Phase 2** | Planned | Multi-LLM (installers) | Node.js `install.js`, format transforms |
| **Phase 3** | Planned | Claude Code skill + history | Same + per-level scoring |
| **Phase 4** | Planned | GitHub Action + skill | Python (shared), GitHub Actions env |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Current State: Pre-Implementation
## Languages in Scope
| Language | Use | Location |
|----------|-----|----------|
| Python 3.8+ | Core formula engine, git integration | `scripts/ed-says-analyze.py` |
| Markdown | Claude Code skill commands and agents | `commands/ed-says/*.md`, `agents/ed-says/*.md` |
| YAML | Configuration | `.ed-says.yml`, `templates/.ed-says.yml` |
| Bash/sh | GitHub comment helper, optional hooks | `scripts/ed-says-comment.sh`, `hooks/` |
| JSON | State file schema | `.ed-says-state.json` |
## Python Conventions
- Functions and variables: `snake_case` (e.g., `compute_component_debt`, `bus_factor`)
- Classes: `PascalCase` (e.g., `ComponentDebt`, `Config`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_BUS_FACTOR_THRESHOLD`)
- Private helpers: `_leading_underscore` prefix
- Order: stdlib → third-party (`pyyaml`, `lizard`) → local
- Use explicit imports, not `import *`
- Required on all function signatures (Python 3.8+ style)
- Use `Optional[X]` not `X | None` for 3.8 compatibility
- Document formula derivations inline with variable definitions
- Use domain acronyms in comments (see acronym table below)
- Magic numbers must be explained (e.g., `0.3  # file_norm weight per SKILL_PLAN.md line 165`)
- `sys.exit(1)` with a descriptive message on fatal errors
- Continue with partial results on per-component errors (log, don't stop)
- Never silently swallow exceptions
- `argparse` for argument parsing
- Support: `--base <branch>`, `--config <path>`, `--format json|text`
## YAML Conventions (`.ed-says.yml`)
## JSON Conventions (`.ed-says-state.json`)
## Markdown Command/Agent Conventions
- Purpose statement (1–2 sentences)
- Argument parsing instructions
- Step-by-step workflow
- Output format specification
- Error cases
## Domain Acronyms
| Acronym | Meaning |
|---------|---------|
| `Cs` | System-aware complexity score (complexity points, CP) |
| `Cs_diff` | Complexity of added lines in the diff |
| `Cs_file` | Pre-existing complexity of the touched files |
| `Cs_effective` | Amplified complexity: `Cs_diff × (1 + weights)` |
| `BF` | Bus factor (number of people who understand the code) |
| `BF_effective` | Confidence-weighted bus factor |
| `N_req` | Minimum required bus factor (coverage threshold) |
| `Ed_risk` | Epistemic debt score (same units as Cs) |
| `Gc` | Comprehension grasp score (Phase 3+) |
| `LLMJ` | LLM judge (Phase 3 comprehension scoring) |
| `CP` | Complexity Points — dimensionless unit for all scores |
## What NOT to Follow
- `EdSaysError` class hierarchy (TypeScript only)
- `src/utils/logger.ts` logging patterns
- `tsconfig.json` settings
- Vitest test patterns
- ESM `.js` import extensions
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- **Formula-first**: Epistemic debt computation via deterministic Python script (`scripts/ed-says-analyze.py`), not LLM-generated
- **Layered coupling**: LLM skill layer orchestrates analysis, interprets results, and runs Phase 3 comprehension judgments; Python engine handles deterministic scoring
- **Graceful degradation**: Works without GitHub token (terminal output); auto-posts PR comments when token available
- **Multi-LLM portable**: Install-time format transformation allows same commands across Claude Code, Cursor, GitHub Copilot, Windsurf, etc.
- **State-driven**: Persists analysis history to `.ed-says-state.json` for trend analysis and grasp-based debt adjustment
## Layers
- Purpose: User-facing CLI interface to epistemic debt workflows
- Location: `.claude/commands/ed-says/` (install target); `commands/ed-says/` (source)
- Contains: Markdown command specifications
- Entry points:
- Depends on: Python analysis script, GitHub API/token, state file
- Used by: End users running `/ed-says:*` commands
- Purpose: Sub-LLM logic for analysis interpretation and Phase 3 comprehension rubric application
- Location: `.claude/agents/ed-says/` (install target); `agents/ed-says/` (source)
- Contains: `ed-says-analyzer.md`, `ed-says-judge.md`
- Responsibilities:
- Depends on: Python script output, component complexity data
- Used by: Command layer for orchestration
- Purpose: Deterministic epistemic debt formula computation
- Location: `scripts/ed-says-analyze.py`
- Contains: Diff parsing, complexity analysis, bus factor derivation, Ed formula application
- Invocation: `python scripts/ed-says-analyze.py [--base <branch>] [--config <path>] [--format json|text]`
- Output: JSON with per-component and total debt scores, severity classification
- Standalone: No LLM required; portable to GitHub Actions (Phase 4)
- Purpose: Track analysis history, support grasp adjustment, enable trend analysis
- Location: `.ed-says-state.json` (repo root)
- Schema: Rolling-window ledger with max 100 entries per `.ed-says-state.json` defaults
- Updated by: `analyze.md` after each run, `ask.md` when grasp scores recorded
- Read by: `status.md`, `history.md`, subsequent `/analyze` runs for grasp-adjusted debt
- Purpose: Define components, bus factor thresholds, subdomain types, analysis weights
- Location: `.ed-says.yml` (repo root)
- Schema: YAML with component definitions, complexity analyzer settings, severity thresholds, output mode
- Read by: `analyze.py`, all commands
- Managed by: `init.md` (creation), `config.md` (view/edit)
- Purpose: Post/update PR comments with analysis results; detect auth context
- Location: `scripts/ed-says-comment.sh` (shell helper), token detection in `analyze.md`
- Token sources: `GITHUB_TOKEN` env var, `GH_TOKEN` env var, Claude Code MCP GitHub tools
- Behavior: Post idempotent comment (via `<!-- ed-says-report -->` HTML marker) if token available; fall back to terminal output + guidance
## Data Flow
- `.ed-says-state.json` entries: `[{timestamp, sha, prNumber, totalDebt, severity, components: [{name, debtScore, complexity, busFactor}]}]`
- Rolling window: when entries exceed `maxEntries` (default 100), drop oldest
- Read/write: Non-destructive append pattern; grasp scores written in-place per component
## Key Abstractions
- Represents a logical unit of code (e.g., `auth`, `payments`, `analytics`)
- Defined in `.ed-says.yml` via glob patterns: `paths: ["src/auth/**", "src/auth.ts"]`
- Attributes: `name`, `paths`, `subdomain` (core/supporting/generic), `bus_factor_threshold` (required coverage)
- Scored independently; combined for total risk
- Unit: Complexity Points (CP) — dimensionless scalar
- Captures: Diff complexity amplified by pre-existing file complexity, coupling (fan-in), and churn
- Formula: `Cs_effective = Cs_diff × (1 + 0.3×file_norm + 0.3×fan_in_norm + 0.2×churn_norm)`
- Rationale: Diff complexity alone misses risk of changes to already-complex files or heavily-imported modules
- Unit: Effective people (fractional after confidence discount)
- Measures: How many people understand the code, weighted by confidence in the measurement source
- Fallback chain: explicit config (0.7) → CODEOWNERS (0.7) → git log recent (0.4) → git log all-time (0.2) → no data (worst case)
- Upgrade path: When LLMJ grasp scores exist (Phase 3), confidence → 1.0
- Pessimistic by default: Maximizes flagged risk (safe error direction)
- Unit: Dimensionless ratio [0, 1]
- Definition: `max(0, 1 − BF_effective / N_req)`
- Interpretation: Fraction of required bus factor not yet covered
- When 0: Full coverage, component contributes zero debt
- When 1: Zero coverage, component contributes full complexity as debt
- Unit: Complexity Points (CP) — same as Cs_effective
- Definition: `Ed_risk = Cs_effective × coverage_gap`
- Interpretation: Knowledge gap risk weighted by system complexity
- Adjusted by grasp: `adjusted_debt = max(0, Ed_risk − Gc)`
- Unit: CP (same as complexity)
- Definition: `Gc = (rubricScore / 16) × Cs_effective`
- Rubric axes: causality (explains why), counterfactuals (considered alternatives), edge case awareness, cross-boundary coherence
- Per-developer, per-component; persisted in state file
- Credit applied only to component + developer pairing
- Band: LOW ≤ 25 CP, MEDIUM ≤ 50 CP, HIGH ≤ 75 CP, CRITICAL > 75 CP
- Applied to both per-component and total debt
- Thresholds: Empirically calibrated so typical well-understood PR scores LOW
## Entry Points
- `/ed-says:analyze [--base <branch>]` - Main entry; computes debt, posts comment, updates state
- `/ed-says:init` - Interactive config scaffold (Phase 1); creates `.ed-says.yml`, `.ed-says-state.json`
- `/ed-says:config` - View/edit `.ed-says.yml` with explanations
- `/ed-says:status` - Fast path: read `.ed-says-state.json`, show last result without re-run
- `/ed-says:ask <component> [--level <level>]` - Comprehension Q&A (Phase 0+); generates questions, scores answers
- `/ed-says:history [--days N]` - Trend view (Phase 2+); plots debt per component over time
- `hooks/ed-says-auto.sh` - PostToolUse hook for auto-run on `git push` (opt-in)
- `action.yml` - Wraps `scripts/ed-says-analyze.py`; same inputs as existing action implementation
- Triggered on PR (opened, synchronize)
- Posts comment via GitHub API (no MCP required in CI context)
- `install.js` - `npx ed-says-skill --install [--local|--global] [--claude|--cursor|--copilot|--windsurf]`
- Copies skill commands, agents, scripts to target location
- Runs format transformation at install time (e.g., markdown → Cursor SKILL.md)
- Not triggered by users after initial install
## Error Handling
- **Missing `.ed-says.yml`**: Commands use built-in defaults (core domain, bus factor 2, heuristic complexity)
- **Lizard unavailable**: Python script falls back to hand-rolled heuristic (port of `src/analyzers/complexity.ts`)
- **Git context missing** (not in PR): Prompt user to run with `--base <branch>` or set up hook
- **GitHub token absent**: Print result to terminal + guidance: `💡 Set GITHUB_TOKEN to enable PR comments`
- **Invalid config**: Python script exits with error message listing validation failures
- **Diff parse error**: Log malformed lines, continue with parsed content
## Cross-Cutting Concerns
- Python script: stderr (errors, warnings), optionally JSON-structured output
- Skill commands: Terminal output via markdown code blocks
- Agent interpretation: Included in command response narrative
- Config: YAML schema validation (required fields per component, glob patterns, bus factor >= 1)
- Git context: Check HEAD vs base branch, ensure diff is non-empty
- Bus factor: Fallback chain ensures no component left unmeasured
- GitHub token: Read from `GITHUB_TOKEN` env var, then `GH_TOKEN`, then Claude Code MCP GitHub tools
- Graceful fallback: Commands work without token (local terminal output only)
- Python script: No LLM calls; same input always produces same output
- Git queries: Use deterministic ordering (--oneline, sorted counts)
- Timestamps: ISO 8601 UTC in state file for reproducibility
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

# Technology Stack

**Analysis Date:** 2026-04-05

## Project Phase

**Current State:** Phase 0 (dog-food MVP) — transitioning from GitHub Action to Claude Code skill

**Target Architecture:**
- Primary: Claude Code skill (Python + Markdown command definitions)
- Secondary: Standalone Python script (LLM-agnostic, portable)
- Future: Multi-LLM support (Cursor, Copilot, Windsurf)

---

## Languages

**Primary:**
- **Python** 3.x — Core analysis engine (`scripts/ed-says-analyze.py`)
  - Deterministic epistemic debt formula calculation
  - Git integration and diff parsing
  - Fallback complexity heuristic (if `lizard` unavailable)

**Secondary:**
- **TypeScript** 5.7.0 — (Legacy, being phased out)
  - Source location: `src/` (removed in commit 59fe13b)
  - Was used for: GitHub Action wrapper, original analysis engine
  - Contains patterns to port: `src/core/`, `src/analyzers/`, `src/scoring/`

**Configuration/Scripting:**
- **YAML** — Configuration format (`.ed-says.yml`)
- **Shell/Bash** — Git operations and CI integration (`scripts/ed-says-comment.sh`)
- **Markdown** — Command definitions for Claude Code skill (`.claude/commands/ed-says/`)

---

## Runtime

**Development/Execution:**
- **Node.js** 18+ (legacy, minimal use in Phase 0)
  - Installer: `install.js` (copied to target repo)
  - Legacy: `npx` entry point for multi-LLM deployment
- **Python 3.8+** — Core analysis, git operations, no heavy dependencies
- **Bash/sh** — Git operations, GitHub API integration
- **Claude Code** — Skill runtime (primary Phase 0 execution context)

**Package Managers:**
- **npm** (legacy, for installer distribution)
  - Primary lockfile: `package-lock.json` (removed 59fe13b)
- **pip** (for Python dependencies: `lizard`, `pyyaml`)

---

## Frameworks & Libraries

### Core Analysis (Python)

**Runtime Dependencies:**
- **PyYAML** 5.x+ — YAML config parsing
  - Purpose: Load `.ed-says.yml` configuration
  - Replaces: Zod (TypeScript) for validation
- **lizard** — Cognitive complexity measurement
  - Purpose: Compute `Cs_diff` and `Cs_file` complexity metrics
  - Languages: TypeScript, Python, Go, JavaScript, etc.
  - Fallback: Hand-rolled heuristic in Python if unavailable

**Git Integration:**
- Standard library: `subprocess`, `pathlib` — Execute `git` commands
  - `git diff` — Unified diff parsing
  - `git show` — Pre-image retrieval for complexity comparison
  - `git log --since=90days` — Churn analysis (commit frequency)
  - `git blame` — Author attribution for bus factor derivation

### Claude Code Skill (Markdown + Python)

**Execution:**
- Claude Code built-in tools:
  - `bash` — Run `scripts/ed-says-analyze.py`, post PR comments via `gh` CLI
  - File I/O — Read/write `.ed-says.yml`, `.ed-says-state.json`
  - GitHub API (via MCP) — Post PR comments, read CODEOWNERS

**Subagents (Phase 1+):**
- `ed-says-analyzer.md` — Orchestrates Python script, interprets results
- `ed-says-judge.md` — Comprehension rubric judge (4-axis scoring, 0–4 each)

### Legacy TypeScript (Removed)

**Former Dependencies (59fe13b, to be ported):**
- **@actions/core** 1.11.1 — GitHub Actions API (input/output)
- **@actions/github** 6.0.0 — GitHub client, PR comment posting
- **ai** 4.0.0 — LLM client library (Vercel AI SDK)
- **zod** 3.24.0 — Schema validation (config, output)
- **commander** 13.0.0 — CLI argument parsing
- **chalk** 5.4.0 — Terminal color formatting

**Dev Dependencies (TypeScript):**
- **TypeScript** 5.7.0 — Transpiler
- **tsup** 8.3.0 — Bundler
- **@vercel/ncc** 0.38.0 — Webpack bundler (GitHub Action)
- **vitest** 3.0.0 — Test runner
- **eslint** 9.0.0 — Linter
- **prettier** 3.4.0 — Code formatter

---

## Configuration

### Environment Variables

**Required (when running in GitHub Actions context):**
- `GITHUB_TOKEN` or `GH_TOKEN` — GitHub API authentication
  - Used by: `scripts/ed-says-comment.sh` for posting PR comments
  - Graceful fallback: Terminal output if absent, with prompt to set token

**Optional (Phase 1+):**
- None explicitly required; all defaults handled by config file

### Config Files

**`.ed-says.yml`** (repository root)
- **Purpose:** Define components, bus factor thresholds, analysis parameters
- **Format:** YAML
- **Created by:** `/ed-says:init` command
- **Schema:** See `SKILL_PLAN.md` (Section: "State File Schema")
- **Key sections:**
  - `components[]` — Component definitions with glob paths, subdomain classification
  - `thresholds.levels` — Weighting for requirements/specification/implementation/validation
  - `analyzers.complexity` — Engine selection (lizard vs heuristic), system-aware metrics
  - `ledger` — State file configuration (Phase 1+)

**`.ed-says-state.json`** (repository root, Phase 0+)
- **Purpose:** Persist analysis results, grasp scores, trend history
- **Format:** JSON
- **Created by:** `/ed-says:init` command; written by `/ed-says:analyze` after each run
- **Schema:** `{ version, maxEntries, entries[] }`
- **Rolling window:** Drop oldest entry when `entries.length > maxEntries` (default: 100)

**`.github/CODEOWNERS`** (optional, used for bus factor derivation)
- **Purpose:** Explicit ownership declaration (confidence: 0.7)
- **Fallback chain** (Phase 0): If absent, use git log (confidence: 0.4)

### Build & Development Config

**`tsconfig.json`** (removed 59fe13b)
- Was: TypeScript compilation target (`ES2020`, `module: "ES2020"`)

**`.prettierrc`** (removed 59fe13b)
- Was: Code formatter config

**`.eslintrc.cjs`** (removed 59fe13b)
- Was: Linter configuration

**`.github/workflows/`** (removed 59fe13b)
- Was: `ci.yml`, `dogfood.yml`, `release.yml` GitHub Actions workflows
- Phase 4 will re-introduce: GitHub Action wrapper for CI integration

---

## Platform Requirements

### Development

**Minimum:**
- Python 3.8+
- Node.js 18+ (for installer only, Phase 2+)
- Git 2.30+ (for `git diff`, `git show`, `git log` with `--since`)
- Bash/sh (for shell scripts)

**Optional:**
- `lizard` (pip install) — Recommended for accurate complexity metrics
  - Fallback: Hand-rolled heuristic in Python
- GitHub CLI (`gh`) — For posting PR comments
  - Fallback: GitHub API via Python `requests` or similar

### Production / Deployment

**Claude Code (Phase 0+):**
- Claude Code runtime with file I/O and bash tool access
- `.claude/commands/` directory (where skill is installed)
- `scripts/` directory (where Python and shell scripts live)

**GitHub Action (Phase 4+):**
- Ubuntu-latest runner (or compatible Linux)
- Python 3.8+ pre-installed
- Git 2.30+ pre-installed
- `gh` CLI available (GitHub-hosted runners include it)

**Multi-LLM (Phase 2+):**
- Cursor IDE (rules format: `.cursor/rules/`)
- GitHub Copilot (appended to `.github/copilot-instructions.md`)
- Windsurf IDE (rules format: `.windsurf/rules/`)

---

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

---

## Dependency Graph

```
Claude Code Skill (Phase 0)
├── scripts/ed-says-analyze.py
│   ├── PyYAML (config parsing)
│   ├── lizard (complexity, optional with fallback)
│   └── git (subprocess)
├── commands/ed-says/analyze.md
│   ├── ed-says-analyzer.md subagent
│   ├── bash tool (run Python script)
│   └── gh CLI (post PR comment)
├── commands/ed-says/ask.md
│   └── ed-says-judge.md subagent (rubric scoring)
└── .ed-says-state.json (state persistence)

GitHub Action (Phase 4, future)
└── action.yml
    └── scripts/ed-says-analyze.py (same as skill)
```

---

## Version History

| Phase | Status | Runtime | Key Tech |
|-------|--------|---------|----------|
| **Legacy** | Removed (59fe13b) | GitHub Action (Node.js) | TypeScript, @actions/github |
| **Phase 0** | Current | Claude Code skill | Python, git, bash |
| **Phase 1** | Planned | Claude Code skill (full) | Same + state persistence |
| **Phase 2** | Planned | Multi-LLM (installers) | Node.js `install.js`, format transforms |
| **Phase 3** | Planned | Claude Code skill + history | Same + per-level scoring |
| **Phase 4** | Planned | GitHub Action + skill | Python (shared), GitHub Actions env |

---

*Stack analysis: 2026-04-05*

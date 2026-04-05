# Codebase Structure

**Analysis Date:** 2026-04-05

## Directory Layout

```
ed-says/
├── .claude/                              # Claude Code installation target (created by installer)
│   ├── commands/
│   │   └── ed-says/                      # Main command suite
│   │       ├── analyze.md                # Run debt analysis
│   │       ├── init.md                   # Interactive config setup
│   │       ├── config.md                 # View/edit config
│   │       ├── status.md                 # Show last report
│   │       ├── ask.md                    # Comprehension Q&A
│   │       └── history.md                # Trend analysis (Phase 2+)
│   └── agents/
│       └── ed-says/
│           ├── ed-says-analyzer.md       # Analysis orchestration agent
│           └── ed-says-judge.md          # Comprehension rubric judge
│
├── commands/                             # Source skill commands
│   └── ed-says/                          # (mirrors .claude/ after install)
│       ├── analyze.md
│       ├── init.md
│       ├── config.md
│       ├── status.md
│       ├── ask.md
│       └── history.md
│
├── agents/                               # Source agents
│   └── ed-says/
│       ├── ed-says-analyzer.md
│       └── ed-says-judge.md
│
├── scripts/                              # Portable, LLM-agnostic implementations
│   ├── ed-says-analyze.py                # Main formula engine (deterministic)
│   └── ed-says-comment.sh                # GitHub PR comment helper
│
├── hooks/                                # Optional automation (Phase 1+)
│   └── ed-says-auto.sh                   # PostToolUse hook for auto-run on git push
│
├── templates/                            # Scaffolds written by /ed-says:init
│   ├── .ed-says.yml                      # Default config scaffold
│   └── .ed-says-state.json               # Empty state file scaffold
│
├── .ed-says.yml                          # Repo-specific config (created by /ed-says:init)
├── .ed-says-state.json                   # Analysis history ledger (created by /ed-says:init)
│
├── install.js                            # npx entry point for multi-LLM installer (Phase 2)
├── package.json                          # Package metadata, bin entry
├── README.md                             # User guide + quick start
├── SKILL_PLAN.md                         # Implementation phases (this handover doc)
├── LICENSE                               # MIT
│
├── docs/                                 # Developer documentation
│   └── formula.md                        # Mathematical specification of Ed formula
│
└── .planning/
    └── codebase/
        ├── ARCHITECTURE.md               # Layer structure, data flow, abstractions
        └── STRUCTURE.md                  # This file
```

## Directory Purposes

**`.claude/commands/ed-says/`:**
- Purpose: Claude Code command definitions (install target)
- Contains: Markdown skill command files, one per command
- Key files:
  - `analyze.md` — Main entry: triggers Python script, interprets results, posts PR comment, updates state
  - `init.md` — One-time setup: creates `.ed-says.yml` and `.ed-says-state.json` interactively
  - `ask.md` — Comprehension loop: generates questions, scores answers, writes grasp to state

**`.claude/agents/ed-says/`:**
- Purpose: Sub-agent definitions for complex logic
- Contains: Agent markdown files with specialized responsibilities
- Key files:
  - `ed-says-analyzer.md` — Runs Python script, interprets JSON, formats narrative
  - `ed-says-judge.md` — Applies 4-axis comprehension rubric, generates questions (Phase 0+)

**`commands/ed-says/` (source):**
- Purpose: Source template for skill commands; copied to `.claude/commands/ed-says/` by installer
- Contains: Same files as `.claude/commands/ed-says/`
- Note: Phase 2+ installer performs format transformation (markdown → Cursor SKILL.md, etc.)

**`agents/ed-says/` (source):**
- Purpose: Source template for agents; copied to `.claude/agents/ed-says/` by installer
- Contains: Same files as `.claude/agents/ed-says/`

**`scripts/`:**
- Purpose: Portable, LLM-agnostic logic; installed to `scripts/` in target repo
- Contains:
  - `ed-says-analyze.py` — Core formula computation (Phase 0)
  - `ed-says-comment.sh` — GitHub PR comment posting via `gh` CLI (Phase 1)
- Note: These scripts are NOT transformed at install time; always copied unchanged

**`hooks/`:**
- Purpose: Optional git hooks for automation
- Contains:
  - `ed-says-auto.sh` — PostToolUse hook for auto-run on `git push` (opt-in, Phase 1+)
- Installation: Only copied if user explicitly opts in during `/ed-says:init`

**`templates/`:**
- Purpose: Default scaffolds used when config/state files don't exist
- Contains:
  - `.ed-says.yml` — Default component definitions, complexity weights (used if config missing)
  - `.ed-says-state.json` — Empty state template (written once by `/ed-says:init`)

**`docs/`:**
- Purpose: Developer reference documentation
- Key files:
  - `formula.md` — Full mathematical specification of Ed formula with unit tables

## Key File Locations

**Entry Points:**

- `commands/ed-says/analyze.md` - Main command; coordinates entire debt analysis workflow
- `commands/ed-says/init.md` - First-time setup; creates `.ed-says.yml`
- `scripts/ed-says-analyze.py` - Python entry point for deterministic computation

**Configuration:**

- `.ed-says.yml` (repo root) - Component definitions, bus factor thresholds, complexity weights
- `templates/.ed-says.yml` - Default config used if `.ed-says.yml` missing
- `.ed-says-state.json` (repo root) - Analysis history ledger, grasp scores
- `templates/.ed-says-state.json` - Empty state scaffold

**Core Logic:**

- `scripts/ed-says-analyze.py` - Diff parsing, complexity analysis, formula computation
- `agents/ed-says/ed-says-analyzer.md` - Python output interpretation, narrative generation
- `agents/ed-says/ed-says-judge.md` - Comprehension rubric application, question generation
- `scripts/ed-says-comment.sh` - GitHub PR comment posting (idempotent via marker)

**Testing & Validation:**

- `docs/formula.md` - Mathematical reference for cross-validation
- (No test files yet; will be added in Phase 0 with test fixtures)

## Naming Conventions

**Files:**

- Skill commands: lowercase `*.md` in `commands/ed-says/` (e.g., `analyze.md`, `ask.md`)
- Agents: descriptive kebab-case with `ed-says-` prefix (e.g., `ed-says-analyzer.md`)
- Python scripts: descriptive kebab-case with `ed-says-` prefix (e.g., `ed-says-analyze.py`)
- Config files: dot-prefixed lowercase (e.g., `.ed-says.yml`, `.ed-says-state.json`)
- Shell scripts: kebab-case with `.sh` extension

**Directories:**

- Kebab-case (e.g., `ed-says-auto.sh` in `hooks/`)
- Plural for collections (e.g., `commands/`, `agents/`, `scripts/`, `hooks/`)

**Constants in code:**

- Environment variables: `SCREAMING_SNAKE_CASE` (e.g., `GITHUB_TOKEN`, `GH_TOKEN`)
- Config keys: `snake_case` in YAML (e.g., `bus_factor_threshold`, `file_norm_weight`)
- JSON keys: `camelCase` in state file (e.g., `csDiff`, `bfEffective`, `debtScore`)
- Python functions/classes: `snake_case` (per PEP 8)
- JSON output keys: `camelCase` (per JavaScript convention, JSON interchange standard)

## Where to Add New Code

**New Feature (e.g., new command like `/ed-says:timeline`):**
1. Create `commands/ed-says/timeline.md` with command logic
2. Add entry to skill registry in installer `install.js`
3. Update `README.md` with new command docs
4. Add test fixture if involves Python output (in Phase 0 test suite)

**New Agent (e.g., specialized judge for requirements level):**
1. Create `agents/ed-says/ed-says-requirements-judge.md`
2. Reference from command that uses it (e.g., `ask.md --level requirements`)
3. Add to installer; update registry

**New Python Module (Phase 1+, e.g., separate coupling analyzer):**
1. Create `scripts/ed-says-coupling.py` following PEP 8
2. Import from `ed-says-analyze.py`
3. Add CLI arg to `ed-says-analyze.py` if externally callable
4. Add test fixture + cross-validation

**Test Fixtures (Phase 0):**
1. Create `test/fixtures/` directory
2. Add `.diff` files representing test cases (from real PRs or synthetic)
3. Create expected output `.json` files
4. Reference in test suite for cross-validation between Python and TypeScript implementations

**New Configuration Schema:**
1. Add field to `templates/.ed-says.yml`
2. Update YAML validation in `scripts/ed-says-analyze.py` (manual check, or pyyaml schema)
3. Document in `docs/formula.md` or new config reference doc

## Special Directories

**`.claude/` (Install Target):**
- Purpose: Installation destination when user runs `npx ed-says-skill --install --local`
- Generated: Yes (by `install.js`)
- Committed: No (to target repo; lives in `.gitignore`)
- Persistence: Survives skill reinstalls; existing commands not overwritten if user modified

**`hooks/` (Optional Automation):**
- Purpose: Git hooks for automatic triggering
- Generated: No (source directory)
- Committed: Yes (to ed-says repo)
- Installation: Only copied to `hooks/` in target repo if user opts in during `/ed-says:init`
- Execution: Triggered by git events (e.g., pre-push)

**`.ed-says-state.json` (State Ledger):**
- Purpose: Rolling-window history of analysis runs
- Generated: Yes (by `/ed-says:analyze` command)
- Committed: Recommended (enables trend analysis across team, but optional)
- Max entries: 100 (configurable, rolled over on new entries)
- Format: JSON array of {timestamp, sha, prNumber, components, totalDebt, severity}

**`.ed-says.yml` (Configuration):**
- Purpose: Component definitions, analysis weights, severity thresholds
- Generated: No (created once by `/ed-says:init`, then user-edited)
- Committed: Yes (essential for reproducibility across sessions)
- Editable: Via `/ed-says:config` command or manual YAML editing
- Schema: YAML with components array, thresholds object, analyzer config

## Installation & Portability

**Install Flow:**
1. User: `npx ed-says-skill --install --local` in target repo
2. `install.js` reads source files from `commands/`, `agents/`, `scripts/`, `hooks/`
3. For each file:
   - If Claude Code (`--local`, `--global`): Copy unchanged to `.claude/` or `~/.claude/`
   - If Cursor (`--cursor`): Wrap markdown in SKILL.md frontmatter, copy to `.cursor/rules/`
   - If Copilot (`--copilot`): Append to `.github/copilot-instructions.md` with section markers
   - If Windsurf (`--windsurf`): Copy to `.windsurf/rules/` with `.md` extension
4. Copy `scripts/` unchanged (always goes to target `scripts/` directory)
5. User runs `/ed-says:init` to create `.ed-says.yml` and `.ed-says-state.json`

**Update Flow:**
1. User: `npx ed-says-skill --install --local` again
2. Installer skips files already present (or can be passed `--force` to overwrite)
3. User can merge changes or keep existing modified versions

## Viewing Current State (Phase 0)

**Phase 0 (MVP) includes:**
- `commands/ed-says/analyze.md`
- `commands/ed-says/ask.md`
- `agents/ed-says/ed-says-analyzer.md`
- `agents/ed-says/ed-says-judge.md`
- `scripts/ed-says-analyze.py`
- `templates/.ed-says.yml`
- No installer yet (manual copy to `.claude/`)

**Phase 1 adds:**
- `commands/ed-says/init.md`, `config.md`, `status.md`
- `scripts/ed-says-comment.sh`
- `install.js` with basic Claude support
- State file write in `analyze.md`

**Phase 2 adds:**
- `commands/ed-says/history.md`
- Full `install.js` with Cursor, Copilot, Windsurf support
- `package.json` with npm publish metadata

---

*Structure analysis: 2026-04-05*

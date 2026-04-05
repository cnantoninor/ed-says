# Codebase Structure

**Analysis Date:** 2026-04-05

## Current State: Pre-Implementation (Planning Phase)

This repository contains **no implemented code**. The only files are planning documents, a config example, and reference documentation. The directory structure below reflects what *currently exists*, not the planned architecture.

---

## Actual Directory Layout

```
ed-says/
├── .ed-says.yml              # Example config (used as spec reference + dog-food sample)
├── .gitignore
├── LICENSE                   # MIT
├── README.md                 # User guide, formula overview, quick start
├── SKILL_PLAN.md             # Master implementation plan (all phases)
│
└── docs/
    └── formula.md            # Full mathematical specification of the Ed formula
```

That is the entire repository. No `src/`, `scripts/`, `commands/`, `agents/`, `test/`, `hooks/`, or `templates/` directories exist yet.

---

## Planned Directory Layout (Post-Implementation)

The following structure is specified in `SKILL_PLAN.md`. It does **not exist yet**.

```
ed-says/
├── commands/ed-says/         # Source skill commands (to be created in Phase 0)
│   ├── analyze.md
│   ├── ask.md
│   ├── init.md               # Phase 1
│   ├── config.md             # Phase 1
│   ├── status.md             # Phase 1
│   └── history.md            # Phase 2+
│
├── agents/ed-says/           # Source agents (to be created in Phase 0)
│   ├── ed-says-analyzer.md
│   └── ed-says-judge.md
│
├── scripts/                  # Portable Python/shell logic (Phase 0)
│   ├── ed-says-analyze.py    # Core formula engine (deterministic)
│   └── ed-says-comment.sh    # GitHub PR comment helper (Phase 1)
│
├── hooks/                    # Optional git hooks (Phase 1+)
│   └── ed-says-auto.sh
│
├── templates/                # Scaffolds for /ed-says:init (Phase 1)
│   ├── .ed-says.yml
│   └── .ed-says-state.json
│
├── install.js                # npx installer (Phase 2)
├── package.json              # npm publish metadata (Phase 2)
│
├── .ed-says.yml              # Repo self-analysis config (exists now)
├── README.md                 # (exists now)
├── SKILL_PLAN.md             # (exists now)
│
└── docs/
    └── formula.md            # (exists now)
```

---

## Key Existing Files

### `.ed-says.yml`
- **Purpose:** Repo-level config that doubles as a specification example and dog-food config
- **Role:** Primary reference for config schema shape — used for spec validation by implementers
- **Schema:** YAML with `components[]`, each having `name`, `paths`, `subdomain`, `bus_factor_threshold`

### `SKILL_PLAN.md`
- **Purpose:** Master implementation handover document for all phases
- **Contains:** Formula spec, command specs (analyze, ask, init, config, status, history), agent specs, state file schema, installer spec, phase success criteria
- **Line count:** ~460 lines
- **Critical sections:**
  - Lines 43–89: Phase 0 deliverables
  - Lines 131–262: Python script specification
  - Lines 268–292: State file schema
  - Lines 296–357: Multi-LLM installer and test fixtures spec

### `docs/formula.md`
- **Purpose:** Mathematical specification of the epistemic debt formula
- **Audience:** Implementers cross-checking the Python formula logic
- **Contains:** Unit table, severity bands, formula derivation, example calculations

### `README.md`
- **Purpose:** User-facing documentation
- **Contains:** Quick start, formula overview, configuration reference, roadmap

---

## Naming Conventions (Planned)

The following conventions are specified in `SKILL_PLAN.md` and should be followed during implementation:

**Files:**
- Skill commands: lowercase `*.md` in `commands/ed-says/` (e.g., `analyze.md`)
- Agents: `ed-says-<role>.md` kebab-case (e.g., `ed-says-analyzer.md`)
- Python scripts: `ed-says-<verb>.py` kebab-case (e.g., `ed-says-analyze.py`)
- Config files: dot-prefixed lowercase (e.g., `.ed-says.yml`, `.ed-says-state.json`)

**YAML config keys:** `snake_case` (e.g., `bus_factor_threshold`, `file_norm_weight`)

**JSON state file keys:** `camelCase` (e.g., `debtScore`, `bfEffective`, `totalDebt`)

**Python functions/classes:** `snake_case` (PEP 8)

**Environment variables:** `SCREAMING_SNAKE_CASE` (e.g., `GITHUB_TOKEN`, `GH_TOKEN`)

---

## Phase 0 Deliverables (Immediate Next Step)

Per `SKILL_PLAN.md` lines 43–89, Phase 0 implementation creates:

1. `scripts/ed-says-analyze.py` — Python formula engine
2. `commands/ed-says/analyze.md` — Main command
3. `commands/ed-says/ask.md` — Comprehension Q&A command
4. `agents/ed-says/ed-says-analyzer.md` — Analysis orchestration agent
5. `agents/ed-says/ed-says-judge.md` — Comprehension rubric judge
6. Manual copy to `.claude/commands/ed-says/` and `.claude/agents/ed-says/` (no installer yet)

---

*Structure analysis: 2026-04-05*

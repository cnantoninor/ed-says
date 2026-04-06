# Coding Conventions

**Analysis Date:** 2026-04-05

## Current State: Pre-Implementation

No source code exists yet. Conventions below are derived from:
1. `SKILL_PLAN.md` — specifies Python + Markdown as the implementation languages
2. `.ed-says.yml` — YAML config example (establishes key naming style)
3. `docs/formula.md` — establishes domain vocabulary and acronym conventions

The TypeScript implementation referenced in commit history (`src/`) was **deleted in commit 59fe13b** and is not a reference for new code. Do not follow TypeScript conventions from that deleted code.

---

## Languages in Scope

| Language | Use | Location |
|----------|-----|----------|
| Python 3.8+ | Core formula engine, git integration | `scripts/ed-says-analyze.py` |
| Markdown | Claude Code skill commands and agents | `commands/ed-says/*.md`, `agents/ed-says/*.md` |
| YAML | Configuration | `.ed-says.yml`, `templates/.ed-says.yml` |
| Bash/sh | GitHub comment helper, optional hooks | `scripts/ed-says-comment.sh`, `hooks/` |
| JSON | State file schema | `.ed-says-state.json` |

TypeScript and Node.js are **not** in scope for Phase 0–3 implementation. They return only in Phase 2 for the `install.js` multi-LLM installer.

---

## Python Conventions

**Style:** PEP 8 strictly — enforced by convention, no linter configured yet.

**Naming:**
- Functions and variables: `snake_case` (e.g., `compute_component_debt`, `bus_factor`)
- Classes: `PascalCase` (e.g., `ComponentDebt`, `Config`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_BUS_FACTOR_THRESHOLD`)
- Private helpers: `_leading_underscore` prefix

**Imports:**
- Order: stdlib → third-party (`pyyaml`, `lizard`) → local
- Use explicit imports, not `import *`

**Type hints:**
- Required on all function signatures (Python 3.8+ style)
- Use `Optional[X]` not `X | None` for 3.8 compatibility

**Comments:**
- Document formula derivations inline with variable definitions
- Use domain acronyms in comments (see acronym table below)
- Magic numbers must be explained (e.g., `0.3  # file_norm weight per SKILL_PLAN.md line 165`)

**Error handling:**
- `sys.exit(1)` with a descriptive message on fatal errors
- Continue with partial results on per-component errors (log, don't stop)
- Never silently swallow exceptions

**CLI interface:**
- `argparse` for argument parsing
- Support: `--base <branch>`, `--config <path>`, `--format json|text`

---

## YAML Conventions (`.ed-says.yml`)

**Key naming:** `snake_case` throughout (e.g., `bus_factor_threshold`, `file_norm_weight`)

**Structure established by existing `.ed-says.yml`:**
```yaml
version: 1
components:
  - name: "component-name"        # kebab-case string
    paths: ["glob/**"]            # array of globs
    subdomain: core               # enum: core | supporting | generic
    bus_factor_threshold: 2       # positive integer
analyzers:
  complexity:
    engine: lizard
    fallback: heuristic
  coupling:
    enabled: false
```

---

## JSON Conventions (`.ed-says-state.json`)

**Key naming:** `camelCase` (JSON interchange standard)

**Schema fields use camelCase:** `debtScore`, `bfEffective`, `totalDebt`, `csDiff`, `csEffective`, `prNumber`, `schemaVersion`

---

## Markdown Command/Agent Conventions

Skill commands in `commands/ed-says/` and agents in `agents/ed-says/` are Markdown files executed by Claude Code. No strict linting standard yet — follow patterns from `SKILL_PLAN.md` command specs.

**Sections expected in each command file:**
- Purpose statement (1–2 sentences)
- Argument parsing instructions
- Step-by-step workflow
- Output format specification
- Error cases

---

## Domain Acronyms

Use these in code comments, variable names, and documentation:

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

---

## What NOT to Follow

The deleted TypeScript implementation (`src/`) had its own conventions (ESLint, Prettier, Zod, `@actions/core`). These are **not applicable** to Phase 0+ Python/Markdown implementation. Specifically, do not carry forward:

- `EdSaysError` class hierarchy (TypeScript only)
- `src/utils/logger.ts` logging patterns
- `tsconfig.json` settings
- Vitest test patterns
- ESM `.js` import extensions

---

*Convention analysis: 2026-04-05*

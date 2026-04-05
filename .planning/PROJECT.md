# Ed Says

## What This Is

Ed Says is a portable, multi-LLM epistemic debt analyzer that lives in a repository alongside the code it analyzes. It computes a deterministic epistemic debt score — measuring how much complexity risk is exposed when too few people understand the code being changed — using a Python script as the stable, LLM-agnostic core. The LLM (Claude, Cursor, Copilot, etc.) handles orchestration, interpretation, and comprehension questioning; never the formula itself.

## Core Value

A developer running `/ed-says:analyze` on a PR gets an honest, reproducible epistemic debt score before merging — not a gut feeling.

## Requirements

### Validated

- ✓ Epistemic debt formula defined (Cs_effective × coverage_gap = Ed_risk, all in CP) — existing
- ✓ Architecture designed: Python engine + LLM skill layer + state persistence — existing
- ✓ State file schema defined (`.ed-says-state.json`, rolling 100-entry window) — existing
- ✓ Config format defined (`.ed-says.yml`, YAML, component + threshold definitions) — existing
- ✓ Complexity engine chosen: lizard with hand-rolled fallback — existing
- ✓ Bus factor source chain: CODEOWNERS → git-recent → git-all → pessimistic — existing
- ✓ Multi-LLM install-time transformation strategy (same pattern as GSD) — existing

### Active

**Milestone 0 — Dog-food MVP:**
- [ ] `scripts/ed-says-analyze.py` — lizard-based complexity + Ed formula + git-derived BF fallback
- [ ] `commands/ed-says/analyze.md` — main command with GitHub token detection and graceful degradation
- [ ] `commands/ed-says/ask.md` — comprehension Q&A loop, writes `Gc` grasp score to state
- [ ] `agents/ed-says-analyzer.md` — analysis subagent (runs script, interprets JSON, adds narrative)
- [ ] `agents/ed-says-judge.md` — 4-axis rubric judge (causality, counterfactuals, edge cases, cross-boundary coherence; 0–4 each)
- [ ] `templates/.ed-says.yml` — default config scaffold
- [ ] Manual install: files copied into `.claude/` in this repo for dog-fooding

**Milestone 1 — Full Skill Suite:**
- [ ] `commands/ed-says/init.md` — interactive setup, writes `.ed-says.yml`, appends CLAUDE.md section
- [ ] `commands/ed-says/config.md` — view/edit config interactively
- [ ] `commands/ed-says/status.md` — last report from state, no re-analysis
- [ ] `scripts/ed-says-comment.sh` — post/update PR comment (idempotent via `<!-- ed-says-report -->` marker)
- [ ] State file write in `analyze.md` after each run

**Milestone 2 — Installer + Packaging:**
- [ ] `install.js` — npx entry point, copies files to target repo
- [ ] `package.json` — bin entry, version, README
- [ ] `commands/ed-says/history.md` — debt trend from state entries
- [ ] Cursor transform support (`--cursor` flag)
- [ ] Published to npm as `ed-says-skill`

**Milestone 3 — Multi-level scoring:**
- [ ] `ask.md` extended with `--level` flag (requirements / specification / implementation / validation)
- [ ] State file extended with per-level grasp scores
- [ ] `history.md` updated with per-component per-level trend

**Milestone 4 — GitHub Action wrapper:**
- [ ] `action.yml` wrapping `scripts/ed-says-analyze.py`
- [ ] Minimal `index.py` or shell entry point for CI
- [ ] GitHub Actions workflow example in README

### Out of Scope

- Real-time analysis (analysis runs on-demand or post-commit, not continuously) — complexity vs value
- LLM-generated formula scores — determinism is non-negotiable for CI trustworthiness
- Separate infrastructure for LLMJ — Claude is the judge; no external service
- TypeScript rewrite — the TS source was the prior implementation; Python is the target

## Context

Ed Says started as a TypeScript GitHub Action for epistemic debt scoring. The TypeScript source (`src/`) has been removed (commit 59fe13b). The project is now pivoting to a skill-first approach: build a Claude Code skill, dog-food it on this repo's own PRs, then graduate to a CI-native GitHub Action in Milestone 4.

The formula is fully specified in `SKILL_PLAN.md`: all scoring quantities (Cs, Gc, Ed_risk, totalDebt) are in dimensionless Complexity Points (CP). Severity bands: LOW≤25, MEDIUM≤50, HIGH≤75, CRITICAL>75 CP.

The existing `.planning/codebase/` maps contain the architecture and stack documentation from the prior analysis session. The TypeScript modules that need to be ported to Python are documented in `SKILL_PLAN.md` (Reference: Existing TypeScript Modules to Port).

Test fixtures for cross-validation live in `test/fixtures/` — Python output should be verified against these before Milestone 0 is considered done.

## Constraints

- **Determinism**: The Python script must produce identical output for the same inputs — no LLM in the formula path
- **Portability**: The script must run standalone (no LLM required) and in GitHub Actions
- **Compatibility**: Must support lizard unavailable (fallback heuristic required)
- **LLM runtime**: Claude Code skill-first; multi-LLM portability via install-time transformation (not runtime abstraction)
- **Branch strategy**: Each milestone gets its own branch + PR against main; Milestone 0 on `claude/ed-says-skill-milestone0`

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Python over TypeScript for formula | Determinism, portability, CI compatibility | ✓ Good |
| `/ed-says:*` subfolder command naming | GSD convention, clean namespace | ✓ Good |
| `.ed-says.yml` config format | Unchanged from TypeScript implementation | ✓ Good |
| Skill-first → Action later | No one-way door; dog-food drives validation | — Pending |
| lizard over hand-rolled complexity | Battle-tested, language-aware, matches SonarQube | — Pending |
| System-aware Cs (diff × context multiplier) | Diff complexity alone misses context risk | — Pending |
| Confidence-weighted BF fallback chain | Git log measures exposure not understanding; discount reflects that | — Pending |
| `/ed-says:ask` in Milestone 0 (not deferred) | Claude is the LLMJ — no stub needed | — Pending |
| All formula units in CP | Same unit across Cs, Gc, Ed_risk, totalDebt; severity bands are CP thresholds | ✓ Good |
| Multi-LLM via install-time transformation | GSD pattern; no runtime abstraction layer | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-05 after initialization*

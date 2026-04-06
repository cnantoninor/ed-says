# Roadmap: Ed Says — Milestone 0 Dog-food MVP

## Overview

Milestone 0 delivers a working `/ed-says:analyze` and `/ed-says:ask` in Claude Code on this
repository. The build proceeds in strict dependency order: the Python analysis script first
(deterministic JSON contract), then the LLM agents that consume that contract, then the user-facing
commands that orchestrate the agents. Manual file installation into `.claude/` completes the
milestone. No state persistence, no PR comments, no installer — just the core formula running
on real PRs in dog-food conditions.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Python Analysis Engine** - Deterministic formula script with validated JSON output contract
- [ ] **Phase 2: Agent Definitions** - LLM skill layer that consumes the JSON contract and drives comprehension
- [ ] **Phase 3: Commands + Installation** - User-facing commands wired to agents, manually installed for dog-fooding

## Phase Details

### Phase 1: Python Analysis Engine
**Goal**: The Python script produces a verified, deterministic JSON result for any PR diff — the stable contract all agents depend on.
**Depends on**: Nothing (first phase)
**Requirements**: ANLY-01, ANLY-02, ANLY-03, ANLY-04, ANLY-05, ANLY-06, ANLY-07, ANLY-08, ANLY-09, CONF-01, CONF-02
**Success Criteria** (what must be TRUE):
  1. Running `python scripts/ed-says-analyze.py --base main` on a real branch diff exits 0 and prints valid JSON matching the specified output schema (totalDebt, severity, components array)
  2. Running the script twice on the same inputs produces byte-identical JSON output (determinism check)
  3. Running the script with lizard absent (e.g., `pip uninstall lizard -y`) completes without error and annotates output with `"complexity_engine": "fallback"`
  4. Running the script without `.ed-says.yml` present uses defaults and does not crash
**Plans**: TBD

### Phase 2: Agent Definitions
**Goal**: The analyzer and judge agents exist as installable `.md` files that correctly consume Phase 1's JSON output and implement the comprehension rubric.
**Depends on**: Phase 1
**Requirements**: AGNT-01, AGNT-02
**Success Criteria** (what must be TRUE):
  1. `agents/ed-says-analyzer.md` contains a complete agent prompt that instructs the subagent to run the Python script, parse its JSON, and produce a formatted narrative report per component
  2. `agents/ed-says-judge.md` contains a complete agent prompt implementing the 4-axis rubric (causality, counterfactuals, edge cases, cross-boundary coherence; 0–4 each) that generates 2–3 questions per component and scores answers returning a rubric score 0–16
  3. Both agent files are syntactically valid Claude Code agent definitions (correct frontmatter and instruction body)
**Plans**: TBD
**UI hint**: no

### Phase 3: Commands + Installation
**Goal**: `/ed-says:analyze` and `/ed-says:ask` are accessible in Claude Code on this repo via manual file installation, and the full workflow runs end-to-end on a real PR.
**Depends on**: Phase 2
**Requirements**: CMD-01, CMD-02, CMD-03, INST-01
**Success Criteria** (what must be TRUE):
  1. `/ed-says:analyze --base main` on a real PR branch produces a debt score with per-component breakdown and overall severity band printed to the terminal
  2. `/ed-says:analyze` without `GITHUB_TOKEN` set prints `Set GITHUB_TOKEN to enable PR comments` (token detection notice, no crash)
  3. `/ed-says:ask <component>` selects a component from the last analysis and triggers the judge agent inline, generating comprehension questions and accepting answers
  4. All required files exist under `.claude/commands/ed-says/`, `.claude/agents/`, and `scripts/` in this repo
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Python Analysis Engine | 0/TBD | Not started | - |
| 2. Agent Definitions | 0/TBD | Not started | - |
| 3. Commands + Installation | 0/TBD | Not started | - |

# Requirements: Ed Says

**Defined:** 2026-04-05
**Core Value:** A developer running `/ed-says:analyze` on a PR gets an honest, reproducible epistemic debt score before merging.

## v1 Requirements (Milestone 0 — Dog-food MVP)

### Analysis Engine

- [ ] **ANLY-01**: Running `scripts/ed-says-analyze.py --base <branch>` produces a JSON result with per-component debt scores and overall severity
- [ ] **ANLY-02**: Script computes cognitive complexity using lizard Python API on post-patch full files (not diff fragments)
- [ ] **ANLY-03**: Script computes system-aware complexity: `Cs_effective = Cs_diff × (1 + 0.3×Cs_file_norm + 0.2×churn_norm)` (fan-in weight deferred to Milestone 1)
- [ ] **ANLY-04**: Script derives bus factor via confidence-weighted fallback chain: CODEOWNERS → git-recent → git-all → pessimistic
- [ ] **ANLY-05**: Script parses `Co-Authored-By:` trailers and filters known bot emails from author counts *(research-informed addition — not explicit in SKILL_PLAN.md M0 but required for BF correctness)*
- [ ] **ANLY-06**: Script applies Ed formula per component: `Ed_risk = Cs_effective × coverage_gap`
- [ ] **ANLY-07**: Script classifies severity: LOW≤25 CP, MEDIUM≤50 CP, HIGH≤75 CP, CRITICAL>75 CP
- [ ] **ANLY-08**: Script runs standalone with no LLM (portable to CI)
- [ ] **ANLY-09**: Script falls back to hand-rolled complexity heuristic when lizard is unavailable

### Configuration

- [ ] **CONF-01**: `templates/.ed-says.yml` default config scaffold defines components, bus factor thresholds, subdomain types, and complexity weights
- [ ] **CONF-02**: Script reads `.ed-says.yml` from repo root (or uses defaults if absent)

### Agents

- [ ] **AGNT-01**: `agents/ed-says-analyzer.md` subagent runs the Python script, interprets the JSON output, and adds narrative commentary
- [ ] **AGNT-02**: `agents/ed-says-judge.md` subagent generates 2–3 comprehension questions per component using a 4-axis rubric (causality, counterfactuals, edge cases, cross-boundary coherence; 0–4 each), scores answers, and returns a rubric score (0–16)

### Commands

- [ ] **CMD-01**: `/ed-says:analyze` runs the analysis engine via the analyzer subagent and prints a formatted report to terminal
- [ ] **CMD-02**: `/ed-says:analyze` detects GitHub token presence; if absent, prints `💡 Set GITHUB_TOKEN to enable PR comments` *(token detection only — actual PR comment posting is Milestone 1)*
- [ ] **CMD-03**: `/ed-says:ask <component>` selects a component from the last analysis result and invokes the judge subagent inline (not nested through the analyzer — subagents cannot spawn subagents)

### Manual Installation

- [ ] **INST-01**: Files are manually copied into `.claude/commands/ed-says/`, `.claude/agents/`, and `scripts/` in this repo, making all commands available via `/ed-says:*`

## v2 Requirements (Milestone 1 — Full Skill Suite)

### State & Grasp

- **STGR-01**: `/ed-says:ask` writes `Gc` grasp score to `.ed-says-state.json` using atomic `os.replace()` writes after each comprehension session
- **STGR-02**: `/ed-says:analyze` applies grasp adjustment when a prior `Gc` score exists for a component (`adjusted_debt = max(0, Ed_risk - Gc)`)
- **STGR-03**: A second `/ed-says:analyze` run after `/ed-says:ask` shows grasp-adjusted debt (lower than the first run)
- **STGR-04**: `/ed-says:analyze` appends each result to the rolling-window state ledger (max 100 entries)

### Full Commands

- **SUIT-01**: `/ed-says:init` — interactive setup, writes `.ed-says.yml`, appends `<!-- ed-says-start/end -->` section to CLAUDE.md
- **SUIT-02**: `/ed-says:config` — view/edit `.ed-says.yml` interactively
- **SUIT-03**: `/ed-says:status` — show last report from state without re-running
- **SUIT-04**: `scripts/ed-says-comment.sh` — post/update idempotent PR comment via `gh` CLI (using `<!-- ed-says-report -->` marker, with pagination handling)
- **SUIT-05**: `/ed-says:analyze` posts/updates PR comment when GitHub token present (uses `ed-says-comment.sh`)

### Analysis Improvements

- **ANLY-10**: Fan-in coupling via dependency-cruiser included in `Cs_effective` formula
- **ANLY-11**: CODEOWNERS team expansion (count team members, not team names)

## v3+ Requirements (Milestone 2–4)

### Installer & Distribution

- **DIST-01**: `install.js` npx entry point copies files to target repo
- **DIST-02**: Published as `ed-says-skill` on npm
- **DIST-03**: `/ed-says:history` — debt trend from state entries across last N PRs
- **DIST-04**: Cursor/Copilot/Windsurf format transforms at install time

### Multi-level Scoring

- **MLVL-01**: `/ed-says:ask --level <requirements|specification|implementation|validation>` flag
- **MLVL-02**: Per-level grasp scores in state; history view shows per-component per-level trend

### CI Graduation

- **CIGA-01**: `action.yml` wrapping `scripts/ed-says-analyze.py` for GitHub Actions
- **CIGA-02**: GitHub Actions workflow example in README

## Out of Scope

| Feature | Reason |
|---------|--------|
| LLM-generated formula scores | Determinism is non-negotiable for CI trustworthiness |
| Real-time / continuous analysis | On-demand is sufficient; continuous adds noise |
| Separate LLMJ infrastructure | Claude is the judge — no external service needed |
| TypeScript rewrite | Python is the target; TS source was the prior implementation |
| Multi-LLM support in Milestone 0 | Manual install sufficient for dog-fooding; transforms come in Milestone 2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ANLY-01 | Phase 1 | Pending |
| ANLY-02 | Phase 1 | Pending |
| ANLY-03 | Phase 1 | Pending |
| ANLY-04 | Phase 1 | Pending |
| ANLY-05 | Phase 1 | Pending |
| ANLY-06 | Phase 1 | Pending |
| ANLY-07 | Phase 1 | Pending |
| ANLY-08 | Phase 1 | Pending |
| ANLY-09 | Phase 1 | Pending |
| CONF-01 | Phase 1 | Pending |
| CONF-02 | Phase 1 | Pending |
| AGNT-01 | Phase 2 | Pending |
| AGNT-02 | Phase 2 | Pending |
| CMD-01 | Phase 3 | Pending |
| CMD-02 | Phase 3 | Pending |
| CMD-03 | Phase 3 | Pending |
| INST-01 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after factual review against SKILL_PLAN.md*

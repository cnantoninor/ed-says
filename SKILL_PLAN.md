# Ed Says — Skill Implementation Plan

## Handover document for a new session / new branch

**Context**: This plan was authored after a trade-off analysis comparing the existing TypeScript
GitHub Action implementation against a Claude Code skill-first approach (inspired by
[get-shit-done](https://github.com/gsd-build/get-shit-done)). The conclusion: build a skill first,
dog-food it, then graduate to a CI-native GitHub Action. No one-way doors are created by this
sequence.

---

## End Product Vision

**Ed Says** as a skill is a portable, multi-LLM epistemic debt analyzer that lives in a repository
alongside the code it analyzes. It:

1. Runs on-demand via `/ed-says:analyze` or automatically via a hook on commits/pushes
2. Computes a deterministic epistemic debt score using a Python script (portable, LLM-agnostic)
3. Uses the LLM (Claude, Cursor, Copilot, etc.) for orchestration, interpretation, and Phase 3
   comprehension questions — not for the formula itself
4. Persists state to `.ed-says-state.json` for trend analysis across sessions
5. Posts results as a PR comment when a GitHub token is available; falls back to terminal output
   with a prompt to set the token
6. Is installed per-repo via `npx ed-says-skill --install` and works across Claude Code, Cursor,
   GitHub Copilot, and any LLM tool that supports custom instructions

---

## File Structure (target state)

```
ed-says-skill/                         ← new repo or new directory in this repo
  install.js                           ← npx entry point (copies files to .claude/ etc.)
  package.json                         ← bin: { "ed-says-skill": "./install.js" }

  commands/
    ed-says/
      analyze.md                       → /ed-says:analyze  (main command)
      init.md                          → /ed-says:init     (interactive config setup)
      config.md                        → /ed-says:config   (view / edit .ed-says.yml)
      status.md                        → /ed-says:status   (show last report from state)
      ask.md                           → /ed-says:ask      (Phase 3 comprehension questions)
      history.md                       → /ed-says:history  (debt trend from state ledger)

  agents/
    ed-says-analyzer.md                ← analysis subagent (runs script, interprets results)
    ed-says-judge.md                   ← Phase 3 rubric judge (generates questions, scores answers)

  scripts/
    ed-says-analyze.py                 ← deterministic formula (portable, no LLM required)
    ed-says-comment.sh                 ← post/update PR comment via gh CLI or GitHub API

  templates/
    .ed-says.yml                       ← default config scaffold written by /ed-says:init
    .ed-says-state.json                ← empty state file written by /ed-says:init

  hooks/
    ed-says-auto.sh                    ← optional PostToolUse hook (auto-run on git push)
```

**Installed to the target repo:**

```
.claude/
  commands/
    ed-says/
      analyze.md
      init.md
      config.md
      status.md
      ask.md
      history.md
  agents/
    ed-says-analyzer.md
    ed-says-judge.md
  hooks/
    ed-says-auto.sh                    ← only if user opts in

scripts/
  ed-says-analyze.py                   ← always installed (LLM-agnostic)
  ed-says-comment.sh

.ed-says.yml                           ← created by /ed-says:init, not by installer
.ed-says-state.json                    ← created by /ed-says:init, not by installer
```

---

## Command Reference (target behavior)

### `/ed-says:analyze`
The main command. Called with no args or with `--base <branch>`.

1. Reads `.ed-says.yml` (or uses defaults if absent)
2. Runs `scripts/ed-says-analyze.py --base <branch>` → JSON result
3. Agent interprets the result, adds narrative commentary
4. Detects GitHub token (`GITHUB_TOKEN` / `GH_TOKEN` env var or MCP GitHub tools)
   - Token present → post/update PR comment (idempotent via `<!-- ed-says-report -->` marker)
   - Token absent → print report to terminal + `💡 Set GITHUB_TOKEN to enable PR comments`
5. Appends entry to `.ed-says-state.json`

### `/ed-says:init`
One-time setup. Interactive.

1. Asks: which directories are your main components? (suggests from git ls-files)
2. Asks: bus factor per component (how many people understand each?)
3. Asks: subdomain type (core / supporting / generic) per component
4. Writes `.ed-says.yml` with those answers
5. Writes empty `.ed-says-state.json`
6. Appends guidance to `CLAUDE.md` (with HTML comment markers, same pattern as GSD)

### `/ed-says:config`
Shows current `.ed-says.yml` contents with explanation of each field. Offers to edit interactively.

### `/ed-says:status`
Reads `.ed-says-state.json`, shows the last analysis result without re-running. Fast, no LLM tokens.

### `/ed-says:ask` (Phase 0+, not deferred)
Selects a component from the last analysis result. Uses `ed-says-judge` agent to generate
comprehension questions at the implementation epistemic level. Posts questions as a GitHub review
thread if token available. Claude acts as the LLMJ — no separate infrastructure needed.
Grasp score (`Gc = rubricScore/16 × complexity`) is written to `.ed-says-state.json` and used
by the next `/ed-says:analyze` run to adjust debt downward.

### `/ed-says:history` (Phase 2)
Reads all entries in `.ed-says-state.json`, shows debt trend per component across the last N PRs.
Flags components trending upward.

---

## The Python Script Contract (`scripts/ed-says-analyze.py`)

This script is the deterministic core. It must be callable standalone, with no LLM.

**Input:**
```
ed-says-analyze.py [--base <branch>] [--config <path>] [--format json|text]
```

**Logic:**
1. `git diff <base>...HEAD` → raw unified diff
2. Parse diff into `ComponentDiff[]` — group files by component via glob matching from `.ed-says.yml`
3. Compute cognitive complexity per component using **lizard** (`pip install lizard`):
   ```bash
   lizard <changed_files> --languages typescript --CCN -o json
   ```
   - Lizard produces language-aware cognitive complexity matching SonarQube's definition
   - Falls back to hand-rolled heuristic (port of `src/analyzers/complexity.ts`) if lizard unavailable
   - Only added lines are analyzed: extract added chunks from diff before passing to lizard
4. Derive bus factor — two sources, first wins:
   - Explicit: `bus_factor` field in `.ed-says.yml` for the component
   - Derived: `git log --follow --format='%ae' -- <paths> | sort -u | wc -l` (distinct authors, last 90 days)
5. Apply Ed formula per component:
   ```
   debt = complexity × max(0, 1 − bus_factor / threshold)
   ```
   Default thresholds: core=2, supporting=2, generic=1
6. If `.ed-says-state.json` contains a grasp score `Gc` for this component from a prior `/ed-says:ask`
   session, apply grasp adjustment:
   ```
   adjusted_debt = max(0, debt − Gc)
   ```
7. Classify severity: LOW≤25, MEDIUM≤50, HIGH≤75, CRITICAL>75
8. Sum component debts → total debt → overall severity

**Coupling analysis (optional, Phase 1+):**
```bash
npx depcruise src/<component> --output-type json
```
`dependency-cruiser` provides fan-in / fan-out per module, replacing the `src/analyzers/coupling.ts` stub.

**Output (JSON):**
```json
{
  "totalDebt": 42.5,
  "severity": "MEDIUM",
  "components": [
    {
      "name": "auth",
      "complexity": 18,
      "busFactor": 1,
      "threshold": 2,
      "debtScore": 9.0,
      "severity": "LOW",
      "files": ["src/auth/login.ts"]
    }
  ],
  "baseBranch": "main",
  "sha": "abc123",
  "timestamp": "2026-04-05T10:00:00Z"
}
```

---

## State File Schema (`.ed-says-state.json`)

```json
{
  "version": 1,
  "maxEntries": 100,
  "entries": [
    {
      "timestamp": "2026-04-05T10:00:00Z",
      "sha": "abc123",
      "prNumber": 42,
      "totalDebt": 42.5,
      "severity": "MEDIUM",
      "components": [
        {
          "name": "auth",
          "debtScore": 9.0,
          "complexity": 18,
          "busFactor": 1
        }
      ]
    }
  ]
}
```

Rolling window: when `entries.length > maxEntries`, drop oldest. Default maxEntries: 100.

---

## Multi-LLM Portability

The installer (`install.js`) performs format transformation at install time, same pattern as GSD.

| Runtime flag | Target path | Transformation |
|---|---|---|
| `--claude --local` | `.claude/commands/ed-says/` | None (source format) |
| `--claude --global` | `~/.claude/commands/ed-says/` | None |
| `--cursor` | `.cursor/rules/` | Wrap each `.md` in SKILL.md frontmatter |
| `--copilot` | `.github/copilot-instructions.md` | Append with section markers |
| `--windsurf` | `.windsurf/rules/` | Copy with `.md` extension |

The Python script and shell script are always copied to `scripts/` unchanged — they are runtime-agnostic.

---

## CLAUDE.md Integration

`/ed-says:init` appends a bounded section to the repo's `CLAUDE.md`:

```markdown
<!-- ed-says-start -->
## Epistemic Debt

Before merging a PR, run `/ed-says:analyze` to check the epistemic debt score.
Run `/ed-says:init` if `.ed-says.yml` is missing.
<!-- ed-says-end -->
```

This ensures every Claude Code session in the repo is aware of ed-says without the user having
to remember to invoke it.

---

## Implementation Phases

---

### Phase 0 — Dog-food (MVP, immediate value)

**Goal:** Run `/ed-says:analyze` on this repo's own PRs today.

**Deliverables:**
1. `scripts/ed-says-analyze.py` — lizard-based complexity + Ed formula + git-derived bus factor fallback
2. `commands/ed-says/analyze.md` — main command prompt with GitHub token detection
3. `commands/ed-says/ask.md` — comprehension Q&A loop, grasp score written to state
4. `agents/ed-says-analyzer.md` — analysis subagent
5. `agents/ed-says-judge.md` — rubric judge (4-axis, 0–4 each)
6. `templates/.ed-says.yml` — default config
7. Manual install: copy files into `.claude/` in this repo

**Out of scope for Phase 0:** installer, multi-LLM, state persistence, PR comments, `init`/`config`/`status`/`history` commands.

**Success criterion:**
- `/ed-says:analyze --base main` on a real PR produces a debt score
- `/ed-says:ask auth` generates 2–3 comprehension questions, accepts answers, writes `Gc` to state
- Second `/ed-says:analyze` run shows grasp-adjusted debt

**Verification:** Cross-check Python script output against `npm run test` results on the same
fixture diffs in `test/fixtures/`. Lizard and the TypeScript heuristic will not produce identical
numbers — document the delta and choose one as the reference.

---

### Phase 1 — Full Skill Suite

**Goal:** All commands working, state persisted, PR comments posted.

**Deliverables:**
1. `commands/ed-says/init.md` — interactive config setup, writes `.ed-says.yml`
2. `commands/ed-says/config.md` — view/edit config
3. `commands/ed-says/status.md` — last report from state, no re-analysis
4. `scripts/ed-says-comment.sh` — post/update PR comment via `gh` CLI
5. State file write in `analyze.md` after each run
6. CLAUDE.md integration in `init.md`

**Success criterion:** Full workflow: `/ed-says:init` → `/ed-says:analyze` → PR comment posted →
`/ed-says:status` shows last result → re-run updates comment in place.

---

### Phase 2 — Installer + Packaging

**Goal:** `npx ed-says-skill --install` works. Others can use it.

**Deliverables:**
1. `install.js` — copies files to `.claude/commands/ed-says/`, `scripts/`, etc.
2. `package.json` — bin entry, version, README
3. `commands/ed-says/history.md` — debt trend from state entries
4. Cursor transform support (`--cursor` flag in installer)
5. Published to npm as `ed-says-skill`

**Success criterion:** A fresh repo can run `npx ed-says-skill --install --local` and immediately
use `/ed-says:analyze`.

---

### Phase 3 — Multi-level scoring + history

**Goal:** Score across all four epistemic levels (requirements, specification, implementation,
validation). Show debt trend per level in `/ed-says:history`.

**Deliverables:**
1. `ask.md` extended with `--level <requirements|specification|implementation|validation>` flag
2. State file extended with per-level grasp scores
3. `analyze.md` updated to show per-level debt breakdown
4. `commands/ed-says/history.md` — trend chart per component per level across last N PRs

**Note:** `/ed-says:ask` and `ed-says-judge.md` are already built in Phase 0. This phase just
adds level selection and the history view. No new infrastructure.

---

### Phase 4 — GitHub Action Wrapper (CI graduation)

**Goal:** The same Python script runs in CI without Claude Code. Full automation on every PR.

**Deliverables:**
1. `action.yml` — wraps `scripts/ed-says-analyze.py`, same inputs as existing `action.yml`
2. Minimal `index.py` or shell entry point — reads GitHub Actions env vars, calls script,
   posts comment via GitHub API
3. GitHub Actions workflow example in README

**Note:** This is additive. The skill continues to work alongside the Action. The Python script
is the shared core — it runs identically in both contexts. This is the "no one-way door" payoff.

---

## Key Decisions Recorded

| Decision | Choice | Rationale |
|---|---|---|
| Formula implementation | Python script, not LLM | Determinism, portability, CI compatibility |
| Command naming | `/ed-says:*` subfolder pattern | GSD convention, clean namespace |
| Config format | `.ed-says.yml` | Unchanged from TypeScript implementation |
| State format | `.ed-says-state.json` | Simple, git-trackable, rolling window |
| GitHub comment | Graceful degradation | Token present → comment; absent → terminal + notice |
| LLM role | Orchestration + rubric judge | LLM for interpretation and comprehension; judge available from Phase 0 |
| /ed-says:ask | Available in Phase 0, not deferred | Skill = Claude is the LLMJ; no stub to implement |
| Complexity engine | lizard over hand-rolled heuristic | Battle-tested, language-aware, matches SonarQube definition |
| Bus factor | Config first, git log fallback | Removes requirement for upfront init; works on first run |
| Multi-LLM | Install-time transformation | GSD pattern, no runtime abstraction layer |
| CLAUDE.md | Append with markers | Self-reinforcing, GSD pattern |
| Sequence | Skill-first → Action later | No one-way door; dog-food drives validation |

---

## Reference: Existing TypeScript Modules to Port

| Python target | TypeScript source | Notes |
|---|---|---|
| Diff parsing | `src/analyzers/diff-parser.ts` | `parseDiff()`, `matchComponent()` |
| Complexity | lizard (pip) | Replaces `src/analyzers/complexity.ts` heuristic; fallback to hand-rolled port if unavailable |
| Coupling | dependency-cruiser (npm) | Replaces `src/analyzers/coupling.ts` stub; fan-in/fan-out per module |
| Formula | `src/scoring/formula.ts` | `computeComponentDebt()`, `classifySeverity()` |
| Config loading | `src/core/config.ts` | Zod schema → use `pyyaml` + manual validation |
| Comment posting | `src/github/comment.ts` | `postOrUpdateComment()`, marker logic |

Test fixtures for cross-validation: `test/fixtures/` — use these diffs to verify Python output
matches TypeScript output before Phase 0 is considered done.

---

## Branch Strategy

- This plan lives on: `claude/ed-says-implementation-analysis-rEyiH`
- Phase 0 build: new branch `claude/ed-says-skill-phase0`
- Each phase gets its own branch, PR against main

---

*Plan authored: 2026-04-05. Hand this file to a new session with the instruction: "Implement
Phase 0 of SKILL_PLAN.md in a new branch `claude/ed-says-skill-phase0`."*

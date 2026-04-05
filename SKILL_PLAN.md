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

### `/ed-says:ask` (Phase 3)
Selects a component from the last analysis result. Uses `ed-says-judge` agent to generate
comprehension questions at the implementation epistemic level. Posts questions as a GitHub review
thread if token available.

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

**Logic (port from existing TypeScript):**
1. `git diff <base>...HEAD` → raw unified diff
2. Parse diff into `ComponentDiff[]` — group files by component via glob matching from `.ed-says.yml`
3. Compute cognitive complexity per component (port from `src/analyzers/complexity.ts`):
   - Only added lines (`+` prefix)
   - Control flow keywords × (1 + nesting depth)
   - Logical operators `&&` `||` flat +1
   - Ternary `?` +1 (excluding `?.`)
4. Apply Ed formula per component:
   ```
   debt = complexity × max(0, 1 − bus_factor / threshold)
   ```
   Default thresholds: core=2, supporting=2, generic=1
5. Classify severity: LOW≤25, MEDIUM≤50, HIGH≤75, CRITICAL>75
6. Sum component debts → total debt → overall severity

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
1. `scripts/ed-says-analyze.py` — port formula + diff parsing from `src/`
2. `commands/ed-says/analyze.md` — main command prompt with GitHub token detection
3. `agents/ed-says-analyzer.md` — analysis subagent
4. `templates/.ed-says.yml` — default config
5. Manual install: copy files into `.claude/` in this repo

**Out of scope for Phase 0:** installer, multi-LLM, state persistence, PR comments, all other commands.

**Success criterion:** Running `/ed-says:analyze --base main` in Claude Code on a real PR in this
repo produces a correctly computed debt score matching the TypeScript implementation.

**Verification:** Cross-check output of the Python script against `npm run test` results on the
same fixture diffs in `test/fixtures/`.

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

### Phase 3 — LLMJ Comprehension (Phase 3 of ed-says roadmap)

**Goal:** `/ed-says:ask` generates comprehension questions and scores answers — using Claude as the
judge (replaces the `src/llmj/` stub entirely).

**Deliverables:**
1. `agents/ed-says-judge.md` — rubric judge agent (4-axis: causality, counterfactuals, edge cases,
   cross-boundary coherence; 0–4 per axis)
2. `commands/ed-says/ask.md` — selects component, generates questions at epistemic level,
   posts as GitHub review thread if token present
3. Grasp score (`Gc = rubricScore/16 × complexity`) written to state file
4. `analyze.md` updated to show grasp-adjusted debt when state contains grasp scores

**Note:** The `ed-says-judge.md` agent *is* the LLMJ. No separate LLM infrastructure needed.
The entire `src/llmj/` module becomes unnecessary in the skill implementation.

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
| LLM role | Orchestration + Phase 3 judge | LLM for interpretation and comprehension, not formula |
| Multi-LLM | Install-time transformation | GSD pattern, no runtime abstraction layer |
| CLAUDE.md | Append with markers | Self-reinforcing, GSD pattern |
| Sequence | Skill-first → Action later | No one-way door; dog-food drives validation |

---

## Reference: Existing TypeScript Modules to Port

| Python target | TypeScript source | Notes |
|---|---|---|
| Diff parsing | `src/analyzers/diff-parser.ts` | `parseDiff()`, `matchComponent()` |
| Complexity | `src/analyzers/complexity.ts` | `computeFileComplexity()`, nesting logic |
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

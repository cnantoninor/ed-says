# External Integrations

**Analysis Date:** 2026-04-05

## Overview

Ed Says integrates primarily with **GitHub** (PR comments, CODEOWNERS, commit metadata) and **git** (local repository operations). Phase 0 is CLI-first and portable; future phases add GitHub Actions automation and multi-LLM IDE support.

---

## APIs & External Services

### GitHub API

**Service:** GitHub
- **Purpose:** 
  - Fetch pull request diffs
  - Read CODEOWNERS for bus factor derivation
  - Post analysis results as PR comments
  - Detect PR context (base branch, head SHA)

**SDK/Client:**
- **Primary:** GitHub CLI (`gh`) via subprocess
  - Used by: `scripts/ed-says-comment.sh`, Claude Code bash tool
  - Alternative: GitHub API via Python `requests` (not yet implemented, Phase 1+)
- **Legacy:** `@actions/github` v6.0.0 (removed 59fe13b, was TypeScript only)

**Authentication:**
- Environment variables: `GITHUB_TOKEN`, `GH_TOKEN`, or `GITHUB_AUTH` (checked in order)
- Graceful fallback: If token absent, results output to terminal with prompt to set token
- Scope required: `pull-requests:read`, `contents:read`, optional `pull-requests:write`

**Integration Points:**
- `/ed-says:analyze` detects token presence and posts PR comment if available
- `scripts/ed-says-comment.sh` posts/updates comment via `gh api` or GitHub REST API
- Phase 1: CLAUDE.md guidance appends explicit token setup instructions

### Git (Local Repository)

**Service:** git (local)
- **Purpose:**
  - Parse unified diffs (`git diff <base>...HEAD`)
  - Fetch pre-image files for complexity analysis (`git show <base>:<filepath>`)
  - Derive bus factor from commit metadata (`git log --since=90days`, `git blame`)
  - Churn analysis (commit frequency in last 90 days)

**Execution:**
- Subprocess calls from Python (`scripts/ed-says-analyze.py`)
- Common commands:
  ```bash
  git diff <base>...HEAD --unified=0  # Get diff, minimal context
  git show <base>:<filepath>           # Fetch pre-image for complexity
  git log --since=90.days --oneline -- <paths>  # Churn count
  git log --all --follow <filepath>    # All-time blame for fallback bus factor
  git rev-parse HEAD                   # Capture current SHA for state
  ```

**No external authentication required** — operates on local repository only.

---

## Data Storage

### Local File Storage

**Configuration Files:**
- `.ed-says.yml` — Component definitions, analysis parameters (read by Python script)
- `.ed-says-state.json` — Analysis results, grasp scores, trend history (written by `/ed-says:analyze`)
- `.github/CODEOWNERS` (optional) — Explicit ownership declarations for bus factor

**Temporary:**
- In-memory diff parsing (Python)
- Temp files for `lizard` input (if needed for large diffs)

**Logs:**
- Terminal output from Python script (JSON + narrative)
- .log files ignored in `.gitignore` (optional for CLI runs)

### External Storage

**None in Phase 0.**

Future (Phase 3+):
- Optional: `.ed-says-ledger.json` — Extended historical ledger (not `.ed-says-state.json`; separate for rollover management)

---

## Authentication & Identity

### GitHub Authentication

**Method:**
- Environment variable: `GITHUB_TOKEN`, `GH_TOKEN`, or generic `GITHUB_AUTH`
- GitHub CLI (`gh`) automatically uses system keychain or token from environment
- No SDK integration required in Phase 0 (CLI is LLM-agnostic)

**Verification:**
- `/ed-says:analyze` checks for token presence before attempting POST
- Log message: `"GITHUB_TOKEN not set. Showing report in terminal. Set GITHUB_TOKEN to enable PR comments."`

**Permissions Required:**
- Read: `pull-requests:read`, `contents:read` (CODEOWNERS, diff)
- Write: `pull-requests:write` (only if posting comments)

### Bus Factor Derivation (Git-Based)

**No authentication required for local git operations.**

**Fallback chain (git log, CODEOWNERS, explicit config):**
1. **Explicit config:** `.ed-says.yml` `bus_factor` field (confidence: 0.7)
2. **CODEOWNERS:** `.github/CODEOWNERS` file (confidence: 0.7)
3. **Recent contributors:** `git log --since=90days` distinct authors (confidence: 0.4)
4. **All-time contributors:** `git log --all` distinct authors (confidence: 0.2)
5. **No data:** Assume BF=0 (worst case, full debt; confidence: 1.0 penalty)

When `/ed-says:ask` produces a grasp score (`Gc`), confidence is upgraded to 1.0 for that component.

---

## Monitoring & Observability

### Error Reporting

**Method:** Terminal output + exception handling

- **Phase 0 (current):** Errors logged to terminal
- **Phase 4 (GitHub Action):** GitHub Actions annotations or workflow failure

**Patterns:**
- Python script exits with status 0 (success) or 1 (error)
- Claude Code skill catches exceptions and reports via terminal/PR comment
- No external error tracking service (sentry, datadog, etc.)

### Logs

**Output:**
- Terminal: ANSI color-formatted narrative report + JSON (via `chalk` replacement or plain text)
- GitHub PR comment: Markdown-formatted results (posted by `/ed-says:analyze`)
- `.ed-says-state.json`: JSON history of all analyses

**Retention:**
- State file rolling window: default 100 entries (configurable `maxEntries`)
- PR comments: GitHub retains indefinitely (comment marker: `<!-- ed-says-report -->`)
- Terminal logs: Not persisted (per-session only)

---

## CI/CD & Deployment

### Hosting

**Current (Phase 0):**
- Claude Code (local to development machine)
- No remote hosting required

**Future (Phase 4+):**
- GitHub Actions (Ubuntu-latest runner)
- Can be triggered on every PR via `.github/workflows/` (provided in README)

### CI Integration Points

**Phase 0 (dog-food MVP):**
- Manual: Developer runs `/ed-says:analyze` in Claude Code
- Trigger: On-demand via `/ed-says:analyze --base main`

**Phase 1:**
- Optional: Git hook (PostToolUse) auto-runs analysis on `git push` (opt-in)
- State file written to `.ed-says-state.json` after each run

**Phase 4:**
- GitHub Actions workflow triggers on: `pull_request.types: [opened, synchronize]`
- Same Python script runs; comment posted via GitHub API
- Workflow example in README

### Environment Configuration

**Package Installation (Phase 0):**
```bash
# Manual in target repo
pip install lizard  # Optional, for accurate complexity
pip install pyyaml  # Required
```

**Phase 2+ (installer):**
```bash
npx ed-says-skill --install --local
# Copies files to .claude/commands/ed-says/, scripts/
# Runs pip install lazily if needed
```

---

## Environment Configuration

### Required Environment Variables

**For GitHub Integration:**
- `GITHUB_TOKEN` (or `GH_TOKEN`) — GitHub API authentication
  - Only needed if posting PR comments
  - Graceful fallback: Results printed to terminal if absent

**Optional:**
- `GITHUB_REPOSITORY` — Detected from GitHub Actions env; used for comment posting
- `GITHUB_HEAD_REF` / `GITHUB_BASE_REF` — PR metadata (detected from context)

### Secrets Location

**Where Secrets Are Stored:**
- **GitHub Actions:** Repository secrets or environment secrets (standard GitHub)
- **Local Development:** `.env` (gitignored; see `.gitignore`)
- **Claude Code:** Environment inherited from shell or GitHub token via MCP

**What to Protect:**
- `GITHUB_TOKEN` — Never commit; always use environment variables or secrets management

---

## Webhooks & Callbacks

### Incoming Webhooks

**None in Phase 0.**

**Phase 4 (GitHub Actions):**
- GitHub webhook: `pull_request` events (no explicit webhook setup required; automatic for Actions)

### Outgoing Webhooks/Callbacks

**None.** Ed Says does not initiate outbound webhooks.

**What it does post:**
- GitHub PR comments (via `gh` CLI or GitHub API)
- PR review threads (future, Phase 3)

---

## GitHub Integration Matrix

| Feature | Phase | Trigger | Auth | Output |
|---------|-------|---------|------|--------|
| **PR diff analysis** | 0 | `/ed-says:analyze --base main` | None (local git) | Terminal or PR comment |
| **CODEOWNERS parsing** | 0 | Auto (in Python script) | `GITHUB_TOKEN` (optional) | Bus factor metric |
| **PR comment posting** | 0 | End of `/ed-says:analyze` | `GITHUB_TOKEN` (required) | PR comment (if token set) |
| **GitHub Actions** | 4 | PR opened/updated | `secrets.GITHUB_TOKEN` | PR check + comment |
| **PR review threads** | 3 | `/ed-says:ask` comprehension | `GITHUB_TOKEN` (required) | Review comment thread |
| **Commit metadata** | 0 | Auto (git log) | None (local) | Bus factor derivation |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ GitHub Repository                                           │
│  ├─ .git/ (local)                                           │
│  ├─ .ed-says.yml (config)                                   │
│  ├─ .ed-says-state.json (results history)                   │
│  ├─ .github/CODEOWNERS (optional, bus factor)               │
│  └─ Pull Request (to analyze)                               │
└─────────────────────────────────────────────────────────────┘
                        ↓
        [Claude Code: /ed-says:analyze]
                        ↓
        ┌───────────────────────────────┐
        │ scripts/ed-says-analyze.py    │
        │  ├─ git diff (local)          │
        │  ├─ git show (pre-image)      │
        │  ├─ lizard (complexity)       │
        │  ├─ git log (churn, authors)  │
        │  └─ .ed-says.yml (config)     │
        └───────────────────────────────┘
                        ↓
                  JSON Result
                        ↓
        ┌──────────────────────────────────┐
        │ ed-says-analyzer.md (subagent)   │
        │  ├─ Interpret results            │
        │  ├─ Generate narrative           │
        │  └─ Detect GITHUB_TOKEN          │
        └──────────────────────────────────┘
                        ↓
            [If GITHUB_TOKEN set]
                        ↓
        ┌──────────────────────────────┐
        │ scripts/ed-says-comment.sh   │
        │  └─ gh pr comment --edit     │
        └──────────────────────────────┘
                        ↓
        GitHub PR comment posted
        (idempotent via marker: <!--ed-says-report-->)
                        ↓
        .ed-says-state.json updated
        (entry appended, rolling window maintained)
```

---

## Migration Notes (TypeScript → Python)

**Legacy integrations removed (59fe13b):**
- `@actions/core` v1.11.1 — GitHub Actions input/output API (replaced by env var detection)
- `@actions/github` v6.0.0 — GitHub REST client (replaced by `gh` CLI)
- `ai` (Vercel AI SDK) v4.0.0 — LLM client (now LLM runtime handles orchestration)

**Why the change:**
- Deterministic formula must be portable across LLMs (Python)
- `gh` CLI is ubiquitous (GitHub-hosted runners, local machines)
- Claude Code uses bash tool to invoke Python scripts

---

*Integration audit: 2026-04-05*

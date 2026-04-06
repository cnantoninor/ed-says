# Architecture Patterns: Claude Code Skill with Python Backend

**Domain:** Claude Code skill orchestrating a deterministic Python analysis script
**Researched:** 2026-04-05
**Overall confidence:** HIGH — sourced from official Claude Code documentation (code.claude.com/docs) and live SDK docs

---

## Recommended Architecture

Three distinct execution layers, each with a well-defined boundary:

```
User invokes /ed-says:analyze
        |
        v
[Command layer]         .claude/commands/ed-says/analyze.md
  - Markdown skill      Runs in main conversation context
  - Reads args          Has access to all tools (Bash, Read, Write)
  - Delegates work      Spawns subagent via @agent-mention or natural lang
        |
        v
[Agent layer]           .claude/agents/ed-says-analyzer.md
  - YAML frontmatter    Runs in isolated subagent context (own context window)
  - System prompt body  Receives task description as user turn
  - Calls Python        Uses Bash tool: python scripts/ed-says-analyze.py
        |
        v
[Python engine]         scripts/ed-says-analyze.py
  - Deterministic       No LLM anywhere in this layer
  - stdin/stdout        Emits JSON on stdout; errors on stderr
  - Standalone          Runs identically in Claude Code and GitHub Actions
```

---

## How Claude Code Skills Actually Work

### Command Files (.claude/commands/ or .claude/skills/)

**Source:** [Slash Commands in the SDK](https://platform.claude.com/docs/en/agent-sdk/slash-commands), [Extend Claude with skills](https://code.claude.com/docs/en/skills)

A `.claude/commands/analyze.md` file is a Markdown prompt template. When the user types `/ed-says:analyze`, Claude Code:

1. Loads the file content as the user-turn prompt
2. Substitutes `$ARGUMENTS` with whatever follows the command name
3. Executes it in the **main conversation context** — Claude has full tool access and full conversation history
4. The `!`<command>`` syntax runs shell commands at skill-load time (preprocessing), replacing the placeholder before Claude sees anything

The recommended modern format is `.claude/skills/<name>/SKILL.md`, which is functionally identical to `.claude/commands/*.md` for the ed-says use case. Both create the same `/slash-command` interface. Subdirectories in `commands/` create namespaced commands: `.claude/commands/ed-says/analyze.md` → `/ed-says:analyze`. This is confirmed working.

**Key frontmatter fields for ed-says commands:**

```yaml
---
name: analyze
description: Analyze epistemic debt for the current PR
argument-hint: [--base <branch>]
allowed-tools: Bash, Read, Write
disable-model-invocation: true
---
```

- `disable-model-invocation: true` is important for `analyze` and `ask` — these have side effects and should only run when the user explicitly invokes them, not auto-triggered by Claude
- `allowed-tools` narrows the tool surface; Bash is required to run the Python script
- `$ARGUMENTS` captures `--base main` or `--base <branch>` from the user invocation

### Subagents (.claude/agents/)

**Source:** [Create custom subagents](https://code.claude.com/docs/en/sub-agents)

Subagents run in an **isolated context window** — they do not share the parent conversation's history. They receive only their system prompt (the markdown body) plus a task prompt from the parent.

**Critical constraint:** Subagents cannot spawn other subagents. Nesting is not possible. Only the main conversation can delegate to a subagent.

**Frontmatter for ed-says agents:**

```yaml
---
name: ed-says-analyzer
description: Runs the ed-says Python analysis script, interprets JSON output, adds narrative. Use when performing epistemic debt analysis.
tools: Bash, Read
model: inherit
---
```

- `tools: Bash, Read` is sufficient — the agent needs to run `python scripts/ed-says-analyze.py` (Bash) and potentially read `.ed-says.yml` or `.ed-says-state.json` (Read)
- `model: inherit` keeps costs predictable; switch to `haiku` if the analysis narrative is lightweight
- The `description` field is what Claude uses to decide when to delegate. Write it to match the task the command wants to delegate

---

## Agent Spawning Patterns

### When to Spawn a Subagent vs Inline Execution

**Spawn a subagent when:**
- The task produces verbose output that would pollute the main conversation context (running `python scripts/ed-says-analyze.py` produces JSON that doesn't need to stay in context)
- You want to enforce specific tool restrictions (the analyzer only needs Bash + Read, not Write)
- The work is self-contained and can return a clean summary

**Execute inline in the command when:**
- The task needs back-and-forth with the user (e.g., the `ask.md` comprehension Q&A loop)
- Multiple steps share significant context that must flow together
- The command IS the reasoning — e.g., `status.md` just reads state and formats output

**For ed-says specifically:**
- `analyze.md` → delegates to `ed-says-analyzer` subagent (verbose Python output, isolation preferred)
- `ask.md` → executes inline; the judge agent generates questions and scores answers in the main context where it can see conversation history
- `status.md`, `config.md`, `history.md` → execute inline (simple read + format operations)

### How the Parent Command Invokes a Subagent

There is no programmatic spawn API in a command file — the command instructs Claude in natural language and Claude's internal Agent tool handles the delegation. Both the `Task(...)` and `Agent(...)` tool names work (the Task tool was renamed to Agent in version 2.1.63; both are aliases).

Practical patterns in the command body:

```markdown
Use the ed-says-analyzer agent to run the analysis and return the JSON result.
Pass --base $ARGUMENTS to the script.
```

Or with an `@`-mention for explicit delegation:

```markdown
@agent-ed-says-analyzer Run: python scripts/ed-says-analyze.py --base $ARGUMENTS --config .ed-says.yml --format json
Return the parsed JSON result and a one-paragraph narrative.
```

The `@agent-<name>` syntax guarantees that specific subagent runs (versus Claude deciding). Use it for deterministic workflows. The natural language form is fine for simpler cases.

---

## How Commands Invoke External Scripts

**Source:** [Bash tool docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/bash-tool), [Extend Claude with skills](https://code.claude.com/docs/en/skills)

### Pattern 1: Bash Tool (PRIMARY — use this)

The agent (or command, inline) uses the Bash tool to invoke the Python script:

```bash
python scripts/ed-says-analyze.py --base main --config .ed-says.yml --format json
```

Claude Code passes this to a persistent shell session. State is maintained between calls in the same turn. The script's stdout is returned to Claude as the tool result.

**Requirements:**
- `Bash` must be in the `tools` list (or `allowed-tools` for commands)
- The script must be on the path or referenced with a relative path from the repo root
- Python must be available in the environment (standard on developer machines; always available in GitHub Actions)

### Pattern 2: Preprocessing with `!`<command>`` (for static context injection)

```markdown
## Current git status
!`git status --short`

## Files changed
!`git diff --name-only HEAD`
```

This runs at skill-load time, before Claude sees the prompt. Use it for injecting environmental context into the skill prompt, not for running the main analysis script. The output is static — it cannot be fed back to Claude for conditional logic.

**Use for:** Injecting `--base` branch defaults, showing recent state file contents at prompt-time.
**Do not use for:** Running `ed-says-analyze.py` — the script output needs to be processed by Claude, not baked into the prompt.

### Confirmed Pattern for ed-says

The `ed-says-analyzer.md` agent body should contain instructions like:

```markdown
Run: python scripts/ed-says-analyze.py --base {base_branch} --config .ed-says.yml --format json

Capture stdout as the analysis result JSON.
If the script exits non-zero, report the stderr output as the error.
Interpret the JSON: summarize totalDebt, severity, and per-component breakdown.
```

Claude uses its Bash tool to execute this. The JSON arrives in the tool result, Claude interprets it, and returns narrative to the parent command.

---

## State File Patterns

**Confirmed pattern:** Read/write JSON files directly using the Bash tool or Read/Write tools.

### The `.ed-says-state.json` Approach

Writing state from an agent or command:

```bash
# Read current state
python -c "import json,sys; s=json.load(open('.ed-says-state.json')); ..."

# Or instruct Claude to use the Write tool directly
# Claude can read the current JSON, mutate the structure in memory, and write it back
```

The recommended pattern for ed-says is to keep the Python script responsible for reading grasp scores from state (it already does this in the spec) and have the command/agent write new entries via the Write tool after receiving the JSON result.

**Concurrency note:** `.ed-says-state.json` is written by a single agent at a time in the ed-says workflow. No concurrency hazard in normal use. The rolling-window truncation (max 100 entries) should be done at write time in the Python script or a simple Python one-liner invoked via Bash.

### State File Location and Scope

`.ed-says-state.json` lives at the repo root (not inside `.claude/`). This is correct: it is project-specific data, not Claude configuration. It should be committed or gitignored depending on team preference — committing it enables shared trend history.

The `project` memory scope in subagent frontmatter (`memory: project`) creates a separate memory at `.claude/agent-memory/<name>/` — this is NOT the right mechanism for ed-says state. The ed-says state is structured domain data, not LLM memory notes. Use a plain JSON file read/written via Bash or Write tool.

---

## Multi-File Skill Installation Pattern

**Source:** [Plugin docs](https://code.claude.com/docs/en/plugins), [Sharing skills](https://code.claude.com/docs/en/skills#share-skills), GSD `install.js` pattern (observed)

### What install.js Must Do

An `npx ed-says-skill --install` entry point needs to:

1. Copy `commands/ed-says/*.md` → target `.claude/commands/ed-says/` (or `.claude/skills/`)
2. Copy `agents/*.md` → target `.claude/agents/`
3. Copy `scripts/ed-says-analyze.py` → target `scripts/`
4. Copy `scripts/ed-says-comment.sh` → target `scripts/`
5. Set executable bit on `.sh` file: `chmod +x scripts/ed-says-comment.sh`
6. Optionally copy `templates/.ed-says.yml` → target root if not already present (non-destructive)
7. Run LLM format transformation if `--cursor`, `--copilot`, or `--windsurf` flag is passed

**No plugin mechanism is needed for Milestone 2.** Plugins are for distributing to users who install via Claude Code's built-in plugin manager. `install.js` is simpler and matches the GSD pattern: it's just a Node.js file copy with transform.

### The GSD install.js Reference Pattern

GSD's `install.js` (inferred from `gsd-tools.cjs` and workflow structure):
- Copies workflow `.md` files to `~/.claude/commands/` or `.claude/commands/`
- Copies agent `.md` files to `~/.claude/agents/` or `.claude/agents/`
- Uses `fs.cpSync` or `fs.copyFileSync` in Node.js
- Checks for existing files before overwriting (prompts or `--force` flag)
- Handles `--local` (project) vs `--global` (user) scope

The key insight from GSD: **install.js is a file copier with optional transforms**, not a package manager. Keep it simple.

### CLAUDE.md Integration (from `/ed-says:init`)

The `init.md` command appends a bounded section using HTML comment markers. This is the GSD-validated pattern:

```markdown
<!-- ed-says-start -->
## Epistemic Debt

Before merging a PR, run `/ed-says:analyze` to check the epistemic debt score.
<!-- ed-says-end -->
```

The markers allow idempotent re-runs: check if `<!-- ed-says-start -->` already exists before appending.

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `commands/ed-says/analyze.md` | User-facing entry point; reads args, delegates to analyzer agent, writes state | Agent layer (delegation), scripts (via agent) |
| `commands/ed-says/ask.md` | Comprehension Q&A loop; inline execution; reads state for component context | Agent layer (judge agent), `.ed-says-state.json` (via Write tool) |
| `agents/ed-says-analyzer.md` | Runs Python script, interprets JSON, generates narrative | Python script (via Bash), `.ed-says-state.json` (read-only) |
| `agents/ed-says-judge.md` | Generates and scores comprehension questions using 4-axis rubric | Called inline by `ask.md`; writes Gc to state |
| `scripts/ed-says-analyze.py` | Deterministic formula engine; git + lizard integration | git CLI, lizard, `.ed-says.yml`, `.ed-says-state.json` (reads Gc) |
| `scripts/ed-says-comment.sh` | Posts/updates PR comment idempotently via `gh` CLI | GitHub API |
| `.ed-says-state.json` | Rolling-window ledger of analysis history and grasp scores | Written by commands via Write tool or Python; read by Python script |
| `.ed-says.yml` | Component definitions, thresholds, complexity weights | Read by Python script and commands |

---

## Build Order: What Must Exist Before What

The following dependencies constrain which files can be authored or tested before others:

```
Level 0 (no dependencies):
  scripts/ed-says-analyze.py          ← standalone, no skill layer needed
  templates/.ed-says.yml              ← static template

Level 1 (depends on Python script contract being stable):
  agents/ed-says-analyzer.md          ← calls ed-says-analyze.py
  agents/ed-says-judge.md             ← standalone rubric logic, no Python dep

Level 2 (depends on agents and state schema):
  commands/ed-says/analyze.md         ← delegates to analyzer agent, writes state
  commands/ed-says/ask.md             ← uses judge agent, reads/writes state

Level 3 (depends on Level 2 being functional):
  commands/ed-says/status.md          ← reads state (needs state to exist)
  commands/ed-says/config.md          ← reads .ed-says.yml (needs config schema)
  scripts/ed-says-comment.sh          ← called from analyze.md (needs analyze to work)
```

**Implication for Milestone 0:** Build in this order:
1. `scripts/ed-says-analyze.py` (with `--format json` output and state-read for Gc)
2. `agents/ed-says-analyzer.md`
3. `agents/ed-says-judge.md`
4. `commands/ed-says/analyze.md`
5. `commands/ed-says/ask.md`

Cross-validate Python output against `test/fixtures/` before authoring the agent prompt, because the agent's narrative instructions depend on knowing what JSON fields the script actually emits.

---

## Patterns to Follow

### Pattern 1: Subagent for Noisy Execution, Inline for Conversation

Use the agent layer for operations that produce large stdout (Python script output, git log dumps). Use inline execution for conversational back-and-forth (ask.md Q&A). This keeps the main conversation context clean.

### Pattern 2: Python Script as Stable Contract

The Python script's JSON output is the contract between the deterministic engine and the LLM layer. Stabilize the schema before writing the agent prompt. Version the schema with a `"version"` field in the output so the agent can handle schema evolution.

### Pattern 3: State Written After Successful Execution

Never write to `.ed-says-state.json` until the Python script exits 0 and the agent has successfully interpreted the result. Write the state entry at the end of the command, not inside the agent. This keeps the agent stateless and rerunnable.

### Pattern 4: Graceful Degradation in the Command Layer

The command file (not the Python script, not the agent) is responsible for detecting missing tools, tokens, and config. The sequence in `analyze.md`:
1. Check `.ed-says.yml` exists (or proceed with defaults)
2. Delegate to agent
3. Agent runs Python; if Python exits non-zero, agent returns error narrative
4. Command receives result; if error, stop and display guidance
5. If success, detect GitHub token, post comment or print to terminal
6. Append state entry

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Putting Formula Logic in the Agent System Prompt

**What goes wrong:** If the LLM is instructed to compute `Cs_effective = Cs_diff * (1 + ...)`, it will produce non-deterministic results. Small rounding differences or interpretation shifts break the CI trustworthiness guarantee.
**Prevention:** The agent's job is to run the Python script and interpret its output in natural language. The agent should never recompute scores from scratch.

### Anti-Pattern 2: Spawning Subagents from a Subagent

**What goes wrong:** Claude Code explicitly prohibits nested subagent spawning. If `ed-says-analyzer.md` tries to spawn `ed-says-judge.md`, it silently fails or errors.
**Prevention:** The `ask.md` command invokes `ed-says-judge.md` directly from the main conversation context (not via the analyzer agent). Keep the two agents as siblings, not parent/child.

### Anti-Pattern 3: Writing State Inside the Subagent

**What goes wrong:** The subagent writes to `.ed-says-state.json`, but if the parent command fails afterward (e.g., comment posting fails), the state has already been mutated. State reflects an incomplete workflow.
**Prevention:** The subagent returns the structured result to the parent command, which writes state only after all downstream actions (comment posting, etc.) succeed or are explicitly skipped.

### Anti-Pattern 4: Using `agent memory:` for Domain State

**What goes wrong:** The `memory: project` frontmatter creates a human-readable `MEMORY.md` file in `.claude/agent-memory/`. It is designed for LLM accumulated knowledge, not structured data. JSON deserializing from it is fragile.
**Prevention:** Use `.ed-says-state.json` at the repo root for all domain state. Reserve subagent memory for cross-session LLM learning only (ed-says doesn't need this).

### Anti-Pattern 5: Hardcoding Absolute Script Paths

**What goes wrong:** Agent body says `python /home/user/project/scripts/ed-says-analyze.py`. Breaks when another developer installs the skill.
**Prevention:** Use `${CLAUDE_SKILL_DIR}` in skill files if the script is bundled with the skill, or use a path relative to the repo root (`scripts/ed-says-analyze.py`) if the script is installed separately. For ed-says, the script lands in `scripts/` at the repo root — always reference it as `scripts/ed-says-analyze.py` without a leading slash.

---

## Scalability Considerations

| Concern | Milestone 0 (dog-food) | Milestone 2 (installable) | Milestone 4 (CI) |
|---------|----------------------|--------------------------|-----------------|
| State file size | 100 entries max, rolling window handles it | Same | Not applicable (CI reads, doesn't accumulate) |
| Script availability | Developer machine has Python | `install.js` can check `python --version` and warn | GitHub Actions always has Python |
| lizard availability | Optional, heuristic fallback | Same | Pin in `requirements.txt` in action |
| GitHub token | Graceful degradation documented | Same | Required field in action inputs |
| Multi-repo | N/A | Each repo gets its own `.ed-says-state.json` | Same |

---

## Sources

- [Create custom subagents — code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents) — HIGH confidence, official docs, fetched 2026-04-05
- [Extend Claude with skills — code.claude.com/docs/en/skills](https://code.claude.com/docs/en/skills) — HIGH confidence, official docs, fetched 2026-04-05
- [Slash Commands in the SDK — platform.claude.com/docs/en/agent-sdk/slash-commands](https://platform.claude.com/docs/en/agent-sdk/slash-commands) — HIGH confidence, official docs, fetched 2026-04-05
- [Bash tool — platform.claude.com/docs/en/agents-and-tools/tool-use/bash-tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/bash-tool) — HIGH confidence, official docs
- GSD executor and researcher agent files at `~/.claude/agents/` — HIGH confidence, observed live implementation

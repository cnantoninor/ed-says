# Domain Pitfalls

**Domain:** Python complexity + bus factor scoring tool wrapped as a Claude Code skill
**Researched:** 2026-04-05
**Scope:** Milestone 0 (dog-food MVP) with forward flags for Milestone 1

---

## 1. Lizard Complexity Scoring Pitfalls

### 1.1 Anonymous Functions Are Not Tracked As Separate Functions (HIGH RISK)

**Problem:** Lizard issue #324 (open since 2021, still unresolved as of March 2026) documents that JavaScript/TypeScript anonymous functions — arrow functions, callbacks, immediately-invoked expressions — are not detected as distinct function boundaries. Their complexity is either silently folded into the containing function or dropped entirely.

**Why it happens:** Lizard uses a token-stream approach to detect function entry points. TypeScript/JavaScript anonymous function syntax does not always produce a named token that triggers lizard's function-start state machine. Issue #343 ("Javascript: handling of anonymous function is supported?") was only closed March 2026, suggesting churn on this area.

**Consequences for Ed Says:** A React component file with ten inline event handlers, each containing conditional logic, may return `Cs_diff = 0` or `Cs_diff = 1` when the true cyclomatic number is 8+. The formula underestimates complexity, producing LOW severity when the risk is genuinely HIGH.

**Mitigation:**
- After running lizard on a TypeScript temp file, check whether the function count in the JSON output is plausible relative to the number of `function`/`=>` tokens in the added lines. If function count is 0 but token count is large, fall back to the hand-rolled heuristic and annotate the output with `"complexity_engine": "fallback", "reason": "no_functions_detected"`.
- The hand-rolled fallback must count `=>` arrows as conditional branches, not just `if`/`else`/`&&`/`||`.
- Log a warning in the JSON output when lizard returns 0 functions for a file that has at least one `function` or `=>` token.

---

### 1.2 Running Lizard on Diff Fragments, Not Complete Files (HIGH RISK)

**Problem:** The plan calls for extracting added lines from the unified diff into a temporary file, then running lizard on that temp file. Lizard explicitly requires syntactically correct code. A diff fragment is almost never a complete syntactic unit — it may open a function but not close it, reference types defined elsewhere, or contain partial class bodies.

**Why it happens:** Unified diffs capture line ranges, not semantic units. A `+` line block starting mid-function, or a block that adds only an `if` branch inside an existing function, is syntactically broken in isolation.

**Consequences for Ed Says:** Lizard silently returns 0 functions (soft failure, no exception) when the fragment is malformed. `Cs_diff` reads as 0. The formula interprets this as zero new complexity, regardless of the actual size of the change.

**Mitigation:**
- Do not run lizard on raw diff fragments. Instead: for each changed file, reconstruct the post-patch version by applying the diff to the pre-image (via `git show <base>:<file>` + patch), then run lizard on the complete post-image file. Subtract the function-level complexity of unchanged functions to isolate the diff contribution.
- Alternative (simpler, lower fidelity): run lizard on the full post-image file for `Cs_file`, use it as a proxy for `Cs_diff` when the file was modified (not created). This is less precise but avoids the fragment problem entirely.
- Never pass a file to lizard that does not have a valid extension matching the language flag passed to `--languages`.

---

### 1.3 TypeScript Generics Cause Angle-Bracket Ambiguity (MEDIUM RISK)

**Problem:** Lizard's own documentation warns that "some C++ complicated templates may cause confusion with matching angle brackets." TypeScript generics use identical `<T>` syntax. Complex generic expressions — `Array<Map<string, Set<number>>>`, conditional types `T extends U ? X : Y`, mapped types — can confuse lizard's bracket-matching state machine.

**Why it happens:** Lizard's TypeScript parser inherits angle-bracket handling from the C++ parser path. When `<` and `>` appear as comparison operators inside generic argument lists, the parser can miscount brackets and lose track of function boundaries.

**Consequences for Ed Says:** Functions with complex generic signatures may be merged into neighboring functions or skipped. Complexity is misattributed or zero for generic-heavy utility files (e.g., type guard utilities, Redux selectors, ORM query builders).

**Mitigation:**
- Test lizard output against the existing `test/fixtures/` files. Include at least one fixture with complex generics (e.g., a file with `Promise<Result<T, E>>` signatures).
- When lizard returns a function count significantly lower than `grep -c "function\|=>"` count for that file, trust the heuristic fallback.
- Document the known delta between lizard and the hand-rolled heuristic in the verification step at the end of Milestone 0.

---

### 1.4 Decorators Are Not Counted As Complexity Branches (LOW-MEDIUM RISK)

**Problem:** TypeScript decorators (`@Injectable()`, `@Component({...})`, `@UseGuards(AuthGuard)`) contain expressions that can have conditional logic and function calls. Lizard does not count decorator arguments as cyclomatic complexity contributions — they are parsed as annotations, not control flow.

**Why it happens:** Lizard's complexity model counts `if`, `for`, `while`, `case`, `&&`, `||` tokens inside function bodies. Decorators appear outside function bodies in the AST and their argument expressions are not walked.

**Consequences for Ed Says:** NestJS or Angular files with many complex decorators produce a low `Cs_diff` even though the decorators encode substantial configuration logic. This is a systematic undercount for backend TypeScript codebases.

**Mitigation:**
- This is a known limitation, not a bug to fix. Document it explicitly in the output JSON: `"known_gaps": ["decorator_complexity_not_counted"]` when the diff contains `@` decorator tokens.
- The hand-rolled heuristic should count decorator argument lines as a fractional complexity contribution (e.g., treat each `@` line as +0.5 to the raw complexity count). This is speculative but directionally correct.

---

### 1.5 Async/Await Does Not Increase Cyclomatic Complexity in Lizard (LOW RISK)

**Problem:** Lizard measures cyclomatic complexity (McCabe), which counts branch points. `async`/`await` keywords are not branch points — they are control-flow sequencing constructs. An `async` function with ten `await` calls has the same cyclomatic complexity as a synchronous function with equivalent structure. This is technically correct but can mislead.

**Why it happens:** This is correct behavior, not a bug. `await` does not create branches; it suspends execution.

**Consequences for Ed Says:** Async-heavy Promise chains converted to `await` chains will appear low-complexity to lizard, even though the error-handling surface (`.catch()`, `try/catch` around `await`) may add significant real complexity. The risk is undercounting async error paths that use `try/catch` blocks — though `catch` blocks do add an `if`-equivalent branch.

**Mitigation:**
- Add a note in the JSON output when `Cs_diff > 0` and the added lines contain `async/await` keywords: "async/await present — review error handling paths manually."
- Ensure the hand-rolled heuristic counts `catch` blocks as +1 branch, consistent with McCabe.

---

### 1.6 Template Literals with Complex Expressions Are Silently Ignored (LOW RISK)

**Problem:** TypeScript tagged template literals (`` sql`SELECT * WHERE id = ${userId}` ``, `` gql`query { ... }` ``) can contain significant logic in their interpolations. Lizard counts the outer function's complexity but does not recurse into template literal expressions.

**Why it happens:** Template literal body parsing is treated as string content, not code. Expressions inside `${}` are tokenized but not walked for branch counts.

**Consequences for Ed Says:** GraphQL schema files, SQL query builders, and styled-components files may produce `Cs_diff = 1` for complex additions. This is a minor undercount in most cases.

**Mitigation:** Accept this limitation. Document it. Instruct the analyzer agent to note in its narrative when a component contains `gql`, `sql`, or `css` tagged template literals that lizard may undercount.

---

## 2. Bus Factor Measurement Pitfalls

### 2.1 Squash Merges Erase Individual Contributor Attribution (HIGH RISK)

**Problem:** When a team uses "Squash and Merge" on GitHub (the default for many repos), every PR becomes a single commit attributed to the person who clicked the button — not to the PR author or the pair who reviewed it. GitHub improved this in September 2022 to show the original PR author in the commit message, but `git log --format="%ae"` (the standard author email) still returns the merger's email, not the PR author's.

**Why it happens:** Git's squash commit has a single `author` field. GitHub's improvement added a `Co-Authored-By:` trailer in the commit body, but this is in the commit message body, not the author field. `git log` without trailer parsing misses it.

**Consequences for Ed Says:** A component where Alice wrote 15 PRs but Bob squash-merged all of them will show `BF_proxy = 1` (Bob), not `BF_proxy = 2` (Alice + Bob). The bus factor is systematically undercounted on repos that squash-merge.

**Mitigation:**
- Parse `Co-Authored-By:` trailers from commit messages. Git supports this natively: `git log --format="%ae%n%(trailers:key=Co-Authored-By,valueonly=true)" -- <paths>` extracts both author and co-author emails.
- Deduplicate the combined set. This requires normalizing email addresses (lowercase, strip whitespace).
- Document in output: `"bf_source_notes": "co-authored-by trailers parsed"` when trailers were found.
- This is particularly important for Milestone 0 since the ed-says repo itself is being dog-fooded on claude-bot-authored commits.

---

### 2.2 Bot Commits Inflate or Deflate Bus Factor (HIGH RISK)

**Problem:** Dependency bots (Dependabot, Renovate), CI bots (GitHub Actions), and code-generation tools commit to the same files as human contributors. Their commit author emails (e.g., `49699333+dependabot[bot]@users.noreply.github.com`, `github-actions[bot]@users.noreply.github.com`) get counted as distinct contributors, inflating BF_proxy — or, if they are the only recent committers to a config file, they produce a false confidence that a human understands that file.

**Why it happens:** `git log` does not distinguish bot commits from human commits. The `[bot]` suffix in GitHub usernames is a GitHub convention but is not guaranteed across all CI systems.

**Consequences for Ed Says:** A `package-lock.json` or `.github/workflows/` directory may show `BF_proxy = 3` (human, Dependabot, Renovate) when the true human bus factor is 1. The formula underestimates debt.

**Mitigation:**
- Filter bot authors before counting. Heuristic: exclude author emails matching `*[bot]*`, `*@users.noreply.github.com` where the username contains `[bot]`, `*noreply*`, or `renovate@whitesourcesoftware.com`.
- Add a configurable `bot_email_patterns` list to `.ed-says.yml` so teams can add custom bots.
- Log filtered bot count in output: `"bf_bots_excluded": 2` so users can verify the filter is working.

---

### 2.3 Short Time Windows Exclude Legitimate Contributors (MEDIUM RISK)

**Problem:** The 90-day git-recent window means that developers who took parental leave, were on a long-running project, or joined the company before the window do not appear as recent contributors. They may deeply understand a component but will not be counted. This makes BF_proxy for stable, well-understood components artificially low.

**Why it happens:** The 90-day window was chosen to measure "active" contributors. But "active" does not equal "understands" — the spec acknowledges this by assigning only 0.4 confidence to git-recent counts.

**Consequences for Ed Says:** Teams with low commit cadence (e.g., infrastructure teams who touch a component once a quarter) consistently receive inflated debt scores for stable components they actually understand well.

**Mitigation:**
- The 0.4 confidence weight already partially accounts for this. Do not increase the confidence value.
- Surface this limitation in the `/ed-says:ask` prompt: "Git log shows 1 contributor in the last 90 days. If your team has other members who understand this component, use `/ed-says:ask` to record their understanding and adjust the score."
- Make the 90-day window configurable in `.ed-says.yml` under `git_recent_days`. Default: 90. Some teams may prefer 180.

---

### 2.4 Aliases and Multiple Email Addresses Undercount Unique Contributors (MEDIUM RISK)

**Problem:** A single developer can commit from multiple email addresses (personal laptop vs work VPN, GitHub web editor vs local git, commit before and after a name change). `git shortlog` counts distinct author strings, so the same person appears as multiple authors.

**Why it happens:** Git does not have a canonical identity system. `~/.gitconfig` email differs per machine if the developer does not configure it consistently.

**Consequences for Ed Says:** A component with one author who committed from three email addresses shows `BF_proxy = 3` when the true bus factor is 1. The formula significantly underestimates debt.

**Mitigation:**
- Support a `.mailmap` file (git's native alias mechanism). When present, git automatically deduplicates via `git log --use-mailmap`. Always pass `--use-mailmap` in git log calls.
- Document in the setup guide: "Create a `.mailmap` file to deduplicate contributor identities across email addresses. This is especially important for accurate bus factor measurement."
- This is a one-line change in the Python script but has high leverage.

---

### 2.5 CODEOWNERS Glob Patterns Are Not Straightforward to Parse (MEDIUM RISK)

**Problem:** `.github/CODEOWNERS` uses a gitignore-style glob pattern syntax with several non-obvious rules: later entries override earlier ones, `*` does not match `/`, patterns starting with `/` are relative to the repo root, team references like `@org/team-name` count as one "person" but represent N people. The Python script must implement this correctly or produce wrong owner counts.

**Why it happens:** CODEOWNERS parsing is underspecified and has edge cases that differ from standard glob libraries. The GitHub documentation lists rules but they are subtle (e.g., a more specific pattern overrides a less specific one only if it appears later in the file).

**Consequences for Ed Says:** A CODEOWNERS entry like `src/auth/* @backend-team` where `@backend-team` has 5 members would count as 1 owner if the script only counts owner tokens. Meanwhile, a file not matched by any pattern defaults to no owners (BF = 0), which is safe but noisy.

**Mitigation:**
- When counting CODEOWNERS entries, count individual `@username` references and team references separately. For teams, use `gh api /orgs/{org}/teams/{team}/members --jq '.[].login' | wc -l` to expand team membership, or default to treating each team as 2 people when the GitHub token is unavailable.
- Apply CODEOWNERS rules in reverse order (last match wins) using the fnmatch library with the explicit rule that `*` does not match `/`.
- When CODEOWNERS parsing fails for any reason, fall through to git log — do not crash.

---

## 3. Diff Parsing Pitfalls

### 3.1 Binary Files Must Be Explicitly Skipped (HIGH RISK)

**Problem:** A unified diff from `git diff` includes binary file change notifications (e.g., `Binary files a/assets/logo.png and b/assets/logo.png differ`). These lines do not contain `+`/`-` change content. If the parser tries to extract "added lines" from a binary diff block and passes them to lizard, lizard will receive garbage or nothing.

**Why it happens:** `git diff` always includes binary file entries in its output. Naive line-by-line parsing that filters for `+` prefixes will produce an empty or malformed temp file for binary changes.

**Consequences for Ed Says:** Binary files produce `Cs_diff = 0` silently, which is correct behavior (binary files have no cyclomatic complexity), but only if the parser handles the binary marker correctly. If it does not, the entire diff parse can fail with an unhandled exception, aborting the analysis.

**Mitigation:**
- Use the `python-unidiff` library (PyPI: `unidiff`) which exposes `PatchedFile.is_binary_file` — check this flag and skip the file before attempting to extract added lines.
- Add a test fixture with a diff that includes a binary file change alongside text file changes.

---

### 3.2 Renamed or Moved Files Break Component Matching (HIGH RISK)

**Problem:** When a file is renamed (e.g., `src/auth/login.ts` → `src/authentication/login.ts`), `git diff` produces a diff header like `diff --git a/src/auth/login.ts b/src/authentication/login.ts` with a similarity index. The old path does not match any current component glob pattern in `.ed-says.yml`. The new path may or may not match.

**Why it happens:** The diff header uses both paths. If the parser only reads the `b/` path (post-rename) it may match the new component correctly. If it reads only the `a/` path it may assign the file to the wrong component or no component.

**Consequences for Ed Says:** Renamed files are either silently dropped (not assigned to any component, their complexity ignored) or assigned to the wrong component (old component still shows debt). During a refactor that renames modules, the formula produces incorrect component-level scores.

**Mitigation:**
- Always use the `b/` (post-patch) path for component matching in `matchComponent()`. This ensures the file is classified by where it ends up, not where it started.
- When `python-unidiff` is used, `PatchedFile.path` returns the target path (post-rename), which is the correct behavior.
- Add a `"renamed_files"` count to the JSON output so users can see how many renames were detected.

---

### 3.3 Large Diffs and Generated Code Inflate Complexity (MEDIUM RISK)

**Problem:** A diff that touches a 10,000-line auto-generated file (protobuf definitions, GraphQL schema, ORM migration, compiled output accidentally committed) will produce a massive `Cs_diff` and `Cs_file`, pushing `totalDebt` into CRITICAL regardless of actual human-authored complexity.

**Why it happens:** Generated files can have high cyclomatic complexity patterns (many `switch` cases, repeated `if` chains) that score high under lizard's model. The diff may touch thousands of lines if the schema was regenerated.

**Consequences for Ed Says:** Every CI run on a protobuf-heavy repo alerts CRITICAL, destroying the signal value of the tool.

**Mitigation:**
- Support a `exclude_patterns` list in `.ed-says.yml` (default includes `*.pb.ts`, `*.pb.go`, `*_generated.*`, `*.min.js`, `schema.graphql`). Files matching these patterns are skipped entirely.
- Add a cap: if a single file contributes more than `max_file_complexity` CP to `Cs_diff` (configurable, default 50), log a warning and cap at that value. This prevents a single generated file from dominating totalDebt.
- In Milestone 0, document these defaults in `templates/.ed-says.yml`.

---

### 3.4 Diff Encoding and Non-UTF-8 Files Crash the Parser (MEDIUM RISK)

**Problem:** `git diff` output is bytes. If a changed file contains non-UTF-8 characters (legacy Latin-1 source files, Windows CRLF + BOM combinations, binary data accidentally committed as text), Python's default `str.splitlines()` or `open()` without explicit encoding will raise a `UnicodeDecodeError`.

**Why it happens:** Python 3's default string handling assumes UTF-8. Legacy codebases often have files in other encodings.

**Consequences for Ed Says:** The entire diff parse aborts on the first non-UTF-8 file, producing no output. The analyze command fails silently or with a cryptic traceback.

**Mitigation:**
- Open all git diff output with `errors='replace'` or `errors='ignore'` to avoid crashes. Log which files triggered encoding errors.
- When using `python-unidiff`, pass `encoding='utf-8'` and `errors='replace'` to `PatchSet.from_string()`.
- Add a test fixture with a diff containing a Latin-1 encoded file.

---

### 3.5 Submodule Changes Appear As Diffs But Have No Useful Content (LOW RISK)

**Problem:** If a repo uses git submodules, a submodule pointer update appears in `git diff` as a single-line change showing the old and new commit SHA. The diff has no `+`/`-` line content. Parsing it produces 0 added lines and 0 complexity, which is correct behavior — but the submodule path may match a component glob in `.ed-says.yml`, producing misleading "0 complexity, 0 debt" output for what could be a significant dependency change.

**Why it happens:** Submodule diffs are pointer changes, not content diffs. There is no way to get the actual diff of the submodule change without recursing into the submodule.

**Mitigation:** Detect submodule diff markers (`Subproject commit` in the diff body). Skip these files for complexity analysis. Log them in the output as `"skipped": [{"file": "vendor/lib", "reason": "submodule_pointer"}]`.

---

## 4. Claude Code Skill Pitfalls

### 4.1 Skill Descriptions Truncated at 250 Characters (MEDIUM RISK)

**Problem:** The Claude Code docs state: "descriptions longer than 250 characters are truncated in the skill listing to reduce context usage." A truncated description causes Claude to fail to auto-invoke the skill when it should, or to invoke it in the wrong context.

**Why it happens:** Skill descriptions are loaded into context for all skills simultaneously. Claude Code dynamically allocates budget proportional to context window size (1% of context, minimum 8,000 characters across all skills). With many skills installed, each description is aggressively trimmed.

**Consequences for Ed Says:** If `/ed-says:analyze` has a verbose description, Claude may not understand when to invoke it automatically. The skill may be invisible in the `/` autocomplete list when the budget is tight.

**Mitigation:**
- Keep `description` fields in all skill frontmatter under 200 characters. Front-load the trigger phrase: "Compute epistemic debt score for changed files. Run before merging a PR. Requires git diff against base branch."
- Set `disable-model-invocation: true` on `analyze.md` to prevent accidental auto-invocation. Ed Says should be invoked explicitly.
- Keep `SKILL.md` / `analyze.md` under 500 lines total, with detailed reference material in separate supporting files.

---

### 4.2 context: fork Subagents Do Not Inherit Conversation History (MEDIUM RISK)

**Problem:** The `analyze.md` command will likely spawn `ed-says-analyzer.md` as a subagent with `context: fork`. The Claude Code docs explicitly warn: "It won't have access to your conversation history." This means the subagent cannot see the user's original request, any prior `/ed-says:ask` session context, or the contents of `.ed-says-state.json` unless they are explicitly injected.

**Why it happens:** `context: fork` creates an isolated context window. The only information available to the subagent is: the skill content itself, `CLAUDE.md`, and any dynamic context injected via `` !`command` `` shell blocks.

**Consequences for Ed Says:** The analyzer subagent runs the Python script and gets JSON back, but it cannot correlate the results with what the user was asking or any prior grasp scores unless the skill content explicitly injects them. The narrative will be generic.

**Mitigation:**
- Use `` !`cat .ed-says-state.json 2>/dev/null || echo '{}'` `` in the subagent's content to inject the current state file as dynamic context.
- Inject `!`git log --oneline -5`` to give the subagent commit context.
- Do not rely on the main session's memory for anything the subagent needs to produce a coherent response.

---

### 4.3 Shell Command Injection Blocks (`` !`cmd` ``) Run Before Claude Sees Anything (MEDIUM RISK)

**Problem:** Shell blocks in skill content (`` !`command` ``) execute at skill-load time, before Claude processes the content. If the command fails (non-zero exit, missing tool, no git repo), the failure output replaces the placeholder. Claude receives error text where it expected JSON data and will either interpret it as malformed context or attempt to explain the error instead of running the analysis.

**Why it happens:** This is documented behavior — preprocessing, not runtime execution. There is no error-handling mechanism in the skill syntax itself.

**Consequences for Ed Says:** If `scripts/ed-says-analyze.py` fails during dynamic injection (e.g., `python` not found, lizard not installed, no git diff), the skill receives an error message as its context. The agent attempts to interpret the error as analysis output.

**Mitigation:**
- Wrap every `` !`command` `` block with explicit fallback: `` !`python scripts/ed-says-analyze.py --base main 2>&1 || echo '{"error": "analysis_failed", "message": "check python and lizard installation"}'` ``
- Structure the skill to detect the `"error"` key in the JSON response and emit a user-friendly diagnostic rather than attempting to parse a failure as a debt score.

---

### 4.4 allowed-tools Restrictions Can Block Required Operations (LOW RISK)

**Problem:** If `analyze.md` specifies `allowed-tools: Bash Read` but omits `Write`, the skill cannot write to `.ed-says-state.json` without prompting the user for permission. In a CI-adjacent context, interactive prompts stall the session.

**Why it happens:** Claude Code requires explicit permission grants for tool use. `allowed-tools` in frontmatter grants permission for the duration of the skill invocation, but only for the listed tools.

**Mitigation:**
- List all tools the skill requires upfront: `allowed-tools: Bash Read Write Grep`. For Milestone 0, be permissive — lock down later when the tool access pattern is stable.
- For the subagent (`ed-says-analyzer.md`), specify `allowed-tools` separately. The subagent needs at minimum `Bash` (to run the Python script) and `Read` (to read `.ed-says-state.json`).

---

## 5. PR Comment Idempotency Pitfalls

### 5.1 Pagination: The Marker Comment May Be Beyond Page 1 (HIGH RISK)

**Problem:** The find-then-update pattern works by listing all PR comments, searching for `<!-- ed-says-report -->`, and updating the matching comment. The GitHub GraphQL API's `pullRequest.comments` connection defaults to the first 100 nodes. If a PR has more than 100 comments (common in large, active PRs), the existing ed-says comment may be beyond the first page and appear "not found," causing a duplicate comment to be created.

**Why it happens:** GraphQL pagination requires explicit cursor-based iteration. Most simple implementations fetch only the first page.

**Consequences for Ed Says:** Multiple ed-says comments accumulate on the PR. The "update in place" guarantee is violated. On busy PRs, this can become a spam problem.

**Mitigation:**
- In `scripts/ed-says-comment.sh`, use `gh api` with pagination: `gh api graphql --paginate` or use the REST endpoint `GET /repos/{owner}/{repo}/issues/{issue_number}/comments` with `per_page=100` and iterate through `Link` header pages until the marker is found or pages are exhausted.
- Alternatively, use `gh pr comment` with `--edit-last` and handle the "no comment to edit" case — but this only finds the most recent comment from the bot, which may not be the ed-says comment.

---

### 5.2 Race Condition: Two Concurrent Runs Create Duplicate Comments (MEDIUM RISK)

**Problem:** If two `/ed-says:analyze` runs execute simultaneously (e.g., developer runs the command while a CI hook fires), both may check for an existing comment simultaneously, find none, and both create new comments. The second run's update attempt then fails because the comment it found "not found" no longer applies.

**Why it happens:** The find-then-create pattern has a TOCTOU (time-of-check/time-of-use) race condition. GitHub's API does not provide an atomic upsert operation for PR comments.

**Consequences for Ed Says:** Two ed-says report comments on the same PR. Subsequent runs will find the first one and update it, ignoring the second — but the second persists as stale noise.

**Mitigation:**
- In Milestone 0, accept this limitation. Document it.
- In Milestone 1, add a comment-creation lock using the state file: write a `"comment_lock": "<timestamp>"` entry to `.ed-says-state.json` before posting and check it before posting. This is imperfect (file-system based, not atomic across machines) but sufficient for a single-user Claude Code context.
- Long-term: use a custom HTTP header or comment body timestamp to detect duplicates and delete the older one if two are found.

---

### 5.3 Marker Comment Manually Edited by a Developer (LOW RISK)

**Problem:** If a developer edits the ed-says PR comment manually (e.g., adds notes, reformats), the `<!-- ed-says-report -->` HTML comment marker may be moved or deleted. The next run fails to find the marker and creates a new comment.

**Why it happens:** The idempotency contract relies on a hidden HTML marker in the comment body. Markdown rendering hides it, but editing the raw comment exposes and makes it easy to accidentally delete.

**Mitigation:**
- Place the marker at the very beginning of the comment body as the first characters: `<!-- ed-says-report -->\n# Ed Says Report\n...`. This reduces the chance of accidental deletion during editing.
- When two ed-says comments are detected on the same PR (matching the `# Ed Says Report` header), delete the older one and keep the newer one.

---

### 5.4 GitHub Token Scope Is Insufficient for Comment Writes (LOW RISK)

**Problem:** A `GITHUB_TOKEN` with only `contents: read` scope (common in restrictive CI policies) cannot post PR comments. The attempt fails silently or with a 403 that the shell script may not handle gracefully.

**Why it happens:** GitHub Actions `GITHUB_TOKEN` scopes are configured in the workflow yaml. Default scopes vary by organization policy. Read-only tokens are common for security-conscious teams.

**Consequences for Ed Says:** The comment posting step fails but the analysis output is correct. If the failure is not surfaced clearly, the user sees "comment posted" feedback but no comment appears on the PR.

**Mitigation:**
- Check the token scope before attempting to post. `gh auth status` or `gh api /user` will succeed for any valid token; test specifically with `gh api /repos/{owner}/{repo}/issues/1/comments --method GET` to verify comment-read access, then attempt write.
- If the write fails with 403, emit a clear diagnostic: "GITHUB_TOKEN lacks `pull-requests: write` or `issues: write` scope. Report printed to terminal only."

---

## 6. State File Pitfalls

### 6.1 Concurrent Writes Corrupt the State File (HIGH RISK)

**Problem:** If two processes write to `.ed-says-state.json` simultaneously (e.g., `analyze.md` writing a new entry while `ask.md` writes a grasp score), the file can become truncated JSON, a mix of two partial writes, or an empty file. Python's `json.dump` + `file.write` is not atomic.

**Why it happens:** File writes in Python are not atomic by default. The OS may interleave partial writes from concurrent processes. POSIX `rename()` is atomic, but Python's standard file write is not.

**Consequences for Ed Says:** A corrupted state file causes all subsequent read operations to throw `json.JSONDecodeError`. The tool becomes unusable until the file is manually repaired or deleted.

**Mitigation:**
- Use atomic write: write to a temp file in the same directory, then `os.replace(tmp_path, state_path)`. On POSIX, `os.replace` uses `rename()` which is atomic.
- Python pattern:
  ```python
  import os, json, tempfile
  tmp = state_path + ".tmp"
  with open(tmp, "w") as f:
      json.dump(state, f, indent=2)
  os.replace(tmp, state_path)
  ```
- This is a one-time implementation choice in Milestone 0 that prevents a class of hard-to-debug data corruption.

---

### 6.2 State File Grows Unbounded If Rolling Window Is Not Enforced (MEDIUM RISK)

**Problem:** The schema specifies `maxEntries: 100` with a rolling window. If the write logic appends without enforcing the cap, the file grows indefinitely. At 1,000+ entries, reading and re-serializing the file on every run adds noticeable latency.

**Why it happens:** The cap enforcement requires explicit trimming logic during every write. It is easy to implement append-only and forget the trim.

**Consequences for Ed Says:** Over months of daily use, `.ed-says-state.json` reaches megabytes. `git diff` on the state file becomes slow. State file reads dominate the analysis runtime.

**Mitigation:**
- Enforce the cap on every write, not lazily. After appending a new entry: `state["entries"] = state["entries"][-state["maxEntries"]:]`. Two lines, always correct.
- Add a schema version field (`"version": 1`) from Milestone 0 so future migrations can be handled cleanly.

---

### 6.3 Grasp Score Is Stale After Code Changes (MEDIUM RISK)

**Problem:** A grasp score (`Gc`) written to state after `/ed-says:ask` is tied to a specific SHA. If the component is significantly modified in a subsequent PR, the old grasp score still reduces debt — even though the developer may not understand the new code.

**Why it happens:** The state file stores grasp scores by component name, not by component SHA. The formula subtracts the old `Gc` from the new `Ed_risk` with no staleness check.

**Consequences for Ed Says:** A developer who understood the old auth module (scoring Gc=15) gets a 15 CP credit applied to a completely rewritten auth module they have not reviewed. Debt is systematically underestimated after refactors.

**Mitigation:**
- Store the SHA alongside the grasp score in the state file: `"gc": {"value": 15, "sha": "abc123", "timestamp": "..."}`.
- When applying a grasp credit, check if the file hash has changed since the grasp was recorded. If `git show <gc_sha>:<component_path>` differs from `HEAD:<component_path>`, discount the grasp credit by 50% (configurable) and add a warning in the output.
- In Milestone 0, implement the SHA storage but defer the staleness discount to Milestone 1.

---

### 6.4 State File Is Committed to Git and Leaks Debt Metrics (LOW RISK)

**Problem:** `.ed-says-state.json` committed to a public repository exposes: per-component debt scores, which components are considered risky, bus factor numbers, and indirectly which areas the team understands least.

**Why it happens:** The design intentionally allows committing the state file for trend tracking. This is a known trade-off (documented in CONCERNS.md), but teams using public repos may not realize the file is being committed.

**Mitigation:**
- Add `.ed-says-state.json` to `.gitignore` by default. Make it opt-in to commit (set `commit_state_file: true` in `.ed-says.yml`).
- In the init command, prompt: "Do you want to commit analysis history to git? (Enables trend tracking, exposes debt metrics in repository history.)"

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Milestone 0: lizard on diff fragments | Zero Cs_diff for valid changes | Run lizard on post-patch full file, not fragment |
| Milestone 0: git log for BF | Squash merges erase contributors | Parse `Co-Authored-By:` trailers; use `--use-mailmap` |
| Milestone 0: anonymous functions | Cs_diff = 0 for arrow-heavy TS | Fallback to heuristic when function count = 0 |
| Milestone 0: state file writes | Concurrent corruption | Atomic write via `os.replace()` from day one |
| Milestone 1: PR comment idempotency | Duplicate comments on busy PRs | Paginate comment search before creating |
| Milestone 1: CODEOWNERS parsing | Wrong owner counts | Reverse-order last-match, expand teams via API |
| Milestone 1: state file growth | File grows unbounded | Enforce cap on every write, not lazily |
| Milestone 2: multi-LLM install | context: fork without instructions | Every forked skill must have explicit task content, not just guidelines |
| Milestone 4: CI GitHub token | 403 on comment write | Check token write scope before attempting post |

---

## Sources

- Lizard GitHub repository (issues and documentation): https://github.com/terryyin/lizard
- Lizard issue #324 (anonymous functions): https://github.com/terryyin/lizard/issues/324
- python-unidiff library: https://github.com/matiasb/python-unidiff
- GitHub squash merge attribution: https://github.blog/changelog/2022-09-15-git-commit-author-shown-when-squash-merging-a-pull-request/
- GitHub improved squash attribution (2019): https://github.blog/changelog/2019-12-19-improved-attribution-when-squashing-commits/
- Create or update PR comment pattern: https://benlimmer.com/blog/2021/12/20/create-or-update-pr-comment/
- Claude Code slash commands documentation: https://code.claude.com/docs/en/slash-commands
- Python atomic write: https://python-atomicwrites.readthedocs.io/en/latest/
- git-shortlog co-author counting: https://git-scm.com/docs/git-shortlog

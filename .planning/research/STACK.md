# Technology Stack

**Project:** Ed Says — epistemic debt analyzer skill
**Researched:** 2026-04-05
**Scope:** Python analysis engine — lizard, dependency-cruiser, git subprocess, diff parsing

---

## Recommended Stack

### Core Analysis Engine

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Python | 3.8+ | Analysis engine runtime | Deterministic, portable, no LLM in formula path |
| lizard | 1.21.3 (latest) | Cognitive complexity (Cs_diff, Cs_file) | Battle-tested, actively maintained (last release 2026-03-30), language-aware for TypeScript, Python API available |
| PyYAML | 6.0.3 (latest) | `.ed-says.yml` config loading | Standard, minimal; replaces Zod/TypeScript schema validation |
| unidiff | 0.7.5 (latest) | Unified diff parsing | Structured access to added/removed lines per hunk; avoids hand-rolling patch parser |
| GitPython | 3.1.46 (latest) | Git operations wrapper | Safe list-args subprocess underneath; exception hierarchy; avoids shell=True |

### Coupling Analysis (Milestone 1+)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| dependency-cruiser | 17.3.10 (latest) | Fan-in count per module | Only tool that provides `dependents[]` in JSON output; actively maintained (last release 2026-03-26) |

---

## Exact API Usage

### lizard

**Preferred: Python API (not subprocess)**

Use `lizard.analyze_file.analyze_source_code(filename, code_string)` — this is the correct entry point for analyzing strings without writing temp files.

```python
import lizard

def compute_ccn(filename: str, code: str) -> int:
    """
    Returns sum of cyclomatic complexity across all functions.
    filename must carry the correct extension (.ts, .tsx, .py, etc.)
    so lizard picks the right reader.
    """
    result = lizard.analyze_file.analyze_source_code(filename, code)
    if not result.function_list:
        return 0
    return sum(fn.cyclomatic_complexity for fn in result.function_list)
```

**Why not CLI subprocess:** The CLI `-X` (XML) and `--csv` outputs require parsing; the Python API returns structured `FileInformation` objects directly. No temp file needed. No encoding issues.

**Why not `lizard.analyze_file(path)`:** Requires an actual file on disk. Use for `Cs_file` (pre-image written to temp file via `git show`), but `analyze_source_code` is cleaner for `Cs_diff` (added lines extracted from diff).

**FileInformation fields used:**

| Field | Type | Meaning |
|-------|------|---------|
| `result.function_list` | `list[FunctionInfo]` | All detected functions |
| `fn.cyclomatic_complexity` | `int` | CCN for this function |
| `fn.nloc` | `int` | Non-comment lines of code |
| `fn.name` | `str` | Function/method name |
| `fn.start_line` | `int` | First line in file |
| `fn.end_line` | `int` | Last line in file |

**Language detection:** lizard infers language from the filename passed to `analyze_source_code`. Supported and verified:
- `typescript` (.ts) — full support including generics, optional chaining, async/await
- `tsx` (.tsx) — JSX syntax handled
- `javascript` / `python` / `go` / `rust` — all supported

**Known edge cases:**
- **TypeScript decorators** (`@Injectable()`, `@Controller()`): lizard does NOT detect functions inside decorated classes when only decorators appear at the top scope. Class methods ARE detected if the class body contains them. Mitigation: decorator-heavy files will under-count functions; `Cs_diff` for added decorator lines will be 0, which is conservative (under-estimates debt).
- **Arrow function class fields** (`bar = (x) => { ... }`): Detected but named `=` instead of the property name. Does not affect CCN calculation — only display.
- **Empty files or import-only files**: Returns `function_list=[]` and `nloc > 0`. Handle with `return 0` for empty function list.
- **stdin pipe (`lizard -`)**: Cannot determine language from `-` filename — returns 0 functions. Do NOT use stdin. Always pass a filename to `analyze_source_code`.

**Version is current:** lizard 1.21.3 was released 2026-03-30 — actively maintained with monthly releases throughout 2025–2026.

---

### dependency-cruiser

**Invocation (subprocess from Python):**

```python
import subprocess, json

def get_fan_in(src_dir: str, project_root: str) -> dict[str, int]:
    """
    Returns {module_source_path: fan_in_count} for all modules in src_dir.
    project_root: directory containing package.json with local dependency-cruiser.
    Returns {} if depcruise unavailable or fails (graceful degradation).
    """
    try:
        result = subprocess.run(
            ['npx', 'depcruise', src_dir,
             '--output-type', 'json',
             '--no-config',
             '--include-only', f'^{src_dir}'],
            cwd=project_root,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=60,
        )
        if result.returncode != 0:
            return {}
        data = json.loads(result.stdout)
        return {
            mod['source']: len(mod.get('dependents', []))
            for mod in data.get('modules', [])
        }
    except (subprocess.TimeoutExpired, FileNotFoundError, json.JSONDecodeError):
        return {}
```

**Fan-in extraction:** The `dependents` field on each module object is the fan-in. It lists the source paths of all modules that import this module. `len(dependents)` is the fan-in count.

```json
{
  "modules": [
    {
      "source": "src/utils/crypto.ts",
      "dependencies": [],
      "dependents": ["src/app.ts", "src/auth/login.ts"],
      ...
    }
  ]
}
```

**Critical constraint:** depcruise must be run from within a project that has `dependency-cruiser` in its local `node_modules`. Running the globally installed `depcruise` against a repo without a local install returns 0 modules (even with `--no-config`). Workaround options:
1. Instruct the user to install `dependency-cruiser` as a devDependency (preferred for Milestone 1+)
2. Fall back to `fan_in=0` if depcruise returns empty (already handled by `return {}`)

**For Milestone 0:** fan_in is excluded from the formula (per SKILL_PLAN.md section c, marked "Milestone 1+"). Set `fan_in=0` and `fan_in_norm=0` for all components.

**Flags used:**
- `--output-type json` — structured JSON output to stdout
- `--no-config` — skip `.dependency-cruiser.js` config file lookup (safer for foreign repos)
- `--include-only ^src` — exclude `node_modules` and other non-source dirs from analysis (prevents explosion)

**Version is current:** 17.3.10 released 2026-03-26.

---

### Git subprocess (via GitPython)

**Use GitPython instead of raw subprocess.** GitPython wraps git commands as list args (safe) and provides a clean exception hierarchy.

```python
import git

repo = git.Repo(project_root, search_parent_directories=True)

# Get unified diff text
diff_text = repo.git.diff(base_branch, 'HEAD')

# Get pre-image of a file for Cs_file
try:
    pre_image = repo.git.show(f'{base_branch}:{filepath}')
except git.exc.GitCommandError:
    pre_image = ''  # new file — no pre-image

# Churn: commit count in last 90 days
log_output = repo.git.log('--since=90 days ago', '--oneline', '--', *paths)
churn = len([l for l in log_output.strip().split('\n') if l])

# Bus factor: distinct authors
author_log = repo.git.log('--since=90 days ago', '--format=%ae', '--', *paths)
authors = set(a for a in author_log.strip().split('\n') if a)
```

**Security:** GitPython uses `subprocess.run` with list args internally — `shell=False` always. Path injection via filenames from `git diff` output is not possible because the path is passed as a literal argument, not interpolated into a shell string. Git also refuses `git show HEAD:../../../../etc/passwd` with "outside repository" error, blocking path traversal.

**Encoding:** GitPython uses `text=True` with UTF-8 by default. Binary diffs (images, fonts) will produce a `UnicodeDecodeError` if not handled. Pattern:

```python
try:
    content = repo.git.show(f'{base}:{path}')
except git.exc.GitCommandError as e:
    if 'binary' in e.stderr.lower():
        return ''  # skip binary files
    raise
```

**When to fall back to raw subprocess:** Only if `git.Repo()` fails (not a git repo). In that case the script should exit early with a clear error message.

---

### unidiff (diff parsing)

**Use unidiff instead of hand-rolling a diff parser.**

```python
import unidiff

def extract_added_lines_per_file(diff_text: str) -> dict[str, str]:
    """
    Returns {filepath: added_lines_code} from a unified diff string.
    added_lines_code can be passed to lizard.analyze_source_code(filepath, code).
    """
    patchset = unidiff.PatchSet(diff_text)
    result = {}
    for patch in patchset:
        added = [line.value.rstrip('\n') for hunk in patch for line in hunk if line.is_added]
        if added:
            result[patch.path] = '\n'.join(added)
    return result
```

**Key attributes:**
- `patch.path` — target file path (use for lizard filename arg)
- `patch.source_file` — `a/` prefixed source path
- `patch.is_added_file` / `patch.is_removed_file` / `patch.is_modified_file`
- `line.is_added` / `line.is_removed` / `line.is_context` — per line
- `line.value` — line content with trailing `\n`

**Edge case:** `unidiff.UnidiffParseError` is raised if the diff hunk header line counts don't match the actual content. This can happen with corrupt diffs or hand-crafted inputs. Catch and skip the file.

**Version:** 0.7.5 (2023). Stable, no recent security issues. API has not changed since 0.7.x. Low-activity but correct and complete.

---

## Alternatives Considered and Rejected

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Complexity (Python API) | lizard 1.21.3 | radon 6.0.1 | radon is Python-only — `cc_visit()` raises `SyntaxError` on TypeScript input. Cannot analyze TS at all. |
| Complexity (TS-native) | lizard | ts-complexity 0.0.3 | Last release 2022-05-22. Stale. Requires Node.js in the formula path (breaks portability). |
| Complexity (TS-native) | lizard | @typescript-eslint complexity rule | ESLint-based, not callable as a library for numeric output. Requires full ESLint config. Overkill. |
| Complexity (TS-native) | lizard | escomplex 2.0.0-alpha | Alpha quality, no TypeScript type-aware parsing, dormant development. |
| Diff parsing | unidiff | hand-rolled regex | Unified diff format has edge cases (binary files, rename detection, no-newline markers). unidiff handles them correctly. |
| Git operations | GitPython | raw subprocess.run | Both are safe with list args. GitPython adds: exception hierarchy, `Repo` context, cleaner API for `git show`/`git log`. Adds ~3MB dep but worth it for correctness. |
| Git operations | GitPython | pygit2 (libgit2 bindings) | Requires compiled C extension (libgit2). More complex install, overkill for our use case. |
| Fan-in | dependency-cruiser | madge (npm) | madge does not expose fan-in / dependents in JSON output. Only outbound dependencies. |
| Fan-in | dependency-cruiser | ts-morph (TypeScript compiler API) | Requires writing a custom analysis script in TypeScript. Higher complexity, still needs Node in the path. |

---

## Installation

```bash
# Core Python dependencies
pip install lizard==1.21.3 pyyaml==6.0.3 gitpython==3.1.46 unidiff==0.7.5

# For Milestone 1+ coupling analysis (in the analyzed repo)
npm install --save-dev dependency-cruiser
```

**requirements.txt** (for `scripts/ed-says-analyze.py`):
```
lizard>=1.21.0
PyYAML>=6.0
GitPython>=3.1.40
unidiff>=0.7.5
```

Note: GitPython and unidiff are optional enhancements over bare `subprocess` + `str.split`. The script can fall back to raw subprocess for git and hand-rolled diff parsing if these packages are unavailable — but that fallback path requires explicit implementation effort.

---

## Phase Boundaries

| Milestone | Required | Optional |
|-----------|----------|----------|
| 0 — Dog-food MVP | lizard, PyYAML, GitPython, unidiff | — |
| 1 — Full Skill Suite | + dependency-cruiser (local to analyzed repo) | fan_in=0 fallback if absent |
| 4 — GitHub Action | Same as above | Ubuntu-latest runners have Python 3.8+ and git pre-installed |

---

## Security Summary

| Risk | Mitigation |
|------|-----------|
| Shell injection via git-derived file paths | Always use list args (GitPython / `subprocess.run(list, shell=False)`). Never `shell=True` with path from diff. |
| Path traversal via `git show` | Git itself rejects paths outside the repository (`fatal: outside repository`). |
| Encoding crashes on binary files | Use `errors='replace'` in subprocess encoding; catch `GitCommandError` for binary blobs. |
| Arbitrary code via `lizard.analyze_source_code` | lizard is a static parser. No code execution of the analyzed file. |
| `npx --yes depcruise` auto-installs unknown version | Use pinned version via `npm install dependency-cruiser@17.3.10` rather than `npx --yes`. |

---

## Sources

- lizard PyPI: https://pypi.org/project/lizard/ (version 1.21.3, released 2026-03-30)
- lizard GitHub: https://github.com/terryyin/lizard
- dependency-cruiser npm: https://registry.npmjs.org/dependency-cruiser (version 17.3.10, released 2026-03-26)
- PyYAML PyPI: https://pypi.org/project/PyYAML/ (version 6.0.3, released 2025-09-25)
- GitPython PyPI: https://pypi.org/project/GitPython/ (version 3.1.46, released 2026-01-01)
- unidiff PyPI: https://pypi.org/project/unidiff/ (version 0.7.5, released 2023-03-10)
- All version dates and API behavior verified by direct install and testing on 2026-04-05

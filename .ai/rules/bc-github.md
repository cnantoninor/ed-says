---
description: DDD bounded context — GitHub Integration (PR diff fetching, comment management, check runs)
globs: src/github/**/*.ts
---

# GitHub Integration — Bounded Context

## Subdomain Classification

**Type**: Supporting Domain
**Why**: GitHub integration is necessary but not differentiating — it is a delivery mechanism for the domain's results. The logic here (Octokit client setup, comment deduplication, diff fetching) supports the Core Domain but does not encode the epistemic debt model itself.

## Purpose

The GitHub Integration context handles all communication with the GitHub API: it authenticates via a token, extracts PR context from the GitHub Actions event payload, fetches the PR diff, and manages idempotent PR comments. It translates `PipelineResult` domain objects into GitHub-specific API calls.

## Ubiquitous Language

| Term | Definition |
| --- | --- |
| **PRContext** | The minimal identifying information for a pull request: owner, repo, pull number, head SHA |
| **Octokit** | The authenticated GitHub REST API client (from `@octokit/rest`) |
| **PR Diff** | The unified diff of all changes in a pull request, fetched via the GitHub API `diff` media type |
| **Comment Marker** | An HTML comment (`<!-- ed-says-report -->`) embedded in the bot comment body to enable idempotent updates |
| **Idempotent Comment** | A PR comment that is created on first run and updated (not duplicated) on subsequent runs |
| **Check Run** | A GitHub status check associated with a commit; planned for Phase 2 |
| **Review Thread** | An inline PR comment attached to a specific file and line; planned for Phase 3 |
| **Severity Emoji** | Visual indicator in comment: 🟢 LOW, 🟡 MEDIUM, 🟠 HIGH, 🔴 CRITICAL |

## Domain Model

### Entities

| Entity | Identity | Mutable State |
| --- | --- | --- |
| `PRContext` | `owner` + `repo` + `pullNumber` | `sha` — immutable after extraction from GitHub Actions event |

### Value Objects

| Value Object | Equality | Notes |
| --- | --- | --- |
| PR diff `string` | By content | Raw unified diff text; treated as opaque input by this context |
| Comment body `string` | By content | Formatted markdown; must always include the comment marker |

### Aggregate Roots

_None_ — this context is a thin integration layer; there is no rich aggregate to protect. Consistency is enforced by the GitHub API itself.

### Domain Services

| Service | Location | Responsibility |
| --- | --- | --- |
| `createClient()` | `src/github/client.ts` | Creates an authenticated `Octokit` instance and extracts `PRContext` from the Actions event payload |
| `fetchPRDiff()` | `src/github/client.ts` | Fetches the unified diff for a PR using the `application/vnd.github.diff` media type |
| `formatSummary()` | `src/github/comment.ts` | Renders a `PipelineResult` as a GitHub-flavored markdown PR comment with component table, severity emojis, and collapsible explanation |
| `postOrUpdateComment()` | `src/github/comment.ts` | Finds the existing Ed Says comment by marker and updates it, or creates a new one if absent |
| `postReviewQuestion()` | `src/github/review-thread.ts` | **Phase 3 stub** — posts an inline question on a specific file/line |
| `readReviewReplies()` | `src/github/review-thread.ts` | **Phase 3 stub** — fetches author replies to an inline review comment |
| `createCheckRun()` | `src/github/check-run.ts` | **Phase 2 stub** — creates a GitHub Check Run with the debt report and pass/fail status |

## Business Rules & Invariants

1. **Only `pull_request` events are supported**: `createClient()` throws if the GitHub Actions event is not a pull request. The action must not run on push or other events.
2. **Comment deduplication is enforced via HTML marker**: Every comment body must include `<!-- ed-says-report -->`. `postOrUpdateComment()` searches for this marker before creating a new comment.
3. **Severity emoji mapping is fixed**:
   - 🟢 LOW
   - 🟡 MEDIUM
   - 🟠 HIGH
   - 🔴 CRITICAL
4. **Comment posting is opt-out via config**: `output.comment: false` disables posting; default is enabled.
5. **Check Run creation is Phase 2 only**: `createCheckRun()` is a stub; calling it in Phase 1 is a no-op.
6. **Diff is fetched as plain text**: The `diff` media type returns the unified diff string, not JSON.

## Relationships with Other Contexts

| Context | Relationship | Shared Surface |
| --- | --- | --- |
| **Core Domain** | Downstream consumer of domain results | `PipelineResult`, `ComponentDebt`, `Severity` |
| **Utils** | Shared Kernel — imports logger and error types | `logger`, `GitHubError` |
| **Entry Point** (`src/index.ts`) | Orchestrator that composes this context with core pipeline | `PRContext`, `Octokit`, `fetchPRDiff()`, `postOrUpdateComment()` |

## Implementation Notes

- **Phase 1 (complete)**: `client.ts`, `comment.ts` — fully operational; comment posting and diff fetching work
- **Phase 2 (stub)**: `check-run.ts` — interface defined, implementation pending
- **Phase 3 (stub)**: `review-thread.ts` — interface defined, implementation pending; will use `octokit.rest.pulls.createReview`

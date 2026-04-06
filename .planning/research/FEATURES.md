# Feature Landscape

**Domain:** Epistemic debt / code knowledge coverage tool for PR workflows
**Researched:** 2026-04-05
**Research mode:** Ecosystem

---

## Competing Tools: Honest Comparison

Before features, understand what already exists. Ed Says occupies a gap between these categories.

### Category 1: Knowledge Distribution / Bus Factor Analytics

**CodeScene** (enterprise, paid)
- Measures "Knowledge Islands" (files known by only one developer) and "Code Familiarity" (team's coverage of the codebase)
- Off-boarding simulation: select a developer, see which files lose their last knowledgeable author
- Source: git commit history only — same limitation as Ed Says BF fallback chain
- PR integration: quality gate on CodeHealth score, notifies CODEOWNERS on gate failure
- Gap: measures knowledge concentration historically, not against complexity of what's being changed right now
- Gap: no comprehension testing — knowing who committed ≠ knowing who understands

**CodePulse** (GitHub-native SaaS)
- Bus factor risk matrix: change frequency × contributor concentration per file
- Alert rules when contributor concentration exceeds threshold
- No formula linking complexity to the knowledge gap
- No comprehension layer

**git-fame** (CLI, open source, PyPI)
- Lines/commits/files attributed per author via `git blame`
- Aggregates ownership statistics; no PR integration, no risk scoring
- Useful primitive, not a workflow tool

**git-of-theseus** (CLI, open source, Python)
- Temporal analysis: which cohort of code still survives from each year, per author
- Visualization only; no actionable score

**GitHub CODEOWNERS** (built-in, free)
- Declares owners for PR review enforcement; does not measure or score anything
- Ed Says uses this as a BF signal source (confidence 0.7)

### Category 2: Complexity / Technical Debt Gates

**SonarQube / SonarCloud** (open source + paid)
- Cognitive Complexity metric per function/file, gated in quality gates
- PR decoration with new-code quality gate status
- Measures complexity; has no knowledge or bus factor dimension
- Standard threshold: Cognitive Complexity < 15 per function
- lizard aligns with SonarQube's cognitive complexity definition — Ed Says benefits from this familiarity

**CodeClimate / Qlty** (SaaS, now Qlty after rebrand)
- 10-point technical debt inspection: duplication, complexity, structure
- PR-native quality gate with GitHub status checks
- No knowledge dimension

### Category 3: Comprehension Debt (emerging concept, no tools yet)

The term "comprehension debt" was popularized by Addy Osmani in early 2026. It describes the growing gap between how much code exists and how much any human genuinely understands. The framing is:

> "Nothing in current measurement systems captures comprehension debt. Velocity metrics look immaculate. DORA metrics hold steady. PR counts are up. Code coverage is green. Performance calibration committees see velocity improvements. They cannot see comprehension deficits."

No existing tool operationalizes this. Ed Says is the first tooling attempt to measure it at the PR level using a testable formula.

### Category 4: AI Code Review (adjacent, not direct competitors)

CodeRabbit, GitHub Copilot PR Review, Greptile, Macroscope, PR-Agent.

These tools review for bugs, style, security, and architectural issues. None of them produce a knowledge-coverage score or test comprehension. They are complements to Ed Says, not substitutes.

---

## Table Stakes

Features users expect. Missing one means the tool is ignored or disabled.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Deterministic score | Devs cite non-reproducible tools as reason for disabling them. "AI left a score" is not trusted. | Low (already designed) | Formula-based, no LLM in the path. |
| Score in CP with severity bands | SonarQube trained developers on complexity thresholds. They expect a named severity level (LOW/MEDIUM/HIGH/CRITICAL), not a raw number. | Low | Already specified: LOW<=25, MEDIUM<=50, HIGH<=75, CRITICAL>75 CP |
| PR comment (idempotent) | Every comparable tool (CodeScene, SonarQube, CodeClimate) posts a PR comment. Devs expect inline visibility. | Medium | Milestone 1. Must update in place — duplicate comments are a known annoyance. |
| Per-component breakdown | Aggregate scores are discarded. Developers need to know which component drove the score and why. | Low | Already in JSON output schema. |
| CODEOWNERS integration | Teams that maintain CODEOWNERS expect tools to respect it as the authoritative ownership signal. | Low | Already in BF source chain at confidence 0.7. |
| Graceful degradation | Tools that hard-fail when GitHub token is absent, lizard is absent, or git history is shallow are immediately abandoned. | Low | Already designed. Pessimistic fallback when data is absent. |
| Fast execution | PR check tools that take >60 seconds block developer flow. Anything over 2 minutes will be turned off. | Medium | Python + lizard + git log should be <15s on typical repos. Needs measurement. |
| Clear explanation of score | False positives are adoption killer #1. Devs need to understand why the score is what it is. | Low | Agent narrative layer (ed-says-analyzer.md) addresses this. |

---

## Differentiators

Features that make Ed Says worth using over alternatives. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Complexity-weighted knowledge gap | Other tools measure bus factor OR complexity, never their product. Ed Says measures: "how complex is this change AND how many people understand this component." This is the formula's unique value: `Ed_risk = Cs_effective × coverage_gap`. | Low (formula done) | The core differentiator. Nothing else does this. |
| Comprehension testing via `/ed-says:ask` | No other tool tests actual understanding. Git commit history measures exposure, not comprehension. Ed Says lets a developer voluntarily prove understanding and have that credit reduce the debt score. | Medium | The LLMJ rubric (4-axis, 0-4 each) is the novel mechanism. Grounded in Addy Osmani's comprehension debt framing. |
| Grasp score reduces future debt | The `Gc` score is persistent. A developer who passes the comprehension test reduces the component's debt score on future PRs, not just the current one. This creates a positive feedback loop: understanding is rewarded. | Medium | Requires state persistence (Milestone 1). |
| System-aware complexity (not just diff) | Diff-only complexity misses context risk. Ed Says multiplies diff complexity by file complexity, coupling (fan-in), and churn. A tiny change to a highly-coupled, frequently-changed file is high risk regardless of diff size. | Medium | Cs_effective formula. Coupling via dependency-cruiser in Milestone 1+. |
| Skill-first, CI-later graduation path | Devs can try it today in Claude Code with zero CI config. Milestone 4 graduates to a GitHub Action using the same Python script. No lock-in to either path. | Low (architectural decision) | Contrast with CodeScene (SaaS-only) and SonarQube (infrastructure overhead). |
| LLM-portable via install-time transform | Works in Claude Code, Cursor, Copilot, Windsurf. The formula is the same Python script. The LLM only handles orchestration and comprehension questions. | Medium | Milestone 2. Enables adoption in non-Claude environments. |
| Trend history per component | `/ed-says:history` shows debt trending over the last N PRs per component. Reveals which components are accumulating knowledge risk over time. | Low (reads state file) | Milestone 2. CodeScene has this; no open-source alternative has it. |
| Per-level comprehension scoring | Milestone 3 adds four epistemic levels: requirements, specification, implementation, validation. A developer can prove understanding at each level independently. This matches how knowledge actually stratifies in teams. | High | Long-term differentiator. Novel; nothing comparable exists. |

---

## Anti-Features

Features to explicitly NOT build. Drawn from research into why comparable tools are disabled.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| LLM in the formula path | Non-determinism is adoption killer #1 for CI tools. If two runs of the same commit produce different scores, developers stop trusting it within days. | Python script computes all scores. LLM only narrates and asks comprehension questions. |
| Blocking merge by default | PR-blocking tools that flag too many false positives get immediately disabled. Research confirms "false positives are the number-one adoption killer." | Report-only by default. Gate mode is opt-in via `.ed-says.yml`. |
| Excessive PR comments / noise | CodeRabbit is criticized for leaving too many comments and "cluttering the GitHub timeline." Copilot's "PR tips" caused immediate backlash when they inserted content without author consent. | One idempotent PR comment, updated in place. Never more than one comment per run. Never modify PR content the author wrote. |
| Hard dependency on enterprise SaaS | CodeScene requires SaaS; SonarQube requires infrastructure. Both have non-trivial adoption friction. | Runs from git + Python with no external service. GitHub token is optional, not required. |
| Opaque scoring | Tools that produce a number without explaining it are dismissed as black boxes. | Per-component breakdown with source attribution (which BF source was used, what confidence). The agent narrative explains the score in plain language. |
| Measuring only historical ownership | git blame tells you who committed, not who understands. CodeScene's "knowledge distribution" has this limitation. | BF is discounted by confidence level to reflect that git exposure is not comprehension. Comprehension testing upgrades confidence to 1.0. |
| Auto-modification of developer artifacts | The GitHub Copilot "PR tips" backlash is the clearest recent signal: developers reject tools that write to their PRs without explicit consent. | Ed Says posts to a dedicated comment thread, never edits PR body or description. Always attributable. |
| Global scoring without component context | A repo-wide debt score is useless. Devs need to know which component is at risk and which files are in it. | Per-component scores with file lists. Overall `totalDebt` is a rollup, always paired with the breakdown. |
| Requiring full test suite or coverage data | Tools that require coverage data to be pre-generated add setup friction that blocks adoption. | No test coverage dependency. Ed Says uses git history and complexity analysis only. |
| Real-time / continuous monitoring | Continuous analysis systems require persistent infrastructure and become noise machines. | On-demand only. Optionally auto-triggered on push via a hook the user opts in to. Never ambient. |

---

## Feature Dependencies

```
Deterministic score (formula) → Per-component breakdown → PR comment → Trend history
Comprehension testing (/ed-says:ask) → Grasp score (Gc) → Adjusted debt in next analyze run
System-aware Cs (fan-in coupling) → requires dependency-cruiser → Milestone 1+
Trend history (/ed-says:history) → requires state persistence → Milestone 2
Per-level scoring (--level flag) → requires Gc per level in state → Milestone 3
GitHub Action CI gate → requires same Python script → Milestone 4 (additive, no rewrite)
```

---

## MVP Recommendation

The Milestone 0 feature set is correct as scoped. Priority order for developer trust:

1. **Deterministic score with per-component breakdown** — without this, nothing else matters
2. **Clear narrative explanation** from ed-says-analyzer.md — score alone is not trusted
3. **Comprehension testing via `/ed-says:ask`** — this is the differentiator that justifies the tool's existence; do not defer it

Defer until Milestone 1+:
- PR comment posting (terminal output is sufficient for dog-fooding)
- Fan-in coupling (complexity without it is still valuable; add in Milestone 1)
- Config editing commands (`/ed-says:config`, `/ed-says:status`)

Do not defer:
- Graceful lizard fallback (must ship in Milestone 0; no fallback = tool breaks on common CI environments)
- Pessimistic BF default (must ship in Milestone 0; silent underestimation is worse than noisy overestimation)

---

## Market Gap Summary

The landscape has:
- Tools that measure complexity (SonarQube, CodeClimate) — no knowledge dimension
- Tools that measure knowledge concentration (CodeScene, git-fame) — no complexity dimension
- Tools that review code for bugs (CodeRabbit, Copilot) — no knowledge dimension
- No tool that measures the product of complexity and knowledge gap
- No tool that tests actual comprehension and credits it against debt

Ed Says fills both gaps. The formula `Ed_risk = Cs_effective × coverage_gap` is novel. The comprehension testing loop is novel. The combination is differentiated.

---

## Sources

- [Comprehension Debt — Addy Osmani, 2026](https://addyosmani.com/blog/comprehension-debt/) — HIGH confidence (official blog)
- [CodeScene Knowledge Distribution Docs](https://codescene.io/docs/guides/social/knowledge-distribution.html) — HIGH confidence (official docs)
- [CodeScene Bus Factor Off-boarding Simulation](https://codescene.io/docs/guides/simulations/offboarding-simulator.html) — HIGH confidence (official docs)
- [Bus Factor Risk Matrix — CodePulse](https://codepulsehq.com/guides/code-hotspots-knowledge-silos) — MEDIUM confidence (vendor guide)
- [State of AI Code Review Tools 2025](https://www.devtoolsacademy.com/blog/state-of-ai-code-review-tools-2025/) — MEDIUM confidence (industry survey)
- [False positives are adoption killer #1](https://www.devtoolsacademy.com/blog/state-of-ai-code-review-tools-2025/) — MEDIUM confidence (multiple sources agree)
- [GitHub Copilot PR tips backlash](https://www.theregister.com/2026/03/30/github_copilot_ads_pull_requests/) — HIGH confidence (The Register, March 2026)
- [SonarQube Quality Gates / Cognitive Complexity](https://docs.sonarsource.com/sonarqube-server/2025.2/quality-standards-administration/managing-quality-gates/introduction-to-quality-gates) — HIGH confidence (official docs)
- [Knowledge Debt in Tech — OpenSauced](https://dev.to/opensauced/the-problem-of-knowledge-debt-in-tech-4hla) — MEDIUM confidence
- [Comprehension Debt concept — multiple 2026 sources](https://medium.com/@addyosmani/comprehension-debt-the-hidden-cost-of-ai-generated-code-285a25dac57e) — HIGH confidence (multiple independent sources)
- [Developer frustration with PR comment noise](https://product.hubspot.com/blog/automated-code-review-the-6-month-evolution) — MEDIUM confidence (HubSpot case study)

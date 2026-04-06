# Ed Says — Epistemic Debt Analyzer

> *"Ed Says your team's knowledge debt is showing."*

Measure how well your team understands the code they ship. Ed Says is a Claude Code skill + GitHub Action that quantifies **epistemic debt** per pull request — the gap between the complexity of code and the team's understanding of it.

## What is Epistemic Debt?

**Epistemic debt** accumulates when code is shipped without genuine understanding. Unlike technical debt (code quality), epistemic debt measures *knowledge quality* — can the people responsible for a component explain, predict, and safely modify it?

```
Ed_risk = Cs_effective × max(0, 1 − BF_effective / N_req)
```

- **Cs_effective** — system-aware complexity: diff complexity amplified by pre-existing file complexity, coupling (fan-in), and churn
- **BF_effective** — confidence-weighted bus factor: proxy count × source confidence (git log = 0.4, CODEOWNERS = 0.7, explicit config = 0.7, LLMJ-verified = 1.0)
- **N_req** — minimum safe coverage (from DDD subdomain classification)

All quantities are in **complexity points (CP)** — a dimensionless index. Severity bands: LOW ≤ 25 CP, MEDIUM ≤ 50 CP, HIGH ≤ 75 CP, CRITICAL > 75 CP.

When bus factor meets the threshold → zero debt. When nobody understands the code → full complexity counts as debt.

## Quick Start

### Claude Code Skill (recommended)

Install the skill into your repo:

```bash
npx ed-says-skill --install --local
```

Then run from Claude Code:

```
/ed-says:analyze --base main
/ed-says:ask auth          # comprehension Q&A → adjusts debt score
/ed-says:status            # show last result without re-running
```

### GitHub Action (Phase 4)

```yaml
name: Epistemic Debt Check
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  ed-says:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: cnantoninor/ed-says@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## How It Works

1. **`/ed-says:analyze` triggered** → reads `.ed-says.yml` (or uses defaults)
2. **Diff parsed** → files grouped by component via glob matching
3. **System-aware complexity** → `lizard` computes `Cs_diff` on added lines; amplified by pre-existing file complexity, fan-in, and churn to get `Cs_effective`
4. **Confidence-weighted bus factor** → derived from CODEOWNERS / git log with a confidence discount; upgraded to 1.0 when LLMJ grasp scores exist
5. **Formula applied** → `Ed_risk = Cs_effective × coverage_gap` per component
6. **Grasp adjustment** → if `/ed-says:ask` was run previously, `Gc` credit reduces `Ed_risk`
7. **Result posted** → PR comment when `GITHUB_TOKEN` is set; terminal output otherwise

## Configuration

Create `.ed-says.yml` in your repo root:

```yaml
version: 1
components:
  - name: "payments"
    paths: ["src/domains/payments/**"]
    subdomain: core
    bus_factor_threshold: 3

  - name: "notifications"
    paths: ["src/services/notifications/**"]
    subdomain: supporting
    bus_factor_threshold: 2
```

See [docs/config-reference.md](docs/config-reference.md) for the full schema.

## Comprehension Levels

Ed Says measures understanding at four levels (Phase 3):

| Level | Signal | Sample Question |
|-------|--------|----------------|
| Requirements | Intent clarity | "What business need does this PR address?" |
| Specification | Design understanding | "What contracts does this PR change?" |
| Implementation | Warrant quality | "Why this approach over alternatives?" |
| Validation | Epistemic closure | "What edge cases would the tests miss?" |

## Roadmap

- **Phase 0** (current): Skill dog-food MVP — `/ed-says:analyze`, `/ed-says:ask`, Python script core
- **Phase 1**: Full skill suite — `init`, `config`, `status` commands; PR comments; state persistence
- **Phase 2**: Installer + packaging — `npx ed-says-skill --install`; multi-LLM support (Cursor, Copilot)
- **Phase 3**: Multi-level scoring — all four epistemic levels; `/ed-says:history` trend view
- **Phase 4**: GitHub Action wrapper — CI graduation; same Python script runs in both contexts

## Development

```bash
git clone https://github.com/cnantoninor/ed-says.git
cd ed-says
npm install
npm run typecheck
npm test
npm run build
```

Requires `lizard` for complexity analysis (falls back to heuristic if unavailable):

```bash
pip install lizard
```

## Formula Reference

See [docs/formula.md](docs/formula.md) for the full mathematical specification and unit table.

## License

MIT

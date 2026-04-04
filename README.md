# Ed Says — Epistemic Debt Analyzer

> *"Ed Says your team's knowledge debt is showing."*

Measure how well your team understands the code they ship. Ed Says is a GitHub Action + CLI that quantifies **epistemic debt** per pull request — the gap between the complexity of code and the team's understanding of it.

## What is Epistemic Debt?

**Epistemic debt** accumulates when code is shipped without genuine understanding. Unlike technical debt (code quality), epistemic debt measures *knowledge quality* — can the people responsible for a component explain, predict, and safely modify it?

```
Ed = Cs(t) × max(0, 1 - BF / N_req)
```

- **Cs(t)** — complexity of the changed code (measured via static analysis)
- **BF** — bus factor (people who understand the component above a threshold)
- **N_req** — minimum safe coverage (from DDD subdomain classification)

When bus factor meets the threshold → zero debt. When nobody understands the code → full complexity counts as debt.

## Quick Start

### GitHub Action

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
      - uses: arau6/ed-says@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### CLI

```bash
npx ed-says analyze --base main
```

## How It Works

1. **PR opened/updated** → Ed Says triggers
2. **Diff parsed** → files grouped by component (from `.ed-says.yml`)
3. **Static analysis** → cognitive complexity computed for changed code
4. **Formula applied** → Ed score per component, weighted by bus factor gap
5. **PR comment posted** → "Ed Says: Epistemic Debt Score: 42 (Architecture: HIGH, Code: LOW)"

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

- **Phase 1** (current): Static complexity analysis + PR comments
- **Phase 2**: CLI mode, debt ledger (time series), coupling analysis
- **Phase 3**: LLMJ comprehension questions + rubric scoring

## Development

```bash
git clone https://github.com/arau6/ed-says.git
cd ed-says
npm install
npm run typecheck
npm test
npm run build
```

## Formula Reference

See [docs/formula.md](docs/formula.md) for the full mathematical specification.

## License

MIT

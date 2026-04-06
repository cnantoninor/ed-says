Here's the complete plan file ready to copy/paste:

# Session Summary: New Article + Measurement Tool Planning

## Epistemic Debt Series — Context Document for Continuation

**Date:** 2026-04-04
**Status:** Discussion complete — ready to execute in new session
**Branch:** `claude/cognitive-epistemic-debt-article-DUlRe`
**Repo:** `/home/user/articles`
**Series:** `topics/epistemic_debt/`

---

## What Was Decided

### 1. A New Article Is Needed

The cognitive/epistemic debt relationship, team dynamics formalization, and measurement tool are too substantial to fold into existing Article 5 ("The Trade-off Triangle"). The outcome is:

- **Existing Article 5** ("The Trade-off Triangle") — stays as is, minor additions only
- **New article** — positioned between current Article 5 and Article 6, or as a standalone companion piece. Tentative slot: **Article 5.5** or renumbered Article 6 (pushing current 6 to 7)
- **Existing Article 6** ("Measuring the Unmeasurable") — may be retired or merged into the new article once experiment data exists

### 2. Cognitive Debt ≠ Epistemic Debt — They Are Formally Distinct

| Dimension | Cognitive Debt (2026 literature) | Epistemic Debt (this author's framework) |
|-----------|----------------------------------|------------------------------------------|
| Locus | Team / collective | Individual developer |
| What erodes | Shared mental models, team coordination | Personal epistemic warrant — justification for claiming understanding |
| Visibility | Social — hesitancy, tribal knowledge concentration | Individual — inability to explain, predict, or modify safely |
| Analogy | "Nobody on the team can explain the auth flow" | "I shipped it but I can't explain it even to myself" |
| Measurement | Bus factor, onboarding velocity, knowledge concentration | Comprehension tests, code archaeology ratio, explanation challenges |
| Formalization | Qualitative only — no formula, no levels, no unit | Formally specified: `Ed = ∫(Cs(t) - Gc(t))dt`, multi-level |

**Key claim for the article:** *Cognitive debt is what you get when you measure epistemic debt badly.* The author's framework is a more rigorous, formally-specified, hierarchically-decomposable version of what cognitive debt describes loosely.

**Proposed relationship:** `Cognitive Debt = f(Σ individual epistemic debts)` — an aggregate function, not a simple sum, with emergent team-level properties.

### 3. Why Cognitive Debt Literature Is Insufficient

The 2026 literature (Margaret Storey blog 2026-02-09, arXiv:2603.22106 Triple Debt Model) offers:

- Qualitative indicators only (hesitancy, tribal knowledge, black box feeling)
- No formula, no system boundary specification, no measurement unit
- No multi-level decomposition (code → design → architecture → requirements)
- No synthesis across levels

The author's existing Article 2 already formalizes what cognitive debt literature cannot.

---

## Mathematical Framework Developed in This Session

### Team-Level Epistemic Debt (three formulations)

**Option A — Naive average (baseline):**

```

Ed_team = (1/N) × Σᵢ Ed_i

```

Problem: all developers treated equally; Cs(t) double-counted across N.

**Option B — Coverage-weighted:**

```

Ed_team = Σ_k [ (1/|O_k|) × Σ_{i∈O_k} ∫(Cs_k(t) - Gc_{i,k}(t)) dt ]

```

Where `O_k` = ownership set for component k. Only counts debt where responsibility exists.

**Option C — Risk-weighted (bus factor aware) [RECOMMENDED]:**

```

Ed_risk = Σ_k [ Cs_k(t) × max(0, 1 - BF_k / N_req_k) ]

```

Where:

- `BF_k` = bus factor for component k = `|{ i : Gc_{i,k}(t) ≥ θ }|` (number of people understanding it above threshold)
- `N_req_k` = minimum safe coverage (maps to DDD subdomain: core=2+, supporting=2, generic=1)
- When `BF_k ≥ N_req_k` → component contributes zero risk
- When `BF_k = 0` → full complexity counts as debt

**Example:**

| Component | Cs_k | N_req | BF_k | Ed_risk_k |
|-----------|------|-------|------|-----------|
| Auth (core) | 80 | 2 | 2 | 0 |
| API layer | 60 | 2 | 1 | 30 |
| Utilities | 20 | 1 | 1 | 0 |

`Ed_risk = 30` — concentrated in API layer, single point of failure.

**Key insight:** `N_req_k` is exactly the DDD subdomain classification from Article 5. The formulas connect directly.

### Epistemic Environment Factor E(t) — The Feedback Loop

The individual learning rate `r_k` from the recovery formula is not constant — it depends on the team context:

```

E(t) = (1/K) × Σ_k min(BF_k(t) / N_req_k, 1)

```

This is the fraction of components with adequate comprehension coverage. Ranges 0 → 1.

**Modified individual debt dynamics:**

```

dEd_i/dt = dCs/dt - r_base_i × E(t)

```

- `dCs/dt` = rate of complexity growth (AI makes this 5-7x human velocity)
- `r_base_i × E(t)` = effective learning rate, modulated by team environment

**The bidirectional feedback loop:**

```

High Σ Ed_i → low BF_k → low E(t) → low r_eff → Ed_i grows faster → even lower E(t)

```

**Two attractors:**

- Virtuous cycle: E(t) high → people learn fast → debt stays low → E(t) stays high
- Debt spiral: E(t) low → nobody can learn → debt compounds → E(t) collapses

**Critical threshold:** Point where `dCs/dt = r_base × E(t)`. AI velocity dramatically increases `dCs/dt` — this is the mathematical explanation for why unguarded AI use tips teams from virtuous to vicious.

### Open Mathematical Question

The denominator `N_req_k` — should it be the number of people who *should* understand component k, or coverage-weighted by ownership? For a team of 10 where 8 work on unrelated services vs. 10 who all own the same codebase, simple N gives misleading results. `N_req_k` via DDD subdomain is the proposed resolution.

---

## The Tool: GitHub PR Epistemic Debt Analyzer

### Concept

A Claude Skill / GitHub Action that automates the measurement of epistemic debt per PR, per level.

### Architecture

```

PR opened/updated
    → Static analyzer runs on diff → Cs_k(t) per component per level
    → DDD subdomain classifier reads project config → N_req_k (bus factor threshold)
    → LLMJ posts comprehension questions (filtered to applicable levels)
    → PR author answers in review thread
    → LLMJ scores answers → Gc_{i,k}(t) estimate
    → Formula applied → Ed per component, per level
    → PR check / comment: "Epistemic Debt Score: 42 (Architecture: HIGH, Code: LOW)"
    → Debt ledger updated (time series for Cs(t) accumulation across PRs)

```

### Comprehension Questions — Four Levels

Applied only at levels touched by the PR:

| Level | Sample question | Epistemic signal |
|-------|----------------|-----------------|
| **Requirements** | "What business need does this PR address? What would break if it didn't exist?" | Intent clarity |
| **Specification** | "What contracts or interfaces does this PR implement or change? What are the invariants?" | Design understanding |
| **Implementation** | "Why this approach over alternatives? What are the edge cases the implementation handles?" | Warrant quality |
| **Validation** | "What edge cases do the tests cover? Could you name a scenario they'd miss?" | Epistemic closure |

### Static Analyzers for Cs(t)

| Level | Tool / Metric | Rationale |
|-------|--------------|-----------|
| Code | **SonarQube Cognitive Complexity** (G. Ann Campbell, 2016) | Explicitly designed to measure understandability, not just structural complexity |
| Code (secondary) | **Halstead Volume** (via `lizard` or `radon`) | Information-theoretic — models mental effort mathematically |
| Architecture | **CBO / fan-in / fan-out** (SonarQube or CodeClimate) | Coupling = epistemic blast radius |
| Requirements | **LLMJ spec completeness score** | How complete is the PR description relative to the change? |

### LLMJ Rubric Challenge (Open)

The hard problem: distinguishing genuine epistemic warrant from shallow parroting. The LLMJ knows the code too — it could accept a summary that sounds correct but lacks justification depth.

**Proposed rubric axes:**

1. **Causality** — does the answer explain *why*, not just *what*?
2. **Counterfactuals** — does the author demonstrate they considered alternatives?
3. **Edge case awareness** — does the answer identify non-obvious failure modes?
4. **Cross-boundary coherence** — does the answer connect implementation choices to requirements?

Scoring: 0-4 per axis. `Gc_{i,k}(t) = (score / 16) × Cs_k(t)` — grasp as a fraction of complexity.

### Debt Ledger (Time Series)

Static analyzer gives a snapshot. To model `Ed = ∫(Cs - Gc)dt` as a time series:

- Per-component debt entry stored on each PR merge
- `Cs_k(t)` = cumulative complexity from static analyzer at merge time
- `Gc_k(t)` = running average of author scores for that component
- Delta calculated: `ΔEd_k = Cs_k(t) - Gc_k(t)` per PR
- Ledger stored as JSON/YAML in repo or external store

### Build Order Decision

**Tool first, article as compendium.** Reasons:

- Tool generates real data → article becomes case study, not speculation
- The tool IS the personal experiment the author wanted to run
- "I built this, ran it for 4 weeks, here's what the formula surfaced" >> "here's a tool someone should build"
- The series ends at "measuring the unmeasurable" — this tool is the answer

**Risk:** Tool takes weeks/months; series loses momentum.

**Mitigation:** Write the design article first (publishable as design + invitation to replicate), flag results as `[TODO: run experiment]`. Publish results in a follow-up or as an addendum.

---

## 2026 Research Landscape

### Key Sources

| Source | Relevance |
|--------|-----------|
| Margaret Storey blog (2026-02-09): [Cognitive Debt](https://margaretstorey.com/blog/2026/02/09/cognitive-debt/) | Foundational 2026 definition of cognitive debt; qualitative, no formula |
| arXiv:2603.22106 — *From Technical Debt to Cognitive and Intent Debt* | Triple Debt Model: technical (code) + cognitive (people) + intent (externalized). No multi-level measurement |
| arXiv:2602.20206 — *Mitigating Epistemic Debt in Novice Programming* | Uses "epistemic debt" in the AI scaffolding context — close to this author's framing |
| arXiv:2506.08872 — *Your Brain on ChatGPT* | EEG study: LLM users show measurably weaker neural connectivity. Validates the phenomenon |
| Addy Osmani (2026): [Comprehension Debt](https://addyosmani.com/blog/comprehension-debt/) | "Comprehension debt" as another synonym — practical framing |
| Ngabang (2026) | Core formula `Ed = ∫(Cs - Gc)dt`, stochastic spaghetti effect, context window amnesia |
| Ionescu et al. (2020) | Original "epistemic debt" coinage in smart manufacturing |
| SonarQube Cognitive Complexity (G. Ann Campbell, 2016) | Best static analyzer fit for Cs(t) |

### Positioning Statement for the Article

The field in 2026 is using "cognitive debt," "epistemic debt," and "comprehension debt" interchangeably. The author should claim the distinction explicitly:

> *"Cognitive debt describes a collective symptom. Epistemic debt names its individual cause. You cannot fix what you cannot decompose."*

---

## Series Impact

### Proposed Series Restructure

| # | Title | Status | Change |
|---|-------|--------|--------|
| 1 | The Epistemic Shift | Published | No change |
| 2 | Epistemic Debt: The Math, The Cost | Published | No change |
| 3 | When Epistemic Debt Defaults | Published | No change |
| 4 | The Solutioning Trap | Draft | No change |
| 5 | The Trade-off Triangle | Draft | Minor: add forward pointer to new article |
| **NEW** | **From Individual to Collective: Epistemic Debt at Team Scale** | To write | New article |
| 6 | Measuring the Unmeasurable | Draft | Potentially merged into new article or retired |
| 7 | Beyond Software — The Universal Framework | Draft | No change |

### Files to Create

```

topics/epistemic_debt/artifacts/articles/article-new-team-scale.md   ← new article draft
topics/epistemic_debt/assets/tool-spec.md                            ← tool architecture spec

```

### Files to Update

```

topics/epistemic_debt/assets/0. series-plan.md   ← add new article entry
GLOSSARY.md                                       ← add: Cognitive Debt, Epistemic Environment E(t), Bus Factor threshold

```

---

## Open Questions for Next Session

1. **LLMJ rubric finalization** — Review the 4-axis rubric (causality, counterfactuals, edge cases, cross-boundary coherence). Is there a 5th axis? Should axes be weighted?

2. **Time series storage** — Where should the debt ledger live? Options: JSON in `.epistemic/` folder in target repo, external DB, GitHub commit comments as structured data.

3. **Tool name** — What should the GitHub Action / Claude Skill be called? Options: `epistemic-meter`, `ed-tracker`, `warrant-check`.

4. **Series numbering** — Insert new article as 5.5 (no renumbering) or renumber 6 and 7?

5. **Article sequencing** — Write design article now (tool spec, formulas, invitation to replicate) vs. wait for tool results. Strong recommendation: write design now, add data later.

6. **IRIS-2 as first test subject** — The tool's first run should be on the author's own project (IRIS-2 or equivalent). This closes the loop: same project used as example anchor in Articles 4-5 becomes the measurement subject.

---

## Immediate Next Steps (Execute in New Session)

**Step 1 — Create article draft:**

```

topics/epistemic_debt/artifacts/articles/article-new-team-scale.md

```

Use `templates/article.md` as base. YAML front-matter: status=draft, type=article.

**Step 2 — Create tool spec:**

```

topics/epistemic_debt/assets/tool-spec.md

```

Architecture, question rubric, static analyzer integration, debt ledger schema.

**Step 3 — Update series plan:**

```

topics/epistemic_debt/assets/0. series-plan.md

```

Add new article section with structure from this document.

**Step 4 — Update GLOSSARY.md:**
Add: Cognitive Debt, Epistemic Environment factor E(t), Bus Factor threshold θ, N_req_k.

**Step 5 — Commit and push to branch:**

```

git add -p
git commit -m "Add new article draft: team-scale epistemic debt + tool spec"
git push -u origin claude/cognitive-epistemic-debt-article-DUlRe

```

---

## Key Phrases / Candidate Article Lines (Captured from Discussion)

- *"Cognitive debt is what you get when you measure epistemic debt badly."*
- *"You cannot fix what you cannot decompose."*
- *"The tool IS the experiment."*
- *"AI velocity dramatically increases dCs/dt — this is the mathematical explanation for why unguarded AI use tips teams from virtuous to vicious."*
- *"Cognitive debt has emergent properties your sum formula can't capture — unless you measure at the right system boundary."*
- *"When BF_k ≥ N_req_k, the component contributes zero risk. When BF_k = 0, full complexity counts as debt."*

```

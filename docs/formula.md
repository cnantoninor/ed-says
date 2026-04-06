# Epistemic Debt Formula Reference

## Individual Component Debt

```
Ed_k = Cs_k(t) × max(0, 1 - Gc_{i,k}(t) / Cs_k(t))
```

Where:
- **Cs_k(t)** = System complexity of component k at time t
- **Gc_{i,k}(t)** = Developer i's grasp/comprehension of component k at time t
- When Gc = Cs → Ed = 0 (full understanding)
- When Gc = 0 → Ed = Cs (zero understanding, maximum debt)

## Risk-Weighted Team Debt (used by Ed Says)

```
Ed_risk = Σ_k [ Cs_k(t) × max(0, 1 - BF_k / N_req_k) ]
```

Where:
- **BF_k** = Bus factor for component k = |{ i : Gc_{i,k}(t) >= θ }|
  - Number of people understanding component k above threshold θ
- **N_req_k** = Minimum safe coverage for component k
  - Derived from DDD subdomain classification:
    - Core domain: N_req >= 2
    - Supporting domain: N_req = 2
    - Generic domain: N_req = 1

### Properties

- When BF_k >= N_req_k → component contributes **zero risk**
- When BF_k = 0 → **full complexity** counts as debt
- Debt concentrates where knowledge gaps intersect with critical components

## Comprehension Grasp (Phase 3 — LLMJ)

```
Gc_{i,k}(t) = (rubric_score / 16) × Cs_k(t)
```

Rubric axes (0-4 each, max total = 16):

| Axis | Measures |
|------|----------|
| Causality | Explains WHY, not just WHAT |
| Counterfactuals | Considered alternatives |
| Edge Case Awareness | Identifies non-obvious failure modes |
| Cross-Boundary Coherence | Connects implementation to requirements |

## Severity Bands

| Score | Severity |
|-------|----------|
| 0-25 | LOW |
| 26-50 | MEDIUM |
| 51-75 | HIGH |
| 76+ | CRITICAL |

## References

- Ngabang (2026): Core formula Ed = ∫(Cs - Gc)dt
- G. Ann Campbell (2016): SonarQube Cognitive Complexity
- Ionescu et al. (2020): Original "epistemic debt" coinage

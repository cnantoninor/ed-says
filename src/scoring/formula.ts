import type { ComponentDebt, Severity } from "../core/types.js";

interface ComponentDebtInput {
  component: string;
  complexity: number; // Cs_k(t)
  busFactor: number; // BF_k — number of people who understand it above threshold
  busFactorThreshold: number; // N_req_k — minimum safe coverage
}

/**
 * Compute epistemic debt for a single component.
 *
 * Ed_risk_k = Cs_k(t) × max(0, 1 - BF_k / N_req_k)
 *
 * When BF_k >= N_req_k → component contributes zero risk.
 * When BF_k = 0 → full complexity counts as debt.
 */
export function computeComponentDebt(input: ComponentDebtInput): ComponentDebt {
  const { component, complexity, busFactor, busFactorThreshold } = input;

  const coverageGap = Math.max(0, 1 - busFactor / busFactorThreshold);
  const debtScore = complexity * coverageGap;
  const severity = classifySeverity(debtScore);

  return {
    component,
    complexity,
    busFactor,
    busFactorThreshold,
    debtScore,
    level: "implementation", // Default for Phase 1; multi-level in Phase 3
    severity,
  };
}

/**
 * Classify a debt score into severity bands.
 */
export function classifySeverity(score: number): Severity {
  if (score <= 25) return "LOW";
  if (score <= 50) return "MEDIUM";
  if (score <= 75) return "HIGH";
  return "CRITICAL";
}

/**
 * Team-level epistemic debt (risk-weighted aggregation).
 *
 * Ed_risk = Σ_k [ Cs_k(t) × max(0, 1 - BF_k / N_req_k) ]
 */
export function computeTeamDebt(components: ComponentDebtInput[]): number {
  return components.reduce((sum, c) => {
    const gap = Math.max(0, 1 - c.busFactor / c.busFactorThreshold);
    return sum + c.complexity * gap;
  }, 0);
}

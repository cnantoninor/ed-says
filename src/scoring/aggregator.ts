import type { ComponentDebt, Severity } from "../core/types.js";
import { classifySeverity } from "./formula.js";

interface ThresholdsConfig {
  levels: {
    requirements: { weight: number; enabled: boolean };
    specification: { weight: number; enabled: boolean };
    implementation: { weight: number; enabled: boolean };
    validation: { weight: number; enabled: boolean };
  };
  severity: {
    low: string;
    medium: string;
    high: string;
    critical: string;
  };
}

interface AggregateResult {
  totalDebt: number;
  severity: Severity;
}

/**
 * Aggregate per-component debt scores into a total PR-level score.
 * Applies level weights from config.
 */
export function aggregateDebt(
  components: ComponentDebt[],
  thresholds: ThresholdsConfig,
): AggregateResult {
  let totalDebt = 0;

  for (const c of components) {
    const levelConfig = thresholds.levels[c.level];
    if (!levelConfig.enabled) continue;

    totalDebt += c.debtScore * levelConfig.weight;
  }

  totalDebt = Math.round(totalDebt * 100) / 100;

  return {
    totalDebt,
    severity: classifySeverity(totalDebt),
  };
}

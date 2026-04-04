// Phase 3: LLMJ rubric for scoring PR author answers

import type { RubricAxisScore } from "../core/types.js";

export type RubricAxis = "causality" | "counterfactuals" | "edge_cases" | "cross_boundary";

export const RUBRIC_AXES: { axis: RubricAxis; label: string; description: string }[] = [
  {
    axis: "causality",
    label: "Causality",
    description: "Does the answer explain WHY, not just WHAT?",
  },
  {
    axis: "counterfactuals",
    label: "Counterfactuals",
    description: "Does the author demonstrate they considered alternatives?",
  },
  {
    axis: "edge_cases",
    label: "Edge Case Awareness",
    description: "Does the answer identify non-obvious failure modes?",
  },
  {
    axis: "cross_boundary",
    label: "Cross-Boundary Coherence",
    description: "Does the answer connect implementation choices to requirements?",
  },
];

/** Max score per axis */
export const MAX_AXIS_SCORE = 4;

/** Max total rubric score (4 axes × 4 max) */
export const MAX_RUBRIC_SCORE = RUBRIC_AXES.length * MAX_AXIS_SCORE;

/**
 * Compute Gc_{i,k}(t) from rubric scores and complexity.
 *
 * Gc_{i,k}(t) = (rubricScore / 16) × Cs_k(t)
 *
 * Where rubricScore is the sum of all axis scores (0-16).
 */
export function computeGrasp(axisScores: RubricAxisScore[], complexity: number): number {
  const totalScore = axisScores.reduce((sum, a) => sum + a.score, 0);
  return (totalScore / MAX_RUBRIC_SCORE) * complexity;
}

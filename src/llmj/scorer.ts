// Phase 3: Score PR author answers against rubric

import type { RubricAxisScore } from "../core/types.js";

export interface ScoringResult {
  axes: RubricAxisScore[];
  totalScore: number;
}

/**
 * Score an author's answer against the 4-axis rubric using LLMJ.
 * Phase 3 implementation — stub for now.
 */
export async function scoreAnswer(
  _question: string,
  _answer: string,
  _patch: string,
): Promise<ScoringResult> {
  // Phase 3: Will use AI SDK generateText with Output.object()
  return {
    axes: [
      { axis: "causality", score: 0, reasoning: "Not yet implemented" },
      { axis: "counterfactuals", score: 0, reasoning: "Not yet implemented" },
      { axis: "edge_cases", score: 0, reasoning: "Not yet implemented" },
      { axis: "cross_boundary", score: 0, reasoning: "Not yet implemented" },
    ],
    totalScore: 0,
  };
}

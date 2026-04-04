// Phase 3: Generate comprehension questions per level

import type { Level, ComponentDiff } from "../core/types.js";

export interface GeneratedQuestion {
  component: string;
  level: Level;
  question: string;
  filePath?: string;
  line?: number;
}

/**
 * Generate comprehension questions for a component at a given level.
 * Phase 3 implementation — stub for now.
 */
export async function generateQuestions(
  _componentDiff: ComponentDiff,
  _level: Level,
  _count: number,
): Promise<GeneratedQuestion[]> {
  // Phase 3: Will use AI SDK generateText with Output.object()
  return [];
}

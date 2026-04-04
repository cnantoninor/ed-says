import type { ComponentDiff } from "../core/types.js";

interface ComplexityConfig {
  engine: string;
  languages: string[];
}

/**
 * Compute cognitive complexity for a component's changed files.
 *
 * Uses a heuristic approach that counts control flow structures
 * and nesting depth in the diff's added lines.
 *
 * Returns Cs_k(t) — the complexity score for the component.
 */
export function computeComplexity(componentDiff: ComponentDiff, config: ComplexityConfig): number {
  let totalComplexity = 0;

  for (const file of componentDiff.files) {
    totalComplexity += computeFileComplexity(file.patch);
  }

  return totalComplexity;
}

/**
 * Heuristic cognitive complexity for a diff patch.
 *
 * Counts complexity-contributing patterns in added lines:
 * - Control flow: if, else, for, while, switch, catch (+1 each)
 * - Nesting: each level of brace nesting adds +1 per control flow
 * - Logical operators: && || (+1 each)
 * - Ternary expressions: ? (+1)
 * - Early returns in nested context (+1)
 */
export function computeFileComplexity(patch: string): number {
  const addedLines = patch
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.slice(1)); // Remove the leading +

  let complexity = 0;
  let nestingDepth = 0;

  const controlFlowPattern =
    /\b(if|else\s+if|else|for|while|do|switch|case|catch|finally)\b/g;
  const logicalOpPattern = /(\&\&|\|\|)/g;
  const ternaryPattern = /\?(?!=)/g; // ? but not ?= or ?.

  for (const line of addedLines) {
    const trimmed = line.trim();

    // Track nesting via braces
    const openBraces = (trimmed.match(/{/g) || []).length;
    const closeBraces = (trimmed.match(/}/g) || []).length;

    // Control flow keywords
    const controlFlowMatches = trimmed.match(controlFlowPattern);
    if (controlFlowMatches) {
      complexity += controlFlowMatches.length * (1 + nestingDepth);
    }

    // Logical operators
    const logicalMatches = trimmed.match(logicalOpPattern);
    if (logicalMatches) {
      complexity += logicalMatches.length;
    }

    // Ternary
    const ternaryMatches = trimmed.match(ternaryPattern);
    if (ternaryMatches) {
      complexity += ternaryMatches.length;
    }

    nestingDepth += openBraces - closeBraces;
    if (nestingDepth < 0) nestingDepth = 0;
  }

  return complexity;
}

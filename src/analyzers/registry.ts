import type { ComponentDiff, Level } from "../core/types.js";

export interface Analyzer {
  level: Level;
  name: string;
  compute(componentDiff: ComponentDiff, config: unknown): number;
}

const analyzers: Analyzer[] = [];

export function registerAnalyzer(analyzer: Analyzer): void {
  analyzers.push(analyzer);
}

export function getAnalyzersForLevel(level: Level): Analyzer[] {
  return analyzers.filter((a) => a.level === level);
}

export function getAllAnalyzers(): Analyzer[] {
  return [...analyzers];
}

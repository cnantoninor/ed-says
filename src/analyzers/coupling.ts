// Phase 2: Fan-in/fan-out coupling analysis for Architecture level
// Will compute CBO (Coupling Between Objects) from import/export analysis

import type { ComponentDiff } from "../core/types.js";

export interface CouplingResult {
  component: string;
  fanIn: number;
  fanOut: number;
  cbo: number;
}

export function computeCoupling(_componentDiff: ComponentDiff): CouplingResult {
  // Phase 2 stub
  return {
    component: _componentDiff.component,
    fanIn: 0,
    fanOut: 0,
    cbo: 0,
  };
}

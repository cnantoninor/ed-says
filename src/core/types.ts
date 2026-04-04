import type { z } from "zod";
import type { configSchema } from "./config.js";

/** The four epistemic levels at which debt is measured */
export type Level = "requirements" | "specification" | "implementation" | "validation";

export const LEVELS: Level[] = ["requirements", "specification", "implementation", "validation"];

/** DDD subdomain classification — drives N_req_k defaults */
export type Subdomain = "core" | "supporting" | "generic";

/** Default bus factor thresholds per subdomain */
export const SUBDOMAIN_DEFAULTS: Record<Subdomain, number> = {
  core: 2,
  supporting: 2,
  generic: 1,
};

/** A component as defined in .ed-says.yml */
export interface Component {
  name: string;
  paths: string[];
  subdomain: Subdomain;
  busFactor: number; // BF_k — current bus factor (known people who understand it)
  busFactorThreshold: number; // N_req_k — minimum safe coverage
  owners?: string[];
}

/** Static complexity score for a component at a given level */
export interface ComplexityScore {
  component: string;
  level: Level;
  score: number; // Cs_k(t)
  details?: Record<string, number>; // e.g. { cognitiveComplexity: 12, halsteadVolume: 340 }
}

/** Comprehension grasp score from LLMJ (Phase 3) */
export interface GraspScore {
  component: string;
  level: Level;
  score: number; // Gc_{i,k}(t) = (rubricScore / 16) × Cs_k(t)
  rubricAxes: RubricAxisScore[];
}

/** Score on a single rubric axis (0-4) */
export interface RubricAxisScore {
  axis: "causality" | "counterfactuals" | "edge_cases" | "cross_boundary";
  score: number; // 0-4
  reasoning: string;
}

/** Epistemic debt for a single component */
export interface ComponentDebt {
  component: string;
  complexity: number; // Cs_k(t)
  busFactor: number; // BF_k
  busFactorThreshold: number; // N_req_k
  debtScore: number; // Cs_k(t) × max(0, 1 - BF_k / N_req_k)
  level: Level;
  severity: Severity;
}

/** Severity bands */
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Aggregated result for the entire PR */
export interface PipelineResult {
  totalDebt: number;
  severity: Severity;
  components: ComponentDebt[];
  summary: string; // Human-readable summary for PR comment
  timestamp: string; // ISO 8601
}

/** Files changed in a PR, grouped by component */
export interface ComponentDiff {
  component: string;
  files: FileDiff[];
}

/** A single file's diff */
export interface FileDiff {
  path: string;
  additions: number;
  deletions: number;
  patch: string;
}

/** Fully resolved config */
export type EdSaysConfig = z.infer<typeof configSchema>;

/** Analysis mode */
export type AnalysisMode = "static-only" | "full";

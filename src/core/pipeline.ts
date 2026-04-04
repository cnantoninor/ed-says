import type {
  AnalysisMode,
  ComponentDebt,
  ComponentDiff,
  EdSaysConfig,
  PipelineResult,
} from "./types.js";
import { parseDiff } from "../analyzers/diff-parser.js";
import { computeComplexity } from "../analyzers/complexity.js";
import { computeComponentDebt, classifySeverity } from "../scoring/formula.js";
import { aggregateDebt } from "../scoring/aggregator.js";
import { formatSummary } from "../github/comment.js";

export interface PipelineInput {
  diff: string;
  config: EdSaysConfig;
  mode: AnalysisMode;
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const { diff, config, mode } = input;

  // Step 1: Parse diff into component groups
  const componentDiffs = parseDiff(diff, config.components);

  // Step 2: Compute complexity per component
  const componentDebts: ComponentDebt[] = [];

  for (const cd of componentDiffs) {
    const componentConfig = config.components.find((c) => c.name === cd.component);
    if (!componentConfig) continue;

    const complexity = computeComplexity(cd, config.analyzers.complexity);

    const debt = computeComponentDebt({
      component: cd.component,
      complexity,
      busFactor: componentConfig.bus_factor_threshold, // Default: assume BF = threshold (no debt)
      busFactorThreshold: componentConfig.bus_factor_threshold,
    });

    componentDebts.push(debt);
  }

  // Step 3: Aggregate
  const { totalDebt, severity } = aggregateDebt(componentDebts, config.thresholds);

  // Step 4: Format summary
  const summary = formatSummary(componentDebts, totalDebt, severity);

  return {
    totalDebt,
    severity,
    components: componentDebts,
    summary,
    timestamp: new Date().toISOString(),
  };
}

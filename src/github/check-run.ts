// Phase 2: Create/update GitHub Check Run with debt summary

import type { Octokit, PRContext } from "./client.js";
import type { PipelineResult } from "../core/types.js";

/**
 * Create a Check Run with the Ed Says debt report.
 * Phase 2 implementation — stub for now.
 */
export async function createCheckRun(
  _octokit: Octokit,
  _ctx: PRContext,
  _result: PipelineResult,
  _failThreshold: number,
): Promise<void> {
  // Phase 2: Will use octokit.rest.checks.create
}

import * as core from "@actions/core";
import { loadConfig } from "./core/config.js";
import { runPipeline } from "./core/pipeline.js";
import { createClient, fetchPRDiff } from "./github/client.js";
import { postOrUpdateComment } from "./github/comment.js";
import { setActionMode } from "./utils/logger.js";
import type { AnalysisMode } from "./core/types.js";

async function run(): Promise<void> {
  setActionMode(true);

  try {
    // Read inputs
    const token = core.getInput("github-token", { required: true });
    const configPath = core.getInput("config-path") || ".ed-says.yml";
    const mode = (core.getInput("mode") || "static-only") as AnalysisMode;
    const failThreshold = parseInt(core.getInput("fail-threshold") || "0", 10);

    // Load config
    const config = await loadConfig(configPath);

    // Create GitHub client
    const { octokit, context } = createClient(token);

    // Fetch PR diff
    const diff = await fetchPRDiff(octokit, context);

    // Run analysis pipeline
    const result = await runPipeline({ diff, config, mode });

    // Post PR comment
    if (config.output.comment) {
      await postOrUpdateComment(octokit, context, result.summary);
    }

    // Set outputs
    core.setOutput("debt-score", result.totalDebt.toString());
    core.setOutput("report-json", JSON.stringify(result));
    core.setOutput("debt-level", result.severity);

    // Fail if threshold exceeded
    if (failThreshold > 0 && result.totalDebt > failThreshold) {
      core.setFailed(
        `Ed Says: Epistemic debt score ${result.totalDebt} exceeds threshold ${failThreshold}`,
      );
    }
  } catch (err) {
    core.setFailed(err instanceof Error ? err.message : String(err));
  }
}

run();

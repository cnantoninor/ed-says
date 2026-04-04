import { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "./core/config.js";
import { runPipeline } from "./core/pipeline.js";
import { setActionMode } from "./utils/logger.js";
import { execSync } from "node:child_process";
import type { AnalysisMode } from "./core/types.js";

export function createCli(): Command {
  const program = new Command();

  program
    .name("ed-says")
    .description("Ed Says — Epistemic Debt Analyzer for your PRs and codebase")
    .version("0.1.0");

  program
    .command("analyze")
    .description("Analyze current branch diff against base")
    .option("-c, --config <path>", "Path to .ed-says.yml config", ".ed-says.yml")
    .option("-b, --base <ref>", "Base branch/ref for diff", "main")
    .option("--mode <mode>", "Analysis mode: static-only | full", "static-only")
    .option("--format <type>", "Output format: text | json | markdown", "text")
    .action(async (options) => {
      setActionMode(false);

      const config = await loadConfig(options.config);

      // Get diff from git
      const diff = execSync(`git diff ${options.base}...HEAD`, { encoding: "utf-8" });

      if (!diff.trim()) {
        console.log(chalk.yellow("No changes detected against base branch."));
        return;
      }

      const result = await runPipeline({
        diff,
        config,
        mode: options.mode as AnalysisMode,
      });

      if (options.format === "json") {
        console.log(JSON.stringify(result, null, 2));
      } else if (options.format === "markdown") {
        console.log(result.summary);
      } else {
        printTextReport(result);
      }
    });

  program
    .command("init")
    .description("Create a starter .ed-says.yml config")
    .action(() => {
      console.log(chalk.green("Creating .ed-says.yml..."));
      console.log(chalk.dim("(Not yet implemented — copy from the repo template)"));
    });

  return program;
}

function printTextReport(result: import("./core/types.js").PipelineResult): void {
  const severityColor = {
    LOW: chalk.green,
    MEDIUM: chalk.yellow,
    HIGH: chalk.hex("#FFA500"),
    CRITICAL: chalk.red,
  };

  console.log();
  console.log(
    chalk.bold(`Ed Says: Epistemic Debt Score: ${result.totalDebt}`),
    severityColor[result.severity](`(${result.severity})`),
  );
  console.log();

  if (result.components.length === 0) {
    console.log(chalk.dim("No components matched. Configure .ed-says.yml."));
    return;
  }

  for (const c of result.components) {
    const color = severityColor[c.severity];
    console.log(
      `  ${chalk.bold(c.component)}: complexity=${c.complexity} BF=${c.busFactor}/${c.busFactorThreshold} debt=${color(String(c.debtScore))}`,
    );
  }

  console.log();
}

import type { ComponentDebt, Severity } from "../core/types.js";
import type { Octokit, PRContext } from "./client.js";

const COMMENT_MARKER = "<!-- ed-says-report -->";

/**
 * Format the debt report as a PR comment body.
 */
export function formatSummary(
  components: ComponentDebt[],
  totalDebt: number,
  severity: Severity,
): string {
  const emoji = severityEmoji(severity);
  const lines: string[] = [
    COMMENT_MARKER,
    "",
    `## ${emoji} Ed Says: Epistemic Debt Score: ${totalDebt} (${severity})`,
    "",
  ];

  if (components.length === 0) {
    lines.push("No components matched the changed files. Configure `.ed-says.yml` to map paths to components.");
    return lines.join("\n");
  }

  lines.push("| Component | Complexity | Bus Factor | Threshold | Debt | Severity |");
  lines.push("|-----------|-----------|------------|-----------|------|----------|");

  for (const c of components) {
    lines.push(
      `| ${c.component} | ${c.complexity} | ${c.busFactor} | ${c.busFactorThreshold} | ${c.debtScore} | ${severityEmoji(c.severity)} ${c.severity} |`,
    );
  }

  lines.push("");
  lines.push("<details>");
  lines.push("<summary>What is this?</summary>");
  lines.push("");
  lines.push("**Epistemic Debt** measures how well your team understands the code being changed.");
  lines.push("");
  lines.push("Formula: `Ed = Cs(t) × max(0, 1 - BF / N_req)`");
  lines.push("");
  lines.push("- **Cs(t)** = complexity of the changed code");
  lines.push("- **BF** = bus factor (people who understand the component)");
  lines.push("- **N_req** = minimum safe coverage (from DDD subdomain classification)");
  lines.push("");
  lines.push("Configure in `.ed-says.yml` · [Learn more](https://github.com/arau6/ed-says)");
  lines.push("</details>");

  return lines.join("\n");
}

/**
 * Post or update the Ed Says comment on a PR.
 * Finds existing comment by marker to avoid duplicates.
 */
export async function postOrUpdateComment(
  octokit: Octokit,
  ctx: PRContext,
  body: string,
): Promise<void> {
  const { data: comments } = await octokit.rest.issues.listComments({
    owner: ctx.owner,
    repo: ctx.repo,
    issue_number: ctx.pullNumber,
  });

  const existing = comments.find((c) => c.body?.includes(COMMENT_MARKER));

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner: ctx.owner,
      repo: ctx.repo,
      comment_id: existing.id,
      body,
    });
  } else {
    await octokit.rest.issues.createComment({
      owner: ctx.owner,
      repo: ctx.repo,
      issue_number: ctx.pullNumber,
      body,
    });
  }
}

function severityEmoji(severity: Severity): string {
  switch (severity) {
    case "LOW":
      return "🟢";
    case "MEDIUM":
      return "🟡";
    case "HIGH":
      return "🟠";
    case "CRITICAL":
      return "🔴";
  }
}

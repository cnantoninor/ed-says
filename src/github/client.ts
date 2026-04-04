import * as github from "@actions/github";

export type Octokit = ReturnType<typeof github.getOctokit>;

export interface PRContext {
  owner: string;
  repo: string;
  pullNumber: number;
  sha: string;
}

/**
 * Create an authenticated Octokit client and extract PR context.
 */
export function createClient(token: string): { octokit: Octokit; context: PRContext } {
  const octokit = github.getOctokit(token);

  const { owner, repo } = github.context.repo;
  const pullNumber = github.context.payload.pull_request?.number;

  if (!pullNumber) {
    throw new Error("Ed Says must run on a pull_request event");
  }

  return {
    octokit,
    context: {
      owner,
      repo,
      pullNumber,
      sha: github.context.sha,
    },
  };
}

/**
 * Fetch the diff for a PR.
 */
export async function fetchPRDiff(octokit: Octokit, ctx: PRContext): Promise<string> {
  const { data } = await octokit.rest.pulls.get({
    owner: ctx.owner,
    repo: ctx.repo,
    pull_number: ctx.pullNumber,
    mediaType: { format: "diff" },
  });

  // When using diff media type, data is a string
  return data as unknown as string;
}

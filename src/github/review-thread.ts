// Phase 3: Post comprehension questions as review comments on specific files

import type { Octokit, PRContext } from "./client.js";

/**
 * Post a review comment (question) on a specific file in a PR.
 * Phase 3 implementation — stub for now.
 */
export async function postReviewQuestion(
  _octokit: Octokit,
  _ctx: PRContext,
  _filePath: string,
  _question: string,
  _line: number,
): Promise<void> {
  // Phase 3: Will create a PR review with inline comments
  // using octokit.rest.pulls.createReview
}

/**
 * Read replies to review comments (author answers).
 * Phase 3 implementation — stub for now.
 */
export async function readReviewReplies(
  _octokit: Octokit,
  _ctx: PRContext,
  _commentId: number,
): Promise<string[]> {
  // Phase 3: Will fetch review comment replies
  return [];
}

// src/worker.ts
import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { redisConnection } from './queue';
import { parseAndFilterDiff } from './diffParser';
import { analyzeCodeDiff } from './aiEngine';

const MAX_REVIEWABLE_FILES = 100;

/**
 * Automates publishing the final markdown review onto the GitHub Pull Request interface
 */
async function postGitHubReview(
  owner: string,
  repo: string,
  prNumber: number,
  reviewBody: string
): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn('⚠️  [GitHub API] Missing GITHUB_TOKEN in environment. Skipping API post.');
    return;
  }

  // Target endpoint according to Section 3.5 of the PRD
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;

  console.log(`✉️  [GitHub API] Submitting comprehensive review to PR #${prNumber}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      body: reviewBody,
      event: 'COMMENT' // Submits findings cleanly as a global review block
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API posting failed with status ${response.status}: ${errorText}`);
  }

  console.log(`🎉 [GitHub API] Automated AI feedback posted successfully on PR #${prNumber}!`);
}

const worker = new Worker(
  'pr-review-queue',
  async (job: Job) => {
    const { prNumber, repoOwner, repoName, diffUrl } = job.data;
    
    console.log(`\n⚙️  [Worker] Processing PR #${prNumber} for ${repoOwner}/${repoName}`);

    try {
      // 1. Fetch raw diff from GitHub payload
      const response = await fetch(diffUrl);
      if (!response.ok) throw new Error(`Failed to fetch diff. Status: ${response.status}`);
      const rawDiffText = await response.text();

      // 2. Parse down to clean, token-minimized code contexts
      const targetedFiles = parseAndFilterDiff(rawDiffText);
      console.log(`📊 [Worker] Target structural files identified: ${targetedFiles.length}`);

      if (targetedFiles.length > MAX_REVIEWABLE_FILES) {
        console.warn(`🛑 [Worker] PR files exceed max limit. Triaging early exit summary message.`);
        await postGitHubReview(
          repoOwner,
          repoName,
          prNumber,
          `🛑 **Automated Review Ignored**: This PR changes ${targetedFiles.length} files. To optimize review quality, please break your modifications into smaller atomic pull requests.`
        );
        return;
      }

      if (targetedFiles.length === 0) {
        console.log(`⏩ [Worker] No reviewable code files found after applying exclusion masks.`);
        return;
      }

      // 3. Dispatch directly to Gemini Core
      const reviewResultMarkdown = await analyzeCodeDiff(targetedFiles);
      
      // 4. Publish findings directly back onto the GitHub Pull Request UI
      await postGitHubReview(repoOwner, repoName, prNumber, reviewResultMarkdown);

    } catch (error: any) {
      console.error(`❌ [Worker] Processing error encountered: ${error.message}`);
      throw error; // Retries automatically via BullMQ
    }
  },
  {
    connection: redisConnection,
    concurrency: 1
  }
);

console.log('跑 Background Worker Engine running and waiting for jobs...');
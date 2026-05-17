// src/worker.ts
import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { redisConnection } from './queue';
import { parseAndFilterDiff } from './diffParser';
import { analyzeCodeDiff } from './aiEngine'; // Import AI engine

const MAX_REVIEWABLE_FILES = 100;

const worker = new Worker(
  'pr-review-queue',
  async (job: Job) => {
    const { prNumber, repoOwner, repoName, diffUrl } = job.data;
    
    console.log(`\n⚙️  [Worker] Processing PR #${prNumber} for ${repoOwner}/${repoName}`);

    try {
      // 1. Fetch raw diff from GitHub endpoint
      const response = await fetch(diffUrl);
      if (!response.ok) throw new Error(`Failed to fetch diff. Status: ${response.status}`);
      const rawDiffText = await response.text();

      // 2. Parse down to token-optimized code changes
      const targetedFiles = parseAndFilterDiff(rawDiffText);
      console.log(`📊 [Worker] Target structural files identified: ${targetedFiles.length}`);

      if (targetedFiles.length > MAX_REVIEWABLE_FILES) {
        console.warn(`🛑 [Worker] PR files exceed max limit.`);
        return;
      }

      // 3. Dispatch directly to Gemini Core
      const reviewResultMarkdown = await analyzeCodeDiff(targetedFiles);
      
      console.log(`\n🤖 [Worker] --- CRITIQUE OUTPUT FOR PR #${prNumber} ---`);
      console.log(reviewResultMarkdown);
      console.log(`---------------------------------------------------\n`);

      // TODO: Phase 5 will use the GitHub REST API to post this markdown output directly to the PR!

    } catch (error: any) {
      console.error(`❌ [Worker] Processing error encountered: ${error.message}`);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 1
  }
);

console.log('🏃‍♂️ Background Worker Engine running and waiting for jobs...');
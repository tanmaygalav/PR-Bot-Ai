// src/worker.ts
import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { redisConnection } from './queue';
import { parseAndFilterDiff } from './diffParser';

const MAX_REVIEWABLE_FILES = 100;

const worker = new Worker(
  'pr-review-queue',
  async (job: Job) => {
    const { prNumber, repoOwner, repoName, diffUrl } = job.data;
    
    console.log(`\n⚙️  [Worker] Processing PR #${prNumber} for ${repoOwner}/${repoName}`);

    try {
      // 1. Fetch the raw cryptographic diff file streaming straight from GitHub
      console.log(`📥 [Worker] Fetching raw diff contents from: ${diffUrl}`);
      const response = await fetch(diffUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch diff file from GitHub. Status: ${response.status}`);
      }
      
      const rawDiffText = await response.text();

      // 2. Parse and scrub the diff down to actionable code context tokens
      const targetedFiles = parseAndFilterDiff(rawDiffText);
      console.log(`📊 [Worker] Filtered down to ${targetedFiles.length} structural files for review.`);

      // 3. Edge Case Mitigation Matrix check (Section 6)
      if (targetedFiles.length > MAX_REVIEWABLE_FILES) {
        console.warn(`🛑 [Worker] PR contains ${targetedFiles.length} files, exceeding safe processing ceiling.`);
        // TODO: Trigger early exit mitigation flow and post a singular summary message to GitHub
        return;
      }

      // Print a structural trace of what we're about to forward into the AI Core
      for (const file of targetedFiles) {
        console.log(`   🔸 Ready to analyze: ${file.fileName} (${file.diffContent.split('\n').length} lines of changes)`);
      }

      // TODO: Phase 4 will dispatch 'targetedFiles' cleanly into the Generative AI Client matrix right here!

    } catch (error: any) {
      console.error(`❌ [Worker] Error compiling context block data: ${error.message}`);
      throw error; // Propagates failure to trigger BullMQ exponential retry protocols
    }
  },
  {
    connection: redisConnection,
    concurrency: 1
  }
);

worker.on('failed', (job, err) => {
  console.error(`🚨 [Worker] Job ${job?.id} hard-failed: ${err.message}`);
});

console.log('跑 Background Worker Engine running and waiting for jobs...');
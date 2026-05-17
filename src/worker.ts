// src/worker.ts
import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import { redisConnection } from './queue';

const worker = new Worker(
  'pr-review-queue',
  async (job: Job) => {
    const { prNumber, repoOwner, repoName, diffUrl } = job.data;
    
    console.log(`\n⚙️  [Worker] Picked up job ${job.id}: Processing PR #${prNumber} for ${repoOwner}/${repoName}`);
    console.log(`🔗 [Worker] Target Diff URL: ${diffUrl}`);
    
    // Fake a 3-second heavy workload (we will replace this with the AI engine in Phase 4)
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    console.log(`✅ [Worker] Finished processing job ${job.id}!`);
  },
  {
    connection: redisConnection,
    concurrency: 1 // Rule 3.2: Only process 1 PR at a time to stay within free tier limits
  }
);

worker.on('failed', (job, err) => {
  console.error(`🚨 [Worker] Job ${job?.id} failed with error: ${err.message}`);
});

console.log('🏃‍♂️ Background Worker Engine running and waiting for jobs...');
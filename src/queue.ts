// src/queue.ts
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Connect directly to the Docker Redis container on port 6379
export const redisConnection = new IORedis({
  host: '127.0.0.1',
  port: 6379,
  maxRetriesPerRequest: null // Required setting for BullMQ compatibility
});

// Create our named queue channel
export const prReviewQueue = new Queue('pr-review-queue', {
  connection: redisConnection
});

console.log('📦 BullMQ Queue channel initialized and linked to Redis.');
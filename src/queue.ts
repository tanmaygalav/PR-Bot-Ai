// src/queue.ts
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let url = process.env.REDIS_URL;

// Auto-Correct Protocol Scheme:
if (url && url.startsWith('redis://') && !url.includes('127.0.0.1') && !url.includes('localhost')) {
  url = url.replace('redis://', 'rediss://');
}

// Automatically connect using the Cloud Redis connection URL if available
// Otherwise, fall back to your local machine defaults
export const redisConnection = url
  ? new IORedis(url, {
      maxRetriesPerRequest: null, // Required setting for BullMQ compatibility
    })
  : new IORedis({
      host: '127.0.0.1',
      port: 6379,
      maxRetriesPerRequest: null, // Required setting for BullMQ compatibility
    });

// Create our named queue channel
export const prReviewQueue = new Queue('pr-review-queue', {
  connection: redisConnection
});

console.log('📦 BullMQ Queue channel initialized and linked to Redis.');

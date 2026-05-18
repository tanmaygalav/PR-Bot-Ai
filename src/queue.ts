// src/queue.ts
import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Automatically connect using the Cloud Redis connection URL if available
// Otherwise, fall back to your local machine defaults
export const redisConnection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, {
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

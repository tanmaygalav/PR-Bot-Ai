// src/app.ts
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { prReviewQueue } from './queue'; // Import our new queue config

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'super_secret_token';

app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

const verifyGitHubSignature = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature) return res.status(401).send('Mismatched or missing signature.');

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = Buffer.from('sha256=' + hmac.update((req as any).rawBody).digest('hex'), 'utf8');
  const checksum = Buffer.from(signature, 'utf8');

  if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
    return res.status(401).send('Request signature is invalid.');
  }
  next();
};

app.post('/webhooks/github', verifyGitHubSignature, async (req: Request, res: Response) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  // Rule 3.1: Immediate Handshake (Instantly reply 200 OK to GitHub under 200ms)
  res.status(200).json({ received: true });

  if (event === 'pull_request') {
    const { action, number, pull_request, repository } = payload;
    
    if (action === 'opened' || action === 'synchronize') {
      // Offload data straight to Redis memory queue
      await prReviewQueue.add(`pr-${number}-${action}`, {
        prNumber: number,
        repoOwner: repository.owner.login,
        repoName: repository.name,
        diffUrl: pull_request.diff_url
      });
      
      console.log(`📥 [Server] PR #${number} safely pushed into Redis queue. Connection freed!`);
    }
  }
});

app.listen(PORT, () => {
  console.log(`🤖 PR-Bot AI server listening securely on port ${PORT}`);
});
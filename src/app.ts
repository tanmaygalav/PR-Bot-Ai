// src/app.ts
import express, { Request, Response } from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'super_secret_token';

// Crucial: We need the raw body to validate the crypto signature accurately
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Verification Middleware
const verifyGitHubSignature = (req: Request, res: Response, next: Function) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  
  if (!signature) {
    return res.status(401).send('Mismatched or missing signature.');
  }

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = Buffer.from('sha256=' + hmac.update((req as any).rawBody).digest('hex'), 'utf8');
  const checksum = Buffer.from(signature, 'utf8');

  if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
    return res.status(401).send('Request signature is invalid.');
  }

  next();
};

// Webhook Endpoint
app.post('/webhooks/github', verifyGitHubSignature, (req: Request, res: Response) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  // Rule 3.1: Immediate Handshake (Under 200ms)
  res.status(200).json({ received: true });

  // Handle only specific pull request actions
  if (event === 'pull_request') {
    const { action, number, pull_request } = payload;
    
    if (action === 'opened' || action === 'synchronize') {
      console.log(`🚀 PR #${number} updated or opened. Offloading to memory queue...`);
      // TODO: Phase 2 will push 'payload' data straight to BullMQ right here!
    }
  }
});

app.listen(PORT, () => {
  console.log(`🤖 PR-Bot AI server listening securely on port ${PORT}`);
});
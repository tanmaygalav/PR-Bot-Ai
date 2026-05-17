# 🤖 PR-Bot AI: Automated GitHub PR Assistant

[![Architecture: Asynchronous Worker Queue](https://img.shields.io/badge/Architecture-Asynchronous%20Worker%20Queue-blueviolet?style=for-the-badge)](https://github.com)
[![Engine: Gemini 2.5 Flash](https://img.shields.io/badge/Engine-Gemini%202.5%20Flash-blue?style=for-the-badge)](https://ai.google.dev/)
[![Queue System: BullMQ + Redis](https://img.shields.io/badge/Queue-BullMQ%20%2B%20Redis-red?style=for-the-badge)](https://bullmq.io/)

PR-Bot AI is an enterprise-grade repository assistant built to optimize code review workflows. It intercepts GitHub Pull Request lifecycle events instantly, sanitizes and optimizes modified source chunks, and leverages cost-efficient Generative AI to leave targeted, line-by-line structural critiques directly inside the GitHub Pull Request interface.

---

## 🎯 The "Recruiter Hook" Value Proposition

Most portfolio AI applications are built as basic, synchronous wrappers around an API endpoint. Under high production loads or concurrent development workflows, these fragile platforms crash due to webhook timeouts (GitHub enforces a strict 10-second response window) or prompt rate limit exhaustion (HTTP 429). 

**PR-Bot AI solves this via architectural isolation.** By decoupling the public webhook ingress from the actual processing engine using a **Redis-backed distributed message queue (BullMQ)**, the application guarantees:
* **Immediate 200 OK Handshakes:** Incoming event tracking executes in **< 100ms**, long before processing begins.
* **Controlled Rate Consumption:** Strictly throttles outbound calls to match the Free Tier API rate boundaries of AI providers.
* **Fault-Tolerant Retries:** Built-in exponential backoff mitigation protects against upstream down-times without loss of computational tasks.

---

## 🏗️ System Architecture & Data Flow

```text
[ GitHub Webhook Event ] 
           │
           ▼ (Immediate Validation & Cryptographic Signature Check)
[ Express/TypeScript Server ] 
           │
           ▼ (Offloads Job Details to Memory Pipeline)
[ Redis Cache Layer / BullMQ Distributed Queue ]
           │
           ▼ (Regulated Throttled Extraction - Concurrency: 1)
[ Background Worker Engine ] ───────► [ Git Diff Parser Core ]
           │                                      │
           │ (Passes Token-Minimized Diff)        ▼ (Aggressive Optimization Mask)
           │                                 Discards: Binary assets, lockfiles,
           ▼                                           and local build artifacts
[ Google Gemini 2.5 Flash ] 
           │
           ▼ (Compiles Strict Markdown Critiques)
[ GitHub REST API: Reviews & Comments ]
```

---

## ⚙️ Technical Stack Matrix

| Layer | Recommended Technology | Architectural Justification |
| :--- | :--- | :--- |
| **Runtime Environment** | Node.js (TypeScript) | High performance asynchronous event-driven I/O engine matching native event loop constructs. |
| **Backend Framework** | Express | Lightweight routing layer keeping ingress processing overhead highly efficient. |
| **Task Queue Manager** | Redis + BullMQ | Industry-standard distributed state store providing bulletproof atomic transactions and worker state monitoring. |
| **Primary AI Core** | Google Gen AI SDK (`gemini-2.5-flash`) | Rapid token analysis, massive context limits, and an efficient free-tier allocation model. |
| **Development Tunnel** | ngrok / localtunnel | Creates cryptographic public HTTPS routing down to localhost during iteration. |

---

## 📂 Project Directory Structure

```text
pr-bot-ai/
├── src/
│   ├── app.ts            # Secure HTTP webhook listener, HMAC verification, entry gate
│   ├── queue.ts          # Centralized Redis connection instance & BullMQ registration
│   ├── worker.ts         # Asynchronous worker processing loop & GitHub feedback engine
│   ├── diffParser.ts     # Computational filter dropping lockfiles, media, and artifacts
│   └── aiEngine.ts       # Low-temperature Gemini client handling system role instructions
├── .env                  # Controlled local process memory environment variables
├── tsconfig.json         # Highly optimized TypeScript compiler engine configurations
├── package.json          # Dependency trees, package locking, and runtime launch scripts
└── README.md             # Systems documentation handbook
```

---

## 🔧 Installation & Environmental Configuration

### 1. Prerequisites
Ensure you have the following environments available on your local system:
* Node.js (v18.x or higher)
* Docker Desktop (For spinning up Redis effortlessly)
* ngrok account (For exposing local hooks to GitHub)

### 2. Clone and Dependency Initialization
```bash
git clone https://github.com/your-username/pr-bot-ai.git
cd pr-bot-ai
npm install
```

### 3. Spin Up the Redis Backbone
Launch a background Redis container using standard port mappings (6379):
```bash
docker run --name pr-bot-redis -p 6379:6379 -d redis
```
Verify the health of your cache engine:
```bash
docker exec -it pr-bot-redis redis-cli ping
# Expect: PONG
```

### 4. Setup Local Environments (.env)
Create an `.env` file at the root level of your project and configure the cryptographic keys:
```env
PORT=3000
GITHUB_WEBHOOK_SECRET=super_secret_token
GEMINI_API_KEY=your_google_ai_studio_api_key_here
GITHUB_TOKEN=your_github_fine_grained_personal_access_token
```

---

## 🔒 Security Configuration Standards

To mirror real-world production configurations, this assistant enforces two strict security perimeters:
1. **HMAC SHA-256 Webhook Verification:** The Express framework (`src/app.ts`) captures the raw incoming body buffer to calculate a verification hash matching the `X-Hub-Signature-256` header. Requests generated from unauthorized vectors are terminated instantly with an `HTTP 401 Unauthorized` block.
2. **No Plaintext Token Persistence:** No security parameters or access tokens flow into persistent tables or log files. All values are held isolated within localized system runtime environments (`process.env`).

---

## 🤖 Prompt Engineering & Critique Strategy

The core AI engine (`src/aiEngine.ts`) utilizes **Gemini 2.5 Flash** set to a deterministic temperature threshold (0.2). This limits creative hallucinations and forces rigid syntax verification. The specialized system prompt configures the context profile:

* **Zero Filler Constraints:** Eliminates conversational overhead ("Sure! Here's your review..."). If no severe structural bugs are found, the model responds with an empty statement, preventing comment clutter.
* **Targeted Analysis Triaging:**
    1. **Security Vulnerabilities:** Flags credential leaks, SQL injection holes, or structural authentication gaps.
    2. **Performance Pitfalls:** Catches inefficient complexity footprints (e.g., O(n^2) array routines) or lingering subscriptions inside frontend rendering hooks.
    3. **Edge Case Breakdowns:** Identifies unhandled exceptions, un-catched async/await workflows, and unverified data signatures.

---

## 🚀 Execution & Operational Workflows

To run the full decoupled architecture simultaneously, use the pre-configured split runtime execution routines:

### Step A: Boot the Webhook Ingress Gateway
In your primary terminal shell, execute the HTTP router:
```bash
npm run start:server
```

### Step B: Boot the Queue Worker Engine
In a separate terminal split shell, execute the queue consumer:
```bash
npm run start:worker
```

### Step C: Map the Ingress Public Tunnel
Expose your server block securely using ngrok:
```bash
ngrok http 3000
```
Copy the secure `https://...` address provided by the output window and navigate to your target GitHub repository configuration tree:
`Settings -> Webhooks -> Add Webhook`. Paste the routing link, append `/webhooks/github`, set content type to `application/json`, and subscribe exclusively to **Pull Requests**.

Now, open a Pull Request containing custom code modifications inside your target repository. Watch the server pass off the event signature, see the background worker parse the diff, watch the Gemini Core generate structural reviews, and monitor your GitHub UI as the automated critique blocks are posted to your interface!

---

## 🛑 Resiliency Protocol (Edge Case Mitigation Matrix)

The system enforces operational limits defined within the project engineering specifications to maintain uptime guarantees under stressed states:

| Trigger Incident | Target Automated System Response | Engineering Mitigation Pattern |
| :--- | :--- | :--- |
| **Large Scale PR** (>100 files altered) | Data truncation and notification summary posting. | Scans diff arrays on extraction. If the limit ceiling is passed, it halts further analysis and posts a message requesting atomic code segmenting. |
| **API Rate Exhaustion** (HTTP 429) | Transparent queue retries with dynamic backoff pacing. | Catches the error state and instructs BullMQ to execute exponential re-scheduling cycles (5s -> 15s -> 45s) to bypass target limits. |
| **Malicious Request Injection** | Immediate transaction termination. | Cryptographic signature validation filters anomalies out before pushing entries down to Redis queues. |

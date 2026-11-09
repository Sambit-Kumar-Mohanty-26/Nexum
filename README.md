<div align="center">

# Nexum AI
### The AI-Mediated Freelance Collaboration & Autonomous Escrow Protocol

**"AI drafts, humans approve, PayPal proves."**

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.4-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1?style=for-the-badge&logo=postgresql)](https://neon.tech/)
[![PayPal REST v2](https://img.shields.io/badge/PayPal-Orders_v2_Escrow-00457C?style=for-the-badge&logo=paypal)](https://developer.paypal.com/)
[![License](https://img.shields.io/badge/License-Proprietary-indigo?style=for-the-badge)](#license)

<br />

<p align="center">
  <a href="#executive-summary">Executive Summary</a> •
  <a href="#core-architectural-pillars">Core Pillars</a> •
  <a href="#system-architecture">System Architecture</a> •
  <a href="#product-capabilities">Capabilities</a> •
  <a href="#security--invariants">Security & Invariants</a> •
  <a href="#enterprise-trust--protocol-guarantees">Protocol Guarantees</a> •
  <a href="#api-reference-overview">API Reference</a>
</p>

</div>

---

## Executive Summary

Traditional freelance platforms suffer from asymmetric information, scope creep, unverified claims, and subjective milestone disputes. Clients struggle to evaluate technical proposals, while freelancers face delayed payments, unpaid revisions, and ambiguous acceptance criteria.

**Nexum** is an enterprise-grade, AI-mediated freelance workspace and autonomous escrow protocol. Nexum positions an autonomous intelligence layer between parties:
1. **Private AI Counsel:** Each party has an isolated, query-layer secured AI assistant to refine briefs, formulate proposals, and evaluate technical terms.
2. **Shared Autonomous Mediator:** Sits inside the shared project workspace to synthesize legal-grade contracts, detect verbal scope changes during calls, enforce milestone pre-funding, and independently verify deliverables before capital release.
3. **Human-in-the-Loop Sovereignty:** AI outputs are strictly non-binding drafts. Only explicit, cryptographic dual human ratifications commit financial resources, modify scope, or trigger escrow release.

---

## Core Architectural Pillars

```
+-----------------------------------------------------------------------------+
|                                 NEXUM PROTOCOL                              |
+-----------------------------------------------------------------------------+
|  [Client Private Space]     |    [Shared Project Workspace]    | [Freelancer Space] |
|   - Private AI Assistant    |     - Autonomous AI Mediator     | - Private AI Agent |
|   - Document Ingestion      |     - Dual-Signature State Mach. | - Resume Parser    |
|   - Uncompromised Queries   |     - Groq Whisper Notetaker     | - Proposal Builder |
+-----------------------------+----------------------------------+--------------------+
                                               |
                                     [Cryptographic Engine]
                                - Canonical JSON Stringification
                                - SHA-256 Immutable Seals
                                - Append-Only Audit Logging
                                               |
                                   [Financial Settlement]
                             - PayPal Orders REST API v2
                             - Integer Minor-Units (Zero Floats)
                             - Pre-funded Bilateral Escrow
```

### 1. Dual-Boundary AI Privacy Isolation
Private conversations between a client and their private AI (or a freelancer and their private AI) are partitioned at the database query layer. No conversation metadata, embeddings, or context are ever readable by the opposing party or shared without an explicit export action.

### 2. Strict Human Consensus & Non-Autonomous Commitment
AI cannot authorize disbursements, sign agreements, approve milestone submissions, or modify financial amounts. AI drafts and synthesizes; humans review, ratify, and authorize.

### 3. Financial Integrity & Zero-Float Arithmetic
Money within the Nexum protocol is strictly stored and calculated as **integer minor units** (e.g., cents, pence) accompanied by an ISO-4217 currency code. Floating-point math is banned across all ledger pipelines.

### 4. Bilateral Escrow Verification with PayPal REST v2
Escrow funding is pre-locked before development begins on each milestone. Funds remain held securely until acceptance criteria are satisfied through autonomous test verification or mutual client sign-off.

---

## System Architecture & Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant AI as Nexum Autonomous Engine
    actor F as Freelancer
    participant DB as PostgreSQL / Neon
    participant PP as PayPal REST v2 Orders

    Note over C,F: Phase 1: Inception & Proposal Selection
    C->>AI: Upload PRD / Technical Brief
    AI->>C: Structured Scope, Milestones & Budget Range
    F->>AI: Submit Custom Proposal (Milestones, Quote & Timeline)
    C->>AI: Accept Proposal (Trigger Candidate Selection)

    Note over C,F: Phase 2: Milestone Sync & Contract Synthesis
    AI->>DB: Synchronize Milestones & Budget to Approved Proposal
    AI->>DB: Decline Other Competing Proposals
    AI->>AI: Synthesize Legal Contract Markdown (v1.0)
    AI->>DB: Save "Contract_Agreement_v1.0.md" to Project Files
    AI->>C: Post Contract Draft into Shared Workspace
    AI->>F: Post Contract Draft into Shared Workspace
    C->>DB: Human Approval (Agreement Version v1.0)
    F->>DB: Human Approval (Agreement Version v1.0)
    DB->>DB: Mutually Ratified (Agreement Status: ACTIVE)

    Note over C,F: Phase 3: PayPal REST v2 Escrow Pre-Funding
    AI->>C: Prompt: Lock Milestone #1 Escrow ($X,XXX.XX USD)
    C->>PP: Create Order (Intent: CAPTURE, Amount: Minor Units)
    C->>PP: Authorize & Capture Milestone #1 Escrow
    PP->>DB: Record Payment (Status: CAPTURED / HELD_IN_ESCROW)
    DB->>DB: Milestone #1 State: CAPTURED | WorkStatus: IN_PROGRESS
    AI->>C: Workspace Notification: Escrow Locked
    AI->>F: Workspace Notification: Escrow Locked - Begin Work

    Note over C,F: Phase 4: Delivery, Autonomous Verification & Release
    F->>AI: Submit Milestone Deliverable (Git Commit, PR, Deploy URL)
    AI->>AI: Autonomous Verifier Suite (Tests, Lint, Deploy Health)
    AI->>C: 72-Hour Client Inspection Clock Started
    C->>AI: Approve Deliverable
    AI->>PP: Release Milestone Escrow
    AI->>DB: Milestone WorkStatus: ACCEPTED
```

---

## Product Capabilities

### 1. Intelligent Opportunity Selection & Proposal Formulation
- **SaaS Opportunity Selector:** Compact, multi-parameter opportunity search filtering active projects, budget ceilings, and domain skills.
- **Duplicate Application Guard:** Real-time state inspection preventing duplicate bids on under-review opportunities while permitting structured re-applications on declined briefs with feedback.
- **Dynamic Milestone Synchronization:** Proposal acceptance immediately overwrites placeholder brief assumptions with the candidate's exact milestones, timelines, acceptance criteria, and budget in minor units.

### 2. Bilateral Contract Generator with Document Versioning
- **Legal-Grade Markdown Generator:** Automatically synthesizes formal agreements encompassing scope, delivery milestones, PayPal escrow requirements, and dispute resolution rules.
- **Semantic Document Versioning:** Strict document tracking (`Contract_Agreement_v1.0.md`, `Contract_Agreement_v2.0.md`). Every post-ratification add-on or scope alteration increments the version, creates a new file, and requires mutual ratification.
- **Dual-Party Project Vault:** All synthesized contract versions are stored as `ProjectFile` records and directly accessible, downloadable, and reviewable in the shared **Files** vault.

### 3. Shared Workspace Mediation & Tier-1 Deterministic Bot
- **Zero-Token Deterministic Evaluation:** Real-time regex triage scanning messages for scope creep, budget amendments, and hostile tone at 0 token cost before dispatching to LLM summarization.
- **Verbal Scope Alert (Meeting Notetaker):** Integrates **Groq Whisper v3** and **LLaMA 3.3 70B** to transcribe recorded discussions, extract action items into interactive tasks, and detect verbal scope deviations (e.g. *"We agreed on Apple Pay for +$400"*).
- **Consensus Registers (ADR):** Cryptographic SHA-256 seals recording mutual sign-offs on architectural decisions and change requests.

### 4. Milestone Verification & Inspection Clock
- **Autonomous Verifier:** Runs verification jobs analyzing Git commit hashes, PR statuses, test pass rates, and deployment endpoints against documented acceptance criteria.
- **72-Hour Inspection Clock:** Automated safety buffer granting clients sufficient time to inspect deliverable packages, after which consensus rules apply.
- **Safe Harbor & Dispute Resolution:** Freezes escrow payouts in the event of unresolved milestone disputes while autonomous mediation audits project event streams.

### 5. Multi-Channel Notifications & Handover Protocol
- **Telegram Mobile Gateway:** Bi-directional notifications allowing stakeholders to review deliverables, approve postponement requests, and monitor escrow changes via Telegram Bot webhooks.
- **Formal Project Handover:** Final verification checklist covering source repository transfers, production credential transfers, documentation sign-offs, and final escrow settlement.

---

## Technology Stack

| Layer | Technologies | Rationale |
|---|---|---|
| **Frontend Framework** | **Next.js 16 (App Router)**, React 19, TypeScript | Server Components, fast streaming, deterministic rendering |
| **Styling & Icons** | **Tailwind CSS 4**, Lucide React | High-performance design tokens, zero-runtime overhead |
| **Backend API** | **Node.js 22**, Express, TypeScript | High-throughput asynchronous event loop, strict typing |
| **Database & ORM** | **PostgreSQL**, Neon Serverless, Prisma ORM 6 | ACID compliance, connection pooling, type-safe schema migrations |
| **Financial Settlement** | **PayPal REST API v2** (Orders & Webhooks) | Global multi-currency support, institutional-grade escrow rails |
| **Autonomous Intelligence** | **Google Gemini 2.0 / 1.5**, Groq (Whisper v3, LLaMA 3.3) | Multilingual audio transcription, structured JSON extraction |
| **Object Storage** | **AWS S3 / Cloudflare R2 / Local Disk** | Presigned secure download URLs, cryptographic artifact storage |
| **Testing Engine** | **Vitest**, Supertest | High-speed unit & integration test runner |

---

## Security Invariants & Compliance Rules

1. **Non-Negotiable Trust Boundaries:**
   - Client ID, role, status, price, and payment state are **never** trusted from client requests. They are resolved strictly from authenticated server sessions or verified database entities.
2. **Four Distinct Lifecycle States:**
   - Proposal Status (`ProposalStatus`)
   - Project Status (`ProjectState`)
   - Milestone Work Status (`MilestoneWorkStatus`)
   - Payment State (`PaymentState`)
   - *These four states are never conflated or merged into a single enum.*
3. **Immutable Audit Trail:**
   - Every state transition generates an append-only `AuditEvent` record recording the actor, action, object identifier, previous state, new state, and ISO timestamp.
4. **Credential Isolation:**
   - Plaintext passwords, API secrets, and PayPal access tokens are strictly prohibited from persistence in logs, client bundles, or database seed files.
5. **No Simulated Releases in Accounting:**
   - A sandbox capture is never recorded as a verified disbursement. Unknown payment statuses remain `UNKNOWN` until reconciled via webhook or authoritative polling.

---

## Repository Layout

```
Nexum/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma            # Canonical multi-tenant database schema
│   │   └── migrations/              # Applied append-only database migrations
│   ├── src/
│   │   ├── domain/
│   │   │   ├── agreements/          # Contract generator, terms diff, activation
│   │   │   ├── mediation/           # Intent classification, access validation
│   │   │   ├── milestones/          # State machines, verification criteria
│   │   │   ├── payments/            # PayPal REST v2 client, idempotency, evidence
│   │   │   └── proposals/           # State transitions, canonical hashing
│   │   ├── middleware/              # Auth, CSRF, validation, error handler
│   │   ├── routes/                  # Client, Freelancer, Workspace, Dev routes
│   │   ├── services/                # WorkspaceService, AutonomousVerifier, Gemini
│   │   └── index.ts                 # Express server bootstrap & router wiring
│   └── tests/                       # Vitest integration test suites
├── frontend/
│   ├── src/
│   │   ├── app/                     # Next.js App Router (Client, Freelancer, Workspace)
│   │   │   ├── api/                 # Next.js API route handlers & proxy layers
│   │   │   ├── client/              # Client dashboard, projects, review proposals
│   │   │   └── freelancer/          # Freelancer dashboard, proposals, workspace
│   │   ├── components/              # Modular UI cards, modals, sidebars, headers
│   │   │   ├── client/              # Workspace chats mode, ADR records
│   │   │   └── freelancer/          # Proposal builder modal, talent portfolio
│   │   ├── context/                 # AuthContext & role session providers
│   │   └── lib/                     # API client, PayPal adapter, workspace data
│   └── public/                      # Static assets, fonts, icons
└── README.md                        # Enterprise product documentation
```

---

## Getting Started

### Prerequisites
- **Node.js:** `v20.x` or `v22.x` (LTS recommended)
- **Package Manager:** `pnpm` (or `npm`)
- **Database:** PostgreSQL instance (Local or [Neon Serverless Postgres](https://neon.tech/))
- **PayPal Developer Account:** [Developer Dashboard](https://developer.paypal.com/) for Sandbox credentials

---

### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/nexum.git
cd nexum
```

---

### Step 2: Configure Environment Variables

#### Backend Configuration
```bash
cd backend
cp .env.example .env
```
Fill in the mandatory variables in `backend/.env`:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://user:password@endpoint.neon.tech/neondb?sslmode=require"
PAYPAL_ENV="sandbox"
PAYPAL_CLIENT_ID="your_sandbox_client_id"
PAYPAL_CLIENT_SECRET="your_sandbox_client_secret"
SESSION_SECRET="your_secure_random_32_byte_secret"
GEMINI_API_KEY="your_google_gemini_api_key"
GROQ_API_KEY="your_groq_api_key"
```

#### Frontend Configuration
```bash
cd ../frontend
cp .env.example .env.local
```
Fill in the variables in `frontend/.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL="http://localhost:4000"
BACKEND_URL="http://localhost:4000"
DATABASE_URL="postgresql://user:password@endpoint.neon.tech/neondb?sslmode=require"
PAYPAL_ENV="sandbox"
PAYPAL_CLIENT_ID="your_sandbox_client_id"
PAYPAL_CLIENT_SECRET="your_sandbox_client_secret"
```

---

### Step 3: Database Migration & Schema Generation
```bash
cd ../backend
npm install
npx prisma generate
npx prisma db push
```

*(Optional) Seed foundational development entities:*
```bash
npm run db:seed
```

---

### Step 4: Run Development Services

In terminal 1 (Backend):
```bash
cd backend
npm run dev
# Server listening on http://localhost:4000
```

In terminal 2 (Frontend):
```bash
cd frontend
npm install
npm run dev
# Next.js running on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Test Verification

Nexum enforces automated verification across all domain modules before any phase is certified.

```bash
cd backend
# Execute the comprehensive test suite
npm run test
```

To run the Phase 6 Contract Generation and Escrow Verification suite:
```bash
npx vitest run tests/contract_and_escrow.test.ts
```

To run TypeScript verification across both codebases:
```bash
# Backend verification
cd backend && npx tsc --noEmit

# Frontend verification
cd ../frontend && npx tsc --noEmit
```

---

## API Reference Overview

### Agreements & Bilateral Ratification
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/agreements/:id` | Retrieve agreement, active version, markdown contract, and approvals |
| `POST` | `/api/agreements/:id/approve` | Human party ratifies agreement version; activates when dual-signed |

### PayPal Milestone Escrow Settlement
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/payments/escrow/create-order` | Prepares PayPal Orders v2 intent for milestone escrow deposit |
| `POST` | `/api/payments/escrow/capture` | Captures PayPal order, locks funds in escrow, authorizes work |
| `POST` | `/api/payments/escrow/simulate-lock` | Fallback simulation route for offline sandbox testing |

### Client Opportunity & Candidate Resolution
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/client/proposals/:id/accept` | Accepts proposal, synchronizes milestones, and drafts contract v1.0 |
| `POST` | `/api/client/proposals/:id/reject` | Declines candidate with structured feedback and audit trail |
| `POST` | `/api/client/reset-terrashield` | Resets project to unapproved stage for fresh end-to-end testing |

### Workspace Mediation & Dynamic Timeline
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/workspace/projects/:id/timeline` | Fetches verified timeline, tasks, files vault, and ADR records |
| `POST` | `/api/workspace/projects/:id/messages` | Dispatches message through Tier-1 bot triage and computes SHA-256 seal |
| `POST` | `/api/workspace/projects/:id/amendments/propose` | Proposes scope amendment card with price/timeline deltas |
| `POST` | `/api/workspace/projects/:id/amendments/:msgId/respond` | Accepts or declines amendment; triggers contract version bump (v2.0) |

---

## Enterprise Trust & Protocol Guarantees

In an enterprise-grade collaborative network, trust cannot rely on verbal assurances or platform discretion. Nexum embeds cryptographic invariants, automated verification pipelines, and institutional financial controls directly into the collaboration lifecycle:

### 1. Deterministic SHA-256 Timeline Anchoring
Every message, scope amendment, task state transition, and file attachment is canonicalized (via deterministic JSON key-sorting) and sealed with a SHA-256 cryptographic digest. Any attempt to alter historical chat records or retroactive commitments is immediately detected through hash-chain verification.

### 2. Non-Repudiation ADR Registers (Architectural Decision Records)
When scope shifts emerge during voice discussions or chat exchanges, the Tier-1 mediator isolates the delta and generates an interactive ADR register. Scope expansions, budget deltas, or timeline adjustments cannot modify the canonical agreement without explicit, recorded dual-party ratification.

### 3. Institutional Escrow Settlement & Zero-Float Arithmetic
All balances and milestone budgets are strictly computed and held as **integer minor units** (e.g. cents) paired with an ISO-4217 currency identifier. Floating-point arithmetic is structurally prevented across all ledger routines. Through PayPal REST v2 Orders integration, escrow deposits are captured into pre-funded holding accounts prior to sprint authorization, guaranteeing liquidity and zero payment defaults.

### 4. Continuous Autonomous Deliverable Verification
Milestone approvals are guarded by Nexum's Autonomous Verifier suite. When a deliverable is submitted, headless verification engines evaluate:
- **Repository Integrity:** Target Git commit hash exists on remote and branches cleanly.
- **PR Merge Validation:** Pull request passes all automated CI/CD checks and merges without conflicts.
- **Test Suite Pass Rates:** Unit and integration test coverage thresholds are fully satisfied.
- **Service Health Probes:** Containerized deployment endpoints respond with valid HTTP `200 OK` status and SSL certificates.

### 5. Dual-Boundary Privacy & AI Query Isolation
Private AI conversations, PRD analyses, and financial modeling queries are strictly isolated at the SQL query layer with tenant-specific authorization filters. A user's private intelligence counsel is never exposed to the counterparty, nor is client data ever used to train underlying foundation models.

---

## License

Copyright &copy; 2026 Nexum Autonomous Protocol Inc. All rights reserved.  
Confidential and Proprietary. Unauthorized copying, distribution, or reverse engineering is strictly prohibited.

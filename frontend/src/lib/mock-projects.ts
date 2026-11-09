export type ProjectLifecycleStatus =
  | "ALL"
  | "DRAFT"
  | "FINDING_FREELANCERS"
  | "NEGOTIATION"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "COMPLETED"
  | "DISPUTED";

export interface MilestoneItem {
  id: string;
  number: number;
  title: string;
  deliverables: string[];
  dueDate: string;
  amount: string;
  status: "PENDING_FUNDING" | "FUNDED" | "IN_PROGRESS" | "IN_REVIEW" | "RELEASED" | "DISPUTED";
  statusLabel: string;
  testReport?: {
    passing: number;
    total: number;
    coverage: string;
    runtime: string;
  };
  paypalOrderId?: string;
  captureId?: string;
  submissionNotes?: string;
  submittedAt?: string;
}

export interface ProposalItem {
  id: string;
  freelancerId?: string;
  freelancerName: string;
  freelancerRole: string;
  avatar: string;
  rating: string;
  proposedBudget: string;
  estimatedTimeline: string;
  coverLetter: string;
  status: "ACCEPTED" | "UNDER_REVIEW" | "DECLINED";
  rejectionFeedback?: string;
  submittedDate: string;
  approach?: string;
  proposedMilestones?: Array<{
    id?: string;
    title: string;
    amount?: number | string;
    amountMinor?: number;
    days?: number;
    durationWeeks?: number;
    criteria?: string[];
  }>;
  attachments?: Array<{
    id: string;
    name: string;
    size?: string;
    url: string;
  }>;
}

export interface ScopeChangeItem {
  id: string;
  title: string;
  requestedBy: "CLIENT" | "FREELANCER";
  requestedByName: string;
  date: string;
  costDelta: string;
  timeDelta: string;
  summary: string;
  originalSpec: string;
  amendedSpec: string;
  status: "PENDING_CLIENT_APPROVAL" | "PENDING_FREELANCER_APPROVAL" | "APPROVED" | "REJECTED";
}

export interface PaymentItem {
  id: string;
  orderId: string;
  milestoneTitle: string;
  amount: string;
  status: "CAPTURED" | "HELD_IN_ESCROW" | "PENDING_FUNDING";
  date: string;
  provider: "PayPal Orders v2" | "Nexum Consensus Vault";
  proofHash: string;
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  actor: string;
  role: "CLIENT" | "FREELANCER" | "CONSENSUS_NODE" | "SYSTEM";
  action: string;
  detail: string;
  hash: string;
}

export interface ProjectDetailData {
  id: string;
  name: string;
  description: string;
  status: ProjectLifecycleStatus;
  statusLabel: string;
  statusColor: string;
  stageSummary: string;
  category: string;
  createdAt: string;
  canonicalHash: string;
  totalBudget: string;
  escrowFunded: string;
  releasedAmount: string;
  nextMilestoneDue: string;
  nextAction: {
    label: string;
    description: string;
    type: "ACTION_REQUIRED" | "AWAITING_REPLY" | "RESUME" | "VIEW";
    urgent?: boolean;
    tabTarget?: string;
  };
  freelancer?: {
    name: string;
    role: string;
    avatar: string;
    rating: string;
    completedJobs: number;
    hourlyRate: string;
    status: string;
  };
  briefAndPrd: {
    overview: string;
    objectives: string[];
    technicalArchitecture: string;
    functionalRequirements: string[];
    nonFunctionalRequirements: string[];
    assumptions: string[];
    exclusions: string[];
    acceptanceCriteria: string[];
    version: string;
    uploadedDocument?: {
      name: string;
      size?: string;
      type?: string;
      uploadedAt?: string;
      dataUrl?: string;
    };
  };
  milestones: MilestoneItem[];
  proposals: ProposalItem[];
  workspaceQuestions: {
    id: string;
    author: string;
    avatar: string;
    date: string;
    question: string;
    answer?: string;
    answeredBy?: string;
    answeredAt?: string;
    status: "RESOLVED" | "OPEN";
  }[];
  changes: ScopeChangeItem[];
  payments: PaymentItem[];
  activities: ActivityItem[];
}

export const MOCK_PROJECTS: Record<string, ProjectDetailData> = {
  proj_1: {
    id: "proj_1",
    name: "Bilateral E-Commerce Payment Rails",
    description: "Milestone-governed PayPal Orders v2 integration with Dual SHA-256 state machine and reconciliation retry engine.",
    status: "IN_REVIEW",
    statusLabel: "In Review",
    statusColor: "bg-amber-50 text-amber-800 border-amber-200/80",
    stageSummary: "Milestone 2 deliverable package submitted with full test assert logs.",
    category: "Fintech & Payment Infrastructure",
    createdAt: "Oct 16, 2026",
    canonicalHash: "canonical_v1.2_#9f8c2b7e411b6d",
    totalBudget: "$6,000.00 USD",
    escrowFunded: "$2,700.00 USD",
    releasedAmount: "$1,200.00 USD",
    nextMilestoneDue: "Today (Under Client Review)",
    nextAction: {
      label: "Review Deliverable & Release Funds",
      description: "Review automated tests & approve release of $1,500.00 from Sandbox escrow.",
      type: "ACTION_REQUIRED",
      urgent: true,
      tabTarget: "milestones",
    },
    freelancer: {
      name: "Rohan Verma",
      role: "Payment Rails Specialist",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&q=80",
      rating: "5.0",
      completedJobs: 28,
      hourlyRate: "$65/hr",
      status: "Online · Working on M2 adjustments",
    },
    briefAndPrd: {
      overview: "Develop an automated, fault-tolerant payment gateway bridging merchant checkouts with PayPal Orders v2 REST API. System must guarantee idempotency, cryptographically sealed state transitions, and automatic retry workers for interrupted webhook dispatches.",
      objectives: [
        "Eliminate unilateral milestone release disputes via Dual SHA-256 signed payloads.",
        "Integrate PayPal Sandbox Orders v2 authorize, capture, and void flows.",
        "Deploy distributed webhook ingestion worker with dead-letter queue resilience.",
        "Maintain zero-loss reconciliation state for intermittent network partitions.",
      ],
      technicalArchitecture: "Next.js 16 App Router on edge, Node.js worker pool, PostgreSQL with Row-Level Security, Redis stream buffer, and PayPal REST v2 API with SHA-256 cryptographic proof seals.",
      functionalRequirements: [
        "Dual-approval milestone locking: release requires valid client signature + test verification.",
        "PayPal Orders v2 webhook verification matching transmission-id, auth-algo, and cert-url.",
        "Automatic fallback reconciliation poller triggered after 120s of unacknowledged webhooks.",
        "Audit trail ledger recording every state shift with immutable hash chaining.",
      ],
      nonFunctionalRequirements: [
        "Webhook response time under 150ms to prevent PayPal notification back-off.",
        "100% test coverage on escrow release authorization handlers.",
        "Zero sensitive credentials exposed in client-side bundles.",
      ],
      assumptions: [
        "Client holds verified PayPal Developer account with Sandbox App credentials.",
        "PostgreSQL database has pgcrypto extension enabled.",
      ],
      exclusions: [
        "Direct credit card PAN storage (all card data routed via PayPal fields).",
        "Physical logistics or shipment carrier fulfillment tracking.",
      ],
      acceptanceCriteria: [
        "All 46 unit & integration tests pass with 0 failures.",
        "Simulated webhook drop recovers successfully via Reconcile-Before-Retry engine.",
        "Dual SHA-256 agreement hash matches between both parties before release trigger is enabled.",
      ],
      version: "v1.2 (Signed & Locked)",
    },
    milestones: [
      {
        id: "m1",
        number: 1,
        title: "Project Intake & Architecture PRD",
        deliverables: ["Canonical PRD document", "Database schema migration", "PayPal Sandbox API wrapper"],
        dueDate: "Oct 24, 2026",
        amount: "$1,200.00 USD",
        status: "RELEASED",
        statusLabel: "Approved & Released",
        paypalOrderId: "4AB912048C881923K",
        captureId: "CAP_981240182_OK",
        submissionNotes: "Architecture diagrams and PayPal API credentials validated.",
        submittedAt: "Oct 24, 2026, 4:10 PM",
        testReport: { passing: 14, total: 14, coverage: "98.5%", runtime: "1.2s" },
      },
      {
        id: "m2",
        number: 2,
        title: "PayPal REST v2 Webhook Ingestion Engine",
        deliverables: [
          "Webhook event router with SHA-256 validation",
          "Idempotency cache & transaction deduping",
          "PayPal Orders capture-order endpoint",
        ],
        dueDate: "Oct 30, 2026 (Submitted)",
        amount: "$1,500.00 USD",
        status: "IN_REVIEW",
        statusLabel: "Awaiting Client Review",
        paypalOrderId: "6DE714998H998261C",
        submissionNotes: "Completed webhook parser and simulated 50 parallel dispatches. All 22 test suites passed without dropped events.",
        submittedAt: "Today, 1:45 PM",
        testReport: { passing: 22, total: 22, coverage: "99.1%", runtime: "2.4s" },
      },
      {
        id: "m3",
        number: 3,
        title: "Real-Time Reconciliation & Retry Worker",
        deliverables: [
          "Reconcile-Before-Retry state machine",
          "Cron sync agent for orphaned orders",
          "Client audit dashboard export",
        ],
        dueDate: "Nov 08, 2026",
        amount: "$1,800.00 USD",
        status: "FUNDED",
        statusLabel: "Pre-Funded in Escrow",
        paypalOrderId: "7FF991823H102938B",
      },
      {
        id: "m4",
        number: 4,
        title: "Production Hardening & E2E Consensus",
        deliverables: ["Load testing up to 500 req/s", "Security pen-test report", "Final release handover"],
        dueDate: "Nov 18, 2026",
        amount: "$1,500.00 USD",
        status: "PENDING_FUNDING",
        statusLabel: "Scheduled",
      },
    ],
    proposals: [
      {
        id: "prop_1",
        freelancerName: "Rohan Verma",
        freelancerRole: "Payment Rails Specialist",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&q=80",
        rating: "5.0 (28 jobs)",
        proposedBudget: "$6,000.00 USD",
        estimatedTimeline: "4 weeks",
        coverLetter: "I specialize in resilient payment systems and PayPal Orders v2 integrations. I have built dual-consensus settlement engines for two European fintech apps.",
        status: "ACCEPTED",
        submittedDate: "Oct 17, 2026",
      },
      {
        id: "prop_2",
        freelancerName: "Elena Rostova",
        freelancerRole: "Full-Stack Architect",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&q=80",
        rating: "4.9 (42 jobs)",
        proposedBudget: "$6,400.00 USD",
        estimatedTimeline: "5 weeks",
        coverLetter: "Strong background in distributed transactions and edge workers. Proposed using Redis Streams for webhook buffering.",
        status: "DECLINED",
        submittedDate: "Oct 18, 2026",
      },
    ],
    workspaceQuestions: [
      {
        id: "q1",
        author: "Rohan Verma",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&q=80",
        date: "Oct 20, 2026",
        question: "Should we reject webhooks that fail cryptographic transmission check immediately or log them into quarantine for 24 hours?",
        answer: "Log into quarantine table with 48h TTL so we can audit false positives during developer sandbox testing.",
        answeredBy: "Sambit Kumar (Client)",
        answeredAt: "Oct 20, 2026",
        status: "RESOLVED",
      },
      {
        id: "q2",
        author: "Rohan Verma",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&q=80",
        date: "Oct 27, 2026",
        question: "For PayPal sandbox testing, which currency code will the primary merchant account be denominated in?",
        answer: "USD ($) for all primary contracts and milestone capture releases.",
        answeredBy: "Sambit Kumar (Client)",
        answeredAt: "Oct 27, 2026",
        status: "RESOLVED",
      },
    ],
    changes: [
      {
        id: "sc_1",
        title: "Section 14: Add Idempotency Dead-Letter Queue",
        requestedBy: "FREELANCER",
        requestedByName: "Rohan Verma",
        date: "Oct 26, 2026",
        costDelta: "+$0.00 (Included in M2)",
        timeDelta: "+0 days",
        summary: "Enhance webhook ingestion worker to route corrupted JSON payloads to dead-letter storage without blocking main dispatch thread.",
        originalSpec: "Webhooks with corrupt payload will throw HTTP 400 and drop immediately.",
        amendedSpec: "Webhooks with corrupt payload are written to 'dlq_events' table and responded with HTTP 202 Accepted to prevent provider spamming.",
        status: "APPROVED",
      },
    ],
    payments: [
      {
        id: "pay_1",
        orderId: "4AB912048C881923K",
        milestoneTitle: "Milestone 1: Project Intake & Architecture PRD",
        amount: "$1,200.00 USD",
        status: "CAPTURED",
        date: "Oct 24, 2026",
        provider: "PayPal Orders v2",
        proofHash: "sha256:d8a201...991e2b",
      },
      {
        id: "pay_2",
        orderId: "6DE714998H998261C",
        milestoneTitle: "Milestone 2: PayPal REST v2 Webhook Engine",
        amount: "$1,500.00 USD",
        status: "HELD_IN_ESCROW",
        date: "Oct 26, 2026",
        provider: "PayPal Orders v2",
        proofHash: "sha256:4fe112...098a1c",
      },
    ],
    activities: [
      {
        id: "act_1",
        timestamp: "Today, 1:45 PM",
        actor: "Rohan Verma",
        role: "FREELANCER",
        action: "Deliverable Submitted",
        detail: "Milestone 2 code package and test results submitted for client sign-off.",
        hash: "e90f2b8a...12c8",
      },
      {
        id: "act_2",
        timestamp: "Yesterday, 4:15 PM",
        actor: "PayPal Gateway",
        role: "SYSTEM",
        action: "Escrow Pre-Funded",
        detail: "Order #6DE714998H998261C pre-authorized in PayPal Sandbox escrow ($1,500.00 USD).",
        hash: "78a9c011...45df",
      },
      {
        id: "act_3",
        timestamp: "Oct 28, 11:30 AM",
        actor: "Consensus Engine",
        role: "CONSENSUS_NODE",
        action: "Dual-Approval Hash Locked",
        detail: "Both parties verified spec hash #9f8c2b7e411b6d.",
        hash: "9f8c2b7e...1b6d",
      },
      {
        id: "act_4",
        timestamp: "Oct 24, 4:12 PM",
        actor: "Sambit Kumar",
        role: "CLIENT",
        action: "Milestone 1 Approved & Released",
        detail: "$1,200.00 captured and transferred to Rohan Verma PayPal wallet.",
        hash: "123a88bb...ff99",
      },
    ],
  },

  proj_2: {
    id: "proj_2",
    name: "CloudMesh AI Gateway Unification",
    description: "Unified streaming API across 4 LLM providers with semantic pgvector caching, row-level isolation & rate limiters.",
    status: "IN_PROGRESS",
    statusLabel: "In Progress",
    statusColor: "bg-blue-50 text-blue-700 border-blue-200/80",
    stageSummary: "M1 active. Elena Rostova proposed PRD #3 scope delta for streaming circuit breaker.",
    category: "AI & Distributed Systems",
    createdAt: "Oct 23, 2026",
    canonicalHash: "canonical_v1.0_#e7b1a90c",
    totalBudget: "$3,600.00 USD",
    escrowFunded: "$1,200.00 USD",
    releasedAmount: "$0.00 USD",
    nextMilestoneDue: "Nov 02, 2026",
    nextAction: {
      label: "Review Scope Change Delta",
      description: "Approve proposed +$400 scope addition for streaming circuit breaker.",
      type: "ACTION_REQUIRED",
      urgent: true,
      tabTarget: "changes",
    },
    freelancer: {
      name: "Elena Rostova",
      role: "Full-Stack AI Architect",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&q=80",
      rating: "5.0",
      completedJobs: 42,
      hourlyRate: "$80/hr",
      status: "Active in development",
    },
    briefAndPrd: {
      overview: "Build an ultra-low latency gateway aggregating OpenAI, Anthropic, Gemini, and Groq behind a unified streaming interface.",
      objectives: ["Semantic caching via pgvector", "Fallback circuit breakers", "Per-token cost metering"],
      technicalArchitecture: "FastAPI, Next.js, Redis, PostgreSQL with pgvector, Docker.",
      functionalRequirements: ["Stream chunks with zero backpressure", "Automatic failover on HTTP 429 rate limits"],
      nonFunctionalRequirements: ["P99 latency under 80ms for cached prompts"],
      assumptions: ["API keys provided by client"],
      exclusions: ["Model fine-tuning or training datasets"],
      acceptanceCriteria: ["Benchmarked at 2,000 req/s with automatic provider fallback verified"],
      version: "v1.0 (Signed)",
    },
    milestones: [
      {
        id: "m1",
        number: 1,
        title: "AI Provider Gateway Isolation",
        deliverables: ["Unified TypeScript SDK", "Rate-limiting middleware", "Docker sandbox setup"],
        dueDate: "Nov 02, 2026",
        amount: "$1,200.00 USD",
        status: "IN_PROGRESS",
        statusLabel: "In Progress",
        paypalOrderId: "88AB91230C991",
      },
      {
        id: "m2",
        number: 2,
        title: "Semantic Vector Cache with pgvector",
        deliverables: ["Embedding similarity cache", "Cache eviction rules", "Benchmark report"],
        dueDate: "Nov 15, 2026",
        amount: "$1,400.00 USD",
        status: "PENDING_FUNDING",
        statusLabel: "Upcoming",
      },
      {
        id: "m3",
        number: 3,
        title: "Monitoring & Token Telemetry Dashboard",
        deliverables: ["Cost tracking per client org", "Grafana dashboards", "Deployment runbooks"],
        dueDate: "Nov 28, 2026",
        amount: "$1,000.00 USD",
        status: "PENDING_FUNDING",
        statusLabel: "Upcoming",
      },
    ],
    proposals: [
      {
        id: "prop_1",
        freelancerName: "Elena Rostova",
        freelancerRole: "Full-Stack AI Architect",
        avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&q=80",
        rating: "5.0 (42 jobs)",
        proposedBudget: "$3,600.00 USD",
        estimatedTimeline: "3 weeks",
        coverLetter: "I've built similar LLM routing layers for high-throughput SaaS companies.",
        status: "ACCEPTED",
        submittedDate: "Oct 23, 2026",
      },
    ],
    workspaceQuestions: [],
    changes: [
      {
        id: "sc_2",
        title: "Section 14: Add Streaming Circuit Breaker",
        requestedBy: "FREELANCER",
        requestedByName: "Elena Rostova",
        date: "Today, 10:15 AM",
        costDelta: "+$400.00 USD",
        timeDelta: "+2 days",
        summary: "Integrate automatic provider switching when an upstream model experiences packet drop or elevated latency above 1200ms.",
        originalSpec: "Requests fail with upstream timeout error when model stalls.",
        amendedSpec: "Gateway detects stall after 1200ms and silently hot-swaps to Gemini Flash with zero interruption to client stream.",
        status: "PENDING_CLIENT_APPROVAL",
      },
    ],
    payments: [
      {
        id: "pay_21",
        orderId: "88AB91230C991",
        milestoneTitle: "Milestone 1: AI Provider Gateway Isolation",
        amount: "$1,200.00 USD",
        status: "HELD_IN_ESCROW",
        date: "Oct 24, 2026",
        provider: "PayPal Orders v2",
        proofHash: "sha256:7198a...88ff",
      },
    ],
    activities: [
      {
        id: "act_21",
        timestamp: "Today, 10:15 AM",
        actor: "Elena Rostova",
        role: "FREELANCER",
        action: "Scope Change Delta Proposed",
        detail: "Proposed +$400 addition for streaming circuit breaker.",
        hash: "aa190f...bc33",
      },
    ],
  },
};

// Default fallback generator for any other project IDs
export function getProjectById(id: string): ProjectDetailData {
  if (MOCK_PROJECTS[id]) {
    return MOCK_PROJECTS[id];
  }

  // Generic fallback so any id clicked will render cleanly
  return {
    id,
    name: "Enterprise Multi-Tenant Design System",
    description: "Accessible Figma component kit with Tailwind CSS & Radix UI code mappings for cross-platform consistency.",
    status: "FINDING_FREELANCERS",
    statusLabel: "Finding Freelancers",
    statusColor: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    stageSummary: "Approved brief published. 4 verified candidate profiles invited for review.",
    category: "Design Systems & Frontend",
    createdAt: "Oct 25, 2026",
    canonicalHash: "canonical_v1.0_#88c012fa",
    totalBudget: "$2,500.00 USD",
    escrowFunded: "$0.00 USD",
    releasedAmount: "$0.00 USD",
    nextMilestoneDue: "Milestones to be agreed upon",
    nextAction: {
      label: "Evaluate Candidate Proposals",
      description: "3 proposals received from verified UI/UX design architects.",
      type: "VIEW",
      urgent: false,
      tabTarget: "proposals",
    },
    freelancer: undefined,
    briefAndPrd: {
      overview: "Create a design system matching modern SaaS specifications.",
      objectives: ["Unified UI Kit", "Design Tokens", "React Tailwind components"],
      technicalArchitecture: "Figma, Tailwind CSS v4, Radix UI primitives.",
      functionalRequirements: ["WCAG 2.1 AA accessibility", "Dark and light mode palettes"],
      nonFunctionalRequirements: ["Lightweight zero-runtime footprint"],
      assumptions: ["Design token schema adheres to W3C Design Tokens Community Group"],
      exclusions: ["Native iOS/Android custom renders"],
      acceptanceCriteria: ["All components tested in Storybook with zero accessibility violations"],
      version: "v1.0 (Draft Approved)",
    },
    milestones: [
      {
        id: "m1",
        number: 1,
        title: "Tokens & Foundations",
        deliverables: ["Color palette", "Typography scale", "Spacing tokens"],
        dueDate: "Nov 10, 2026",
        amount: "$800.00 USD",
        status: "PENDING_FUNDING",
        statusLabel: "Pending Funding",
      },
      {
        id: "m2",
        number: 2,
        title: "Core Interactive Primitives",
        deliverables: ["Buttons", "Inputs", "Modals", "Tooltips"],
        dueDate: "Nov 20, 2026",
        amount: "$1,000.00 USD",
        status: "PENDING_FUNDING",
        statusLabel: "Pending Funding",
      },
      {
        id: "m3",
        number: 3,
        title: "Storybook & Documentation",
        deliverables: ["Interactive documentation site", "NPM package publish"],
        dueDate: "Nov 30, 2026",
        amount: "$700.00 USD",
        status: "PENDING_FUNDING",
        statusLabel: "Pending Funding",
      },
    ],
    proposals: [
      {
        id: "prop_design_1",
        freelancerName: "David K.",
        freelancerRole: "UI/UX Systems Architect",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=128&q=80",
        rating: "5.0 (19 jobs)",
        proposedBudget: "$2,500.00 USD",
        estimatedTimeline: "3 weeks",
        coverLetter: "I've built design systems for enterprise SaaS apps used by 50,000+ daily active users.",
        status: "UNDER_REVIEW",
        submittedDate: "Oct 27, 2026",
      },
    ],
    workspaceQuestions: [],
    changes: [],
    payments: [],
    activities: [
      {
        id: "act_init",
        timestamp: "Oct 25, 2026",
        actor: "Sambit Kumar",
        role: "CLIENT",
        action: "Project Scope Published",
        detail: "Approved brief and milestone breakdown published to talent network.",
        hash: "33ab99...112c",
      },
    ],
  };
}


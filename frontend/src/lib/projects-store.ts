// Shared persistent in-memory projects store for Next.js API routes when Express backend is offline
import { ProjectCardData, ProjectLifecycleStatus } from "@/components/client/ClientProjectsView";

export interface StoredProject extends ProjectCardData {
  title?: string;
  state?: string;
  budgetCents?: number;
  currency?: string;
  category?: string;
  subcategory?: string;
  goals?: string;
  requiredSkills?: string[];
  skills?: string[];
  detailedRequirements?: string;
  scopeOfWork?: string[];
  budgetType?: string;
  timelineDuration?: string;
  experienceLevel?: string;
  englishLevel?: string;
  visibility?: string;
  milestones?: Array<{
    id?: string;
    title: string;
    amount?: string;
    amountCents?: number;
    days?: string;
    state?: string;
    status?: string;
    deadline?: string | Date;
    deliverables?: string[];
  }>;
  clientId?: string;
  uploadedDocument?: {
    name: string;
    size?: string;
    type?: string;
    uploadedAt?: string;
    dataUrl?: string;
  };
}

const INITIAL_PROJECTS: StoredProject[] = [
  {
    id: "proj_1",
    name: "Bilateral E-Commerce Payment Rails",
    description:
      "Milestone-governed PayPal Orders v2 integration with Dual SHA-256 state machine and reconciliation retry engine.",
    status: "IN_PROGRESS",
    statusLabel: "In Progress",
    statusColor: "bg-blue-50 text-blue-700 border-blue-200/80",
    stageSummary: "Milestone deliverable package submitted with full test assert logs.",
    nextAction: {
      label: "Review Deliverable & Release Funds",
      description: "Review automated tests & approve release of funds from Sandbox escrow.",
      type: "ACTION_REQUIRED",
      urgent: true,
    },
    lastUpdated: "2 hours ago",
    updatedTimestamp: Date.now() - 2 * 3600 * 1000,
    createdAtTimestamp: Date.now() - 14 * 86400 * 1000,
    nextMilestoneDueTimestamp: Date.now() + 1 * 86400 * 1000,
    freelancer: {
      name: "Rohan Verma",
      role: "Payment Rails Specialist",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&q=80",
    },
    nextMilestone: {
      title: "M2: PayPal Webhook Ingestion Engine",
      dueDate: "Tomorrow",
      amount: "$1,500.00",
    },
    totalBudget: "$4,500.00",
    budgetCents: 450000,
    currency: "USD",
    category: "Web Development",
    subcategory: "Backend & APIs",
    goals: "Build payment engine, Integrate PayPal escrow",
    requiredSkills: ["Node.js", "PostgreSQL", "PayPal Orders v2", "State Machines"],
    skills: ["Node.js", "PostgreSQL", "PayPal Orders v2", "State Machines"],
    detailedRequirements: "• Robust bilateral escrow\n• Webhook replay protection\n• Automated reconciliation",
    scopeOfWork: ["Payment gateway", "Escrow consensus", "Dispute mitigation"],
    budgetType: "FIXED",
    timelineDuration: "1 - 2 months",
    experienceLevel: "EXPERT",
    englishLevel: "FLUENT",
    visibility: "PUBLIC",
    needsAction: true,
    hasDeltaChange: false,
    clientId: "usr_client_alex",
    milestones: [
      {
        id: "ms_proj_1_1",
        title: "M1: PayPal v2 Orders Sandbox Core",
        amount: "1500",
        amountCents: 150000,
        days: "14",
        state: "CAPTURED",
        status: "RELEASED",
      },
      {
        id: "ms_proj_1_2",
        title: "M2: PayPal Webhook Ingestion Engine",
        amount: "1500",
        amountCents: 150000,
        days: "14",
        state: "APPROVED",
        status: "IN_REVIEW",
      },
      {
        id: "ms_proj_1_3",
        title: "M3: Reconciliation Retry Engine",
        amount: "1500",
        amountCents: 150000,
        days: "14",
        state: "NOT_STARTED",
        status: "PENDING_FUNDING",
      },
    ],
  },
  {
    id: "proj_2",
    name: "CloudMesh AI Gateway Unification",
    description:
      "Unified streaming API across 4 LLM providers with semantic pgvector caching, row-level isolation & rate limiters.",
    status: "IN_PROGRESS",
    statusLabel: "In Progress",
    statusColor: "bg-blue-50 text-blue-700 border-blue-200/80",
    stageSummary: "Milestone in active engineering progress.",
    nextAction: {
      label: "Review Scope Change Delta",
      description: "Approve proposed scope addition to maintain consensus lock.",
      type: "ACTION_REQUIRED",
      urgent: true,
    },
    lastUpdated: "5 hours ago",
    updatedTimestamp: Date.now() - 5 * 3600 * 1000,
    createdAtTimestamp: Date.now() - 7 * 86400 * 1000,
    nextMilestoneDueTimestamp: Date.now() + 3 * 86400 * 1000,
    freelancer: {
      name: "Elena Rostova",
      role: "Full-Stack AI Architect",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=128&q=80",
    },
    nextMilestone: {
      title: "M1: AI Provider Gateway Isolation",
      dueDate: "In 3 days",
      amount: "$1,200.00",
    },
    totalBudget: "$3,600.00",
    budgetCents: 360000,
    currency: "USD",
    category: "AI / Machine Learning",
    subcategory: "LLM & Agent Workflows",
    goals: "Integrate AI providers, Semantic caching",
    requiredSkills: ["Python", "FastAPI", "pgvector", "Redis"],
    skills: ["Python", "FastAPI", "pgvector", "Redis"],
    detailedRequirements: "• Unified streaming across OpenAI, Anthropic, Gemini\n• Semantic vector cache\n• Tenant isolation",
    scopeOfWork: ["Gateway router", "Vector cache", "Rate limiting"],
    budgetType: "FIXED",
    timelineDuration: "2 - 3 months",
    experienceLevel: "EXPERT",
    englishLevel: "FLUENT",
    visibility: "PUBLIC",
    needsAction: true,
    hasDeltaChange: true,
    clientId: "usr_client_alex",
    milestones: [
      {
        id: "ms_proj_2_1",
        title: "M1: AI Provider Gateway Isolation",
        amount: "1200",
        amountCents: 120000,
        days: "14",
        state: "IN_PROGRESS",
        status: "IN_PROGRESS",
      },
      {
        id: "ms_proj_2_2",
        title: "M2: Semantic pgvector Caching",
        amount: "1200",
        amountCents: 120000,
        days: "14",
        state: "NOT_STARTED",
        status: "PENDING_FUNDING",
      },
    ],
  },
];

// Global in-memory cache keyed per client
declare global {
  // eslint-disable-next-line no-var
  var __nexumMockProjectsStore: Map<string, StoredProject[]> | undefined;
}

if (!globalThis.__nexumMockProjectsStore) {
  globalThis.__nexumMockProjectsStore = new Map<string, StoredProject[]>();
}

const storeMap = globalThis.__nexumMockProjectsStore;

export function getProjectsStore(clientId = "usr_client_alex"): StoredProject[] {
  if (!storeMap.has(clientId)) {
    // Clone baseline projects
    const initial = JSON.parse(JSON.stringify(INITIAL_PROJECTS));
    storeMap.set(clientId, initial);
  }
  return storeMap.get(clientId) || [];
}

export function getProjectByIdFromStore(id: string, clientId = "usr_client_alex"): StoredProject | null {
  const list = getProjectsStore(clientId);
  const found = list.find((p) => p.id === id);
  if (found) return found;

  // Search across all client caches
  for (const clientList of storeMap.values()) {
    const item = clientList.find((p) => p.id === id);
    if (item) return item;
  }
  return null;
}

export function saveProjectToStore(payload: any, clientId = "usr_client_alex"): StoredProject {
  const list = getProjectsStore(clientId);
  const isDraft = payload.state === "DRAFT";
  const id = payload.id || `prj_${isDraft ? "draft_" : ""}${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const existingIdx = list.findIndex((p) => p.id === id);

  const budgetNum = typeof payload.budgetCents === "number" ? payload.budgetCents / 100 : parseFloat(payload.budgetAmount) || 0;
  const budgetCents = payload.budgetCents ?? Math.round(budgetNum * 100);
  const totalBudgetStr = budgetCents > 0
    ? `$${(budgetCents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : undefined;

  const cardStatus: ProjectLifecycleStatus = isDraft
    ? "DRAFT"
    : payload.status || (budgetCents > 0 ? "FINDING_FREELANCERS" : "DRAFT");

  const statusLabel = cardStatus === "DRAFT"
    ? "Draft"
    : cardStatus === "FINDING_FREELANCERS"
    ? "Finding Freelancers"
    : "In Progress";

  const statusColor = cardStatus === "DRAFT"
    ? "bg-slate-100 text-slate-700 border-slate-200"
    : cardStatus === "FINDING_FREELANCERS"
    ? "bg-indigo-50 text-indigo-700 border-indigo-200/80"
    : "bg-blue-50 text-blue-700 border-blue-200/80";

  const stageSummary = cardStatus === "DRAFT"
    ? "Draft spec saved. Ready to complete remaining details and publish."
    : "Approved brief published. Open for verified candidate proposals.";

  const nextAction = cardStatus === "DRAFT"
    ? {
        label: "Resume Project Setup",
        description: "Complete remaining technical details and publish scope to match talent.",
        type: "RESUME" as const,
        urgent: false,
      }
    : {
        label: "Evaluate Candidate Proposals",
        description: "Candidate proposals received for evaluation.",
        type: "VIEW" as const,
        urgent: false,
      };

  const formattedMilestones = (payload.milestones || []).map((m: any, idx: number) => ({
    id: m.id || `ms_${id}_${idx + 1}`,
    title: m.title || `Milestone ${idx + 1}`,
    amount: String(m.amountCents ? m.amountCents / 100 : m.amount || "1000"),
    amountCents: m.amountCents ?? Math.round((parseFloat(m.amount) || 0) * 100),
    days: String(m.days || "14"),
    state: m.state || (isDraft ? "NOT_STARTED" : "UPCOMING"),
    status: m.status || (isDraft ? "PENDING_FUNDING" : "UPCOMING"),
  }));

  const projectRecord: StoredProject = {
    id,
    name: payload.title || payload.name || "Untitled Specification",
    title: payload.title || payload.name || "Untitled Specification",
    description: payload.description || payload.overview || "Project requirements and deliverables spec",
    status: cardStatus,
    statusLabel,
    statusColor,
    stageSummary,
    nextAction,
    lastUpdated: "Just now",
    updatedTimestamp: Date.now(),
    createdAtTimestamp: existingIdx >= 0 ? list[existingIdx].createdAtTimestamp : Date.now(),
    nextMilestoneDueTimestamp: null,
    totalBudget: totalBudgetStr,
    budgetCents,
    state: payload.state || (cardStatus === "DRAFT" ? "DRAFT" : "MATCHING"),
    currency: payload.currency || "USD",
    category: payload.category || "Web Development",
    subcategory: payload.subcategory || "",
    goals: payload.goals || "",
    requiredSkills: payload.requiredSkills || payload.skills || [],
    skills: payload.requiredSkills || payload.skills || [],
    detailedRequirements: payload.detailedRequirements || "",
    scopeOfWork: payload.scopeOfWork || [],
    budgetType: payload.budgetType || "FIXED",
    timelineDuration: payload.timelineDuration || "",
    experienceLevel: payload.experienceLevel || "EXPERT",
    englishLevel: payload.englishLevel || "FLUENT",
    visibility: payload.visibility || "PUBLIC",
    milestones: formattedMilestones,
    uploadedDocument: payload.uploadedDocument || (existingIdx >= 0 ? list[existingIdx].uploadedDocument : undefined),
    needsAction: false,
    hasDeltaChange: false,
    clientId,
  };

  if (existingIdx >= 0) {
    list[existingIdx] = projectRecord;
  } else {
    list.unshift(projectRecord);
  }

  storeMap.set(clientId, list);
  return projectRecord;
}

export function deleteProjectFromStore(id: string, clientId = "usr_client_alex"): boolean {
  const list = getProjectsStore(clientId);
  const nextList = list.filter((p) => p.id !== id);
  const deleted = nextList.length !== list.length;
  storeMap.set(clientId, nextList);
  return deleted;
}

export function computeProjectStats(list: StoredProject[]) {
  const inProgressCount = list.filter((p) => p.status === "IN_PROGRESS" || p.status === "IN_REVIEW").length;
  const needsActionCount = list.filter((p) => p.needsAction).length;
  return {
    totalCount: list.length,
    inProgressCount,
    needsActionCount,
    countsByStatus: {
      ALL: list.length,
      IN_PROGRESS: list.filter((p) => p.status === "IN_PROGRESS").length,
      IN_REVIEW: list.filter((p) => p.status === "IN_REVIEW").length,
      NEGOTIATION: list.filter((p) => p.status === "NEGOTIATION").length,
      FINDING_FREELANCERS: list.filter((p) => p.status === "FINDING_FREELANCERS").length,
      DRAFT: list.filter((p) => p.status === "DRAFT").length,
      COMPLETED: list.filter((p) => p.status === "COMPLETED").length,
      DISPUTED: list.filter((p) => p.status === "DISPUTED").length,
    },
  };
}

/**
 * Return all published/open projects across all clients for freelancer discovery fallback
 */
export function getAllOpenProjectsFromStore(): StoredProject[] {
  const seenIds = new Set<string>();
  const openProjects: StoredProject[] = [];

  for (const list of storeMap.values()) {
    for (const p of list) {
      const isDraftOrCompleted =
        p.status === "DRAFT" ||
        p.status === "COMPLETED" ||
        p.state === "DRAFT" ||
        p.state === "COMPLETED" ||
        p.state === "CANCELLED";
      const isOpenPosting = !isDraftOrCompleted && !p.freelancer;
      if (isOpenPosting && !seenIds.has(p.id)) {
        seenIds.add(p.id);
        openProjects.push(p);
      }
    }
  }

  return openProjects;
}


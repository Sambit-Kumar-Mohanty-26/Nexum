export type ExperienceLevel = "BEGINNER" | "JUNIOR" | "MID_LEVEL" | "SENIOR" | "EXPERT";
export type FreelancerType = "INDIVIDUAL" | "AGENCY";
export type AvailabilityStatus = "AVAILABLE" | "ACTIVE_CONTRACTOR" | "LIMITED";

export interface PortfolioHighlight {
  title: string;
  client: string;
  outcome: string;
  year: string;
  verifiedOnLedger?: boolean;
}

export interface WorkHistoryItem {
  role: string;
  company: string;
  duration: string;
  description: string;
}

export interface FitScoreBreakdown {
  overallScore: number;
  stackMatch: number;        // Technical stack overlap (40% weight)
  trackRecordMatch: number;  // Ledger-verified milestone track record (25% weight)
  budgetMatch: number;       // Hourly rate alignment with sprint budget (20% weight)
  availabilityMatch: number; // Bandwidth & turnaround capacity (15% weight)
  summaryText: string;
}

export interface FreelancerProfile {
  id: string;
  name: string;
  avatar: string;
  title: string;
  type: FreelancerType;
  experienceLevel: ExperienceLevel;
  experienceYears: number;
  bio: string;
  fullBio: string;
  skills: string[];
  location: string;
  timezone: string;
  hourlyRateCents?: number;
  hourlyRateDisplay?: string;
  availability?: AvailabilityStatus;
  recommendationReason: string;
  recommendedForProjectId?: string;
  fitScore: number;
  fitBreakdown?: FitScoreBreakdown;
  portfolioHighlights: PortfolioHighlight[];
  workHistory: WorkHistoryItem[];
  verifiedCredentials: string[];
  githubUrl?: string;
  linkedinUrl?: string;
  isSaved?: boolean;
}

export interface FreelancerInvitation {
  id: string;
  freelancerId: string;
  freelancerName: string;
  freelancerAvatar: string;
  freelancerTitle: string;
  projectId: string;
  projectName: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  sentDate: string;
  proposedRate: string;
  customNote: string;
}

export const INITIAL_FREELANCERS: FreelancerProfile[] = [
  {
    id: "usr_freelancer_rohan",
    name: "Rohan Verma",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
    title: "Senior Full-Stack & Payment Rails Engineer",
    type: "INDIVIDUAL",
    experienceLevel: "SENIOR",
    experienceYears: 7,
    bio: "Full-stack engineer specializing in Next.js, state machines, API idempotency, and PayPal Orders v2 integration with zero-drop webhook processing.",
    fullBio: "Over 7 years of full-stack engineering expertise with high-reliability payment gateways, bilateral consensus state machines, and cryptographically verified escrow release rails. Certified PayPal REST v2 integrator with deep domain knowledge in webhook signature verification and idempotent order orchestration.",
    skills: ["PayPal v2", "Next.js", "State Machines", "TypeScript", "Node.js", "PostgreSQL", "TailwindCSS"],
    location: "Bengaluru, India",
    timezone: "Asia/Kolkata (UTC+5:30)",
    hourlyRateCents: 6500,
    hourlyRateDisplay: "$65.00/hr",
    availability: "ACTIVE_CONTRACTOR",
    recommendationReason: "Direct experience with PayPal REST v2 Orders, webhook signature validation, and dual SHA-256 state machines.",
    recommendedForProjectId: "proj_1",
    fitScore: 98,
    portfolioHighlights: [
      {
        title: "Bilateral E-Commerce Payment Rails",
        client: "Horizon Commerce LLC",
        outcome: "Delivered 14 milestones with automated SHA-256 state hashing and sandbox PayPal Orders capture.",
        year: "2026",
        verifiedOnLedger: true,
      },
      {
        title: "High-Throughput Webhook Ingestion Engine",
        client: "FinTech ScaleUp",
        outcome: "Processed 4.2M events/day with 0 duplicate captures and sub-30ms replay tolerance.",
        year: "2025",
        verifiedOnLedger: true,
      },
    ],
    workHistory: [
      {
        role: "Lead Payment Architect",
        company: "PayLedger Systems",
        duration: "2023 - Present",
        description: "Architected multi-party escrow release pipelines and integrated PayPal and Stripe webhook dispatchers.",
      },
      {
        role: "Senior Backend Engineer",
        company: "Nova Commerce",
        duration: "2020 - 2023",
        description: "Built microservices handling transactional workflows and audit trails for cross-border merchants.",
      },
    ],
    verifiedCredentials: [
      "PayPal Sandbox Verified Partner",
      "Next.js Certified Enterprise Developer",
      "Level 3 Consensus Ledger Contributor",
    ],
    githubUrl: "https://github.com/rohan-v-payments",
    linkedinUrl: "https://linkedin.com/in/rohanverma-dev",
    isSaved: false,
  },
];

export const INITIAL_INVITATIONS: FreelancerInvitation[] = [
  {
    id: "inv_1",
    freelancerId: "usr_freelancer_rohan",
    freelancerName: "Rohan Verma",
    freelancerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
    freelancerTitle: "Senior Full-Stack & Payment Rails Engineer",
    projectId: "proj_1",
    projectName: "Bilateral E-Commerce Payment Rails",
    status: "ACCEPTED",
    sentDate: "Oct 24, 2026",
    proposedRate: "$65.00/hr ($4,500 milestone budget)",
    customNote: "Hi Rohan, we reviewed your PayPal REST v2 work and would like to formally invite you to lead Milestone 2 webhook processing.",
  },
];

export const AVAILABLE_SKILLS_FILTER: string[] = [
  "PayPal v2",
  "Next.js",
  "TypeScript",
  "State Machines",
  "Node.js",
  "PostgreSQL",
  "TailwindCSS",
  "Figma",
  "Design Systems",
  "Docker",
  "CI/CD",
  "React Native",
  "Kubernetes",
  "AWS",
];


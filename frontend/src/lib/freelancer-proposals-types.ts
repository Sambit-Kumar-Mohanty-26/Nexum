/**
 * Nexum Freelancer Proposals Types
 * Data structures for proposal lifecycle, negotiation, client briefs, and counteroffers.
 */

export type ProposalStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "COUNTEROFFER_RECEIVED"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN";

export type ProposalDetailTab =
  | "proposal"
  | "project_details"
  | "client"
  | "messages"
  | "activity";

export interface ProposalAttachment {
  id: string;
  name: string;
  fileType: string;
  fileSize: string;
  uploadDate: string;
  downloadUrl?: string;
}

export interface ProposalCounteroffer {
  id: string;
  originalPrice: string;
  proposedPrice: string;
  originalDuration: string;
  proposedDuration: string;
  scopeNotes: string;
  receivedDate: string;
  expiresAt: string;
}

export interface ProposalMilestoneAllocation {
  id: string;
  orderIndex: number;
  title: string;
  amount: string;
  duration: string;
  acceptanceCriteria: string[];
}

export interface ProposalActivityEvent {
  id: string;
  title: string;
  description: string;
  actor: string;
  timestamp: string;
  type: "CREATED" | "SUBMITTED" | "VIEWED" | "SHORTLISTED" | "COUNTEROFFER" | "ACCEPTED" | "REJECTED";
}

export interface FreelancerProposalItem {
  id: string;
  projectId: string;
  projectTitle: string;
  categoryIcon: "HEALTH" | "CART" | "CHART" | "MOBILE" | "CERT" | "SCHOOL" | "CRYPTO" | "GENERIC";
  status: ProposalStatus;
  statusLabel: string;
  statusBadgeColor: string;
  submittedDate: string;
  submittedTime: string;
  client: {
    id: string;
    name: string;
    companyName: string;
    verified: boolean;
    industry: string;
    companySize: string;
    location: string;
    postedDate: string;
    totalHires: number;
    avatarLetter: string;
    avatarBg: string;
  };
  clientBrief: {
    description: string;
    category: string;
    budgetRange: string;
    duration: string;
    deadline: string;
    requiredSkills: string[];
    technicalRequirements: string[];
    acceptanceCriteria: string[];
    objectives?: string[];
    technicalArchitecture?: string;
    uploadedDocument?: {
      name: string;
      size?: string;
      type?: string;
      uploadedAt?: string;
      dataUrl?: string;
    };
  };
  offer: {
    summary: string;
    approach: string;
    priceDisplay: string;
    priceType: "FIXED" | "HOURLY";
    duration: string;
    expectedStartDate: string;
    coverLetter: string;
    attachments: ProposalAttachment[];
    milestones: ProposalMilestoneAllocation[];
  };
  counteroffer?: ProposalCounteroffer;
  messagesCount: number;
  activityTrail: ProposalActivityEvent[];
  techTags: string[];
}

export interface ProposalSummaryKPIs {
  totalProposals: number;
  underReview: number;
  shortlisted: number;
  interview: number;
  accepted: number;
  rejected: number;
  counteroffer: number;
  draft: number;
}

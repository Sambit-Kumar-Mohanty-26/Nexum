export interface ProjectMilestone {
  id: string;
  number: number;
  title: string;
  amount: string;
  dueDate: string;
  status: "Accepted" | "In progress" | "Upcoming" | "CAPTURED" | "READY_FOR_WORK" | "PENDING_FUNDING" | string;
  statusColor: string;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  shortName: string;
  iconType: "cart" | "mobile" | "chart" | string;
  freelancerName: string;
  freelancerAvatar: string;
  clientName?: string;
  clientAvatar?: string;
  clientCompany?: string;
  status: "Active project" | "Negotiation" | "Draft brief" | string;
  statusColor: string;
  budget: string;
  duration: string;
  startDate: string;
  agreementVersion: string;
  unreadCount: number;
  lastMessagePreview: string;
  lastActivityTime: string;
  milestones: ProjectMilestone[];
  decisionRequired?: {
    title: string;
    description: string;
    actionLabel: string;
    version: string;
    expiresText: string;
  };
  upcomingMeeting?: {
    title: string;
    time: string;
  };
  paymentNote?: string;
  canSee: boolean;
}

export interface MediationMetric {
  priceChange: string;
  scheduleChange: string;
  agreementVersion: string;
}

export type TimelineItemType =
  | "freelancer_reply_card"
  | "client_bubble"
  | "freelancer_bubble"
  | "draft_counteroffer_card"
  | "sent_to_freelancer_card"
  | "agreement_comparison_card"
  | "meeting_proposal_card"
  | "meeting_confirmed_card"
  | "meeting_postponed_card"
  | "milestone_postponement_card"
  | "deliverable_card"
  | "notetaker_summary_card"
  | "system_event_card"
  | "CONTRACT_DRAFT"
  | "AGREEMENT_RATIFIED"
  | "ESCROW_LOCKED"
  | string;

export interface WorkspaceTaskItem {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  dueDate?: string;
  assignedToName?: string;
  assignedToRole?: string;
}

export interface WorkspaceMeetingItem {
  id: string;
  title: string;
  agenda?: string;
  durationMinutes: number;
  status: "PROPOSED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  proposedSlots: string[];
  acceptedSlot?: string;
  roomUrl: string;
  googleCalendarUrl?: string;
  icsContent?: string;
  notetakerSummary?: {
    summary: string;
    actionItems?: string[];
    keyDecisions?: string[];
    verbalScopeCreep?: string[];
    transcriptionUrl?: string;
  };
}

export interface WorkspaceDecisionItem {
  id: string;
  title: string;
  context: string;
  resolution: string;
  status: "DRAFT" | "ACCEPTED" | "REJECTED";
  sha256Seal: string;
  createdAt: string;
}

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  senderName: string;
  timestamp: string;
  summaryText?: string;
  rawMessage?: string;
  bubbleText?: string;
  badgeText?: string;
  badgeType?: "amber" | "gray" | "green" | "purple";
  sha256Seal?: string;
  metadata?: Record<string, any>;
  metrics?: MediationMetric;
  counterofferDetails?: {
    title: string;
    priceChange: string;
    schedule: string;
    expires: string;
  };
  meetingDetails?: {
    meetingId: string;
    title: string;
    durationMinutes: number;
    proposedSlots: string[];
    acceptedSlot?: string;
    roomUrl: string;
    googleCalendarUrl?: string;
  };
  deliverableDetails?: {
    milestoneId: string;
    milestoneTitle?: string;
    repoUrl?: string;
    previewUrl?: string;
    reviewDeadline?: string;
    sha256Seal?: string;
  };
  notetakerDetails?: {
    meetingId: string;
    summary: string;
    actionItems: string[];
    keyDecisions: string[];
    verbalScopeDetections?: string[];
  };
  actions?: {
    primaryLabel?: string;
    primaryAction?: string;
    secondaryLabel?: string;
    secondaryAction?: string;
    tertiaryLabel?: string;
    tertiaryAction?: string;
  };
  originalMessageLinkText?: string;
}

export interface PrivateAIChatEntry {
  id: string;
  title: string;
  projectTag: string;
  dateGroup: "TODAY" | "YESTERDAY" | "OLDER";
  messagesCount: number;
  updatedAt: string;
}

export interface BasedOnChip {
  id: string;
  label: string;
  recordType: "agreement" | "cr" | "quote" | "milestone" | "chat";
  detail: string;
}

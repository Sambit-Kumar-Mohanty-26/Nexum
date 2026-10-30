export interface ProjectMilestone {
  id: string;
  number: number;
  title: string;
  amount: string;
  dueDate: string;
  status: "Accepted" | "In progress" | "Upcoming";
  statusColor: string;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  shortName: string;
  iconType: "cart" | "mobile" | "chart";
  freelancerName: string;
  freelancerAvatar: string;
  status: "Active project" | "Negotiation" | "Draft brief";
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
  | "draft_counteroffer_card"
  | "sent_to_freelancer_card"
  | "agreement_comparison_card";

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
  metrics?: MediationMetric;
  counterofferDetails?: {
    title: string;
    priceChange: string;
    schedule: string;
    expires: string;
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


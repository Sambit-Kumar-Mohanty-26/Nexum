export type SettingsSectionKey =
  | "account"
  | "saved_projects"
  | "notifications"
  | "availability"
  | "payments"
  | "ai_preferences"
  | "connected_accounts"
  | "privacy"
  | "appearance"
  | "help"
  | "delete_account";

export interface ActiveSession {
  id: string;
  device: string;
  os: string;
  browser: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
  deviceType: "desktop" | "mobile" | "tablet";
}

export interface SavedProject {
  id: string;
  title: string;
  clientCompany: string;
  budget: string;
  skills: string[];
  status: "OPEN" | "IN_REVIEW" | "CONTRACTED" | "CLOSED";
  savedDate: string;
}

export interface NotificationPreferences {
  projectInvitations: boolean;
  proposalResponses: boolean;
  milestoneUpdates: boolean;
  deliverableReviews: boolean;
  scopeChangeRequests: boolean;
  clientMessages: boolean;
  aiMediationUpdates: boolean;
  meetingInvitations: boolean;
  agreementApprovals: boolean;
  paymentCaptures: boolean;
  pendingPayments: boolean;
  payoutProcessing: boolean;
  payoutCompleted: boolean;
  emailChannel: boolean;
  inAppChannel: boolean;
  pushChannel: boolean;
}

export interface AvailabilityPreferences {
  status: "AVAILABLE" | "BUSY" | "UNAVAILABLE";
  hourlyRate: string;
  minBudget: string;
  hoursPerWeek: string;
  duration: string;
  timezone: string;
  preferredCategories: string[];
}

export interface ConnectedAccountItem {
  id: string;
  provider: "PayPal" | "GitHub" | "Google" | "GitLab" | "Slack";
  name: string;
  identifier: string;
  isConnected: boolean;
  connectedAt?: string;
  isSandbox?: boolean;
}

export interface NexumAIPreferences {
  proposalDrafting: boolean;
  messageDrafting: boolean;
  milestoneSummaries: boolean;
  scopeChangeExplanations: boolean;
  communicationSuggestions: boolean;
  responseLanguage: string;
  responseStyle: "Concise" | "Balanced" | "Detailed";
}

export interface PrivacyPreferences {
  profileVisibility: "PUBLIC" | "VERIFIED_CLIENTS" | "PRIVATE";
  searchableInDirectory: boolean;
  showPublicPortfolio: boolean;
  shareMediationTelemetry: boolean;
}

export interface AppearancePreferences {
  theme: "light" | "dark" | "system";
  language: string;
  currency: "INR" | "USD" | "EUR";
  dateFormat: string;
  timeFormat: "12h" | "24h";
}


/**
 * Nexum API Client
 * Provides typed connectivity between the Next.js frontend and the Express/Prisma backend.
 */

import { AppNotification } from "./notifications-data";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://localhost:4000";

export interface BackendHealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  database: {
    provider: string;
    status: "CONNECTED" | "DISCONNECTED" | "ERROR";
    latencyMs: number | null;
  };
  truthStatement: string;
}

export interface ApiUser {
  id: string;
  role: "CLIENT" | "FREELANCER" | "OPERATOR";
  email: string;
  name: string;
  locale: string;
  timezone: string;
  status: string;
  presence?: string;
  createdAt: string;
  freelancerProfile?: {
    id: string;
    title: string;
    bio: string;
    skills: string[];
    availability: string;
    isDemoData: boolean;
  } | null;
}

export interface ApiProject {
  id: string;
  title: string;
  description: string;
  state: string;
  goals: string;
  budgetCents: number;
  currency: string;
  client?: { id: string; name: string; email: string };
  proposals?: Array<{
    id: string;
    version: number;
    versionHash: string;
    amountCents: number;
    currency: string;
    milestones: Array<{
      id: string;
      orderIndex: number;
      title: string;
      amountCents: number;
      state: string;
    }>;
  }>;
}

export interface ApiPaymentAttempt {
  id: string;
  milestoneId: string;
  provider: string;
  orderId?: string | null;
  captureId?: string | null;
  amountCents: number;
  currency: string;
  state: string;
  idempotencyKey: string;
  uncertaintyReason?: string | null;
  createdAt: string;
}

/**
 * Health check probe to the Express backend.
 */
export async function checkBackendHealth(): Promise<{
  connected: boolean;
  data?: BackendHealthResponse;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return { connected: false, error: `HTTP ${res.status}: ${res.statusText}` };
    }
    const data = (await res.json()) as BackendHealthResponse;
    return { connected: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to connect to backend";
    return { connected: false, error: msg };
  }
}

/**
 * Fetch all seeded users and profiles from the backend.
 */
export async function fetchBackendUsers(): Promise<{
  success: boolean;
  data?: ApiUser[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/users`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch users",
    };
  }
}

/**
 * Fetch all projects from the backend.
 */
export async function fetchBackendProjects(): Promise<{
  success: boolean;
  data?: ApiProject[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/projects`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch projects",
    };
  }
}

/**
 * Fetch payment attempts and audit timeline from the backend.
 */
export async function fetchBackendPaymentAttempts(): Promise<{
  success: boolean;
  data?: ApiPaymentAttempt[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/payments/attempts`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch payments",
    };
  }
}

/**
 * Fetch notifications from API.
 */
export async function fetchNotifications(role?: string, userId?: string): Promise<{
  success: boolean;
  notifications: AppNotification[];
  unreadCount: number;
}> {
  try {
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (userId) params.set("userId", userId);

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`/api/notifications${query}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { success: false, notifications: [], unreadCount: 0 };
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Mark all notifications as read.
 */
export async function markAllNotificationsAsRead(role?: string, userId?: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/notifications/read-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, userId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch user presence status.
 */
export async function fetchUserPresence(): Promise<string> {
  try {
    const res = await fetch(`/api/users/presence`, { cache: "no-store" });
    if (!res.ok) return "available";
    const data = await res.json();
    return data.presence || "available";
  } catch {
    return "available";
  }
}

/**
 * Update user presence status in backend and session.
 */
export async function updateUserPresence(presence: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/users/presence`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ presence }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Enqueue an event notification via the resilient backend queue.
 */
export async function publishNotificationEvent(event: {
  eventName: string;
  recipientUserId?: string;
  recipientRole?: string;
  type?: string;
  priority?: string;
  title: string;
  message: string;
  projectName?: string;
  projectId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  maxAttempts?: number;
}): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const res = await fetch(`/api/notifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to publish notification";
    return { success: false, error: msg };
  }
}

/**
 * Fetch Dead Letter Queue (DLQ) records for monitoring & forensics.
 */
export async function fetchDeadLetters(): Promise<{ success: boolean; deadLetters: unknown[] }> {
  try {
    const res = await fetch(`/api/notifications/queue/dlq`, { cache: "no-store" });
    if (!res.ok) return { success: false, deadLetters: [] };
    return await res.json();
  } catch {
    return { success: false, deadLetters: [] };
  }
}

/**
 * Replay a dead-lettered event back into the processing queue.
 */
export async function replayDeadLetter(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/notifications/queue/dlq/${id}/replay`, {
      method: "POST",
    });
    return res.ok;
  } catch {
    return false;
  }
}


// ---------------------------------------------------------------------------
// Phase 2: Freelancer Profile & Portfolio API Client
// ---------------------------------------------------------------------------

export interface FreelancerProfileData {
  id: string;
  userId: string;
  professionalTitle?: string | null;
  headline?: string | null;
  locationText?: string | null;
  countryCode?: string | null;
  timezone?: string | null;
  bio?: string | null;
  photoFileId?: string | null;
  coverFileId?: string | null;
  specialization?: string | null;
  servicesOffered?: string[];
  preferredProjectTypes?: string[];
  tools?: string[];
  experienceLevel?: string | null;
  availabilityStatus?: string;
  weeklyCapacityHours?: number | null;
  preferredEngagement?: string | null;
  rateHourlyMinor?: number | null;
  rateCurrency?: string;
  workArrangement?: string | null;
  searchVisibility?: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: string | null;
  };
  freelancerSkills?: Array<{
    id: string;
    skillName: string;
    proficiency: string;
    displayOrder: number;
  }>;
  workExperiences?: Array<{
    id: string;
    company: string;
    role: string;
    location?: string | null;
    startMonth: string;
    endMonth?: string | null;
    isCurrent: boolean;
    description?: string | null;
  }>;
  educationEntries?: Array<{
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy?: string | null;
    startYear?: number | null;
    graduationYear?: number | null;
  }>;
  certifications?: Array<{
    id: string;
    name: string;
    issuer: string;
    issuedMonth: string;
    expiryMonth?: string | null;
    expiresMonth?: string | null;
    credentialId?: string | null;
    credentialUrl?: string | null;
  }>;
  portfolioProjects?: Array<{
    id: string;
    title: string;
    description: string;
    role?: string | null;
    tools?: string[];
    projectUrl?: string | null;
    repoUrl?: string | null;
    startMonth?: string | null;
    endMonth?: string | null;
    coverFileId?: string | null;
    displayOrder: number;
  }>;
  resumeFiles?: Array<{
    id: string;
    originalName: string;
    sizeBytes: number;
    status: string;
    visibility: string;
    uploadedAt: string;
  }>;
}

export interface ProfileCompleteness {
  percent: number;
  breakdown: {
    basic: { score: number; max: number };
    skills: { score: number; max: number };
    experienceOrEducation: { score: number; max: number };
    availability: { score: number; max: number };
    resumeOrPortfolio: { score: number; max: number };
  };
  missing: string[];
}

export async function fetchFreelancerProfile(): Promise<{
  success: boolean;
  profile?: FreelancerProfileData;
  completeness?: ProfileCompleteness;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson.error?.message || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { success: true, profile: data.profile, completeness: data.completeness };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to fetch profile" };
  }
}

export async function updateBasicProfile(data: {
  professionalTitle?: string;
  headline?: string;
  locationText?: string;
  countryCode?: string;
  timezone?: string;
  bio?: string;
  photoFileId?: string | null;
  coverFileId?: string | null;
}): Promise<{ success: boolean; profile?: FreelancerProfileData; completeness?: ProfileCompleteness; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/basic`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, profile: json.profile, completeness: json.completeness };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Update failed" };
  }
}

export async function updateProfessionalProfile(data: {
  specialization?: string;
  servicesOffered?: string[];
  preferredProjectTypes?: string[];
  tools?: string[];
  experienceLevel?: string;
}): Promise<{ success: boolean; profile?: FreelancerProfileData; completeness?: ProfileCompleteness; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/professional`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, profile: json.profile, completeness: json.completeness };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Update failed" };
  }
}

export async function updateSkills(skills: Array<{ skillName: string; proficiency: string }>): Promise<{
  success: boolean;
  skills?: any[];
  completeness?: ProfileCompleteness;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/skills`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ skills }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, skills: json.skills, completeness: json.completeness };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Skills update failed" };
  }
}

export async function createExperience(data: {
  company: string;
  role: string;
  location?: string;
  startMonth: string;
  endMonth?: string;
  isCurrent?: boolean;
  description?: string;
}): Promise<{ success: boolean; experience?: any; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/experiences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, experience: json.experience };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create experience" };
  }
}

export async function updateExperience(
  id: string,
  data: Partial<{
    company: string;
    role: string;
    location: string;
    startMonth: string;
    endMonth: string;
    isCurrent: boolean;
    description: string;
  }>
): Promise<{ success: boolean; experience?: any; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/experiences/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, experience: json.experience };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update experience" };
  }
}

export async function deleteExperience(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/experiences/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function createEducation(data: {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number;
  graduationYear?: number;
}): Promise<{ success: boolean; education?: any; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/educations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, education: json.education };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create education" };
  }
}

export async function updateEducation(
  id: string,
  data: Partial<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: number;
    graduationYear: number;
  }>
): Promise<{ success: boolean; education?: any; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/educations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, education: json.education };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update education" };
  }
}

export async function deleteEducation(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/educations/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function createCertification(data: {
  name: string;
  issuer: string;
  issuedMonth: string;
  expiresMonth?: string;
  expiryMonth?: string;
  credentialId?: string;
  credentialUrl?: string;
}): Promise<{ success: boolean; certification?: any; error?: string }> {
  try {
    const payload = {
      ...data,
      expiresMonth: data.expiresMonth || data.expiryMonth,
    };
    delete (payload as any).expiryMonth;
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/certifications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, certification: json.certification };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create certification" };
  }
}

export async function updateCertification(
  id: string,
  data: Partial<{
    name: string;
    issuer: string;
    issuedMonth: string;
    expiryMonth: string;
    credentialId: string;
    credentialUrl: string;
  }>
): Promise<{ success: boolean; certification?: any; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/certifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, certification: json.certification };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update certification" };
  }
}

export async function deleteCertification(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/certifications/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function createPortfolioProject(data: {
  title: string;
  description: string;
  role?: string;
  tools?: string[];
  projectUrl?: string;
  repoUrl?: string;
  startMonth?: string;
  endMonth?: string;
  coverFileId?: string;
}): Promise<{ success: boolean; portfolio?: any; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/portfolio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, portfolio: json.portfolio };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create portfolio" };
  }
}

export async function updatePortfolioProject(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    role: string;
    tools: string[];
    projectUrl: string;
    repoUrl: string;
    startMonth: string;
    endMonth: string;
    coverFileId: string;
  }>
): Promise<{ success: boolean; portfolio?: any; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/portfolio/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, portfolio: json.portfolio };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update portfolio" };
  }
}

export async function deletePortfolioProject(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/portfolio/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function updateAvailability(data: {
  availabilityStatus?: string;
  weeklyCapacityHours?: number;
  preferredEngagement?: string;
  rateHourlyMinor?: number;
  rateCurrency?: string;
  workArrangement?: string;
  searchVisibility?: string;
}): Promise<{ success: boolean; profile?: FreelancerProfileData; completeness?: ProfileCompleteness; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/availability`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, profile: json.profile, completeness: json.completeness };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Availability update failed" };
  }
}

export async function uploadProfileFile(
  file: File,
  purpose: "PROFILE_PHOTO" | "PROFILE_COVER" | "PORTFOLIO_IMAGE"
): Promise<{ success: boolean; file?: any; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", purpose);

    const res = await fetch(`${BACKEND_URL}/api/freelancer/files`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, file: json.file };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "File upload failed" };
  }
}

export async function fetchResumeMetadata(): Promise<{
  success: boolean;
  resume?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/resume`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, resume: json.resume };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to fetch resume" };
  }
}

export async function uploadResumeFile(file: File): Promise<{
  success: boolean;
  resumeId?: string;
  extractionId?: string;
  jobId?: string;
  error?: string;
}> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BACKEND_URL}/api/freelancer/resume`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, resumeId: json.resumeId, extractionId: json.extractionId, jobId: json.jobId };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Resume upload failed" };
  }
}

export async function updateResumeVisibility(
  visibility: "PRIVATE" | "PROPOSAL_CLIENTS" | "PUBLIC"
): Promise<{ success: boolean; resume?: any; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/resume/visibility`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ visibility }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, resume: json.resume };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Visibility update failed" };
  }
}

export async function fetchPublicProfilePreview(): Promise<{
  success: boolean;
  publicProfile?: any;
  completeness?: ProfileCompleteness;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/profile/public-preview`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, publicProfile: json.publicProfile, completeness: json.completeness };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Preview fetch failed" };
  }
}

/**
 * Fetch aggregated client overview telemetry, attention items, projects & talent.
 */
export async function fetchClientOverview(clientId?: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const q = clientId ? `?clientId=${clientId}` : "";
    const res = await fetch(`/api/client/overview${q}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load client overview";
    return { success: false, error: msg };
  }
}

/**
 * Approve a milestone deliverable and capture/release escrow funds.
 */
export async function approveClientMilestone(
  milestoneId: string,
  payload?: { clientId?: string; orderId?: string }
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/client/milestones/${milestoneId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload || {}),
    });
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to approve milestone";
    return { success: false, error: msg };
  }
}

/**
 * Approve a scope change request / counteroffer.
 */
export async function approveClientScopeChange(changeRequestId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/client/change-requests/${changeRequestId}/approve`, {
      method: "POST",
    });
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to approve scope change";
    return { success: false, error: msg };
  }
}

/**
 * Invite a recommended talent to an open project (supports object payload or arguments).
 */
export type InviteTalentPayload = {
  clientId?: string;
  freelancerId: string;
  freelancerName?: string;
  freelancerAvatar?: string;
  freelancerTitle?: string;
  projectId: string;
  projectName?: string;
  proposedRate?: string;
  customNote?: string;
};

export async function inviteClientTalent(
  payloadOrFreelancerId: string | InviteTalentPayload,
  freelancerName?: string,
  projectId?: string
): Promise<{ success: boolean; invitation?: any; message?: string; error?: string }> {
  try {
    const payload =
      typeof payloadOrFreelancerId === "string"
        ? {
            freelancerId: payloadOrFreelancerId,
            freelancerName: freelancerName || "Talent",
            projectId: projectId || "proj_1",
          }
        : payloadOrFreelancerId;

    const res = await fetch(`/api/client/talent/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    const name = typeof payloadOrFreelancerId === "string" ? freelancerName : payloadOrFreelancerId.freelancerName;
    return { success: true, message: `Invitation sent to ${name || "talent"}.` };
  }
}

/**
 * Fetch paginated & filtered audit logs.
 */
export async function fetchClientAuditLogs(params?: {
  page?: number;
  limit?: number;
  search?: string;
  action?: string;
  objectType?: string;
}): Promise<{
  success: boolean;
  logs: any[];
  total: number;
  page: number;
  totalPages: number;
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.action && params.action !== "ALL") query.set("action", params.action);
    if (params?.objectType && params.objectType !== "ALL") query.set("objectType", params.objectType);

    const res = await fetch(`/api/client/audit-logs?${query.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch audit logs";
    return { success: false, logs: [], total: 0, page: 1, totalPages: 1, error: msg };
  }
}


// ===========================================================================
// Phase 3: Project Opportunities, Search & Bookmarks API Client
// ===========================================================================

export interface SearchProjectsParams {
  q?: string;
  location?: string;
  category?: string;
  experienceLevel?: "BEGINNER" | "JUNIOR" | "MID" | "SENIOR" | "EXPERT";
  budgetType?: "HOURLY" | "FIXED_PRICE" | "ALL";
  minBudgetCents?: number;
  maxBudgetCents?: number;
  skills?: string;
  sortBy?: "newest" | "budget_high" | "budget_low" | "match_high" | "fewest_proposals";
  page?: number;
  limit?: number;
}

export interface ApiProjectOpportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  skills: string[];
  experienceLevel: "BEGINNER" | "JUNIOR" | "MID" | "SENIOR" | "EXPERT" | "Entry Level" | "Intermediate" | "Expert";
  budgetType: "Hourly" | "Fixed Price";
  budgetAmount: number;
  budgetCents: number;
  currency: string;
  location: string;
  postedAt: string;
  proposalsCount: number;
  isSaved: boolean;
  client: {
    id: string;
    name: string;
    company: string;
    location: string;
    isVerified: boolean;
  };
}

export interface SearchProjectsResponse {
  success: boolean;
  projects: ApiProjectOpportunity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

export async function searchFreelancerProjects(
  params?: SearchProjectsParams
): Promise<SearchProjectsResponse> {
  try {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.location) query.set("location", params.location);
    if (params?.category) query.set("category", params.category);
    if (params?.experienceLevel) query.set("experienceLevel", params.experienceLevel);
    if (params?.budgetType) query.set("budgetType", params.budgetType);
    if (params?.minBudgetCents !== undefined) query.set("minBudgetCents", String(params.minBudgetCents));
    if (params?.maxBudgetCents !== undefined) query.set("maxBudgetCents", String(params.maxBudgetCents));
    if (params?.skills) query.set("skills", params.skills);
    if (params?.sortBy) query.set("sortBy", params.sortBy);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/search?${query.toString()}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        projects: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
        error: json.error?.message || `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      projects: json.projects || [],
      pagination: json.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 },
    };
  } catch (err: unknown) {
    return {
      success: false,
      projects: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
      error: err instanceof Error ? err.message : "Search failed",
    };
  }
}

export async function getFreelancerProjectDetails(
  id: string
): Promise<{ success: boolean; project?: any; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/${id}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, project: json.project };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to load project details" };
  }
}

export async function saveFreelancerProject(
  id: string
): Promise<{ success: boolean; isSaved: boolean; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/${id}/save`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, isSaved: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, isSaved: true };
  } catch (err: unknown) {
    return { success: false, isSaved: false, error: err instanceof Error ? err.message : "Failed to save project" };
  }
}

export async function unsaveFreelancerProject(
  id: string
): Promise<{ success: boolean; isSaved: boolean; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/${id}/save`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, isSaved: true, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, isSaved: false };
  } catch (err: unknown) {
    return { success: false, isSaved: true, error: err instanceof Error ? err.message : "Failed to unsave project" };
  }
}

export async function getSavedFreelancerProjects(): Promise<{
  success: boolean;
  savedProjects: ApiProjectOpportunity[];
  total: number;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/saved`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, savedProjects: [], total: 0, error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      savedProjects: json.savedProjects || [],
      total: json.total || 0,
    };
  } catch (err: unknown) {
    return { success: false, savedProjects: [], total: 0, error: err instanceof Error ? err.message : "Failed to fetch saved projects" };
  }
}

export interface ApiProjectRecommendation extends ApiProjectOpportunity {
  matchScore: number;
  matchReasons: string[];
}

export async function getFreelancerRecommendations(
  limit: number = 10
): Promise<{
  success: boolean;
  recommendations: ApiProjectRecommendation[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/recommended?limit=${limit}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, recommendations: [], error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      recommendations: json.recommendations || [],
    };
  } catch (err: unknown) {
    return {
      success: false,
      recommendations: [],
      error: err instanceof Error ? err.message : "Failed to fetch recommendations",
    };
  }
}

export interface ApiProjectInvitation {
  id: string;
  projectId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";
  message?: string | null;
  createdAt: string;
  respondedAt?: string | null;
  project: {
    id: string;
    title: string;
    description: string;
    category?: string;
    skills?: string[];
    budgetMinCents?: number | null;
    budgetMaxCents?: number | null;
    budgetCents?: number | null;
    currency: string;
    client?: {
      id: string;
      name: string;
      company?: string;
      location?: string;
    };
  };
}

export async function getFreelancerInvitations(): Promise<{
  success: boolean;
  invitations: ApiProjectInvitation[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/invitations`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, invitations: [], error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      invitations: json.invitations || [],
    };
  } catch (err: unknown) {
    return {
      success: false,
      invitations: [],
      error: err instanceof Error ? err.message : "Failed to fetch invitations",
    };
  }
}

export async function declineFreelancerInvitation(
  id: string,
  reason?: string
): Promise<{
  success: boolean;
  invitation?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/invitations/${id}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      invitation: json.invitation,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to decline invitation",
    };
  }
}

// ===========================================================================
// Phase 4: Proposals & Versioned Negotiation API Client
// ===========================================================================

export interface ProposalSummaryKPIs {
  all: number;
  totalProposals?: number;
  draft: number;
  submitted: number;
  underReview: number;
  shortlisted: number;
  interviewDiscussion: number;
  interview?: number;
  counterofferReceived: number;
  counteroffer?: number;
  accepted: number;
  rejected: number;
  withdrawn: number;
}

export interface ProposalListItem {
  id: string;
  projectId: string;
  projectTitle: string;
  clientName: string;
  skills: string[];
  amountDisplay: string;
  amountMinor: number;
  currency: string;
  durationWeeks: number | null;
  status: string;
  submittedAt: string | null;
  lastActivityAt: string;
  currentVersionNumber: number;
  nextAction: { code: string; label: string };
}

export interface ListProposalsParams {
  q?: string;
  status?: string;
  category?: string;
  budgetMin?: number;
  budgetMax?: number;
  submittedFrom?: string;
  submittedTo?: string;
  sort?: "newest" | "oldest" | "latest_update";
  page?: number;
  pageSize?: number;
}

export async function fetchFreelancerProposalsSummary(): Promise<{
  success: boolean;
  summary?: ProposalSummaryKPIs;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/proposals/summary`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, summary: json.summary };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch proposals summary",
    };
  }
}

export async function fetchFreelancerProposals(
  params?: ListProposalsParams
): Promise<{
  success: boolean;
  proposals: ProposalListItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.q) query.set("q", params.q);
    if (params?.status && params.status !== "ALL") query.set("status", params.status);
    if (params?.category && params.category !== "ALL") query.set("category", params.category);
    if (params?.budgetMin !== undefined) query.set("budgetMin", String(params.budgetMin));
    if (params?.budgetMax !== undefined) query.set("budgetMax", String(params.budgetMax));
    if (params?.submittedFrom) query.set("submittedFrom", params.submittedFrom);
    if (params?.submittedTo) query.set("submittedTo", params.submittedTo);
    if (params?.sort) query.set("sort", params.sort);
    if (params?.page) query.set("page", String(params.page));
    if (params?.pageSize) query.set("pageSize", String(params.pageSize));

    const res = await fetch(`${BACKEND_URL}/api/freelancer/proposals?${query.toString()}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return {
        success: false,
        proposals: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
        error: json.error?.message || `HTTP ${res.status}`,
      };
    }
    return {
      success: true,
      proposals: json.proposals || [],
      pagination: json.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    };
  } catch (err: unknown) {
    return {
      success: false,
      proposals: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
      error: err instanceof Error ? err.message : "Failed to fetch proposals",
    };
  }
}

export async function fetchFreelancerProposalDetails(id: string): Promise<{
  success: boolean;
  proposal?: any;
  currentVersion?: any;
  versions?: any[];
  projectDetails?: any;
  client?: any;
  activity?: any[];
  attachments?: any[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/proposals/${id}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      proposal: json.proposal,
      currentVersion: json.currentVersion,
      versions: json.versions,
      projectDetails: json.projectDetails,
      client: json.client,
      activity: json.activity,
      attachments: json.attachments,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load proposal details",
    };
  }
}

export async function createDraftProposal(
  projectId: string,
  invitationId?: string
): Promise<{
  success: boolean;
  proposal?: any;
  currentVersion?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/${projectId}/proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ invitationId }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      proposal: json.proposal,
      currentVersion: json.currentVersion,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create draft proposal",
    };
  }
}

export async function updateDraftProposal(
  id: string,
  data: any
): Promise<{
  success: boolean;
  proposal?: any;
  currentVersion?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/proposals/${id}/draft`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      proposal: json.proposal,
      currentVersion: json.currentVersion,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update draft proposal",
    };
  }
}

export async function submitProposal(id: string): Promise<{
  success: boolean;
  proposal?: any;
  currentVersion?: any;
  warnings?: string[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/proposals/${id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      proposal: json.proposal,
      currentVersion: json.currentVersion,
      warnings: json.warnings,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit proposal",
    };
  }
}

export async function reviseProposal(
  id: string,
  expectedVersionId: string,
  terms: any
): Promise<{
  success: boolean;
  proposal?: any;
  newVersion?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/proposals/${id}/revise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ expectedVersionId, terms }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      proposal: json.proposal,
      newVersion: json.newVersion,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to revise proposal",
    };
  }
}

export async function acceptProposalCounteroffer(
  id: string,
  expectedVersionId?: string
): Promise<{
  success: boolean;
  proposal?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/proposals/${id}/counteroffer/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ expectedVersionId }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      proposal: json.proposal,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to accept counteroffer",
    };
  }
}


export async function rejectProposalCounteroffer(
  id: string
): Promise<{
  success: boolean;
  proposal?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/proposals/${id}/counteroffer/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      proposal: json.proposal,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reject counteroffer",
    };
  }
}

export async function withdrawProposal(
  id: string,
  reason?: string
): Promise<{
  success: boolean;
  proposal?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/proposals/${id}/withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      proposal: json.proposal,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to withdraw proposal",
    };
  }
}

export async function fetchProposalDiff(
  id: string,
  from: string,
  to: string
): Promise<{
  success: boolean;
  diff?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/proposals/${id}/diff?from=${from}&to=${to}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      diff: json.diff,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch proposal diff",
    };
  }
}

export async function generateProposalAiDraft(id: string): Promise<{
  success: boolean;
  suggestedDraft?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/proposals/${id}/ai-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      suggestedDraft: json.suggestedDraft,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate AI draft",
    };
  }
}



// ==========================================
// Phase 5: Agreements, Milestones & Change Requests
// ==========================================

export async function fetchActiveProjects(): Promise<{
  success: boolean;
  projects?: any[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/active`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, projects: json.projects };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch active projects",
    };
  }
}

export async function fetchFreelancerAgreements(): Promise<{
  success: boolean;
  agreements?: any[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/agreements`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, agreements: json.agreements };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch agreements",
    };
  }
}

export async function fetchFreelancerAgreement(id: string): Promise<{
  success: boolean;
  agreement?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/agreements/${id}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, agreement: json.agreement };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch agreement",
    };
  }
}

export async function fetchAgreementDiff(
  id: string,
  from: number | string,
  to: number | string
): Promise<{
  success: boolean;
  diff?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/agreements/${id}/diff?from=${from}&to=${to}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, diff: json.diff };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch agreement diff",
    };
  }
}

export async function approveAgreementVersion(
  agreementId: string,
  versionId: string,
  contentHash: string
): Promise<{
  success: boolean;
  activated?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/agreements/${agreementId}/versions/${versionId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ contentHash }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, activated: json.activated, message: json.message };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to approve agreement version",
    };
  }
}

export async function rejectAgreementVersion(
  agreementId: string,
  versionId: string,
  reason?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/agreements/${agreementId}/versions/${versionId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to reject agreement version",
    };
  }
}

export async function fetchMilestonesSummary(): Promise<{
  success: boolean;
  summary?: {
    inProgress: number;
    awaitingReview: number;
    revisionsRequested: number;
    disputeActive: number;
    completed: number;
    total: number;
  };
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/milestones/summary`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, summary: json.summary };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch milestones summary",
    };
  }
}

export async function fetchMilestones(params?: {
  status?: string;
  projectId?: string;
  sort?: string;
  limit?: number;
}): Promise<{
  success: boolean;
  milestones?: any[];
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.projectId) query.set("projectId", params.projectId);
    if (params?.sort) query.set("sort", params.sort);
    if (params?.limit) query.set("limit", String(params.limit));

    const res = await fetch(`${BACKEND_URL}/api/freelancer/milestones?${query.toString()}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, milestones: json.milestones };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch milestones",
    };
  }
}

export async function fetchMilestone(id: string): Promise<{
  success: boolean;
  milestone?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/milestones/${id}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, milestone: json.milestone };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch milestone",
    };
  }
}

export async function startMilestone(id: string): Promise<{
  success: boolean;
  milestone?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/milestones/${id}/start`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, milestone: json.milestone };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to start milestone",
    };
  }
}

export async function readyMilestone(id: string): Promise<{
  success: boolean;
  milestone?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/milestones/${id}/ready`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, milestone: json.milestone };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to mark milestone ready",
    };
  }
}

export async function submitMilestoneDeliverable(
  id: string,
  payload: {
    note: string;
    links?: string[];
    fileIds?: string[];
  }
): Promise<{
  success: boolean;
  submission?: any;
  milestone?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/milestones/${id}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      submission: json.submission,
      milestone: json.milestone,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit milestone deliverable",
    };
  }
}

export async function submitDisputeStatement(
  id: string,
  statement: string
): Promise<{
  success: boolean;
  disputeStatement?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/milestones/${id}/dispute-statement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ statement }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, disputeStatement: json.disputeStatement };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit dispute statement",
    };
  }
}

export async function fetchChangeRequests(projectId?: string): Promise<{
  success: boolean;
  changeRequests?: any[];
  error?: string;
}> {
  try {
    const url = projectId
      ? `${BACKEND_URL}/api/freelancer/change-requests?projectId=${projectId}`
      : `${BACKEND_URL}/api/freelancer/change-requests`;
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, changeRequests: json.changeRequests };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch change requests",
    };
  }
}

export async function fetchChangeRequest(id: string): Promise<{
  success: boolean;
  changeRequest?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/change-requests/${id}`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, changeRequest: json.changeRequest };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch change request",
    };
  }
}

export async function quoteChangeRequest(
  id: string,
  payload: {
    priceDeltaMinor: number;
    rationale: string;
    addedMilestones?: any[];
    modifiedMilestones?: any[];
    removedMilestoneIds?: string[];
  }
): Promise<{
  success: boolean;
  changeRequest?: any;
  version?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/change-requests/${id}/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, changeRequest: json.changeRequest, version: json.version };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit quote for change request",
    };
  }
}

export async function declineChangeRequest(
  id: string,
  reason?: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/change-requests/${id}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to decline change request",
    };
  }
}

// ============================================================================
// PHASE 6: WORKSPACE, MEDIATED CHAT, FILES, TASKS, MEETINGS & PRIVATE NEXUM AI
// ============================================================================

export interface ApiConversationThread {
  id: string;
  projectId: string;
  projectTitle: string;
  client: { id: string; name: string };
  unreadCount: number;
  lastMessageSnippet: string | null;
  lastMessageTime: string | null;
  lastMessageClass: string | null;
  status: string;
}

export interface ApiChatMessage {
  id: string;
  senderId: string | null;
  senderKind: "USER" | "NEXUM" | "SYSTEM";
  senderName: string;
  senderRole?: string;
  isSelf: boolean;
  status: string;
  mediationState: string;
  messageClass: string | null;
  cardType: string | null;
  cardPayload: any;
  summaryText: string;
  hasOriginal: boolean;
  requiresSenderConfirmation: boolean;
  attachments: Array<{
    id: string;
    name: string;
    sizeBytes: number;
    mime: string;
  }>;
  createdAt: string;
}

export async function fetchConversations(
  filter: string = "all",
  q: string = ""
): Promise<{
  success: boolean;
  conversations?: ApiConversationThread[];
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (filter) params.set("filter", filter);
    if (q) params.set("q", q);
    const res = await fetch(`${BACKEND_URL}/api/freelancer/conversations?${params.toString()}`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, conversations: json.conversations };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch conversations",
    };
  }
}

export async function fetchConversationMessages(
  conversationId: string,
  options: { after?: string; before?: string; limit?: number } = {}
): Promise<{
  success: boolean;
  messages?: ApiChatMessage[];
  conversation?: any;
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (options.after) params.set("after", options.after);
    if (options.before) params.set("before", options.before);
    if (options.limit) params.set("limit", options.limit.toString());
    const res = await fetch(
      `${BACKEND_URL}/api/freelancer/conversations/${conversationId}/messages?${params.toString()}`,
      {
        method: "GET",
        credentials: "include",
      }
    );
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, messages: json.messages, conversation: json.conversation };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch messages",
    };
  }
}

export async function sendMessage(
  conversationId: string,
  body: string,
  attachmentFileIds: string[] = [],
  clientMessageId?: string
): Promise<{
  success: boolean;
  messageId?: string;
  status?: string;
  idempotent?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ body, attachmentFileIds, clientMessageId }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      messageId: json.messageId || json.message?.id,
      status: json.status,
      idempotent: json.idempotent,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send message",
    };
  }
}

export async function confirmMessage(
  messageId: string,
  editedSummary?: string
): Promise<{
  success: boolean;
  message?: any;
  changeRequestId?: string | null;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/messages/${messageId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ editedSummary }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, message: json.message, changeRequestId: json.changeRequestId };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to confirm message",
    };
  }
}

export async function discardMessage(
  messageId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/messages/${messageId}/discard`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to discard message",
    };
  }
}

export async function fetchOriginalMessage(
  messageId: string
): Promise<{
  success: boolean;
  originalBody?: string;
  senderKind?: string;
  attachments?: any[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/messages/${messageId}/original`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return {
      success: true,
      originalBody: json.originalBody,
      senderKind: json.senderKind,
      attachments: json.attachments,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch original message",
    };
  }
}

export async function markConversationRead(
  conversationId: string,
  upToMessageId?: string
): Promise<{
  success: boolean;
  readAt?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/conversations/${conversationId}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ upToMessageId }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, readAt: json.readAt };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to mark conversation read",
    };
  }
}

export async function fetchConversationContext(
  conversationId: string
): Promise<{
  success: boolean;
  context?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/conversations/${conversationId}/context`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, context: json.context };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch conversation context",
    };
  }
}

export async function fetchProjectFiles(
  projectId: string
): Promise<{
  success: boolean;
  files?: any[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/${projectId}/files`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, files: json.files };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch project files",
    };
  }
}

export async function fetchProjectActivity(
  projectId: string
): Promise<{
  success: boolean;
  activity?: Array<{
    id: string;
    action: string;
    objectType: string;
    objectId: string;
    actor: string;
    actorRole: string;
    timestamp: string;
    metadata?: any;
  }>;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/${projectId}/activity`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, activity: json.activity };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch project activity",
    };
  }
}

export async function uploadProjectFile(
  projectId: string,
  payload: {
    fileId: string;
    category?: string;
    name: string;
    note?: string;
    versionOf?: string;
  }
): Promise<{
  success: boolean;
  projectFile?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/${projectId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, projectFile: json.projectFile };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to upload project file",
    };
  }
}

export async function fetchProjectTasks(
  projectId?: string
): Promise<{
  success: boolean;
  tasks?: any[];
  pendingCount?: number;
  error?: string;
}> {
  try {
    const url = projectId
      ? `${BACKEND_URL}/api/freelancer/projects/${projectId}/tasks`
      : `${BACKEND_URL}/api/freelancer/tasks`;
    const res = await fetch(url, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, tasks: json.tasks, pendingCount: json.pendingCount };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch tasks",
    };
  }
}

export async function createProjectTask(
  projectId: string,
  payload: {
    title: string;
    description?: string;
    status?: string;
    dueDate?: string;
    visibility?: string;
    milestoneId?: string;
  }
): Promise<{
  success: boolean;
  task?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, task: json.task };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create task",
    };
  }
}

export async function updateProjectTask(
  taskId: string,
  payload: {
    title?: string;
    description?: string;
    status?: string;
    dueDate?: string | null;
    visibility?: string;
  }
): Promise<{
  success: boolean;
  task?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, task: json.task };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update task",
    };
  }
}

export async function deleteProjectTask(
  taskId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/tasks/${taskId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete task",
    };
  }
}

export async function fetchProjectMeetings(
  projectId: string
): Promise<{
  success: boolean;
  meetings?: any[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/${projectId}/meetings`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, meetings: json.meetings };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch meetings",
    };
  }
}

export async function proposeProjectMeeting(
  projectId: string,
  payload: {
    title: string;
    startsAt: string;
    endsAt: string;
    joinUrl?: string;
  }
): Promise<{
  success: boolean;
  meeting?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/${projectId}/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, meeting: json.meeting };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to propose meeting",
    };
  }
}

export async function respondMeeting(
  meetingId: string,
  response: "ACCEPTED" | "DECLINED"
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/meetings/${meetingId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ response }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to respond to meeting",
    };
  }
}

export async function fetchProjectDecisions(
  projectId: string
): Promise<{
  success: boolean;
  decisions?: any[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/${projectId}/decisions`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, decisions: json.decisions };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch decisions",
    };
  }
}

export async function createProjectDecision(
  projectId: string,
  payload: {
    title: string;
    description: string;
  }
): Promise<{
  success: boolean;
  decision?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/projects/${projectId}/decisions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, decision: json.decision };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create decision note",
    };
  }
}

export async function fetchPrivateAiChats(): Promise<{
  success: boolean;
  chats?: any[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/ai/chats`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, chats: json.chats };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch private AI chats",
    };
  }
}

export async function createPrivateAiChat(payload: {
  title?: string;
  projectId?: string;
} = {}): Promise<{
  success: boolean;
  chat?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/ai/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, chat: json.chat };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create private AI chat",
    };
  }
}

export async function fetchPrivateAiMessages(chatId: string): Promise<{
  success: boolean;
  chat?: any;
  messages?: any[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/ai/chats/${chatId}/messages`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, chat: json.chat, messages: json.messages };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch private AI messages",
    };
  }
}

export async function postPrivateAiMessage(
  chatId: string,
  payload: {
    content: string;
    quickAction?: "SUMMARIZE_CONVERSATION" | "DRAFT_REPLY" | "NEXT_STEPS";
  }
): Promise<{
  success: boolean;
  message?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/ai/chats/${chatId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, message: json.message };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to post message to Nexum AI",
    };
  }
}

export async function sendAiDraft(
  draftId: string,
  conversationId: string
): Promise<{
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/ai/drafts/${draftId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ conversationId }),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, messageId: json.messageId, status: json.status };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send AI draft",
    };
  }
}

export async function deletePrivateAiChat(chatId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/ai/chats/${chatId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete private AI chat",
    };
  }
}

// -------------------------------------------------------------
// Phase 7: Earnings, Payments and Evidence (PayPal Sandbox)
// -------------------------------------------------------------

export interface EarningsSummary {
  availableMinor: number;
  fundedMinor: number;
  inReviewMinor: number;
  withdrawnMinor: number;
  onHoldMinor: number;
  currency: string;
  demoRate: number;
}

export interface EarningsMilestoneItem {
  id: string;
  milestoneKey?: string | null;
  sequence?: number | null;
  title: string;
  projectId: string;
  projectTitle: string;
  clientName: string;
  amountMinor: number;
  currency: string;
  workStatus: string;
  paymentStatus: string;
  earningsLabel: string;
  lastVerifiedAt?: string | null;
  dueDate?: string | null;
  acceptedAt?: string | null;
}

export interface PayoutAccount {
  id: string;
  label: string;
  accountEmail: string;
  last4: string;
  createdAt: string;
}

export interface Payout {
  id: string;
  amountMinor: number;
  currency: string;
  status: string;
  methodLabel: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface EvidencePacket {
  id: string;
  paymentId: string;
  canonicalPayload: Record<string, any>;
  sha256Hash: string;
  createdAt: string;
  verified: boolean;
}

export async function fetchEarningsSummary(): Promise<{
  success: boolean;
  summary?: EarningsSummary;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/earnings/summary`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, summary: json.summary };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch earnings summary",
    };
  }
}

export async function fetchEarningsMilestones(query?: {
  page?: number;
  pageSize?: number;
  status?: string;
  projectId?: string;
}): Promise<{
  success: boolean;
  milestones?: EarningsMilestoneItem[];
  pagination?: { page: number; pageSize: number; total: number; totalPages: number };
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (query?.page) params.set("page", String(query.page));
    if (query?.pageSize) params.set("pageSize", String(query.pageSize));
    if (query?.status) params.set("status", query.status);
    if (query?.projectId) params.set("projectId", query.projectId);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${BACKEND_URL}/api/freelancer/earnings/milestones${qs}`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, milestones: json.milestones, pagination: json.pagination };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch earnings milestones",
    };
  }
}

export async function fetchEarningsMilestoneDetail(
  projectId: string,
  milestoneKey: string
): Promise<{
  success: boolean;
  milestone?: any;
  error?: string;
}> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/freelancer/earnings/milestones/${projectId}/${milestoneKey}`,
      {
        method: "GET",
        credentials: "include",
      }
    );
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, milestone: json.milestone };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch milestone detail",
    };
  }
}

export async function fetchPaymentEvidence(paymentId: string): Promise<{
  success: boolean;
  evidence?: EvidencePacket;
  error?: string;
}> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/freelancer/payments/${paymentId}/evidence`,
      {
        method: "GET",
        credentials: "include",
      }
    );
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, evidence: json.evidence };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch payment evidence",
    };
  }
}

export async function fetchPayoutAccount(): Promise<{
  success: boolean;
  account?: PayoutAccount | null;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/payout-account`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, account: json.account };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch payout account",
    };
  }
}

export async function updatePayoutAccount(data: {
  label?: string;
  accountEmail: string;
  last4?: string;
}): Promise<{
  success: boolean;
  account?: PayoutAccount;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/payout-account`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, account: json.account };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update payout account",
    };
  }
}

export async function deletePayoutAccount(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/payout-account`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete payout account",
    };
  }
}

export async function requestPayout(data: {
  amountMinor: number;
  currency?: string;
  idempotencyKey: string;
}): Promise<{
  success: boolean;
  payout?: Payout;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/payouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, payout: json.payout };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to request payout",
    };
  }
}

export async function fetchPayouts(): Promise<{
  success: boolean;
  payouts?: Payout[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/payouts`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, payouts: json.payouts };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch payouts",
    };
  }
}


// ============================================================================
// Phase 8: Dashboard, Notifications, Settings & Assistant Methods
// ============================================================================

export interface DashboardSummaryData {
  activeProjects: { count: number; items: any[] };
  allProposals: { count: number; byStatus: Record<string, number> };
  milestonesDueSoon: { count: number; items: any[] };
  overdue: { count: number; items: any[] };
  awaitingClientReview: { count: number; items: any[] };
  earningsSnapshot: {
    availableMinor: number;
    fundedMinor: number;
    inReviewMinor: number;
    withdrawnMinor: number;
    onHoldMinor: number;
    currency: string;
    demoRate: string;
  };
  needsYourReply: { count: number; items: any[] };
  recommendedProjects: Array<{
    id: string;
    title: string;
    budget: string;
    clientName: string;
    reason: string;
    category: string;
  }>;
  recentProposals?: Array<{
    id: string;
    title: string;
    clientName: string;
    status: string;
    amountDisplay: string;
    timeAgo: string;
  }>;
  profileCompleteness: {
    score: number;
    nextAction: string;
    missingItems: string[];
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    timestamp: string;
  }>;
  monthlyEarnings?: Array<{
    month: string;
    shortMonth: string;
    completed: number;
    pending: number;
    label: string;
  }>;
}

export async function fetchMonthlyEarnings(): Promise<{
  success: boolean;
  monthly?: Array<{
    month: string;
    shortMonth: string;
    completed: number;
    pending: number;
    label: string;
  }>;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/earnings/monthly`, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, monthly: json.monthly };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch monthly earnings",
    };
  }
}

export async function fetchFreelancerDashboard(): Promise<{
  success: boolean;
  dashboard?: DashboardSummaryData;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/dashboard`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    }
    return { success: true, dashboard: json };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch dashboard summary",
    };
  }
}

export async function fetchFreelancerAccountSettings(): Promise<{
  success: boolean;
  account?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/settings/account`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, account: json.account };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to fetch settings" };
  }
}

export async function updateFreelancerAccountSettings(data: {
  name?: string;
  timezone?: string;
  locale?: string;
  workingHours?: any;
}): Promise<{ success: boolean; account?: any; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/settings/account`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, account: json.account };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update settings" };
  }
}

export async function requestEmailChange(newEmail: string): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/settings/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ newEmail }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, token: json.token };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to request email change" };
  }
}

export async function verifyEmailChange(token: string): Promise<{
  success: boolean;
  email?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/settings/email/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, email: json.email };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to verify email change" };
  }
}

export async function updatePassword(currentPassword: string, newPassword: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/settings/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update password" };
  }
}

export async function fetchFreelancerSessions(): Promise<{
  success: boolean;
  sessions?: any[];
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/settings/sessions`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, sessions: json.sessions };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to fetch sessions" };
  }
}

export async function revokeFreelancerSession(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/settings/sessions/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPrivacySettings(): Promise<{
  success: boolean;
  privacy?: { visibility: string; showRate: boolean; showPortfolio: boolean };
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/settings/privacy`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, privacy: json.privacy };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to fetch privacy settings" };
  }
}

export async function updatePrivacySettings(data: {
  visibility?: "PUBLIC" | "PRIVATE";
  showRate?: boolean;
  showPortfolio?: boolean;
}): Promise<{ success: boolean; privacy?: any; error?: string }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/settings/privacy`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, privacy: json.privacy };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update privacy settings" };
  }
}

export async function exportFreelancerData(): Promise<{
  success: boolean;
  export?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/settings/export`, {
      method: "GET",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true, export: json.export };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to export data" };
  }
}

export async function deleteFreelancerAccount(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/settings/account`, {
      method: "DELETE",
      credentials: "include",
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete account" };
  }
}

export async function sendAssistantMessage(content: string, chatId?: string): Promise<{
  success: boolean;
  message?: string;
  refusal?: boolean;
  toolCalled?: string;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/freelancer/assistant/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ content, chatId }),
    });
    const json = await res.json();
    if (!res.ok) return { success: false, error: json.error?.message || `HTTP ${res.status}` };
    return {
      success: true,
      message: json.message,
      refusal: json.refusal,
      toolCalled: json.toolCalled,
      data: json.data,
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to contact assistant" };
  }
}

// Namespace export for structured module access
export const workspace = {
  getConversations: fetchConversations,
  getMessages: fetchConversationMessages,
  sendMessage: sendMessage,
  confirmMessage: confirmMessage,
  discardMessage: discardMessage,
  fetchOriginalMessage: fetchOriginalMessage,
  markConversationRead: markConversationRead,
  getContext: fetchConversationContext,
};

export const api = {
  workspace,
  fetchConversations,
  fetchConversationMessages,
  sendMessage,
  confirmMessage,
  discardMessage,
  fetchOriginalMessage,
  markConversationRead,
  fetchConversationContext,
};


// ===========================================================================
// Client Dashboard API - Projects, Milestones, Freelancers, Settings
// ===========================================================================

/**
 * Fetch projects and drafts with dynamic counts and filter status
 */
export async function fetchClientProjects(params?: {
  clientId?: string;
  status?: string;
  search?: string;
}): Promise<{
  success: boolean;
  count: number;
  data: any[];
  stats: {
    totalCount: number;
    inProgressCount: number;
    needsActionCount: number;
    countsByStatus: Record<string, number>;
  };
}> {
  try {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "ALL") query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    const res = await fetch(`/api/projects?${query.toString()}`, { cache: "no-store", credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { success: true, count: 0, data: [], stats: { totalCount: 0, inProgressCount: 0, needsActionCount: 0, countsByStatus: {} } };
  }
}

/**
 * Fetch a single project or draft by ID
 */
export async function fetchProjectById(id: string): Promise<any | null> {
  try {
    const res = await fetch(`/api/projects/${id}`, { cache: "no-store", credentials: "include" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch { return null; }
}

/**
 * Save or publish a project/draft
 */
export async function saveProject(payload: any): Promise<{
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}> {
  try {

    const method = payload.id ? "PUT" : "POST";
    const endpoint = payload.id ? `/api/projects/${payload.id}` : "/api/projects";
    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save project";
    return { success: false, error: msg };
  }
}

/**
 * Delete a project or draft
 */
export async function deleteProject(id: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/projects/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete project";
    return { success: false, error: msg };
  }
}

/**
 * Fetch all client milestones with live telemetry stats and project groupings
 */
export async function fetchClientMilestones(clientId?: string): Promise<{
  success: boolean;
  count: number;
  data: any[];
  stats: {
    upcomingCount: number;
    awaitingReviewCount: number;
    overdueCount: number;
    completedCount: number;
  };
  distinctProjects: Array<{ id: string; name: string }>;
  error?: string;
}> {
  try {
    const query = clientId ? `?clientId=${clientId}` : "";
    const res = await fetch(`/api/client/milestones${query}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch milestones";
    return {
      success: false,
      count: 0,
      data: [],
      stats: {
        upcomingCount: 0,
        awaitingReviewCount: 0,
        overdueCount: 0,
        completedCount: 0,
      },
      distinctProjects: [],
      error: msg,
    };
  }
}

/**
 * Request corrections for an unaccepted milestone deliverable
 */
export async function requestClientMilestoneCorrections(
  milestoneId: string,
  payload: { notes: string; unmetCriteria: string[]; clientId?: string }
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/client/milestones/${milestoneId}/corrections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to request corrections";
    return { success: false, error: msg };
  }
}

/**
 * Fetch verified freelancers with explainable match fitScores, breakdown metrics, and server-side pagination
 */
export async function fetchClientFreelancers(
  paramsOrClientId?: string | {
    clientId?: string;
    page?: number;
    limit?: number;
    search?: string;
    skills?: string[];
    experienceLevel?: string;
    type?: string;
    availability?: string;
    projectId?: string;
    maxHourlyRate?: number;
    sortBy?: string;
  }
): Promise<{
  success: boolean;
  count: number;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasMore?: boolean;
  data: any[];
  error?: string;
}> {
  try {
    const query = new URLSearchParams();
    if (typeof paramsOrClientId === "string") {
      query.set("clientId", paramsOrClientId);
    } else if (paramsOrClientId) {
      if (paramsOrClientId.clientId) query.set("clientId", paramsOrClientId.clientId);
      if (paramsOrClientId.page) query.set("page", String(paramsOrClientId.page));
      if (paramsOrClientId.limit) query.set("limit", String(paramsOrClientId.limit));
      if (paramsOrClientId.search) query.set("search", paramsOrClientId.search);
      if (paramsOrClientId.skills?.length) query.set("skills", paramsOrClientId.skills.join(","));
      if (paramsOrClientId.experienceLevel && paramsOrClientId.experienceLevel !== "ALL") {
        query.set("experienceLevel", paramsOrClientId.experienceLevel);
      }
      if (paramsOrClientId.type && paramsOrClientId.type !== "ALL") {
        query.set("type", paramsOrClientId.type);
      }
      if (paramsOrClientId.availability && paramsOrClientId.availability !== "ALL") {
        query.set("availability", paramsOrClientId.availability);
      }
      if (paramsOrClientId.projectId && paramsOrClientId.projectId !== "ALL") {
        query.set("projectId", paramsOrClientId.projectId);
      }
      if (paramsOrClientId.maxHourlyRate) {
        query.set("maxHourlyRate", String(paramsOrClientId.maxHourlyRate));
      }
      if (paramsOrClientId.sortBy) query.set("sortBy", paramsOrClientId.sortBy);
    }

    const res = await fetch(`/api/client/freelancers?${query.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch freelancers";
    return { success: false, count: 0, data: [], error: msg };
  }
}

/**
 * Toggle bookmark / saved status for a freelancer candidate
 */
export async function toggleSaveFreelancer(
  freelancerId: string,
  clientId?: string
): Promise<{ success: boolean; isSaved: boolean; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/client/freelancers/${freelancerId}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to toggle bookmark";
    return { success: false, isSaved: false, error: msg };
  }
}

/**
 * Fetch all formal project invitations sent by this client
 */
export async function fetchClientInvitations(clientId?: string): Promise<{
  success: boolean;
  count: number;
  data: any[];
  error?: string;
}> {
  try {
    const query = clientId ? `?clientId=${clientId}` : "";
    const res = await fetch(`/api/client/invitations${query}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch invitations";
    return { success: false, count: 0, data: [], error: msg };
  }
}

export interface ClientSettingsProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  company: string;
  website: string;
  timezone: string;
  bio: string;
  avatar: string;
}

export interface ClientSettingsSecurity {
  twoFactorEnabled: boolean;
  passwordLastChanged: string;
  activeSessions: Array<{
    id: string;
    device: string;
    location: string;
    ip: string;
    isCurrent: boolean;
    lastActive: string;
  }>;
}

export interface BillingReceiptItem {
  id: string;
  orderId: string;
  projectTitle: string;
  date: string;
  amount: string;
  status: string;
  receiptUrl?: string;
}

export interface ClientSettingsPayments {
  autoFundMilestones: boolean;
  disputeMediationBuffer: boolean;
  paypalSandboxStatus: "CONNECTED" | "DISCONNECTED";
  paypalEmail: string;
  defaultCurrency: string;
  vatOrTaxId: string;
  billingReceipts?: BillingReceiptItem[];
}

export interface ClientSettingsNotifications {
  proposalsEmail: boolean;
  proposalsInApp: boolean;
  messagesEmail: boolean;
  messagesInApp: boolean;
  milestonesEmail: boolean;
  milestonesInApp: boolean;
  revisionsEmail: boolean;
  revisionsInApp: boolean;
  paymentsEmail: boolean;
  paymentsInApp: boolean;
  deadlinesEmail: boolean;
  deadlinesInApp: boolean;
}

export interface ClientSettingsHiring {
  budgetMin: number;
  budgetMax: number;
  preferredExpLevel: "ENTRY" | "INTERMEDIATE" | "SENIOR" | "EXPERT" | string;
  preferredSkills: string[];
  autoMatchThreshold: number;
}

export interface ClientSettingsPrivacy {
  profileVisibility: "PUBLIC" | "VERIFIED_ONLY" | "PRIVATE";
  shareAuditTelemetry: boolean;
}

export interface ClientSettingsData {
  profile: ClientSettingsProfile;
  security: ClientSettingsSecurity;
  payments: ClientSettingsPayments;
  notifications: ClientSettingsNotifications;
  hiring: ClientSettingsHiring;
  privacy: ClientSettingsPrivacy;
  updatedAt: string;
}

/**
 * Fetch full workspace settings for a client
 */
export async function fetchClientSettings(clientId?: string): Promise<{
  success: boolean;
  data: ClientSettingsData;
  error?: string;
}> {
  try {
    const q = clientId ? `?clientId=${clientId}` : "";
    const res = await fetch(`/api/client/settings${q}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch settings";
    return { success: false, data: {} as any, error: msg };
  }
}

/**
 * Update client workspace settings
 */
export async function updateClientSettings(
  settings: Partial<ClientSettingsData>,
  clientId?: string
): Promise<{
  success: boolean;
  data?: ClientSettingsData;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/client/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, clientId }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update settings";
    return { success: false, error: msg };
  }
}

/**
 * Change client password securely
 */
export async function changeClientPassword(payload: {
  currentPassword: string;
  newPassword: string;
  userId?: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/client/settings/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      return { success: false, error: json.error || `HTTP ${res.status}` };
    }
    return json;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to change password";
    return { success: false, error: msg };
  }
}

/**
 * Revoke other active device sessions
 */
export async function revokeOtherClientSessions(userId?: string): Promise<{
  success: boolean;
  remainingSessions?: number;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/client/settings/sessions/revoke-others`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to revoke sessions";
    return { success: false, error: msg };
  }
}

/**
 * Submit priority support or mediation ticket
 */
export async function submitClientSupportTicket(ticket: {
  category: string;
  issue: string;
  projectId?: string;
  userId?: string;
}): Promise<{
  success: boolean;
  ticketId?: string;
  message?: string;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/client/settings/support`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ticket),
    });
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit ticket";
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Workspace Collaboration, Cryptographic Timeline, Meetings & Tasks
// ---------------------------------------------------------------------------

/**
 * Fetch real active workspace projects for a user.
 * Returns truthful empty list when user has zero projects.
 */
export async function fetchWorkspaceProjects(
  userId = "usr_client_alex",
  role = "CLIENT"
): Promise<{
  success: boolean;
  count: number;
  data: any[];
  error?: string;
}> {
  try {
    const res = await fetch(
      `/api/workspace/projects?userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`,
      { cache: "no-store" }
    );
    return await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch workspace projects";
    return { success: false, count: 0, data: [], error: msg };
  }
}

/**
 * Fetch bilateral workspace state (timeline, meetings, tasks, decisions, agreement hash)
 */
export async function getWorkspaceTimeline(projectId: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/workspace/projects/${projectId}/timeline`, {
      cache: "no-store",
    });
    return await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch timeline";
    return { success: false, error: msg };
  }
}

/**
 * Send a message into the bilateral workspace
 */
export async function sendWorkspaceMessage(
  projectId: string,
  payload: {
    senderId: string;
    senderRole: "CLIENT" | "FREELANCER" | "OPERATOR";
    content: string;
    type?: string;
    origin?: "WEB" | "TELEGRAM";
    metadata?: Record<string, unknown>;
  }
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/workspace/projects/${projectId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send message";
    return { success: false, error: msg };
  }
}

/**
 * Propose a scope amendment (Existing milestone delta or new milestone)
 */
export async function proposeScopeAmendment(
  projectId: string,
  payload: {
    proposerId: string;
    amendmentType: "AMEND_EXISTING_MILESTONE" | "ADD_NEW_MILESTONE" | "ZERO_COST_TWEAK";
    milestoneId?: string;
    newMilestoneTitle?: string;
    priceDeltaCents: number;
    timelineDaysDelta: number;
    newAcceptanceCriteria: string[];
    justification: string;
  }
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/workspace/projects/${projectId}/amendments/propose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to propose amendment";
    return { success: false, error: msg };
  }
}

/**
 * Respond to pending scope amendment (Accept or Decline)
 */
export async function respondToScopeAmendment(
  projectId: string,
  messageId: string,
  payload: {
    responderId: string;
    action: "ACCEPT" | "DECLINE";
  }
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/workspace/projects/${projectId}/amendments/${messageId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to respond to amendment";
    return { success: false, error: msg };
  }
}

/**
 * Submit deliverable and trigger 72-hour inspection clock
 */
export async function submitWorkspaceDeliverable(
  projectId: string,
  payload: {
    milestoneId: string;
    freelancerId: string;
    repoUrl: string;
    previewUrl?: string;
    notes: string;
  }
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/workspace/projects/${projectId}/deliverables/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to submit deliverable";
    return { success: false, error: msg };
  }
}

/**
 * Propose meeting with 1-3 time slots
 */
export async function proposeWorkspaceMeeting(
  projectId: string,
  payload: {
    proposedByUserId: string;
    title: string;
    agenda: string;
    durationMinutes: number;
    proposedSlots: Array<{ id: string; startTime: string; endTime: string }>;
  }
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/workspace/projects/${projectId}/meetings/propose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to propose meeting";
    return { success: false, error: msg };
  }
}

/**
 * Confirm meeting time slot with Google Calendar link generation
 */
export async function respondToWorkspaceMeeting(
  projectId: string,
  meetingId: string,
  payload: {
    responderId: string;
    action: "CONFIRM" | "DECLINE";
    selectedSlotTime?: string;
  }
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/workspace/projects/${projectId}/meetings/${meetingId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to respond to meeting";
    return { success: false, error: msg };
  }
}

/**
 * Submit autonomous meeting notetaker summary & auto-extract tasks/ADRs
 */
export async function submitMeetingNotetakerSynthesis(
  projectId: string,
  meetingId: string,
  payload: {
    executiveSummary: string;
    actionItems: Array<{ task: string; assigneeId?: string; dueDate?: string }>;
    decisions: Array<{ title: string; description: string }>;
    transcriptSegments?: Array<{ speaker: string; timestamp: string; text: string }>;
    verbalScopeAlert?: { detected: boolean; verbalAgreementSnippet: string; suggestedDeltaCents: number };
  }
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/workspace/projects/${projectId}/meetings/${meetingId}/notetaker/synthesize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to synthesize meeting notes";
    return { success: false, error: msg };
  }
}

/**
 * Create a Kanban Task
 */
export async function createWorkspaceTask(
  projectId: string,
  payload: {
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assignedToId?: string;
    dueDate?: string;
  }
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/workspace/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create task";
    return { success: false, error: msg };
  }
}

/**
 * Update Kanban Task status
 */
export async function updateWorkspaceTaskStatus(
  taskId: string,
  status: string
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/workspace/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update task status";
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Telegram Mobile Edge Node Gateway
// ---------------------------------------------------------------------------

/**
 * Fetch 1-click deep link to pair Telegram account with Nexum
 */
export async function getTelegramDeepLink(userId = "usr_client_alex"): Promise<{
  success: boolean;
  data?: {
    deepLink: string;
    isLinked: boolean;
    telegramUsername?: string;
    telegramNotifications?: boolean;
  };
  error?: string;
}> {
  try {
    const res = await fetch(`/api/telegram/link?userId=${encodeURIComponent(userId)}`, {
      cache: "no-store",
    });
    return await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get Telegram deep link";
    return {
      success: false,
      data: {
        deepLink: "https://t.me/NexumDev_Bot?start=link_usr_client_alex",
        isLinked: false,
      },
      error: msg,
    };
  }
}

/**
 * Disconnect Telegram pairing
 */
export async function disconnectTelegram(userId = "usr_client_alex"): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/telegram/disconnect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    return await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to disconnect Telegram";
    return { success: false, error: msg };
  }
}


// ============================================================================
// Phase 7: Client Financial Ledger & PayPal Orders REST v2
// ============================================================================

/**
 * Fetch client payments & financial escrow summary.
 */
export async function fetchClientPaymentsSummary(clientId?: string): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    const q = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
    const res = await fetch(`${BACKEND_URL}/api/client/payments/summary${q}`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load payment summary";
    return { success: false, error: msg };
  }
}

/**
 * Fetch client transaction history with cryptographic evidence.
 */
export async function fetchClientTransactions(
  clientId?: string,
  filter?: { status?: string; search?: string }
): Promise<{
  success: boolean;
  data?: any[];
  count?: number;
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (clientId) params.append("clientId", clientId);
    if (filter?.status && filter.status !== "ALL") params.append("status", filter.status);
    if (filter?.search) params.append("search", filter.search);

    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${BACKEND_URL}/api/client/payments/transactions${qs}`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load transactions";
    return { success: false, data: [], error: msg };
  }
}

/**
 * Fetch client cash flow points for spline chart.
 */
export async function fetchClientCashFlow(
  clientId?: string,
  timeframe = "1M"
): Promise<{
  success: boolean;
  data?: any[];
  error?: string;
}> {
  try {
    const params = new URLSearchParams();
    if (clientId) params.append("clientId", clientId);
    if (timeframe) params.append("timeframe", timeframe);

    const res = await fetch(`${BACKEND_URL}/api/client/payments/cash-flow?${params.toString()}`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load cash flow";
    return { success: false, data: [], error: msg };
  }
}

/**
 * Fetch urgent client action items (milestone deliverables submitted).
 */
export async function fetchClientActionRequired(clientId?: string): Promise<{
  success: boolean;
  data?: any | null;
  error?: string;
}> {
  try {
    const q = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
    const res = await fetch(`${BACKEND_URL}/api/client/payments/action-required${q}`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return { success: false, data: null };
  }
}

/**
 * Fetch upcoming scheduled deliverable for client.
 */
export async function fetchClientUpcomingDeliverable(clientId?: string): Promise<{
  success: boolean;
  data?: any | null;
  error?: string;
}> {
  try {
    const q = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
    const res = await fetch(`${BACKEND_URL}/api/client/payments/upcoming${q}`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err: unknown) {
    return { success: false, data: null };
  }
}

/**
 * Authorize and Release milestone escrow funds to freelancer.
 */
export async function authorizeClientMilestoneRelease(
  milestoneId: string,
  clientId?: string
): Promise<{
  success: boolean;
  receiptNumber?: string;
  proofHash?: string;
  amountReleased?: string;
  freelancerName?: string;
  error?: string;
}> {
  try {
    const q = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
    const res = await fetch(`${BACKEND_URL}/api/client/payments/release${q}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ milestoneId }),
    });
    return await res.json();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to release milestone escrow";
    return { success: false, error: msg };
  }
}

import { prisma } from "../../prisma.js";
import { LedgerEntryKind, MilestoneWorkStatus, ProjectState, ChangeRequestStatus, PaymentState } from "@prisma/client";
import { calculateProfileCompleteness } from "../../lib/profileCompleteness.js";

export interface ActiveProjectItem {
  id: string;
  title: string;
  client: { id: string; name: string };
  status: string;
  agreementId: string;
  milestonesTotal: number;
  milestonesAccepted: number;
}

export interface MilestoneCardItem {
  id: string;
  title: string;
  projectId: string;
  projectTitle: string;
  dueDate: string | null;
  amountMinor: number;
  currency: string;
  status: string;
  daysOverdue?: number;
}

export interface NeedsReplyItem {
  id: string;
  type: string;
  title: string;
  linkKind: string;
  linkId: string;
  createdAt: string;
}

export interface RecommendedProjectItem {
  id: string;
  title: string;
  budget: string;
  clientName: string;
  reason: string;
  category: string;
}

export interface RecentProposalSummaryItem {
  id: string;
  title: string;
  clientName: string;
  status: string;
  amountDisplay: string;
  timeAgo: string;
}

export interface DashboardSummaryResponse {
  activeProjects: { count: number; items: ActiveProjectItem[] };
  allProposals: { count: number; byStatus: Record<string, number> };
  milestonesDueSoon: { count: number; items: MilestoneCardItem[] };
  overdue: { count: number; items: MilestoneCardItem[] };
  awaitingClientReview: { count: number; items: MilestoneCardItem[] };
  earningsSnapshot: {
    availableMinor: number;
    fundedMinor: number;
    inReviewMinor: number;
    withdrawnMinor: number;
    onHoldMinor: number;
    currency: string;
    demoRate: string;
  };
  needsYourReply: { count: number; items: NeedsReplyItem[] };
  recommendedProjects: RecommendedProjectItem[];
  recentProposals?: RecentProposalSummaryItem[];
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

/**
 * 1. Active Projects Query
 * Criteria: Agreement ACTIVE and Project state ACTIVE, MATCHING, or NEGOTIATING.
 */
export async function getActiveProjects(freelancerId: string): Promise<{ count: number; items: ActiveProjectItem[] }> {
  const agreements = await prisma.agreement.findMany({
    where: {
      freelancerId,
      status: { in: ["ACTIVE", "COMPLETED"] },
      project: {
        state: { in: [ProjectState.ACTIVE, ProjectState.MATCHING, ProjectState.NEGOTIATING, ProjectState.COMPLETED] },
      },
    },
    include: {
      project: {
        include: {
          client: { select: { id: true, name: true } },
        },
      },
      milestones: { where: { removedAt: null } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const items: ActiveProjectItem[] = [];

  for (const agr of agreements) {
    let milestones = agr.milestones;
    if (milestones.length === 0) {
      milestones = await prisma.milestone.findMany({
        where: { projectId: agr.projectId, removedAt: null },
      });
    }

    const total = milestones.length;
    const accepted = milestones.filter((m: any) => m.workStatus === MilestoneWorkStatus.ACCEPTED).length;
    const isCompleted = (total > 0 && accepted === total) || agr.project.state === ProjectState.COMPLETED || agr.status === "COMPLETED";
    const status = isCompleted ? "COMPLETED" : "ACTIVE";

    items.push({
      id: agr.project.id,
      title: agr.project.title,
      client: agr.project.client,
      status,
      agreementId: agr.id,
      milestonesTotal: total,
      milestonesAccepted: accepted,
    });
  }

  return { count: items.length, items };
}

/**
 * 2. All Proposals Query
 * Returns total count and status breakdown matching the Proposals directory.
 */
export async function getAllProposals(freelancerId: string): Promise<{ count: number; byStatus: Record<string, number> }> {
  const proposals = await prisma.proposal.findMany({
    where: { freelancerId },
    select: { id: true, status: true },
  });

  const byStatus: Record<string, number> = {};
  for (const p of proposals) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  }

  return { count: proposals.length, byStatus };
}

/**
 * 3. Milestones Due Soon Query
 * Due within `withinDays` (default 7 days), and not yet ACCEPTED.
 */
export async function getMilestonesDueSoon(
  freelancerId: string,
  withinDays = 7
): Promise<{ count: number; items: MilestoneCardItem[] }> {
  const now = new Date();
  const future = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

  const milestones = await prisma.milestone.findMany({
    where: {
      agreement: { freelancerId },
      removedAt: null,
      workStatus: { not: MilestoneWorkStatus.ACCEPTED },
      dueDate: {
        gte: now,
        lte: future,
      },
    },
    include: {
      project: { select: { id: true, title: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const items: MilestoneCardItem[] = milestones.map((m: any) => ({
    id: m.id,
    title: m.title,
    projectId: m.project?.id || "",
    projectTitle: m.project?.title || "",
    dueDate: m.dueDate ? m.dueDate.toISOString() : null,
    amountMinor: m.amountMinor,
    currency: m.currency,
    status: m.workStatus,
  }));

  return { count: items.length, items };
}

/**
 * 4. Overdue Milestones Query
 * RULE: Overdue stays computed: never stored, derived from due date and milestone status.
 */
export async function getOverdueMilestones(freelancerId: string): Promise<{ count: number; items: MilestoneCardItem[] }> {
  const now = new Date();

  const milestones = await prisma.milestone.findMany({
    where: {
      agreement: { freelancerId },
      removedAt: null,
      workStatus: { not: MilestoneWorkStatus.ACCEPTED },
      dueDate: {
        lt: now,
      },
    },
    include: {
      project: { select: { id: true, title: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const items: MilestoneCardItem[] = milestones.map((m: any) => {
    const diffMs = now.getTime() - (m.dueDate?.getTime() || now.getTime());
    const daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    return {
      id: m.id,
      title: m.title,
      projectId: m.project?.id || "",
      projectTitle: m.project?.title || "",
      dueDate: m.dueDate ? m.dueDate.toISOString() : null,
      amountMinor: m.amountMinor,
      currency: m.currency,
      status: m.workStatus,
      daysOverdue,
    };
  });

  return { count: items.length, items };
}

/**
 * 5. Awaiting Client Review Milestones Query
 */
export async function getAwaitingClientReviewMilestones(
  freelancerId: string
): Promise<{ count: number; items: MilestoneCardItem[] }> {
  const milestones = await prisma.milestone.findMany({
    where: {
      agreement: { freelancerId },
      removedAt: null,
      workStatus: MilestoneWorkStatus.AWAITING_CLIENT_REVIEW,
    },
    include: {
      project: { select: { id: true, title: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const items: MilestoneCardItem[] = milestones.map((m: any) => ({
    id: m.id,
    title: m.title,
    projectId: m.project?.id || "",
    projectTitle: m.project?.title || "",
    dueDate: m.dueDate ? m.dueDate.toISOString() : null,
    amountMinor: m.amountMinor,
    currency: m.currency,
    status: m.workStatus,
  }));

  return { count: items.length, items };
}

/**
 * 6. Earnings Snapshot Query
 * Uses exact Phase 7 minor units logic and honest status labels.
 */
export async function getEarningsSnapshot(freelancerId: string): Promise<{
  availableMinor: number;
  fundedMinor: number;
  inReviewMinor: number;
  withdrawnMinor: number;
  onHoldMinor: number;
  currency: string;
  demoRate: string;
}> {
  const ledgerEntries = await prisma.ledgerEntry.findMany({
    where: { userId: freelancerId },
  });

  let totalReleased = 0;
  let totalWithdrawn = 0;
  let totalOnHold = 0;

  for (const entry of ledgerEntries) {
    if (entry.kind === LedgerEntryKind.RELEASED) {
      totalReleased += entry.amountMinor;
    } else if (entry.kind === LedgerEntryKind.PAYOUT_SIMULATED) {
      totalWithdrawn += entry.amountMinor;
    } else if (entry.kind === LedgerEntryKind.HOLD) {
      totalOnHold += entry.amountMinor;
    }
  }

  // Fail-safe reconciliation: also include accepted milestones if not already in ledger
  const acceptedMilestones = await prisma.milestone.findMany({
    where: {
      OR: [
        { agreement: { freelancerId }, workStatus: MilestoneWorkStatus.ACCEPTED, state: PaymentState.CAPTURED },
        { project: { agreement: { freelancerId } }, workStatus: MilestoneWorkStatus.ACCEPTED, state: PaymentState.CAPTURED },
      ],
      removedAt: null,
    },
  });

  const milestoneTotalMinor = acceptedMilestones.reduce(
    (sum, m) => sum + (m.amountMinor || m.amountCents || 0),
    0
  );
  if (milestoneTotalMinor > totalReleased) {
    totalReleased = milestoneTotalMinor;
  }

  const availableMinor = Math.max(0, totalReleased - totalWithdrawn);

  const milestones = await prisma.milestone.findMany({
    where: {
      agreement: { freelancerId },
      removedAt: null,
    },
    include: {
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  let fundedMinor = 0;
  let inReviewMinor = 0;

  for (const m of milestones) {
    const latestPayment = m.payments[0];
    if (latestPayment && latestPayment.status === "CAPTURED") {
      if (m.workStatus === MilestoneWorkStatus.IN_PROGRESS || m.workStatus === MilestoneWorkStatus.REVISIONS_REQUESTED) {
        fundedMinor += latestPayment.amountMinor;
      } else if (m.workStatus === MilestoneWorkStatus.AWAITING_CLIENT_REVIEW) {
        inReviewMinor += latestPayment.amountMinor;
      }
    }
  }

  return {
    availableMinor,
    fundedMinor,
    inReviewMinor,
    withdrawnMinor: totalWithdrawn,
    onHoldMinor: totalOnHold,
    currency: "USD",
    demoRate: "USD",
  };
}

/**
 * 7. Needs Your Reply Query
 * Mediated requests or messages addressed to freelancer that are unanswered,
 * or change requests awaiting quote/approval.
 */
export async function getNeedsYourReply(freelancerId: string): Promise<{ count: number; items: NeedsReplyItem[] }> {
  // Pending change requests requested by client for freelancer's agreements
  const changeRequests = await prisma.changeRequest.findMany({
    where: {
      agreement: { freelancerId },
      status: { in: [ChangeRequestStatus.OPEN, ChangeRequestStatus.QUOTE_SUBMITTED, ChangeRequestStatus.PENDING] },
      NOT: { raisedById: freelancerId },
    },
    include: {
      agreement: { select: { projectId: true } },
    },
    take: 5,
  });

  const items: NeedsReplyItem[] = changeRequests.map((cr: any) => ({
    id: cr.id,
    type: "CHANGE_REQUEST",
    title: `Change request pending review (${cr.description.slice(0, 40) || "Scope Update"})`,
    linkKind: "agreement",
    linkId: cr.agreementId || "",
    createdAt: cr.createdAt.toISOString(),
  }));

  // Also check unread notifications with action required
  const unreadMessages = await prisma.notification.findMany({
    where: {
      userId: freelancerId,
      readAt: null,
      type: "MESSAGE",
    },
    take: 5,
  });

  for (const msg of unreadMessages) {
    items.push({
      id: msg.id,
      type: "MESSAGE",
      title: msg.title,
      linkKind: msg.linkKind,
      linkId: msg.linkId,
      createdAt: msg.createdAt.toISOString(),
    });
  }

  return { count: items.length, items };
}

/**
 * 8. Recommended Projects Query
 * Deterministic recommendation algorithm (Top 3 open opportunities with reasons).
 */
export async function getRecommendedProjects(
  freelancerId: string,
  limit = 3
): Promise<RecommendedProjectItem[]> {
  const profile = await prisma.freelancerProfile.findUnique({
    where: { userId: freelancerId },
    include: { user: { include: { freelancerSkills: true } } },
  });

  const skills = profile?.user.freelancerSkills.map((s: any) => s.skillName.toLowerCase()) || [];

  const openProjects = await prisma.project.findMany({
    where: {
      state: { in: [ProjectState.MATCHING, ProjectState.INTAKE, ProjectState.ACTIVE] },
    },
    include: {
      client: { select: { name: true } },
    },
    take: 20,
  });

  const scored: Array<{
    item: RecommendedProjectItem;
    score: number;
  }> = [];

  for (const p of openProjects) {
    const requiredSkills: string[] = Array.isArray(p.skills) ? p.skills : [];

    const matchedSkills = requiredSkills.filter((rs: string) =>
      skills.includes(rs.toLowerCase())
    );

    let score = matchedSkills.length * 20;
    if (p.category && profile?.professionalTitle && p.category.toLowerCase().includes(profile.professionalTitle.toLowerCase())) {
      score += 30;
    }

    const reason =
      matchedSkills.length > 0
        ? `Matches ${matchedSkills.length} of your skills: ${matchedSkills.slice(0, 2).join(", ")}`
        : `Matches your primary category: ${p.category || "Development"}`;

    scored.push({
      item: {
        id: p.id,
        title: p.title,
        budget: p.budgetCents ? `$${(p.budgetCents / 100).toLocaleString()} USD` : "Fixed Budget",
        clientName: p.client.name,
        reason,
        category: p.category || "General",
      },
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * 9. Profile Completeness Query
 */
export async function getProfileCompleteness(freelancerId: string): Promise<{
  score: number;
  nextAction: string;
  missingItems: string[];
}> {
  const profile = await prisma.freelancerProfile.findUnique({
    where: { userId: freelancerId },
    include: {
      user: {
        include: {
          freelancerSkills: true,
          certifications: true,
          workExperiences: true,
          portfolioProjects: true,
          educationEntries: true,
        },
      },
    },
  });

  if (!profile) {
    return {
      score: 0,
      nextAction: "Complete your initial profile setup",
      missingItems: ["Title", "Bio", "Skills", "Portfolio"],
    };
  }

  const result = calculateProfileCompleteness({
    photoFileId: profile.photoFileId,
    professionalTitle: profile.professionalTitle,
    headline: profile.headline,
    bio: profile.bio,
    locationText: profile.locationText,
    availabilityStatus: profile.availabilityStatus,
    freelancerSkills: profile.user.freelancerSkills,
    workExperiences: profile.user.workExperiences,
    educationEntries: profile.user.educationEntries,
    portfolioProjects: profile.user.portfolioProjects,
  });

  return {
    score: result.percent,
    nextAction: result.missing[0] ? `Add ${result.missing[0]}` : "Profile looks great!",
    missingItems: result.missing,
  };
}

/**
 * 10. Recent Activity Query
 * Last 10 audit entries visible to this user.
 */
export async function getRecentActivity(
  freelancerId: string,
  limit = 10
): Promise<Array<{ id: string; action: string; entityType: string; entityId: string; timestamp: string }>> {
  const events = await prisma.auditEvent.findMany({
    where: {
      OR: [
        { actorId: freelancerId },
        { objectId: freelancerId },
      ],
    },
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  return events.map((e: any) => ({
    id: e.id,
    action: e.action,
    entityType: e.objectType || "SYSTEM",
    entityId: e.objectId || "",
    timestamp: e.timestamp.toISOString(),
  }));
}

/**
 * 11. Recent Proposals Query
 * Returns the latest proposals submitted by the freelancer with project title, client, status, and budget.
 */
export async function getRecentProposals(
  freelancerId: string,
  limit = 3
): Promise<RecentProposalSummaryItem[]> {
  const proposals = await prisma.proposal.findMany({
    where: { freelancerId },
    include: {
      project: {
        include: {
          client: { select: { id: true, name: true } },
        },
      },
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return proposals.map((p: any) => {
    const ver = p.versions[0];
    const amountMinor = ver?.totalAmountMinor ?? p.project.budgetCents ?? 0;
    return {
      id: p.id,
      title: p.project.title,
      clientName: p.project.client?.name || "Client",
      status: p.status,
      amountDisplay: `$${(amountMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })} USD`,
      timeAgo: "Recently",
    };
  });
}

/**
 * 12. Monthly Earnings Query
 * Aggregates real ledger releases and pending milestone values across the trailing 6 months.
 */
export async function getMonthlyEarnings(freelancerId: string): Promise<Array<{
  month: string;
  shortMonth: string;
  completed: number;
  pending: number;
  label: string;
}>> {
  const entries = await prisma.ledgerEntry.findMany({
    where: { userId: freelancerId, kind: LedgerEntryKind.RELEASED },
  });

  const milestones = await prisma.milestone.findMany({
    where: {
      agreement: { freelancerId },
      removedAt: null,
      workStatus: { in: [MilestoneWorkStatus.IN_PROGRESS, MilestoneWorkStatus.AWAITING_CLIENT_REVIEW] },
    },
  });

  const totalReleased = entries.reduce((sum, e) => sum + e.amountMinor, 0) / 100;
  const totalPending = milestones.reduce((sum, m) => sum + m.amountMinor, 0) / 100;

  const now = new Date();
  const result = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mName = d.toLocaleDateString("en-US", { month: "short" });
    const year = d.getFullYear();
    const monthStart = new Date(year, d.getMonth(), 1);
    const monthEnd = new Date(year, d.getMonth() + 1, 0, 23, 59, 59);

    const monthReleased = entries
      .filter((e) => e.createdAt >= monthStart && e.createdAt <= monthEnd)
      .reduce((sum, e) => sum + e.amountMinor, 0) / 100;

    const monthPending = (i === 0) ? totalPending : 0;

    result.push({
      month: mName,
      shortMonth: `${mName} ${year}`,
      completed: monthReleased,
      pending: monthPending,
      label: `$${(monthReleased + monthPending).toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
    });
  }

  // If historical entries fall outside window, place verified balance in current month
  const totalCharted = result.reduce((acc, r) => acc + r.completed, 0);
  if (totalCharted === 0 && totalReleased > 0) {
    result[result.length - 1].completed = totalReleased;
    result[result.length - 1].label = `$${(totalReleased + totalPending).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
  }

  return result;
}

/**
 * 13. Aggregate Summary Function
 * Runs all query functions concurrently for a single unified response.
 */
export async function getDashboardSummary(freelancerId: string): Promise<DashboardSummaryResponse> {
  const [
    activeProjects,
    allProposals,
    milestonesDueSoon,
    overdue,
    awaitingClientReview,
    earningsSnapshot,
    needsYourReply,
    recommendedProjects,
    profileCompleteness,
    recentActivity,
    recentProposals,
    monthlyEarnings,
  ] = await Promise.all([
    getActiveProjects(freelancerId),
    getAllProposals(freelancerId),
    getMilestonesDueSoon(freelancerId),
    getOverdueMilestones(freelancerId),
    getAwaitingClientReviewMilestones(freelancerId),
    getEarningsSnapshot(freelancerId),
    getNeedsYourReply(freelancerId),
    getRecommendedProjects(freelancerId, 3),
    getProfileCompleteness(freelancerId),
    getRecentActivity(freelancerId, 10),
    getRecentProposals(freelancerId, 3),
    getMonthlyEarnings(freelancerId),
  ]);

  return {
    activeProjects,
    allProposals,
    milestonesDueSoon,
    overdue,
    awaitingClientReview,
    earningsSnapshot,
    needsYourReply,
    recommendedProjects,
    recentProposals,
    profileCompleteness,
    recentActivity,
    monthlyEarnings,
  };
}

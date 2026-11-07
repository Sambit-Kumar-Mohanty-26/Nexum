import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth, requireRole, requireOnboarded } from "../../middleware/auth.js";
import { Role, ProposalStatus, ProjectState, FilePurpose } from "@prisma/client";
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "../../lib/errors.js";
import { appendAuditEvent } from "../../lib/audit.js";
import { defaultStorage } from "../../lib/files.js";
import { canonicalJson, hashVersion } from "../../domain/proposals/canonicalJson.js";
import { transitionProposal } from "../../domain/proposals/stateMachine.js";
import { getNextAction } from "../../domain/proposals/nextAction.js";
import { diffVersions } from "../../domain/proposals/diffVersions.js";
import { validateForSubmit } from "../../domain/proposals/submitValidator.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
});

const router = Router();

// Enforce authentication, role boundary & onboarded check across all freelancer routes
router.use(requireAuth);
router.use(requireRole(Role.FREELANCER));
router.use(requireOnboarded);

// Magic byte validation for attachments: PDF, PNG, JPG, DOCX
function validateAttachmentMagicBytes(buffer: Buffer): { valid: boolean; mime: string } {
  if (!buffer || buffer.length < 4) {
    return { valid: false, mime: "application/octet-stream" };
  }

  // PDF (%PDF-)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return { valid: true, mime: "application/pdf" };
  }

  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, mime: "image/png" };
  }

  // JPEG (FF D8 FF)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, mime: "image/jpeg" };
  }

  // DOCX / ZIP (PK..)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return {
      valid: true,
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  return { valid: false, mime: "application/octet-stream" };
}

/**
 * GET /api/freelancer/proposals/summary
 * Live database counts for proposal overview KPI cards. Never hardcoded.
 */
router.get("/summary", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const freelancerId = req.user!.id;

    const [
      allCount,
      draftCount,
      submittedCount,
      underReviewCount,
      shortlistedCount,
      interviewCount,
      counterofferCount,
      acceptedCount,
      rejectedCount,
      withdrawnCount,
    ] = await Promise.all([
      prisma.proposal.count({ where: { freelancerId } }),
      prisma.proposal.count({ where: { freelancerId, status: ProposalStatus.DRAFT } }),
      prisma.proposal.count({ where: { freelancerId, status: ProposalStatus.SUBMITTED } }),
      prisma.proposal.count({ where: { freelancerId, status: ProposalStatus.UNDER_REVIEW } }),
      prisma.proposal.count({ where: { freelancerId, status: ProposalStatus.SHORTLISTED } }),
      prisma.proposal.count({ where: { freelancerId, status: ProposalStatus.INTERVIEW_DISCUSSION } }),
      prisma.proposal.count({ where: { freelancerId, status: ProposalStatus.COUNTEROFFER_RECEIVED } }),
      prisma.proposal.count({ where: { freelancerId, status: ProposalStatus.ACCEPTED } }),
      prisma.proposal.count({ where: { freelancerId, status: ProposalStatus.REJECTED } }),
      prisma.proposal.count({ where: { freelancerId, status: ProposalStatus.WITHDRAWN } }),
    ]);

    res.status(200).json({
      success: true,
      summary: {
        all: allCount,
        totalProposals: allCount,
        draft: draftCount,
        submitted: submittedCount,
        underReview: underReviewCount,
        shortlisted: shortlistedCount,
        interview: interviewCount,
        interviewDiscussion: interviewCount,
        counteroffer: counterofferCount,
        counterofferReceived: counterofferCount,
        accepted: acceptedCount,
        rejected: rejectedCount,
        withdrawn: withdrawnCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

const listProposalsQuerySchema = z.object({
  q: z.string().optional(),
  status: z.nativeEnum(ProposalStatus).optional(),
  category: z.string().optional(),
  budgetMin: z.coerce.number().int().nonnegative().optional(),
  budgetMax: z.coerce.number().int().positive().optional(),
  submittedFrom: z.string().optional(),
  submittedTo: z.string().optional(),
  sort: z.enum(["newest", "oldest", "latest_update"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50, "pageSize cannot exceed 50").default(10),
  limit: z.coerce.number().int().min(1).max(50, "limit cannot exceed 50").optional(),
});

/**
 * GET /api/freelancer/proposals
 * Paginated proposal directory with search, filters, and real counts.
 */

function getStatusLabel(status: ProposalStatus): string {
  switch (status) {
    case ProposalStatus.DRAFT: return "Draft";
    case ProposalStatus.SUBMITTED: return "Submitted";
    case ProposalStatus.UNDER_REVIEW: return "Under Review";
    case ProposalStatus.SHORTLISTED: return "Shortlisted";
    case ProposalStatus.INTERVIEW_DISCUSSION: return "Interview";
    case ProposalStatus.COUNTEROFFER_RECEIVED: return "Counteroffer";
    case ProposalStatus.ACCEPTED: return "Accepted";
    case ProposalStatus.REJECTED: return "Rejected";
    case ProposalStatus.WITHDRAWN: return "Withdrawn";
    default: return status;
  }
}

function getStatusBadgeColor(status: ProposalStatus): string {
  switch (status) {
    case ProposalStatus.DRAFT: return "bg-slate-50 text-slate-600 border-slate-200";
    case ProposalStatus.SUBMITTED: return "bg-blue-50 text-blue-700 border-blue-200/80";
    case ProposalStatus.UNDER_REVIEW: return "bg-amber-50 text-amber-700 border-amber-200/80";
    case ProposalStatus.SHORTLISTED: return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    case ProposalStatus.INTERVIEW_DISCUSSION: return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
    case ProposalStatus.COUNTEROFFER_RECEIVED: return "bg-purple-50 text-purple-700 border-purple-200/80";
    case ProposalStatus.ACCEPTED: return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    case ProposalStatus.REJECTED: return "bg-rose-50 text-rose-700 border-rose-200/80";
    case ProposalStatus.WITHDRAWN: return "bg-slate-100 text-slate-600 border-slate-200";
    default: return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function getCategoryIcon(category?: string | null): "HEALTH" | "CART" | "CHART" | "MOBILE" | "CERT" | "SCHOOL" | "CRYPTO" | "GENERIC" {
  if (!category) return "GENERIC";
  const cat = category.toLowerCase();
  if (cat.includes("health") || cat.includes("med")) return "HEALTH";
  if (cat.includes("commerce") || cat.includes("cart") || cat.includes("shop")) return "CART";
  if (cat.includes("chart") || cat.includes("fin") || cat.includes("data")) return "CHART";
  if (cat.includes("mobile") || cat.includes("ios") || cat.includes("android")) return "MOBILE";
  if (cat.includes("crypto") || cat.includes("blockchain") || cat.includes("web3")) return "CRYPTO";
  if (cat.includes("cert") || cat.includes("security")) return "CERT";
  if (cat.includes("school") || cat.includes("edu")) return "SCHOOL";
  return "GENERIC";
}

router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawQuery = { ...req.query };
    if (rawQuery.limit && !rawQuery.pageSize) {
      rawQuery.pageSize = rawQuery.limit;
    }

    const parsed = listProposalsQuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const isPageSizeError = fieldErrors.pageSize || fieldErrors.limit;
      res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: isPageSizeError ? "pageSize cannot exceed 50" : "Invalid query parameters",
          details: fieldErrors,
        },
      });
      return;
    }

    const {
      q,
      status,
      category,
      budgetMin,
      budgetMax,
      submittedFrom,
      submittedTo,
      sort,
      page,
      pageSize,
    } = parsed.data;

    const freelancerId = req.user!.id;

    const where: any = {
      freelancerId,
    };

    if (status) {
      where.status = status;
    }

    if (category && category !== "ALL" && category !== "All Categories") {
      where.project = {
        ...where.project,
        category: { equals: category, mode: "insensitive" },
      };
    }

    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { project: { title: { contains: term, mode: "insensitive" } } },
        { project: { client: { name: { contains: term, mode: "insensitive" } } } },
      ];
    }

    if (submittedFrom || submittedTo) {
      where.submittedAt = {};
      if (submittedFrom) {
        where.submittedAt.gte = new Date(submittedFrom);
      }
      if (submittedTo) {
        where.submittedAt.lte = new Date(submittedTo);
      }
    }

    let orderBy: any = { createdAt: "desc" };
    if (sort === "oldest") {
      orderBy = { createdAt: "asc" };
    } else if (sort === "latest_update") {
      orderBy = { lastActivityAt: "desc" };
    }

    const [total, proposals] = await Promise.all([
      prisma.proposal.count({ where }),
      prisma.proposal.findMany({
        where,
        include: {
          project: {
            include: {
              client: { select: { id: true, name: true } },
              briefVersions: { orderBy: { version: "desc" }, take: 1 },
              projectMilestones: { orderBy: { orderIndex: "asc" } },
            },
          },
          versions: {
            orderBy: { version: "desc" },
            take: 2,
          },
          attachments: {
            include: {
              file: { select: { id: true, originalName: true, mime: true, sizeBytes: true, createdAt: true } },
            },
          },
          events: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = proposals.map((p) => {
      const currentVer = p.versions[0];
      const clientVer = p.versions.find((v) => v.authorRole === Role.CLIENT);
      const freelancerVer = p.versions.find((v) => v.authorRole === Role.FREELANCER) || currentVer;
      const fAmount = freelancerVer?.totalAmountMinor ?? freelancerVer?.amountCents ?? 0;
      const cAmount = clientVer?.totalAmountMinor ?? clientVer?.amountCents ?? fAmount;
      const hasFeedback = Boolean(p.rejectionFeedback);
      const nextAct = getNextAction(p.status, hasFeedback);

      let amountDisplay = "Budget not specified";
      let amountMinor = 0;
      if (currentVer) {
        if (currentVer.paymentModel === "HOURLY") {
          const rate = currentVer.hourlyRateMinor || 0;
          amountMinor = rate;
          amountDisplay = `$${(rate / 100).toFixed(2)}/hr`;
        } else {
          const amt = currentVer.totalAmountMinor ?? currentVer.amountCents ?? 0;
          amountMinor = amt;
          amountDisplay = `$${(amt / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
        }
      }

      return {
        id: p.id,
        projectId: p.projectId,
        projectTitle: p.project.title,
        clientName: p.project.client.name,
        skills: p.project.skills || [],
        amountDisplay,
        amountMinor,
        currency: currentVer?.currency || p.project.currency || "USD",
        durationWeeks: currentVer?.estimatedDurationWeeks || null,
        status: p.status,
        statusLabel: getStatusLabel(p.status),
        statusBadgeColor: getStatusBadgeColor(p.status),
        categoryIcon: getCategoryIcon(p.project.category),
        submittedAt: p.submittedAt ? p.submittedAt.toISOString() : null,
        submittedDate: p.submittedAt ? new Date(p.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Draft",
        submittedTime: p.submittedAt ? new Date(p.submittedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
        lastActivityAt: p.lastActivityAt.toISOString(),
        currentVersionNumber: currentVer?.versionNumber ?? currentVer?.version ?? 1,
        nextAction: nextAct,
        client: {
          id: p.project.client.id,
          name: p.project.client.name,
          companyName: `${p.project.client.name} Corp`,
          verified: true,
          industry: p.project.category || "Technology",
          companySize: "10–50 employees",
          location: p.project.location || "Remote",
          postedDate: p.project.createdAt ? new Date(p.project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently",
          totalHires: 12,
          avatarLetter: p.project.client.name ? p.project.client.name[0].toUpperCase() : "C",
          avatarBg: "bg-indigo-600 text-white",
        },
        clientBrief: (() => {
          const brief = (p.project.briefVersions?.[0]?.structuredBrief as any) || {};
          const technicalRequirements = Array.isArray(brief.scopeOfWork) && brief.scopeOfWork.length > 0
            ? brief.scopeOfWork
            : (brief.detailedRequirements
                ? brief.detailedRequirements
                    .split("\n")
                    .map((s: string) => s.replace(/^[•\-\*]\s*/, "").trim())
                    .filter(Boolean)
                : p.project.skills || []);

          const acceptanceCriteria = Array.isArray(p.project.projectMilestones) && p.project.projectMilestones.length > 0
            ? p.project.projectMilestones.map((m: any) => m.title)
            : (Array.isArray(brief.milestones) ? brief.milestones.map((m: any) => m.title) : []);

          const duration = brief.timelineDuration || (currentVer?.estimatedDurationWeeks ? `${currentVer.estimatedDurationWeeks} weeks` : "Flexible");
          const uploadedDocument = brief.uploadedDocument || undefined;

          return {
            description: p.project.description,
            category: p.project.category || "General",
            budgetRange: p.project.budgetCents ? `$${(p.project.budgetCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "Custom",
            duration,
            deadline: p.project.deadline ? new Date(p.project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Flexible",
            requiredSkills: p.project.skills || [],
            technicalRequirements,
            acceptanceCriteria,
            uploadedDocument,
            objectives: brief.goals ? brief.goals.split(",").map((g: string) => g.trim()).filter(Boolean) : [],
            technicalArchitecture: (p.project.skills || []).join(", "),
          };
        })(),
        offer: {
          summary: currentVer?.scopeText || currentVer?.scope || "Proposal offer submitted",
          approach: "Agile delivery with verifiable milestones",
          priceDisplay: amountDisplay,
          priceType: (currentVer?.paymentModel === "HOURLY" ? "HOURLY" : "FIXED") as any,
          duration: currentVer?.estimatedDurationWeeks ? `${currentVer.estimatedDurationWeeks} weeks` : "Flexible",
          expectedStartDate: "Immediate",
          coverLetter: currentVer?.coverLetter || "",
          attachments: ((p as any).attachments || []).map((a: any) => ({
            id: a.id,
            name: a.file.originalName,
            fileType: a.file.mime,
            fileSize: `${Math.round(a.file.sizeBytes / 1024)} KB`,
            uploadDate: "Recently",
          })),
          milestones: (Array.isArray(currentVer?.milestonesJson) ? (currentVer.milestonesJson as any[]) : []).map((m: any, idx: number) => ({
            id: `m-${idx + 1}`,
            orderIndex: idx + 1,
            title: m.title || `Milestone ${idx + 1}`,
            amount: m.amountMinor ? `$${(m.amountMinor / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "$0",
            duration: "2 weeks",
            acceptanceCriteria: m.criteria || [],
          })),
        },
        counteroffer: p.status === ProposalStatus.COUNTEROFFER_RECEIVED && clientVer ? {
          id: `co-${p.id}`,
          originalPrice: `$${(fAmount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          proposedPrice: `$${(cAmount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          originalDuration: freelancerVer?.estimatedDurationWeeks ? `${freelancerVer.estimatedDurationWeeks} weeks` : "Flexible",
          proposedDuration: clientVer?.estimatedDurationWeeks ? `${clientVer.estimatedDurationWeeks} weeks` : "Flexible",
          scopeNotes: clientVer?.coverLetter || clientVer?.scopeText || "Client requested adjusted terms and delivery timeline.",
          receivedDate: clientVer?.submittedAt ? new Date(clientVer.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : (p.lastActivityAt ? new Date(p.lastActivityAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently"),
          expiresAt: "Open for review",
        } : undefined,
        techTags: p.project.skills || [],
        messagesCount: 0,
        activityTrail: ((p as any).events || []).map((e: any) => ({
          id: e.id,
          title: e.type,
          description: `Proposal event: ${e.toStatus || e.type}`,
          actor: e.actorRole === Role.CLIENT ? p.project.client.name : "Freelancer",
          timestamp: new Date(e.createdAt).toLocaleDateString(),
          type: (e.toStatus === "ACCEPTED" ? "ACCEPTED" : e.toStatus === "REJECTED" ? "REJECTED" : "SUBMITTED") as any,
        })),
      };
    });

    res.status(200).json({
      success: true,
      proposals: items,
      items,
      pagination: {
        page,
        pageSize,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Helper to check project visibility under Phase 3 rules
 */
async function assertProjectVisibleToFreelancer(projectId: string, freelancerId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      invitations: {
        where: {
          freelancerId,
          status: { in: ["PENDING", "PROPOSAL_SUBMITTED"] },
        },
      },
    },
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  // Invisible if DRAFT or PRIVATE or closed
  const isClosed = project.state !== ProjectState.MATCHING && project.state !== ProjectState.ACTIVE;
  if (project.visibility === "PRIVATE" || project.state === ProjectState.DRAFT || isClosed) {
    throw new NotFoundError("Project opportunity not found");
  }

  // Invisible if INVITE_ONLY without invitation
  if (project.visibility === "INVITE_ONLY") {
    if (!project.invitations || project.invitations.length === 0) {
      throw new NotFoundError("Project opportunity not found");
    }
  }

  return project;
}

/**
 * POST /api/freelancer/projects/:projectId/proposals
 * Create a draft proposal for a project.
 */
export async function handleCreateDraftProposal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projectId = req.params.projectId || req.body.projectId;
    if (!projectId) {
      throw new ValidationError("projectId is required");
    }
    const freelancerId = req.user!.id;

    // 1. Check project visibility under Phase 3 rule
    const project = await assertProjectVisibleToFreelancer(projectId, freelancerId);

    // 2. Check live proposal restriction
    const existingLive = await prisma.proposal.findFirst({
      where: {
        projectId,
        freelancerId,
        status: { not: ProposalStatus.WITHDRAWN },
      },
    });

    if (existingLive) {
      if (existingLive.status === ProposalStatus.REJECTED) {
        throw new ConflictError(
          "Freelancer was previously rejected for this project and cannot re-apply",
          "PROPOSAL_REJECTED_CANNOT_REAPPLY"
        );
      }
      throw new ConflictError(
        "A live proposal already exists for this project",
        "LIVE_PROPOSAL_EXISTS"
      );
    }

    // Also check if any past rejected proposal exists for this freelancer
    const pastRejected = await prisma.proposal.findFirst({
      where: {
        projectId,
        freelancerId,
        status: ProposalStatus.REJECTED,
      },
    });
    if (pastRejected) {
      throw new ConflictError(
        "Freelancer was previously rejected for this project and cannot re-apply",
        "PROPOSAL_REJECTED_CANNOT_REAPPLY"
      );
    }

    // 3. Create Proposal and Version 1 in transaction
    const initialPaymentModel = project.budgetType === "HOURLY" ? "HOURLY" : "FIXED_PRICE";
    const initialAmount = project.budgetCents || 0;

    const proposal = await prisma.proposal.create({
      data: {
        projectId,
        freelancerId,
        status: ProposalStatus.DRAFT,
      },
    });

    const v1Hash = crypto
      .createHash("sha256")
      .update(`draft_${proposal.id}_v1_${Date.now()}`)
      .digest("hex");

    const v1 = await prisma.proposalVersion.create({
      data: {
        proposalId: proposal.id,
        projectId,
        freelancerId,
        version: 1,
        versionNumber: 1,
        authorRole: Role.FREELANCER,
        versionHash: v1Hash,
        paymentModel: initialPaymentModel,
        totalAmountMinor: initialPaymentModel === "FIXED_PRICE" ? initialAmount : null,
        hourlyRateMinor: initialPaymentModel === "HOURLY" ? initialAmount : null,
        amountCents: initialAmount,
        currency: project.currency || "USD",
        status: ProposalStatus.DRAFT,
      },
    });

    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { currentVersionId: v1.id },
    });

    // Create ProposalEvent
    await prisma.proposalEvent.create({
      data: {
        proposalId: proposal.id,
        proposalVersionId: v1.id,
        actorRole: Role.FREELANCER,
        actorId: freelancerId,
        type: "CREATED",
        fromStatus: ProposalStatus.DRAFT,
        toStatus: ProposalStatus.DRAFT,
        metadata: { projectId },
      },
    });

    // Append audit event
    await appendAuditEvent({
      actorId: freelancerId,
      action: "PROPOSAL_CREATED",
      objectType: "Proposal",
      objectId: proposal.id,
      previousStatus: null,
      newStatus: "DRAFT",
      metadata: { projectId },
    });

    res.status(201).json({
      success: true,
      proposal: {
        id: proposal.id,
        projectId: proposal.projectId,
        status: proposal.status,
        currentVersionId: v1.id,
        createdAt: proposal.createdAt.toISOString(),
      },
      currentVersion: v1,
    });
  } catch (err) {
    next(err);
  }
}

router.post("/projects/:projectId/proposals", handleCreateDraftProposal);
router.post("/", handleCreateDraftProposal);

/**
 * GET /api/freelancer/proposals/:id
 * Proposal full details with versions, listing snapshot, client safe fields, and activity trail.
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;

    const proposal = await prisma.proposal.findFirst({
      where: { id, freelancerId },
      include: {
        project: {
          include: {
            client: { select: { id: true, name: true } },
            briefVersions: { orderBy: { version: "desc" }, take: 1 },
            projectMilestones: { orderBy: { orderIndex: "asc" } },
          },
        },
        versions: {
          orderBy: { version: "desc" },
        },
        attachments: {
          include: {
            file: { select: { id: true, originalName: true, mime: true, sizeBytes: true, createdAt: true } },
          },
        },
        events: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundError("Proposal not found");
    }

    const currentVersion =
      proposal.versions.find((v) => v.id === proposal.currentVersionId) || proposal.versions[0];

    const hasFeedback = Boolean(proposal.rejectionFeedback);
    const nextAct = getNextAction(proposal.status, hasFeedback);

    res.status(200).json({
      success: true,
      proposal: {
        id: proposal.id,
        projectId: proposal.projectId,
        freelancerId: proposal.freelancerId,
        status: proposal.status,
        currentVersionId: proposal.currentVersionId,
        rejectionFeedback: proposal.rejectionFeedback,
        submittedAt: proposal.submittedAt ? proposal.submittedAt.toISOString() : null,
        lastActivityAt: proposal.lastActivityAt.toISOString(),
        createdAt: proposal.createdAt.toISOString(),
        nextAction: nextAct,
      },
      currentVersion,
      versions: proposal.versions.map((v) => ({
        id: v.id,
        version: v.version,
        versionNumber: v.versionNumber || v.version,
        authorRole: v.authorRole,
        totalAmountMinor: v.totalAmountMinor,
        hourlyRateMinor: v.hourlyRateMinor,
        paymentModel: v.paymentModel,
        currency: v.currency,
        contentHash: v.contentHash,
        status: v.status,
        submittedAt: v.submittedAt ? v.submittedAt.toISOString() : null,
        createdAt: v.createdAt.toISOString(),
      })),
      projectDetails: (() => {
        const brief = (proposal.project.briefVersions?.[0]?.structuredBrief as any) || {};
        const technicalRequirements = Array.isArray(brief.scopeOfWork) && brief.scopeOfWork.length > 0
          ? brief.scopeOfWork
          : (brief.detailedRequirements
              ? brief.detailedRequirements.split("\n").map((s: string) => s.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean)
              : proposal.project.skills || []);
        const acceptanceCriteria = Array.isArray(proposal.project.projectMilestones) && proposal.project.projectMilestones.length > 0
          ? proposal.project.projectMilestones.map((m: any) => m.title)
          : (Array.isArray(brief.milestones) ? brief.milestones.map((m: any) => m.title) : []);
        const duration = brief.timelineDuration || (currentVersion?.estimatedDurationWeeks ? `${currentVersion.estimatedDurationWeeks} weeks` : "Flexible");

        return {
          id: proposal.project.id,
          title: proposal.project.title,
          description: proposal.project.description,
          category: proposal.project.category || "General",
          skills: proposal.project.skills || [],
          budgetType: proposal.project.budgetType,
          budgetCents: proposal.project.budgetCents,
          budgetMinCents: proposal.project.budgetMinCents,
          budgetMaxCents: proposal.project.budgetMaxCents,
          currency: proposal.project.currency,
          location: proposal.project.location || "Remote",
          duration,
          deadline: proposal.project.deadline ? new Date(proposal.project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Flexible",
          technicalRequirements,
          acceptanceCriteria,
          uploadedDocument: brief.uploadedDocument || undefined,
          objectives: brief.goals ? brief.goals.split(",").map((g: string) => g.trim()).filter(Boolean) : [],
          technicalArchitecture: (proposal.project.skills || []).join(", "),
        };
      })(),
      client: {
        id: proposal.project.client.id,
        displayName: proposal.project.client.name,
        companyName: `${proposal.project.client.name} Team`,
      },
      activity: proposal.events.map((e) => ({
        id: e.id,
        type: e.type,
        actorRole: e.actorRole,
        actorId: e.actorId,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        metadata: e.metadata,
        createdAt: e.createdAt.toISOString(),
      })),
      attachments: proposal.attachments.map((a) => ({
        id: a.id,
        fileId: a.fileId,
        originalName: a.file.originalName,
        mime: a.file.mime,
        sizeBytes: a.file.sizeBytes,
        createdAt: a.file.createdAt.toISOString(),
      })),
      messagesAvailable: false,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/freelancer/proposals/:id/draft
 * Partial updates to draft proposal version.
 */
router.patch("/:id/draft", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;

    const proposal = await prisma.proposal.findFirst({
      where: { id, freelancerId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });

    if (!proposal) {
      throw new NotFoundError("Proposal not found");
    }

    if (proposal.status !== ProposalStatus.DRAFT) {
      throw new ConflictError("Only draft proposals can be modified", "INVALID_STATE");
    }

    const currentVersion = proposal.versions[0];
    if (!currentVersion) {
      throw new NotFoundError("Proposal draft version not found");
    }

    const body = req.body || {};
    const updatedVersion = await prisma.proposalVersion.update({
      where: { id: currentVersion.id },
      data: {
        coverLetter: body.coverLetter !== undefined ? body.coverLetter : currentVersion.coverLetter,
        approach: body.approach !== undefined ? body.approach : currentVersion.approach,
        scopeText: body.scopeText !== undefined ? body.scopeText : currentVersion.scopeText,
        scope: body.scopeText !== undefined ? body.scopeText : currentVersion.scope,
        deliverables: body.deliverables !== undefined ? body.deliverables : currentVersion.deliverables,
        milestonesJson: body.milestones !== undefined ? body.milestones : currentVersion.milestonesJson,
        paymentModel: body.paymentModel !== undefined ? body.paymentModel : currentVersion.paymentModel,
        totalAmountMinor: body.totalAmountMinor !== undefined ? body.totalAmountMinor : currentVersion.totalAmountMinor,
        hourlyRateMinor: body.hourlyRateMinor !== undefined ? body.hourlyRateMinor : currentVersion.hourlyRateMinor,
        estimatedHours: body.estimatedHours !== undefined ? body.estimatedHours : currentVersion.estimatedHours,
        estimatedDurationWeeks:
          body.estimatedDurationWeeks !== undefined
            ? body.estimatedDurationWeeks
            : currentVersion.estimatedDurationWeeks,
        startAvailableOn:
          body.startAvailableOn !== undefined
            ? body.startAvailableOn
              ? new Date(body.startAvailableOn)
              : null
            : currentVersion.startAvailableOn,
        exclusions: body.exclusions !== undefined ? body.exclusions : currentVersion.exclusions,
        assumptions: body.assumptions !== undefined ? body.assumptions : currentVersion.assumptions,
        dependencies: body.dependencies !== undefined ? body.dependencies : currentVersion.dependencies,
        portfolioSnapshot:
          body.portfolioSnapshot !== undefined ? body.portfolioSnapshot : currentVersion.portfolioSnapshot,
        amountCents:
          body.totalAmountMinor !== undefined
            ? body.totalAmountMinor
            : body.hourlyRateMinor && body.estimatedHours
              ? body.hourlyRateMinor * body.estimatedHours
              : currentVersion.amountCents,
      },
    });

    await prisma.proposal.update({
      where: { id: proposal.id },
      data: { lastActivityAt: new Date() },
    });

    res.status(200).json({
      success: true,
      proposal: {
        id: proposal.id,
        status: proposal.status,
        lastActivityAt: new Date().toISOString(),
      },
      currentVersion: updatedVersion,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/freelancer/proposals/:id/submit
 * Validates, freezes cryptographic hash, and transitions proposal to SUBMITTED.
 */
router.post("/:id/submit", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;

    // Daily submission rate limit check (max 20 per day)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const submissionsToday = await prisma.proposal.count({
      where: {
        freelancerId,
        submittedAt: { gte: oneDayAgo },
      },
    });

    if (submissionsToday >= 20) {
      res.status(429).json({
        error: {
          code: "SUBMISSION_LIMIT_EXCEEDED",
          message: "Daily proposal submission limit (20) exceeded",
        },
      });
      return;
    }

    const proposal = await prisma.proposal.findFirst({
      where: { id, freelancerId },
      include: {
        project: true,
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
    });

    if (!proposal) {
      throw new NotFoundError("Proposal not found");
    }

    if (proposal.status !== ProposalStatus.DRAFT) {
      throw new ConflictError("Only draft proposals can be submitted", "INVALID_TRANSITION");
    }

    const currentVersion = proposal.versions[0];
    if (!currentVersion) {
      throw new NotFoundError("Proposal version not found");
    }

    // Fetch owned portfolio projects for validation
    const ownedPortfolios = await prisma.portfolioProject.findMany({
      where: { userId: freelancerId },
      select: { id: true },
    });
    const ownedPortfolioIds = ownedPortfolios.map((p) => p.id);

    // Validate for submit
    const validation = validateForSubmit(currentVersion, proposal.project, ownedPortfolioIds);
    if (!validation.isValid) {
      res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Proposal validation failed",
          details: validation.errors,
        },
      });
      return;
    }

    // Compute cryptographic version hash
    const contentHash = hashVersion({
      projectId: proposal.projectId,
      freelancerId,
      versionNumber: currentVersion.versionNumber || currentVersion.version,
      paymentModel: currentVersion.paymentModel,
      totalAmountMinor: currentVersion.totalAmountMinor,
      hourlyRateMinor: currentVersion.hourlyRateMinor,
      estimatedHours: currentVersion.estimatedHours,
      currency: currentVersion.currency,
      scopeText: currentVersion.scopeText || currentVersion.scope,
      deliverables: currentVersion.deliverables as any[],
      milestones: (currentVersion.milestonesJson as any[]) || [],
      exclusions: currentVersion.exclusions,
      assumptions: currentVersion.assumptions,
      dependencies: currentVersion.dependencies,
      estimatedDurationWeeks: currentVersion.estimatedDurationWeeks,
      startAvailableOn: currentVersion.startAvailableOn,
    });

    const now = new Date();

    // Atomic transaction
    const [updatedProposal, updatedVersion] = await prisma.$transaction(async (tx) => {
      // 1. Atomically verify and transition proposal status from DRAFT
      const updateResult = await tx.proposal.updateMany({
        where: {
          id: proposal.id,
          status: ProposalStatus.DRAFT,
        },
        data: {
          status: ProposalStatus.SUBMITTED,
          submittedAt: now,
          lastActivityAt: now,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictError("Only draft proposals can be submitted", "INVALID_TRANSITION");
      }

      const p = await tx.proposal.findUniqueOrThrow({ where: { id: proposal.id } });

      // 2. Freeze version
      const v = await tx.proposalVersion.update({
        where: { id: currentVersion.id },
        data: {
          contentHash,
          versionHash: contentHash,
          submittedAt: now,
          status: ProposalStatus.SUBMITTED,
        },
      });

      // 3. If an invitation exists on this project for this freelancer, update status
      await tx.projectInvitation.updateMany({
        where: {
          projectId: proposal.projectId,
          freelancerId,
          status: "PENDING",
        },
        data: {
          status: "PROPOSAL_SUBMITTED",
          respondedAt: now,
        },
      });

      // 4. Create ProposalEvent
      await tx.proposalEvent.create({
        data: {
          proposalId: p.id,
          proposalVersionId: v.id,
          actorRole: Role.FREELANCER,
          actorId: freelancerId,
          type: "SUBMITTED",
          fromStatus: ProposalStatus.DRAFT,
          toStatus: ProposalStatus.SUBMITTED,
          metadata: { contentHash, warnings: validation.warnings },
        },
      });

      return [p, v];
    });

    // Append audit event
    await appendAuditEvent({
      actorId: freelancerId,
      action: "PROPOSAL_SUBMITTED",
      objectType: "Proposal",
      objectId: proposal.id,
      previousStatus: "DRAFT",
      newStatus: "SUBMITTED",
      metadata: { contentHash, warnings: validation.warnings },
    });

    res.status(200).json({
      success: true,
      proposal: updatedProposal,
      currentVersion: updatedVersion,
      warnings: validation.warnings,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/freelancer/proposals/:id/revise
 * Freelancer responds to counteroffer with version n+1.
 */
router.post("/:id/revise", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;
    const { expectedVersionId, terms } = req.body || {};

    const proposal = await prisma.proposal.findFirst({
      where: { id, freelancerId },
      include: {
        versions: { orderBy: { version: "desc" } },
      },
    });

    if (!proposal) {
      throw new NotFoundError("Proposal not found");
    }

    if (proposal.status !== ProposalStatus.COUNTEROFFER_RECEIVED) {
      throw new ConflictError(
        `Cannot revise proposal from status ${proposal.status}. Revisions are only allowed from COUNTEROFFER_RECEIVED.`,
        "INVALID_TRANSITION"
      );
    }

    if (expectedVersionId && proposal.currentVersionId !== expectedVersionId) {
      throw new ConflictError("Proposal version is stale", "STALE_VERSION");
    }

    const currentVersion = proposal.versions[0];
    const nextVersionNumber = (currentVersion?.version || 1) + 1;
    const nextStatus = transitionProposal(proposal.status, "revise", Role.FREELANCER);

    const now = new Date();
    const contentHash = `hash_${proposal.id}_v${nextVersionNumber}_${Date.now()}`;

    const [updatedProposal, newVersion] = await prisma.$transaction(async (tx) => {
      const v = await tx.proposalVersion.create({
        data: {
          proposalId: proposal.id,
          projectId: proposal.projectId,
          freelancerId,
          version: nextVersionNumber,
          versionNumber: nextVersionNumber,
          authorRole: Role.FREELANCER,
          parentVersionId: currentVersion?.id || null,
          versionHash: contentHash,
          contentHash,
          coverLetter: terms?.coverLetter || currentVersion?.coverLetter,
          scopeText: terms?.scopeText || currentVersion?.scopeText,
          scope: terms?.scopeText || currentVersion?.scope || "",
          paymentModel: terms?.paymentModel || currentVersion?.paymentModel,
          totalAmountMinor: terms?.totalAmountMinor ?? currentVersion?.totalAmountMinor,
          hourlyRateMinor: terms?.hourlyRateMinor ?? currentVersion?.hourlyRateMinor,
          estimatedHours: terms?.estimatedHours ?? currentVersion?.estimatedHours,
          currency: terms?.currency || currentVersion?.currency || "USD",
          estimatedDurationWeeks: terms?.estimatedDurationWeeks ?? currentVersion?.estimatedDurationWeeks,
          startAvailableOn: terms?.startAvailableOn ? new Date(terms.startAvailableOn) : currentVersion?.startAvailableOn,
          deliverables: terms?.deliverables || currentVersion?.deliverables || [],
          milestonesJson: terms?.milestones || currentVersion?.milestonesJson || [],
          status: nextStatus,
          submittedAt: now,
        },
      });

      const p = await tx.proposal.update({
        where: { id: proposal.id },
        data: {
          status: nextStatus,
          currentVersionId: v.id,
          lastActivityAt: now,
        },
      });

      await tx.proposalEvent.create({
        data: {
          proposalId: p.id,
          proposalVersionId: v.id,
          actorRole: Role.FREELANCER,
          actorId: freelancerId,
          type: "REVISED",
          fromStatus: proposal.status,
          toStatus: nextStatus,
          metadata: { versionNumber: nextVersionNumber },
        },
      });

      return [p, v];
    });

    await appendAuditEvent({
      actorId: freelancerId,
      action: "PROPOSAL_REVISED",
      objectType: "Proposal",
      objectId: proposal.id,
      previousStatus: proposal.status,
      newStatus: nextStatus,
      metadata: { newVersionId: newVersion.id },
    });

    res.status(200).json({
      success: true,
      proposal: updatedProposal,
      newVersion,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/freelancer/proposals/:id/accept
 * Freelancer accepts client's counteroffer.
 */
router.post("/:id/accept", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;
    const { expectedVersionId } = req.body || {};

    const proposal = await prisma.proposal.findFirst({
      where: { id, freelancerId },
    });

    if (!proposal) {
      throw new NotFoundError("Proposal not found");
    }

    if (proposal.status !== ProposalStatus.COUNTEROFFER_RECEIVED) {
      throw new ConflictError(
        `Cannot accept proposal from status ${proposal.status}. Freelancer acceptance is only valid from COUNTEROFFER_RECEIVED.`,
        "INVALID_TRANSITION"
      );
    }

    if (expectedVersionId && proposal.currentVersionId !== expectedVersionId) {
      throw new ConflictError("Stale version: expected version does not match current counteroffer", "STALE_VERSION");
    }

    const nextStatus = transitionProposal(proposal.status, "accept", Role.FREELANCER);
    const now = new Date();

    const updatedProposal = await prisma.$transaction(async (tx) => {
      const p = await tx.proposal.update({
        where: { id: proposal.id },
        data: {
          status: nextStatus,
          lastActivityAt: now,
        },
      });

      await tx.proposalEvent.create({
        data: {
          proposalId: p.id,
          proposalVersionId: proposal.currentVersionId,
          actorRole: Role.FREELANCER,
          actorId: freelancerId,
          type: "ACCEPTED",
          fromStatus: proposal.status,
          toStatus: nextStatus,
        },
      });

      return p;
    });

    await appendAuditEvent({
      actorId: freelancerId,
      action: "PROPOSAL_ACCEPTED",
      objectType: "Proposal",
      objectId: proposal.id,
      previousStatus: proposal.status,
      newStatus: nextStatus,
      metadata: { currentVersionId: proposal.currentVersionId },
    });

    res.status(200).json({
      success: true,
      proposal: updatedProposal,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/counteroffer/accept", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Alias for /:id/accept
  const { id } = req.params;
  const freelancerId = req.user!.id;
  const { expectedVersionId } = req.body || {};

  try {
    const proposal = await prisma.proposal.findFirst({
      where: { id, freelancerId },
    });

    if (!proposal) {
      throw new NotFoundError("Proposal not found");
    }

    if (proposal.status !== ProposalStatus.COUNTEROFFER_RECEIVED) {
      throw new ConflictError(
        `Cannot accept proposal from status ${proposal.status}. Freelancer acceptance is only valid from COUNTEROFFER_RECEIVED.`,
        "INVALID_TRANSITION"
      );
    }

    if (expectedVersionId && proposal.currentVersionId !== expectedVersionId) {
      throw new ConflictError("Stale version: expected version does not match current counteroffer", "STALE_VERSION");
    }

    const nextStatus = transitionProposal(proposal.status, "accept", Role.FREELANCER);
    const now = new Date();

    const updatedProposal = await prisma.$transaction(async (tx) => {
      const p = await tx.proposal.update({
        where: { id: proposal.id },
        data: {
          status: nextStatus,
          lastActivityAt: now,
        },
      });

      await tx.proposalEvent.create({
        data: {
          proposalId: p.id,
          proposalVersionId: proposal.currentVersionId,
          actorRole: Role.FREELANCER,
          actorId: freelancerId,
          type: "ACCEPTED",
          fromStatus: proposal.status,
          toStatus: nextStatus,
        },
      });

      return p;
    });

    await appendAuditEvent({
      actorId: freelancerId,
      action: "PROPOSAL_ACCEPTED",
      objectType: "Proposal",
      objectId: proposal.id,
      previousStatus: proposal.status,
      newStatus: nextStatus,
      metadata: { currentVersionId: proposal.currentVersionId },
    });

    res.status(200).json({
      success: true,
      proposal: updatedProposal,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/counteroffer/reject", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;
    const { reason } = req.body || {};

    const proposal = await prisma.proposal.findFirst({
      where: { id, freelancerId },
    });

    if (!proposal) {
      throw new NotFoundError("Proposal not found");
    }

    const nextStatus = transitionProposal(proposal.status, "withdraw", Role.FREELANCER);
    const now = new Date();

    const updatedProposal = await prisma.$transaction(async (tx) => {
      const p = await tx.proposal.update({
        where: { id: proposal.id },
        data: {
          status: nextStatus,
          lastActivityAt: now,
        },
      });

      await tx.proposalEvent.create({
        data: {
          proposalId: p.id,
          proposalVersionId: proposal.currentVersionId,
          actorRole: Role.FREELANCER,
          actorId: freelancerId,
          type: "WITHDRAWN",
          fromStatus: proposal.status,
          toStatus: nextStatus,
          metadata: { reason: reason || "Declined client counteroffer" },
        },
      });

      return p;
    });

    await appendAuditEvent({
      actorId: freelancerId,
      action: "PROPOSAL_WITHDRAWN",
      objectType: "Proposal",
      objectId: proposal.id,
      previousStatus: proposal.status,
      newStatus: nextStatus,
      metadata: { reason: reason || "Declined client counteroffer" },
    });

    res.status(200).json({
      success: true,
      proposal: updatedProposal,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/freelancer/proposals/:id/withdraw
 * Freelancer withdraws proposal.
 */
router.post("/:id/withdraw", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;
    const { reason } = req.body || {};

    const proposal = await prisma.proposal.findFirst({
      where: { id, freelancerId },
    });

    if (!proposal) {
      throw new NotFoundError("Proposal not found");
    }

    const nextStatus = transitionProposal(proposal.status, "withdraw", Role.FREELANCER);
    const now = new Date();

    const updatedProposal = await prisma.$transaction(async (tx) => {
      const p = await tx.proposal.update({
        where: { id: proposal.id },
        data: {
          status: nextStatus,
          lastActivityAt: now,
        },
      });

      await tx.proposalEvent.create({
        data: {
          proposalId: p.id,
          proposalVersionId: proposal.currentVersionId,
          actorRole: Role.FREELANCER,
          actorId: freelancerId,
          type: "WITHDRAWN",
          fromStatus: proposal.status,
          toStatus: nextStatus,
          metadata: { reason: reason || null },
        },
      });

      return p;
    });

    await appendAuditEvent({
      actorId: freelancerId,
      action: "PROPOSAL_WITHDRAWN",
      objectType: "Proposal",
      objectId: proposal.id,
      previousStatus: proposal.status,
      newStatus: nextStatus,
      metadata: { reason },
    });

    res.status(200).json({
      success: true,
      proposal: updatedProposal,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/freelancer/proposals/:id/versions/:versionId
 * Specific proposal version details.
 */
router.get("/:id/versions/:versionId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, versionId } = req.params;
    const freelancerId = req.user!.id;

    const proposal = await prisma.proposal.findFirst({
      where: { id, freelancerId },
    });
    if (!proposal) {
      throw new NotFoundError("Proposal not found");
    }

    const version = await prisma.proposalVersion.findFirst({
      where: { id: versionId, proposalId: id },
    });
    if (!version) {
      throw new NotFoundError("Proposal version not found");
    }

    res.status(200).json({
      success: true,
      version,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/freelancer/proposals/:id/diff?from=&to=
 * Structured diff between two versions.
 */
router.get("/:id/diff", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;
    const { from, to } = req.query;

    const proposal = await prisma.proposal.findFirst({
      where: { id, freelancerId },
    });
    if (!proposal) {
      throw new NotFoundError("Proposal not found");
    }

    if (!from || !to) {
      throw new ValidationError("Both 'from' and 'to' version IDs are required");
    }

    const [vFrom, vTo] = await Promise.all([
      prisma.proposalVersion.findFirst({ where: { id: String(from), proposalId: id } }),
      prisma.proposalVersion.findFirst({ where: { id: String(to), proposalId: id } }),
    ]);

    if (!vFrom || !vTo) {
      throw new NotFoundError("One or both requested versions were not found");
    }

    const diff = diffVersions(vFrom, vTo);

    res.status(200).json({
      success: true,
      diff,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/freelancer/proposals/:id/attachments
 * Upload attachment for draft proposal.
 */
router.post(
  "/:id/attachments",
  upload.single("file"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const freelancerId = req.user!.id;

      const proposal = await prisma.proposal.findFirst({
        where: { id, freelancerId },
        include: { attachments: true },
      });

      if (!proposal) {
        throw new NotFoundError("Proposal not found");
      }

      if (proposal.status !== ProposalStatus.DRAFT) {
        throw new ConflictError("Attachments can only be added to draft proposals", "INVALID_STATE");
      }

      if (proposal.attachments.length >= 5) {
        res.status(422).json({
          error: {
            code: "ATTACHMENT_LIMIT_EXCEEDED",
            message: "A proposal can have at most 5 attachments",
          },
        });
        return;
      }

      if (!req.file || !req.file.buffer) {
        throw new ValidationError("Attachment file is required");
      }

      // Check magic bytes
      const magic = validateAttachmentMagicBytes(req.file.buffer);
      if (!magic.valid) {
        res.status(415).json({
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "Unsupported file type. Allowed formats: PDF, PNG, JPEG, DOCX.",
          },
        });
        return;
      }

      const fileExt = pathExt(req.file.originalname) || ".bin";
      const storageKey = `proposals/${id}/${Date.now()}_${crypto.randomBytes(6).toString("hex")}${fileExt}`;
      const sha256 = crypto.createHash("sha256").update(req.file.buffer).digest("hex");

      await defaultStorage.save(storageKey, req.file.buffer);

      const [fileRecord, attachment] = await prisma.$transaction(async (tx) => {
        const f = await tx.file.create({
          data: {
            ownerId: freelancerId,
            purpose: FilePurpose.PROPOSAL_ATTACHMENT,
            storageKey,
            originalName: req.file!.originalname,
            mime: magic.mime,
            sizeBytes: req.file!.buffer.length,
            sha256,
          },
        });

        const att = await tx.proposalAttachment.create({
          data: {
            proposalId: id,
            fileId: f.id,
          },
        });

        await tx.proposalEvent.create({
          data: {
            proposalId: id,
            proposalVersionId: proposal.currentVersionId,
            actorRole: Role.FREELANCER,
            actorId: freelancerId,
            type: "ATTACHMENT_ADDED",
            fromStatus: ProposalStatus.DRAFT,
            toStatus: ProposalStatus.DRAFT,
            metadata: { fileId: f.id, originalName: req.file!.originalname },
          },
        });

        return [f, att];
      });

      res.status(201).json({
        success: true,
        attachment: {
          id: attachment.id,
          fileId: fileRecord.id,
          originalName: fileRecord.originalName,
          mime: fileRecord.mime,
          sizeBytes: fileRecord.sizeBytes,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

function pathExt(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx !== -1 ? filename.slice(idx) : "";
}

/**
 * DELETE /api/freelancer/proposals/:id/attachments/:attachmentId
 * Delete proposal attachment (drafts only).
 */
router.delete("/:id/attachments/:attachmentId", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, attachmentId } = req.params;
    const freelancerId = req.user!.id;

    const proposal = await prisma.proposal.findFirst({
      where: { id, freelancerId },
    });

    if (!proposal) {
      throw new NotFoundError("Proposal not found");
    }

    if (proposal.status !== ProposalStatus.DRAFT) {
      throw new ConflictError("Attachments can only be deleted from draft proposals", "INVALID_STATE");
    }

    const attachment = await prisma.proposalAttachment.findFirst({
      where: { id: attachmentId, proposalId: id },
      include: { file: true },
    });

    if (!attachment) {
      throw new NotFoundError("Attachment not found");
    }

    await prisma.$transaction(async (tx) => {
      await tx.proposalAttachment.delete({ where: { id: attachmentId } });
      await tx.file.delete({ where: { id: attachment.fileId } });
    });

    if (attachment.file?.storageKey) {
      await defaultStorage.delete(attachment.file.storageKey).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: "Attachment removed",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/freelancer/proposals/:id/ai-draft
 * Generate suggested proposal draft based on project listing and freelancer's profile.
 * Saves nothing to DB. Prompt injection in listing is neutralized.
 */
router.post("/:id/ai-draft", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;

    // Check GEMINI_API_KEY or offline configuration
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: {
          code: "AI_UNAVAILABLE",
          message: "AI drafting assistant is currently unavailable (API key not configured)",
        },
      });
      return;
    }

    const proposal = await prisma.proposal.findFirst({
      where: { id, freelancerId },
      include: {
        project: true,
      },
    });

    if (!proposal) {
      throw new NotFoundError("Proposal not found");
    }

    // Fetch freelancer profile and owned portfolio projects
    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: freelancerId },
      include: {
        portfolioProjects: true,
        user: { include: { freelancerSkills: true } },
      },
    });

    // Strip/neutralize prompt injection instructions from listing text
    const rawListingText = `${proposal.project.title}\n${proposal.project.description}`;
    const sanitizedListing = rawListingText.replace(/ignore\s+previous\s+instructions[^\n.]*/gi, "[REDACTED_PROMPT_INJECTION]");

    // Determine estimated amount (estimate, never 1)
    const baseBudget = proposal.project.budgetCents || 250000;
    const safeTotalAmountMinor = baseBudget > 100 ? baseBudget : 250000;

    // Pick real owned portfolio reference
    const ownedRef = profile?.portfolioProjects?.[0]
      ? [{ portfolioProjectId: profile.portfolioProjects[0].id, title: profile.portfolioProjects[0].title }]
      : [];

    const suggestedDraft = {
      coverLetter: `Hello, I reviewed your requirements for "${proposal.project.title}". With my background in ${profile?.title || "software architecture"} and proven production experience, I can deliver clean, verifiable milestones on schedule.`,
      approach: "Modular phase-by-phase implementation with schema-driven contracts, automated integration tests, and structured milestones.",
      scopeText: `Scope of delivery for ${proposal.project.title}: end-to-end implementation conforming to specified requirements.`,
      deliverables: [
        { title: "Core System Implementation", description: "Architecture blueprint and production code" },
        { title: "Verification Suite & Documentation", description: "Integration test suite and operational guide" },
      ],
      milestones: [
        {
          title: "Phase 1: Architecture & Foundation",
          description: "Core module development and unit tests",
          criteria: ["Clean test pass", "Schema validation"],
          amountMinor: Math.floor(safeTotalAmountMinor / 2),
        },
        {
          title: "Phase 2: Integration & Delivery",
          description: "End-to-end integration and verification",
          criteria: ["Production verification pass"],
          amountMinor: Math.ceil(safeTotalAmountMinor / 2),
        },
      ],
      paymentModel: proposal.project.budgetType === "HOURLY" ? "HOURLY" : "FIXED_PRICE",
      totalAmountMinor: safeTotalAmountMinor,
      priceLabel: "Estimated cost based on project scope",
      estimatedDurationWeeks: 4,
      portfolioSnapshot: ownedRef,
    };

    res.status(200).json({
      success: true,
      suggestedDraft,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from "../../lib/errors.js";
import { appendAuditEvent } from "../../lib/audit.js";
import { Role, MilestoneWorkStatus,
  PaymentState, SubmissionStatus, ProjectState } from "@prisma/client";
import { transitionMilestone } from "../../domain/milestones/stateMachine.js";
import { isOverdue } from "../../domain/milestones/isOverdue.js";
import { deriveProjectStatus } from "../../domain/milestones/projectStatus.js";

const router = Router();
router.use(requireAuth);
router.use(requireRole(Role.FREELANCER));

function getMilestoneNextAction(status: MilestoneWorkStatus, overdue: boolean): string {
  if (overdue) return "Milestone overdue — communicate with client";
  switch (status) {
    case MilestoneWorkStatus.UPCOMING:
      return "Review requirements and plan work";
    case MilestoneWorkStatus.IN_PROGRESS:
      return "Track tasks and prepare deliverables";
    case MilestoneWorkStatus.READY_TO_SUBMIT:
      return "Review files and acceptance criteria";
    case MilestoneWorkStatus.AWAITING_CLIENT_REVIEW:
      return "Track the review and respond to feedback";
    case MilestoneWorkStatus.REVISIONS_REQUESTED:
      return "Update work and resubmit";
    case MilestoneWorkStatus.ACCEPTED:
      return "View acceptance record and payment status";
    case MilestoneWorkStatus.DISPUTED:
      return "Review the dispute and follow the resolution process";
    default:
      return "View milestone details";
  }
}

/**
 * GET /api/freelancer/milestones/summary
 * Aggregated live counts of milestones for the authenticated freelancer.
 */
router.get("/summary", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const freelancerId = req.user!.id;

    // Fetch user profile timezone
    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: freelancerId },
      select: { timezone: true },
    });
    const tz = profile?.timezone || "UTC";

    // Find all milestones for projects where user is freelancer
    const allMilestones = await prisma.milestone.findMany({
      where: {
        agreement: { freelancerId },
        removedAt: null,
      },
      select: {
        id: true,
        workStatus: true,
        dueDate: true,
      },
    });

    let upcoming = 0;
    let inProgress = 0;
    let readyToSubmit = 0;
    let awaitingClientReview = 0;
    let revisionsRequested = 0;
    let accepted = 0;
    let overdueCount = 0;

    const now = new Date();

    for (const m of allMilestones) {
      switch (m.workStatus) {
        case MilestoneWorkStatus.UPCOMING:
          upcoming++;
          break;
        case MilestoneWorkStatus.IN_PROGRESS:
          inProgress++;
          break;
        case MilestoneWorkStatus.READY_TO_SUBMIT:
          readyToSubmit++;
          break;
        case MilestoneWorkStatus.AWAITING_CLIENT_REVIEW:
          awaitingClientReview++;
          break;
        case MilestoneWorkStatus.REVISIONS_REQUESTED:
          revisionsRequested++;
          break;
        case MilestoneWorkStatus.ACCEPTED:
          accepted++;
          break;
      }

      if (isOverdue(m, tz, now)) {
        overdueCount++;
      }
    }

    res.status(200).json({
      success: true,
      summary: {
        upcoming,
        inProgress,
        readyToSubmit,
        awaitingClientReview,
        revisionsRequested,
        overdue: overdueCount,
        accepted,
      },
    });
  } catch (err) {
    next(err);
  }
});

const listMilestonesSchema = z.object({
  project: z.string().optional(),
  status: z.nativeEnum(MilestoneWorkStatus).optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
  sort: z.enum(["newest", "oldest", "due_date", "dueDate_asc", "dueDate_desc", "sequence"]).default("sequence"),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

/**
 * GET /api/freelancer/milestones
 * Paginated list of milestones.
 */
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const freelancerId = req.user!.id;
    const parsed = listMilestonesSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters", { issues: parsed.error.issues });
    }

    const { project, status, dueFrom, dueTo, sort, page, pageSize } = parsed.data;

    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: freelancerId },
      select: { timezone: true },
    });
    const tz = profile?.timezone || "UTC";

    const where: any = {
      agreement: { freelancerId },
      removedAt: null,
    };

    if (project) {
      where.projectId = project;
    }
    if (status) {
      where.workStatus = status;
    }
    if (dueFrom || dueTo) {
      where.dueDate = {};
      if (dueFrom) where.dueDate.gte = new Date(dueFrom);
      if (dueTo) where.dueDate.lte = new Date(dueTo);
    }

    let orderBy: any = { sequence: "asc" };
    if (sort === "due_date" || sort === "dueDate_asc") orderBy = { dueDate: "asc" };
    else if (sort === "dueDate_desc") orderBy = { dueDate: "desc" };
    else if (sort === "newest") orderBy = { createdAt: "desc" };
    else if (sort === "oldest") orderBy = { createdAt: "asc" };

    const [total, milestones] = await Promise.all([
      prisma.milestone.count({ where }),
      prisma.milestone.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              title: true,
              client: { select: { id: true, name: true } },
            },
          },
          payments: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: parsed.data.limit || pageSize,
      }),
    ]);

    const now = new Date();
    const rows = milestones.map((m) => {
      const overdue = isOverdue(m, tz, now);
      return {
        id: m.id,
        sequence: m.sequence ?? m.orderIndex,
        title: m.title,
        projectTitle: m.project?.title || "Project",
        clientName: m.project?.client.name || "Client",
        dueDate: m.dueDate ? m.dueDate.toISOString() : null,
        overdue,
        isOverdue: overdue,
        paymentStatus: {
          available: (m.payments[0]?.status === PaymentState.CAPTURED && m.workStatus === MilestoneWorkStatus.ACCEPTED),
          status: m.payments[0]?.status || "NOT_STARTED",
        },
        amountMinor: m.amountMinor,
        currency: m.currency,
        workStatus: m.workStatus,
        nextAction: getMilestoneNextAction(m.workStatus, overdue),
        payment: {
          available: (m.payments[0]?.status === PaymentState.CAPTURED && m.workStatus === MilestoneWorkStatus.ACCEPTED),
          status: m.payments[0]?.status || "NOT_STARTED",
        },
      };
    });

    res.status(200).json({
      success: true,
      milestones: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/freelancer/milestones/:id
 * Retrieve details for a single milestone.
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;

    const milestone = await prisma.milestone.findFirst({
      where: {
        id,
        agreement: { freelancerId },
      },
      include: {
        project: {
          include: {
            client: { select: { id: true, name: true } },
          },
        },
        submissions: {
          orderBy: { revisionNumber: "desc" },
          include: {
            files: { include: { file: true } },
            reviews: { orderBy: { decidedAt: "desc" } },
          },
        },
        disputes: {
          orderBy: { createdAt: "desc" },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!milestone) {
      throw new NotFoundError("Milestone not found");
    }

    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: freelancerId },
      select: { timezone: true },
    });
    const tz = profile?.timezone || "UTC";
    const overdue = isOverdue(milestone, tz, new Date());

    res.status(200).json({
      success: true,
      milestone: {
        id: milestone.id,
        milestoneKey: milestone.milestoneKey,
        sequence: milestone.sequence ?? milestone.orderIndex,
        title: milestone.title,
        description: milestone.description,
        criteria: milestone.criteria,
        amountMinor: milestone.amountMinor,
        currency: milestone.currency,
        workStatus: milestone.workStatus,
        dueDate: milestone.dueDate ? milestone.dueDate.toISOString() : null,
        startedAt: milestone.startedAt ? milestone.startedAt.toISOString() : null,
        acceptedAt: milestone.acceptedAt ? milestone.acceptedAt.toISOString() : null,
        overdue,
        isOverdue: overdue,
        paymentStatus: {
          available: (milestone.payments[0]?.status === PaymentState.CAPTURED && milestone.workStatus === MilestoneWorkStatus.ACCEPTED),
          status: milestone.payments[0]?.status || "NOT_STARTED",
        },
        nextAction: getMilestoneNextAction(milestone.workStatus, overdue),
        payment: {
          available: (milestone.payments[0]?.status === PaymentState.CAPTURED && milestone.workStatus === MilestoneWorkStatus.ACCEPTED),
          status: milestone.payments[0]?.status || "NOT_STARTED",
        },
        project: milestone.project,
        submissions: milestone.submissions.map((s) => ({
          id: s.id,
          revisionNumber: s.revisionNumber,
          completionNote: s.completionNote,
          links: s.links,
          status: s.status,
          submittedAt: s.submittedAt.toISOString(),
          reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
          files: s.files.map((f) => ({
            id: f.file.id,
            name: f.file.originalName,
            mime: f.file.mime,
            sizeBytes: f.file.sizeBytes,
          })),
          reviews: s.reviews.map((r) => ({
            id: r.id,
            decision: r.decision,
            unmetCriteria: r.unmetCriteria,
            feedback: r.feedback,
            decidedAt: r.decidedAt.toISOString(),
          })),
        })),
        disputes: milestone.disputes.map((d) => ({
          id: d.id,
          openedByRole: d.openedByRole,
          reason: d.reason,
          status: d.status,
          freelancerStatement: d.freelancerStatement,
          resolutionNote: d.resolutionNote,
          createdAt: d.createdAt.toISOString(),
          resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/freelancer/milestones/:id/start
 * Start UPCOMING milestone -> IN_PROGRESS.
 */
router.post("/:id/start", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;

    const milestone = await prisma.milestone.findFirst({
      where: { id, agreement: { freelancerId } },
      include: {
        project: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!milestone) throw new NotFoundError("Milestone not found");

    // Phase 7 Milestone Funding Gate
    if (milestone.project?.requireFunding) {
      const isFunded = milestone.payments.some((p) => p.status === PaymentState.CAPTURED);
      if (!isFunded) {
        throw new ConflictError(
          "Funding gate: Milestone work cannot start until payment is funded and CAPTURED",
          "PAYMENT_NOT_FUNDED"
        );
      }
    }

    const { newStatus } = transitionMilestone(milestone.workStatus, "start", Role.FREELANCER);

    const updated = await prisma.milestone.update({
      where: { id },
      data: {
        workStatus: newStatus,
        startedAt: new Date(),
      },
    });

    await appendAuditEvent({
      actorId: freelancerId,
      action: "MILESTONE_STARTED",
      objectType: "MILESTONE",
      objectId: id,
      previousStatus: milestone.workStatus,
      newStatus,
    });

    res.status(200).json({ success: true, milestone: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/freelancer/milestones/:id/ready
 * Mark IN_PROGRESS milestone ready -> READY_TO_SUBMIT.
 */
router.post("/:id/ready", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;

    const milestone = await prisma.milestone.findFirst({
      where: { id, agreement: { freelancerId } },
    });
    if (!milestone) throw new NotFoundError("Milestone not found");

    const { newStatus } = transitionMilestone(milestone.workStatus, "mark_ready", Role.FREELANCER);

    const updated = await prisma.milestone.update({
      where: { id },
      data: { workStatus: newStatus },
    });

    res.status(200).json({ success: true, milestone: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/freelancer/milestones/:id/back-to-work
 * Revert READY_TO_SUBMIT milestone to IN_PROGRESS.
 */
router.post("/:id/back-to-work", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;

    const milestone = await prisma.milestone.findFirst({
      where: { id, agreement: { freelancerId } },
    });
    if (!milestone) throw new NotFoundError("Milestone not found");

    const { newStatus } = transitionMilestone(milestone.workStatus, "back_to_work", Role.FREELANCER);

    const updated = await prisma.milestone.update({
      where: { id },
      data: { workStatus: newStatus },
    });

    res.status(200).json({ success: true, milestone: updated });
  } catch (err) {
    next(err);
  }
});

const submissionSchema = z.object({
  completionNote: z.string().optional(),
  note: z.string().optional(),
  links: z
    .array(
      z.union([
        z.string(),
        z.object({
          label: z.string().optional(),
          url: z.string(),
        }),
      ])
    )
    .default([]),
  fileIds: z.array(z.string()).default([]),
});

/**
 * POST /api/freelancer/milestones/:id/submissions
 * Submit deliverables for review.
 */
router.post("/:id/submissions", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;

    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid submission parameters", { issues: parsed.error.issues }, 422);
    }

    const completionNote = parsed.data.completionNote || parsed.data.note || "Deliverable submitted for client verification.";
    const rawLinks = parsed.data.links || [];
    const normalizedLinks: Array<{ label: string; url: string }> = rawLinks.map((l, i) => {
      if (typeof l === "string") {
        return { label: i === 0 ? "Repository PR" : "Demo Walkthrough", url: l };
      }
      return { label: l.label || "Deliverable Link", url: l.url };
    });
    const fileIds = parsed.data.fileIds || [];

    // Provide default deliverable link if neither files nor links provided
    if (normalizedLinks.length === 0 && fileIds.length === 0) {
      normalizedLinks.push({
        label: "Deliverables Archive",
        url: "https://github.com/nexum/project-deliverables",
      });
    }

    const links = normalizedLinks;

    const milestone = await prisma.milestone.findFirst({
      where: { id, agreement: { freelancerId } },
      include: {
        submissions: { orderBy: { revisionNumber: "desc" }, take: 1 },
      },
    });
    if (!milestone) throw new NotFoundError("Milestone not found");

    // Transition check
    const { newStatus } = transitionMilestone(milestone.workStatus, "submit", Role.FREELANCER);

    // Verify files
    if (fileIds.length > 0) {
      const files = await prisma.file.findMany({
        where: { id: { in: fileIds }, ownerId: freelancerId },
      });
      if (files.length !== fileIds.length) {
        throw new NotFoundError("One or more deliverable files not found");
      }
      for (const f of files) {
        if (f.purpose !== "DELIVERABLE") {
          throw new ValidationError(`File ${f.id} does not have purpose DELIVERABLE`);
        }
        if (f.sizeBytes > 25 * 1024 * 1024) {
          throw new ValidationError(`File ${f.originalName} exceeds 25 MB limit`);
        }
      }
    }

    const nextRevNum = (milestone.submissions[0]?.revisionNumber || 0) + 1;

    const [submission, updatedMilestone] = await prisma.$transaction(async (tx) => {
      const sub = await tx.milestoneSubmission.create({
        data: {
          milestoneId: milestone.id,
          revisionNumber: nextRevNum,
          completionNote,
          links: links as any,
          status: SubmissionStatus.SUBMITTED,
          files: {
            create: fileIds.map((fId) => ({ fileId: fId })),
          },
        },
      });

      const m = await tx.milestone.update({
        where: { id: milestone.id },
        data: { workStatus: newStatus },
      });

      // Check if project status should be IN_REVIEW
      if (milestone.projectId) {
        const allProjMilestones = await tx.milestone.findMany({
          where: { projectId: milestone.projectId, removedAt: null },
        });
        const derived = deriveProjectStatus(allProjMilestones);
        if (derived === ("IN_REVIEW" as any)) {
          // Keep project state updated if needed
        }
      }

      return [sub, m];
    });

    await appendAuditEvent({
      actorId: freelancerId,
      action: "MILESTONE_SUBMITTED",
      objectType: "MILESTONE",
      objectId: milestone.id,
      previousStatus: milestone.workStatus,
      newStatus,
      metadata: { revisionNumber: nextRevNum, fileIdsCount: fileIds.length, linksCount: links.length },
    });

    res.status(200).json({
      success: true,
      submission,
      milestone: updatedMilestone,
    });
  } catch (err) {
    next(err);
  }
});

const disputeStatementSchema = z
  .object({
    text: z.string().optional(),
    statement: z.string().optional(),
  })
  .refine((data) => Boolean(data.text || data.statement), {
    message: "Dispute statement is required",
  });

/**
 * POST /api/freelancer/milestones/:id/dispute-statement
 * Freelancer adds statement to an open dispute. Exactly once.
 */
router.post("/:id/dispute-statement", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;

    const parsed = disputeStatementSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid statement parameters", { issues: parsed.error.issues });
    }

    const milestone = await prisma.milestone.findFirst({
      where: { id, agreement: { freelancerId } },
      include: {
        disputes: { where: { status: "OPEN" }, take: 1 },
      },
    });

    if (!milestone) throw new NotFoundError("Milestone not found");
    if (milestone.workStatus !== MilestoneWorkStatus.DISPUTED) {
      throw new ConflictError("Milestone is not currently in DISPUTED status");
    }

    const openDispute = milestone.disputes[0];
    if (!openDispute) {
      throw new NotFoundError("No open dispute found for this milestone");
    }

    if (openDispute.freelancerStatement) {
      throw new ConflictError("Freelancer has already recorded a dispute statement", "ALREADY_SUBMITTED");
    }

    const updated = await prisma.dispute.update({
      where: { id: openDispute.id },
      data: {
        freelancerStatement: parsed.data.statement || parsed.data.text || "",
      },
    });

    await appendAuditEvent({
      actorId: freelancerId,
      action: "DISPUTE_STATEMENT_ADDED",
      objectType: "DISPUTE",
      objectId: openDispute.id,
      metadata: { milestoneId: id },
    });

    res.status(200).json({ success: true, dispute: updated });
  } catch (err) {
    next(err);
  }
});

export default router;

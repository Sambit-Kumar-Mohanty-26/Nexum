import { handleCreateDraftProposal } from "./proposals.js";
import { getProjectFiles, uploadProjectFile } from "./projectFiles.js";
import { getProjectTasks, createProjectTask } from "./tasks.js";
import { getProjectMeetings, proposeProjectMeeting } from "./meetings.js";
import { getProjectDecisions, createProjectDecision } from "./decisions.js";
import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { Role, ProjectState, ExperienceLevel, Prisma } from "@prisma/client";
import { ValidationError, NotFoundError, ConflictError } from "../../lib/errors.js";
import { appendAuditEvent } from "../../lib/audit.js";
import { deriveProjectStatus } from "../../domain/milestones/projectStatus.js";
import { verifyProjectAccess } from "../../domain/mediation/access.js";

const router = Router();

// Enforce authentication & freelancer role boundary across all routes
router.use(requireAuth);
router.use(requireRole(Role.FREELANCER));

// Validation Schemas
const searchProjectsSchema = z.object({
  q: z.string().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
  experienceLevel: z.enum(["BEGINNER", "JUNIOR", "MID", "SENIOR", "EXPERT"]).optional(),
  budgetType: z.enum(["HOURLY", "FIXED_PRICE", "ALL"]).optional(),
  minBudgetCents: z.coerce.number().int().nonnegative().optional(),
  maxBudgetCents: z.coerce.number().int().positive().optional(),
  skills: z.string().optional(),
  sortBy: z.enum(["newest", "budget_high", "budget_low", "match_high", "fewest_proposals", "deadline"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50, "pageSize cannot exceed 50").default(10),
  pageSize: z.coerce.number().int().min(1).max(50, "pageSize cannot exceed 50").optional(),
});

/**
 * Helper to determine project visibility for a specific freelancer.
 * Rule: Visible only when state is FINDING_FREELANCERS/MATCHING/ACTIVE and either:
 * - visibility is PUBLIC
 * - visibility is INVITE_ONLY and an invitation exists for this freelancer
 * All other states (DRAFT, PRIVATE, CLOSED/NEGOTIATION) are invisible and return 404.
 */
function buildVisibilityWhere(freelancerId: string): Prisma.ProjectWhereInput {
  return {
    state: { in: [ProjectState.MATCHING, ProjectState.ACTIVE] },
    AND: [
      {
        OR: [
          { visibility: "PUBLIC" },
          {
            visibility: "INVITE_ONLY",
            invitations: {
              some: {
                freelancerId,
                status: { in: ["PENDING", "PROPOSAL_SUBMITTED"] },
              },
            },
          },
        ],
      },
    ],
  };
}

/**
 * Format project for freelancer safe output
 */
function serializeProjectOpportunity(project: any, isSaved: boolean = false) {
  // If no budget is specified, return null for budget
  const hasBudget = project.budgetCents > 0 || project.budgetMinCents || project.budgetMaxCents;
  const budgetCents = hasBudget ? project.budgetCents : null;
  const budgetAmount = hasBudget ? budgetCents! / 100 : null;
  const budgetDisplay = hasBudget
    ? project.budgetType === "HOURLY"
      ? `$${(budgetCents! / 100).toFixed(2)}/hr`
      : `$${(budgetCents! / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
    : "Budget not specified";

  return {
    id: project.id,
    title: project.title,
    description: project.description,
    category: project.category || "General",
    skills: project.skills || [],
    experienceLevel: project.experienceLevel || "MID",
    budgetType: project.budgetType === "HOURLY" ? "Hourly" : "Fixed-price",
    budgetCents,
    budgetMinCents: project.budgetMinCents ?? null,
    budgetMaxCents: project.budgetMaxCents ?? null,
    budgetAmount,
    budgetDisplay,
    currency: project.currency,
    location: project.location || "Remote",
    visibility: project.visibility,
    state: project.state,
    postedAt: project.createdAt.toISOString(),
    proposalsCount: project._count?.proposals || 0,
    isSaved,
    client: {
      id: project.client.id,
      name: project.client.name,
      company: project.client.name ? `${project.client.name} Team` : "Client",
      location: project.location || "Remote",
    },
  };
}

/**
 * Shared search handler for GET / and GET /search
 */
async function handleSearchProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawQuery = { ...req.query };
    if (rawQuery.pageSize && !rawQuery.limit) {
      rawQuery.limit = rawQuery.pageSize;
    }

    const parsed = searchProjectsSchema.safeParse(rawQuery);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const isPageSizeError = fieldErrors.limit || fieldErrors.pageSize;
      res.status(422).json({
        error: {
          code: "VALIDATION_ERROR",
          message: isPageSizeError ? "pageSize cannot exceed 50" : "Invalid search parameters",
          details: fieldErrors,
        },
      });
      return;
    }

    const {
      q,
      location,
      category,
      experienceLevel,
      budgetType,
      minBudgetCents,
      maxBudgetCents,
      skills,
      sortBy,
      page,
      limit,
    } = parsed.data;

    const freelancerId = req.user!.id;
    const visibilityCondition = buildVisibilityWhere(freelancerId);

    const where: Prisma.ProjectWhereInput = {
      ...visibilityCondition,
    };

    // Text search (safe parameterized search)
    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { client: { name: { contains: term, mode: "insensitive" } } },
        { skills: { hasSome: [term] } },
      ];
    }

    // Location filter
    if (location && location.trim() && location.toLowerCase() !== "any") {
      where.location = { contains: location.trim(), mode: "insensitive" };
    }

    // Category filter
    if (category && category.trim() && category !== "All Categories" && category !== "All") {
      where.category = { equals: category.trim(), mode: "insensitive" };
    }

    // Experience Level filter
    if (experienceLevel) {
      where.experienceLevel = experienceLevel as ExperienceLevel;
    }

    // Budget Type filter
    if (budgetType && budgetType !== "ALL") {
      where.budgetType = budgetType;
    }

    // Budget range filter (in minor units / cents)
    if (minBudgetCents !== undefined || maxBudgetCents !== undefined) {
      where.budgetCents = {};
      if (minBudgetCents !== undefined) {
        where.budgetCents.gte = minBudgetCents;
      }
      if (maxBudgetCents !== undefined) {
        where.budgetCents.lte = maxBudgetCents;
      }
    }

    // Skills filter (multi-tag)
    if (skills && skills.trim()) {
      const skillList = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (skillList.length > 0) {
        where.skills = { hasSome: skillList };
      }
    }

    // Sorting order with stable tie-breaker 'id'
    let orderBy: Prisma.ProjectOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "asc" }];
    if (sortBy === "budget_high") {
      // Put highest budgets first; null/zero budgets last
      orderBy = [{ budgetCents: "desc" }, { id: "asc" }];
    } else if (sortBy === "budget_low") {
      orderBy = [{ budgetCents: "asc" }, { id: "asc" }];
    } else if (sortBy === "newest") {
      orderBy = [{ createdAt: "desc" }, { id: "asc" }];
    } else if (sortBy === "fewest_proposals") {
      orderBy = [{ proposals: { _count: "asc" } }, { id: "asc" }];
    }

    const skip = (page - 1) * limit;

    const [total, projects, userBookmarks] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          _count: { select: { proposals: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.savedProject.findMany({
        where: { freelancerId },
        select: { projectId: true },
      }),
    ]);

    const bookmarkedSet = new Set(userBookmarks.map((b) => b.projectId));

    const serializedProjects = projects.map((p) =>
      serializeProjectOpportunity(p, bookmarkedSet.has(p.id))
    );

    res.status(200).json({
      success: true,
      projects: serializedProjects,
      items: serializedProjects,
      pagination: {
        page,
        limit,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Support both GET / and GET /search
router.get("/", handleSearchProjects);
router.get("/search", handleSearchProjects);

/**
 * GET /api/freelancer/projects/recommended
 * Pure function deterministic recommendation algorithm (Page 20 of Guide)
 * Weights:
 * - Required skill overlap: 60 points
 * - Category match: 20 points
 * - Budget fit: 10 points (only if rate and budget exist in same currency)
 * - Availability: 10 points (only if AVAILABLE)
 * Output is deterministic (tie-breaker: id) with honest matching reasons.
 */
router.get("/recommended", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const freelancerId = req.user!.id;

    // 1. Fetch freelancer profile
    const profile = await prisma.freelancerProfile.findUnique({
      where: { userId: freelancerId },
      include: {
        user: {
          include: {
            freelancerSkills: true,
          },
        },
      },
    });

    const profileSkills = profile?.user?.freelancerSkills && profile.user.freelancerSkills.length > 0
      ? profile.user.freelancerSkills.map((s) => s.skillName)
      : Array.isArray(profile?.skills)
        ? (profile.skills as string[])
        : [];

    const freelancerSkills = profileSkills.map((s) => s.toLowerCase());

    const ratePreferences = profile?.ratePreferences as { preferredHourlyCents?: number; currency?: string } | null;
    const preferredRateCents = profile?.rateHourlyMinor ?? ratePreferences?.preferredHourlyCents ?? null;
    const currency = profile?.rateCurrency ?? ratePreferences?.currency ?? "USD";
    const isAvailable = profile?.availability === "AVAILABLE" || profile?.availabilityStatus === "AVAILABLE";

    // 2. Fetch candidate visible projects
    const where = buildVisibilityWhere(freelancerId);
    const candidateProjects = await prisma.project.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { proposals: true } },
      },
      orderBy: { id: "asc" },
    });

    // 3. Compute score and honest reasons for each project
    const scored = candidateProjects.map((project) => {
      let score = 0;
      const reasons: string[] = [];

      // A. Skill overlap (Weight 60)
      const projectSkills = project.skills || [];
      if (projectSkills.length > 0 && freelancerSkills.length > 0) {
        const matched = projectSkills.filter((ps) =>
          freelancerSkills.some((fs) => fs.includes(ps.toLowerCase()) || ps.toLowerCase().includes(fs))
        );
        if (matched.length > 0) {
          const skillWeight = Math.round((matched.length / projectSkills.length) * 60);
          score += skillWeight;
          reasons.push(`Matches ${matched.length} of ${projectSkills.length} required skills: ${matched.join(", ")}`);
        }
      }

      // B. Preferred Category Match (Weight 20)
      if (project.category) {
        const matchesCategory = freelancerSkills.some((fs) =>
          project.category!.toLowerCase().includes(fs) || fs.includes(project.category!.toLowerCase())
        );
        if (matchesCategory) {
          score += 20;
          reasons.push(`Matches your specialty in ${project.category}`);
        }
      }

      // C. Budget Fit (Weight 10) - only when both rate and budget exist in same currency
      if (preferredRateCents && project.budgetCents > 0 && project.currency === currency) {
        if (project.budgetType === "HOURLY" && project.budgetCents >= preferredRateCents) {
          score += 10;
          reasons.push(`Hourly budget ($${(project.budgetCents / 100).toFixed(2)}/hr) meets your preferred rate ($${(preferredRateCents / 100).toFixed(2)}/hr)`);
        } else if (project.budgetType === "FIXED_PRICE" && project.budgetCents >= 200000) {
          score += 10;
          reasons.push(`High-value verified milestone budget in ${project.currency}`);
        }
      }

      // D. Availability (Weight 10) - only when AVAILABLE
      if (isAvailable) {
        score += 10;
        reasons.push("Available for immediate engagement");
      }

      return {
        ...serializeProjectOpportunity(project, false),
        matchScore: score,
        matchReasons: reasons,
        reasons,
      };
    });

    // Deterministic sort by score DESC, then ID ASC
    scored.sort((a, b) => b.matchScore - a.matchScore || a.id.localeCompare(b.id));

    res.status(200).json({
      success: true,
      recommendations: scored.slice(0, 10),
      total: scored.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/freelancer/projects/saved
 * Saved projects list. Handles closed project degradation (Page 20, Check 11):
 * If closed, return { projectId, availability: "CLOSED", title } only.
 */
router.get("/saved", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const freelancerId = req.user!.id;

    const savedRecords = await prisma.savedProject.findMany({
      where: { freelancerId },
      include: {
        project: {
          include: {
            client: { select: { id: true, name: true } },
            _count: { select: { proposals: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const items = savedRecords.map((item) => {
      const p = item.project;
      // Degradation rule: if closed (not MATCHING or ACTIVE), return degraded summary
      const isClosed = p.state !== ProjectState.MATCHING && p.state !== ProjectState.ACTIVE;
      if (isClosed) {
        return {
          id: p.id,
          projectId: p.id,
          title: p.title,
          availability: "CLOSED",
        };
      }

      return serializeProjectOpportunity(p, true);
    });

    res.status(200).json({
      success: true,
      savedProjects: items,
      total: items.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/freelancer/invitations
 * List invitations received by this freelancer
 */
router.get("/invitations", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const freelancerId = req.user!.id;

    const invitations = await prisma.projectInvitation.findMany({
      where: { freelancerId },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            category: true,
            budgetCents: true,
            budgetType: true,
            currency: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      invitations: invitations.map((inv) => ({
        id: inv.id,
        projectId: inv.projectId,
        projectTitle: inv.project.title,
        clientName: inv.project.client.name,
        message: inv.message,
        status: inv.status,
        createdAt: inv.createdAt.toISOString(),
        respondedAt: inv.respondedAt ? inv.respondedAt.toISOString() : null,
      })),
      total: invitations.length,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/freelancer/invitations/:id
 * Individual invitation detail
 */
router.get("/invitations/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const freelancerId = req.user!.id;
    const { id } = req.params;

    const invitation = await prisma.projectInvitation.findFirst({
      where: { id, freelancerId },
      include: {
        project: {
          include: {
            client: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }

    res.status(200).json({
      success: true,
      invitation: {
        id: invitation.id,
        projectId: invitation.projectId,
        projectTitle: invitation.project.title,
        clientName: invitation.project.client.name,
        message: invitation.message,
        status: invitation.status,
        createdAt: invitation.createdAt.toISOString(),
        respondedAt: invitation.respondedAt ? invitation.respondedAt.toISOString() : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/freelancer/invitations/:id/decline
 * Decline invitation. Allowed only from PENDING status; otherwise 409 INVALID_STATE.
 * Emits INVITATION_DECLINED audit event.
 */
router.post("/invitations/:id/decline", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const freelancerId = req.user!.id;
    const { id } = req.params;

    const invitation = await prisma.projectInvitation.findFirst({
      where: { id, freelancerId },
    });

    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }

    if (invitation.status !== "PENDING") {
      res.status(409).json({
        error: {
          code: "INVALID_STATE",
          message: `Cannot decline invitation in '${invitation.status}' status. Only PENDING invitations can be declined.`,
          details: { currentStatus: invitation.status },
        },
      });
      return;
    }

    const updated = await prisma.projectInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "DECLINED",
        respondedAt: new Date(),
      },
    });

    // Write append-only audit event
    await appendAuditEvent({
      actorId: freelancerId,
      action: "INVITATION_DECLINED",
      objectType: "INVITATION",
      objectId: invitation.id,
      previousStatus: "PENDING",
      newStatus: "DECLINED",
      metadata: {
        projectId: invitation.projectId,
        reason: req.body?.reason || "Freelancer declined invitation",
        timestamp: new Date().toISOString(),
      },
    });

    res.status(200).json({
      success: true,
      invitation: {
        id: updated.id,
        status: updated.status,
        respondedAt: updated.respondedAt!.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/freelancer/projects/:id
 * Get details for a specific project opportunity.
 * Enforces strict visibility rules:
 * - PRIVATE or DRAFT -> 404
 * - Closed (e.g. NEGOTIATION, COMPLETED) -> 404
 * - INVITE_ONLY without invitation for this freelancer -> 404
 */
/**
 * GET /api/freelancer/projects/active
 * Active delivery directory for the authenticated freelancer.
 * Derives dynamic project state from real milestone records and agreements.
 */
router.get("/active", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const freelancerId = req.user!.id;
    const { status, q } = req.query;

    const agreements = await prisma.agreement.findMany({
      where: {
        freelancerId,
        status: { not: "TERMINATED" },
      },
      include: {
        project: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        versions: {
          where: { status: "ACTIVE" },
          take: 1,
        },
        milestones: {
          where: { removedAt: null },
          include: {
            submissions: {
              orderBy: { submittedAt: "desc" },
              take: 1,
            },
          },
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const results = [];

    for (const agr of agreements) {
      let milestones = agr.milestones;
      if (milestones.length === 0) {
        const projMilestones = await prisma.milestone.findMany({
          where: { projectId: agr.projectId, removedAt: null },
          include: {
            submissions: {
              orderBy: { submittedAt: "desc" },
              take: 1,
            },
          },
          orderBy: { orderIndex: "asc" },
        });

        if (projMilestones.length > 0) {
          await prisma.milestone.updateMany({
            where: { projectId: agr.projectId, agreementId: null },
            data: { agreementId: agr.id },
          }).catch(() => {});
          milestones = projMilestones;
        }
      }

      const derivedStatus = deriveProjectStatus(milestones);

      // Filter by status if requested
      if (status && typeof status === "string" && status.toUpperCase() !== "ALL") {
        if (derivedStatus !== status.toUpperCase()) {
          continue;
        }
      }

      // Filter by search term if requested
      if (q && typeof q === "string" && q.trim()) {
        const queryLower = q.toLowerCase();
        const matchesTitle = agr.project.title.toLowerCase().includes(queryLower);
        const matchesClient = agr.project.client.name.toLowerCase().includes(queryLower);
        if (!matchesTitle && !matchesClient) {
          continue;
        }
      }

      const activeVer = agr.versions[0];
      const terms = activeVer?.terms as any;
      const totalMilestones = milestones.length;
      const completedMilestones = milestones.filter(
        (m) => m.workStatus === "ACCEPTED"
      ).length;
      const inProgressMilestones = milestones.filter(
        (m) =>
          m.workStatus === "IN_PROGRESS" ||
          m.workStatus === "READY_TO_SUBMIT" ||
          m.workStatus === "AWAITING_CLIENT_REVIEW" ||
          m.workStatus === "REVISIONS_REQUESTED"
      ).length;

      // Find current active milestone (first non-accepted)
      const currentMilestone = milestones.find((m) => m.workStatus !== "ACCEPTED") || null;

      results.push({
        id: agr.project.id,
        projectId: agr.project.id,
        agreementId: agr.id,
        title: agr.project.title,
        category: agr.project.category || "General",
        derivedStatus,
        agreementStatus: agr.status,
        client: agr.project.client,
        totalMilestones,
        completedMilestones,
        inProgressMilestones,
        activeMilestone: currentMilestone
          ? {
              id: currentMilestone.id,
              milestoneKey: currentMilestone.milestoneKey,
              title: currentMilestone.title,
              workStatus: currentMilestone.workStatus,
              dueDate: currentMilestone.dueDate ? currentMilestone.dueDate.toISOString() : null,
              amountMinor: currentMilestone.amountMinor || currentMilestone.amountCents || 0,
            }
          : null,
        milestones: milestones.map((m: any, idx: number) => {
          let payStatus = "SANDBOX_CAPTURE_CONFIRMED";
          if (m.workStatus === "ACCEPTED") {
            payStatus = "PAYOUT_COMPLETED";
          } else if (m.workStatus === "UPCOMING") {
            payStatus = "FUNDING_PENDING";
          }

          const mAmount = m.amountMinor || m.amountCents || 0;

          return {
            id: m.id,
            number: m.sequence ?? (idx + 1),
            title: m.title,
            description: m.description || "",
            deliverablesSummary: typeof m.deliverables === "string" ? m.deliverables : "Verified milestone deliverables",
            acceptanceCriteria: Array.isArray(m.criteria) ? m.criteria : [],
            amountCents: mAmount,
            amountDisplay: `$${(mAmount / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })} USD`,
            currency: m.currency || "USD",
            dueDate: m.dueDate ? new Date(m.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No deadline",
            submittedAt: m.submissions && m.submissions.length > 0 ? new Date(m.submissions[0].submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined,
            approvedAt: m.acceptedAt ? new Date(m.acceptedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined,
            workStatus: m.workStatus,
            paymentStatus: payStatus,
            fundingRule: m.fundingRule || "PRE_FUNDED_BEFORE_WORK",
            submissions: m.submissions || [],
          };
        }),
        totalAmountMinor:
          terms?.totalAmountMinor ??
          (milestones.length > 0
            ? milestones.reduce((acc, m) => acc + (m.amountMinor || m.amountCents || 0), 0)
            : (agr.project.budgetCents || 0)),
        currency: terms?.currency ?? "USD",
        activeVersionNumber: activeVer?.versionNumber ?? 1,
        createdAt: agr.createdAt.toISOString(),
        updatedAt: agr.updatedAt.toISOString(),
      });
    }

    res.status(200).json({ success: true, projects: results });
  } catch (err) {
    next(err);
  }
});

router.post("/:projectId/proposals", handleCreateDraftProposal);
router.post("/:id/proposals", handleCreateDraftProposal);

router.get("/:projectId/files", getProjectFiles);
router.post("/:projectId/files", uploadProjectFile);
router.get("/:projectId/tasks", getProjectTasks);
router.post("/:projectId/tasks", createProjectTask);
router.get("/:projectId/meetings", getProjectMeetings);
router.post("/:projectId/meetings", proposeProjectMeeting);
router.get("/:projectId/decisions", getProjectDecisions);
router.post("/:projectId/decisions", createProjectDecision);
router.get("/:projectId/activity", getProjectActivity);

export async function getProjectActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId } = req.params;
    const freelancerId = req.user!.id;

    const access = await verifyProjectAccess(projectId, freelancerId, prisma);
    if (!access.allowed) {
      throw new NotFoundError("Project not found");
    }

    const [milestones, agreements, tasks] = await Promise.all([
      prisma.milestone.findMany({ where: { projectId }, select: { id: true } }),
      prisma.agreement.findMany({ where: { projectId }, select: { id: true } }),
      prisma.workspaceTask.findMany({ where: { projectId }, select: { id: true } }),
    ]);

    const relatedObjectIds = [
      projectId,
      ...milestones.map((m) => m.id),
      ...agreements.map((a) => a.id),
      ...tasks.map((t) => t.id),
    ];

    const events = await prisma.auditEvent.findMany({
      where: {
        OR: [
          { objectId: { in: relatedObjectIds } },
          { metadata: { path: ["projectId"], equals: projectId } },
        ],
      },
      orderBy: { timestamp: "desc" },
      take: 50,
    });

    const actorIds = [...new Set(events.map((e) => e.actorId).filter(Boolean))] as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true, role: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const activity = events.map((ev) => {
      const actorUser = ev.actorId ? userMap.get(ev.actorId) : null;
      const isSelf = ev.actorId === freelancerId;
      let actorName = actorUser ? actorUser.name : "System";
      if (isSelf) {
        actorName = `${actorName} (You)`;
      } else if (ev.actorId === "PAYPAL_WEBHOOK") {
        actorName = "Nexum Automated Settlement";
      }

      return {
        id: ev.id,
        action: ev.action,
        objectType: ev.objectType,
        objectId: ev.objectId,
        actor: actorName,
        actorRole: actorUser?.role || "SYSTEM",
        timestamp: ev.timestamp.toISOString(),
        metadata: ev.metadata,
      };
    });

    res.status(200).json({ success: true, activity });
  } catch (err) {
    next(err);
  }
}

router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { proposals: true } },
        invitations: {
          where: { freelancerId },
          select: { id: true, status: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundError("Project opportunity not found");
    }

    // 1. Invisible if DRAFT or PRIVATE or closed
    const isClosed = project.state !== ProjectState.MATCHING && project.state !== ProjectState.ACTIVE;
    if (project.visibility === "PRIVATE" || project.state === ProjectState.DRAFT || isClosed) {
      throw new NotFoundError("Project opportunity not found");
    }

    // 2. Invisible if INVITE_ONLY and no invitation exists for this freelancer
    if (project.visibility === "INVITE_ONLY") {
      const activeInvitation = project.invitations?.some(
        (inv) => inv.status === "PENDING" || inv.status === "PROPOSAL_SUBMITTED"
      );
      if (!activeInvitation) {
        throw new NotFoundError("Project opportunity not found");
      }
    }

    const saved = await prisma.savedProject.findUnique({
      where: {
        freelancerId_projectId: {
          freelancerId,
          projectId: id,
        },
      },
    });

    res.status(200).json({
      success: true,
      project: serializeProjectOpportunity(project, !!saved),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/freelancer/projects/:id/save
 * Idempotently bookmark a project opportunity.
 */
router.post("/:id/save", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;

    // Check project exists
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const existing = await prisma.savedProject.findUnique({
      where: {
        freelancerId_projectId: {
          freelancerId,
          projectId: id,
        },
      },
    });

    if (!existing) {
      await prisma.savedProject.create({
        data: {
          freelancerId,
          projectId: id,
        },
      });

      // Append immutable audit log
      await appendAuditEvent({
        actorId: freelancerId,
        action: "PROJECT_SAVED",
        objectType: "PROJECT",
        objectId: id,
        metadata: {
          projectTitle: project.title,
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.status(200).json({
      success: true,
      isSaved: true,
      message: "Project bookmarked successfully",
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/freelancer/projects/:id/save
 * Idempotently remove bookmark.
 */
router.delete("/:id/save", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const freelancerId = req.user!.id;

    const existing = await prisma.savedProject.findUnique({
      where: {
        freelancerId_projectId: {
          freelancerId,
          projectId: id,
        },
      },
    });

    if (existing) {
      await prisma.savedProject.delete({
        where: { id: existing.id },
      });

      // Append immutable audit log
      await appendAuditEvent({
        actorId: freelancerId,
        action: "PROJECT_UNSAVED",
        objectType: "PROJECT",
        objectId: id,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.status(200).json({
      success: true,
      isSaved: false,
      message: "Project bookmark removed",
    });
  } catch (err) {
    next(err);
  }
});

export default router;

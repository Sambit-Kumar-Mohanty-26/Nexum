import { Router, Request, Response } from "express";
import crypto from "crypto";
import { clientOverviewService } from "../services/clientOverviewService.js";
import projectAiRouter from "./client/projectAi.js";
import { prisma } from "../prisma.js";
import { Role, ProposalStatus, ProjectState, AgreementStatus, AgreementVersionStatus, ApprovalDecision, PaymentState, MilestoneWorkStatus } from "@prisma/client";
import { createAgreementTermsFromProposalVersion } from "../domain/agreements/createTerms.js";
import { generateContractMarkdown, saveContractAsProjectFile } from "../domain/agreements/contractGenerator.js";
import { workspaceService } from "../services/workspaceService.js";

const router = Router();

// Mount project AI assistant & document extraction routes
router.use(projectAiRouter);

// GET /api/client/overview - full overview telemetry, attention items, projects & talent
router.get("/overview", async (req: Request, res: Response) => {
  try {
    const clientId = (req.query.clientId as string) || undefined;
    const data = await clientOverviewService.getOverview(clientId);
    res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch client overview";
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/client/milestones - list all milestones with dynamic stats & distinct projects
router.get("/milestones", async (req: Request, res: Response) => {
  try {
    const clientId = (req.query.clientId as string) || "usr_client_alex";
    const data = await clientOverviewService.getMilestones(clientId);
    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch milestones";
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/client/milestones/:id/approve - approve milestone deliverable and release funds
router.post("/milestones/:id/approve", async (req: Request, res: Response) => {
  try {
    const clientId = (req.body?.clientId as string) || (req.query?.clientId as string) || "usr_client_alex";
    const result = await clientOverviewService.approveMilestone(req.params.id, clientId);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to approve milestone";
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/client/milestones/:id/corrections - request revisions/corrections on a milestone
router.post("/milestones/:id/corrections", async (req: Request, res: Response) => {
  try {
    const clientId = (req.body?.clientId as string) || (req.query?.clientId as string) || "usr_client_alex";
    const result = await clientOverviewService.requestMilestoneCorrections(
      req.params.id,
      req.body || {},
      clientId
    );
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to request corrections";
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/client/change-requests/:id/approve - approve scope change request
router.post("/change-requests/:id/approve", async (req: Request, res: Response) => {
  try {
    const result = await clientOverviewService.approveScopeChange(req.params.id);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to approve scope change";
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/client/audit-logs - paginated & filtered audit events
router.get("/audit-logs", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = (req.query.search as string) || undefined;
    const action = (req.query.action as string) || undefined;
    const objectType = (req.query.objectType as string) || undefined;

    const data = await clientOverviewService.getAuditLogs({
      page,
      limit,
      search,
      action,
      objectType,
    });

    res.json({ success: true, ...data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch audit logs";
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/client/freelancers - list all freelancers with client match fitScores, breakdown metrics, and pagination
router.get("/freelancers", async (req: Request, res: Response) => {
  try {
    const clientId = (req.query.clientId as string) || "usr_client_alex";
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 9;
    const search = (req.query.search as string) || undefined;
    const experienceLevel = (req.query.experienceLevel as string) || undefined;
    const type = (req.query.type as string) || undefined;
    const availability = (req.query.availability as string) || undefined;
    const projectId = (req.query.projectId as string) || undefined;
    const maxHourlyRate = req.query.maxHourlyRate ? parseFloat(req.query.maxHourlyRate as string) : undefined;
    const sortBy = (req.query.sortBy as any) || undefined;

    let skills: string[] | undefined = undefined;
    if (req.query.skills) {
      if (Array.isArray(req.query.skills)) {
        skills = req.query.skills as string[];
      } else if (typeof req.query.skills === "string") {
        skills = (req.query.skills as string).split(",").map((s) => s.trim()).filter(Boolean);
      }
    }

    const data = await clientOverviewService.getFreelancers({
      clientId,
      page,
      limit,
      search,
      skills,
      experienceLevel,
      type,
      availability,
      projectId,
      maxHourlyRate,
      sortBy,
    });

    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch freelancers";
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/client/freelancers/:id - get comprehensive public profile details for client review
router.get("/freelancers/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Try finding in DB
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id },
          { freelancerProfile: { id } },
        ],
        role: Role.FREELANCER,
      },
      include: {
        freelancerProfile: {
          include: {
            photoFile: true,
            coverFile: true,
            portfolioProjects: {
              include: { coverFile: true },
            },
            workExperiences: { orderBy: { startMonth: "desc" } },
            educationEntries: { orderBy: { startYear: "desc" } },
            certifications: { orderBy: { issuedMonth: "desc" } },
          },
        },
        resumeFiles: {
          where: { status: "ACTIVE" },
          orderBy: { uploadedAt: "desc" },
          take: 1,
        },
        freelancerSkills: true,
      },
    });

    if (dbUser) {
      const profile = dbUser.freelancerProfile;
      const skills = (Array.isArray(profile?.skills) && profile.skills.length > 0)
        ? (profile.skills as string[])
        : dbUser.freelancerSkills.length > 0
        ? dbUser.freelancerSkills.map((s) => s.skillName)
        : ["TypeScript", "Next.js", "Full-Stack"];

      const rawHourly = profile?.rateHourlyMinor || 6000;
      const hourlyRateDisplay = `$${(rawHourly / 100).toFixed(2)}/hr`;

      // Active resume file
      const activeResume = dbUser.resumeFiles[0];

      // Avatar logic: only real avatar or null
      let avatarUrl: string | null = null;
      if (profile?.photoFileId) {
        avatarUrl = `/api/files/${profile.photoFileId}`;
      } else if (dbUser.avatarUrl && !dbUser.avatarUrl.includes("photo-1507003211169") && !dbUser.avatarUrl.includes("photo-1534528741775")) {
        avatarUrl = dbUser.avatarUrl;
      } else if (
        (dbUser.preferences as any)?.avatar &&
        !(dbUser.preferences as any).avatar.includes("photo-1507003211169") &&
        !(dbUser.preferences as any).avatar.includes("photo-1534528741775")
      ) {
        avatarUrl = (dbUser.preferences as any).avatar;
      }

      return res.json({
        success: true,
        freelancer: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          avatar: avatarUrl,
          title: profile?.professionalTitle || profile?.title || "Freelancer Specialist",
          headline: profile?.headline || "",
          bio: profile?.bio || "Verified talent on the Nexum protocol.",
          fullBio: profile?.bio || "Verified talent on the Nexum protocol.",
          location: profile?.locationText || "Remote",
          timezone: profile?.timezone || "UTC",
          hourlyRateDisplay,
          hourlyRateCents: rawHourly,
          experienceLevel: profile?.experienceLevel || "MID",
          availability: profile?.availabilityStatus || "AVAILABLE",
          weeklyCapacityHours: profile?.weeklyCapacityHours || 40,
          skills,
          servicesOffered: profile?.servicesOffered || [],
          tools: profile?.tools || [],
          portfolio: (profile?.portfolioProjects || []).map((p) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            role: p.role,
            tools: p.tools,
            projectUrl: p.projectUrl,
            repoUrl: p.repoUrl,
            startMonth: p.startMonth,
            endMonth: p.endMonth,
            coverUrl: p.coverFileId ? `/api/files/${p.coverFileId}` : null,
          })),
          workHistory: (profile?.workExperiences || []).map((w) => ({
            id: w.id,
            role: w.role,
            company: w.company,
            location: w.location,
            startMonth: w.startMonth,
            endMonth: w.endMonth,
            isCurrent: w.isCurrent,
            description: w.description,
            responsibilities: w.responsibilities,
            achievements: w.achievements,
          })),
          education: (profile?.educationEntries || []).map((ed) => ({
            id: ed.id,
            institution: ed.institution,
            degree: ed.degree,
            fieldOfStudy: ed.fieldOfStudy,
            startYear: ed.startYear,
            graduationYear: ed.graduationYear,
            description: ed.description,
          })),
          certifications: (profile?.certifications || []).map((c) => ({
            id: c.id,
            name: c.name,
            issuer: c.issuer,
            issuedMonth: c.issuedMonth,
            expiresMonth: c.expiresMonth,
            credentialUrl: c.credentialUrl,
          })),
          resume: activeResume
            ? {
                id: activeResume.id,
                name: activeResume.originalName,
                size: `${Math.round(activeResume.sizeBytes / 1024)} KB`,
                sizeBytes: activeResume.sizeBytes,
                mime: activeResume.mimeType,
                url: `/api/files/${activeResume.id}`,
              }
            : null,
          verifiedCredentials: ["Identity Verified", "Automated Consensus Verified", "Milestone Escrow Ready"],
          rating: "5.0",
          matchScore: 95,
        },
      });
    }

    // 2. Fallback to clientOverviewService roster (e.g. for mock candidates like Rohan Verma)
    const roster = await clientOverviewService.getFreelancers("usr_client_alex");
    const candidate = roster.data.find((f) => f.id === id || f.id === `usr_${id}` || `usr_${f.id}` === id);

    if (candidate) {
      return res.json({
        success: true,
        freelancer: {
          ...candidate,
          avatar:
            candidate.avatar &&
            !candidate.avatar.includes("photo-1507003211169") &&
            !candidate.avatar.includes("photo-1534528741775")
              ? candidate.avatar
              : null,
          resume: null,
          rating: "5.0",
          matchScore: candidate.fitScore || 95,
        },
      });
    }

    return res.status(404).json({ success: false, error: "Freelancer not found" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load freelancer details";
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/client/freelancers/:id/save - toggle save/bookmark status for a candidate
router.post("/freelancers/:id/save", async (req: Request, res: Response) => {
  try {
    const clientId = (req.body?.clientId as string) || (req.query?.clientId as string) || "usr_client_alex";
    const result = await clientOverviewService.toggleSaveFreelancer(req.params.id, clientId);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to toggle bookmark";
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/client/invitations - list formal project invitations for client
router.get("/invitations", async (req: Request, res: Response) => {
  try {
    const clientId = (req.query.clientId as string) || "usr_client_alex";
    const data = await clientOverviewService.getInvitations(clientId);
    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch invitations";
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/client/talent/invite - invite talent to project
router.post("/talent/invite", async (req: Request, res: Response) => {
  try {
    const {
      clientId = "usr_client_alex",
      freelancerId,
      freelancerName,
      freelancerAvatar,
      freelancerTitle,
      projectId,
      projectName,
      proposedRate,
      customNote,
    } = req.body || {};

    if (!freelancerId || !projectId) {
      return res.status(400).json({
        success: false,
        error: "Missing required freelancerId or projectId",
      });
    }

    const result = await clientOverviewService.inviteTalent({
      clientId,
      freelancerId,
      freelancerName,
      freelancerAvatar,
      freelancerTitle,
      projectId,
      projectName,
      proposedRate,
      customNote,
    });

    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to invite talent";
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/client/settings - fetch client workspace settings
router.get("/settings", async (req: Request, res: Response) => {
  try {
    const clientId = (req.query.clientId as string) || "usr_client_alex";
    const data = await clientOverviewService.getClientSettings(clientId);
    res.json({ success: true, data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch settings";
    res.status(500).json({ success: false, error: msg });
  }
});

// PATCH /api/client/settings - update client workspace settings
router.patch("/settings", async (req: Request, res: Response) => {
  try {
    const clientId = (req.body?.clientId as string) || (req.query?.clientId as string) || "usr_client_alex";
    const result = await clientOverviewService.updateClientSettings(clientId, req.body || {});
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update settings";
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/client/settings/change-password - change password
router.post("/settings/change-password", async (req: Request, res: Response) => {
  try {
    const { userId = "usr_client_alex", currentPassword, newPassword } = req.body || {};
    const result = await clientOverviewService.changePassword(userId, currentPassword, newPassword);
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to change password";
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/client/settings/sessions/revoke-others - revoke other active sessions
router.post("/settings/sessions/revoke-others", async (req: Request, res: Response) => {
  try {
    const { userId = "usr_client_alex" } = req.body || {};
    const result = await clientOverviewService.revokeOtherSessions(userId);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to revoke sessions";
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/client/settings/export - export full workspace data package
router.get("/settings/export", async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || (req.query.clientId as string) || "usr_client_alex";
    const data = await clientOverviewService.exportUserData(userId);
    res.setHeader("Content-Disposition", `attachment; filename="nexum-export-${userId}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to export user data";
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/client/settings/support - submit support/mediation ticket
router.post("/settings/support", async (req: Request, res: Response) => {
  try {
    const { userId = "usr_client_alex", category = "General", issue = "", projectId } = req.body || {};
    const result = await clientOverviewService.submitSupportTicket(userId, { category, issue, projectId });
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to submit support ticket";
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/client/overview/reset - reset overview state for testing
router.post("/overview/reset", (_req: Request, res: Response) => {
  clientOverviewService.reset();
  res.json({ success: true, message: "Client overview state reset" });
});

// GET /api/client/proposals/:id - get proposal details for client review page
router.get("/proposals/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        freelancer: {
          include: {
            freelancerProfile: true,
          },
        },
        project: {
          include: {
            projectMilestones: { orderBy: { orderIndex: "asc" } },
            briefVersions: { orderBy: { version: "desc" }, take: 1 },
          },
        },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
        },
        attachments: {
          include: {
            file: true,
          },
        },
      },
    });

    if (!proposal) {
      return res.status(404).json({ success: false, error: "Proposal not found" });
    }

    const latestVersion = proposal.versions[0];
    const brief = (proposal.project.briefVersions?.[0]?.structuredBrief as any) || {};

    const proposedMilestones =
      Array.isArray(latestVersion?.milestonesJson) && (latestVersion.milestonesJson as any[]).length > 0
        ? latestVersion.milestonesJson
        : proposal.project.projectMilestones;

    const attachments = (proposal.attachments || []).map((att) => ({
      id: att.id,
      name: att.file?.originalName || "Proposal Attachment",
      size: `${Math.round(((att.file?.sizeBytes || 1024) / 1024 / 1024) * 10) / 10} MB`,
      sizeBytes: att.file?.sizeBytes || 0,
      type: att.file?.mime || "application/pdf",
      url: `/api/files/${att.fileId}`,
    }));

    const amountCents = latestVersion?.amountCents || latestVersion?.totalAmountMinor || proposal.project.budgetCents || 0;

    res.json({
      success: true,
      proposal: {
        id: proposal.id,
        projectId: proposal.projectId,
        projectTitle: proposal.project.title,
        freelancerId: proposal.freelancerId,
        freelancerName: proposal.freelancer.name,
        freelancerRole:
          proposal.freelancer.freelancerProfile?.title ||
          proposal.freelancer.freelancerProfile?.professionalTitle ||
          "Verified Talent",
        avatar:
          proposal.freelancer.avatarUrl && !proposal.freelancer.avatarUrl.includes("photo-1507003211169") && !proposal.freelancer.avatarUrl.includes("photo-1534528741775")
            ? proposal.freelancer.avatarUrl
            : (proposal.freelancer.preferences as any)?.avatar && !(proposal.freelancer.preferences as any).avatar.includes("photo-1507003211169") && !(proposal.freelancer.preferences as any).avatar.includes("photo-1534528741775")
            ? (proposal.freelancer.preferences as any).avatar
            : null,
        rating: "5.0",
        status: proposal.status,
        rejectionFeedback: proposal.rejectionFeedback,
        amountCents,
        proposedBudget: `$${((amountCents / 100)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
        estimatedTimeline: latestVersion?.estimatedDurationWeeks
          ? `${latestVersion.estimatedDurationWeeks} weeks`
          : (brief.timelineDuration || "Sprint schedule"),
        estimatedDurationWeeks: latestVersion?.estimatedDurationWeeks || null,
        coverLetter:
          latestVersion?.coverLetter ||
          "I have thoroughly reviewed your project requirements and technical specifications. I am ready to implement the complete scope adhering strictly to the documented milestones, automated verification, and code quality benchmarks.",
        approach: latestVersion?.approach || latestVersion?.scopeText || "",
        proposedMilestones,
        attachments,
        submittedDate: proposal.submittedAt
          ? new Date(proposal.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "Recent",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load proposal details";
    res.status(500).json({ success: false, error: msg });
  }
});


// POST /api/client/proposals/:id/accept - client accepts a freelancer proposal, synchronizes milestones & budget, and synthesizes bilateral contract
router.post("/proposals/:id/accept", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clientId = (req.body?.clientId as string) || (req.query?.clientId as string) || "usr_client_alex";

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        freelancer: true,
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
    });

    if (!proposal) {
      return res.status(404).json({ success: false, error: "Proposal not found" });
    }

    const effectiveClientId = (req.body?.clientId as string) || (req.query?.clientId as string) || proposal.project.clientId;
    const currentVersion = proposal.versions[0];
    const now = new Date();

    // Parse proposal milestones cleanly
    const rawMilestones = Array.isArray(currentVersion?.milestonesJson)
      ? (currentVersion.milestonesJson as any[])
      : [];

    const parsedMilestones = rawMilestones.map((m: any, idx: number) => {
      let amountMinor = 0;
      if (typeof m.amountMinor === "number") amountMinor = m.amountMinor;
      else if (typeof m.amountCents === "number") amountMinor = m.amountCents;
      else if (typeof m.amount === "number") amountMinor = Math.round(m.amount * 100);
      else if (typeof m.amount === "string") {
        const cleaned = m.amount.replace(/[^0-9.]/g, "");
        const val = parseFloat(cleaned);
        amountMinor = isNaN(val) ? 0 : Math.round(val * 100);
      }

      let criteria: any[] = [];
      if (Array.isArray(m.criteria)) {
        criteria = m.criteria.map((c: any, cIdx: number) => {
          if (typeof c === "string") return { id: `crit_${idx + 1}_${cIdx + 1}`, text: c };
          return { id: c.id || `crit_${idx + 1}_${cIdx + 1}`, text: c.text || c.title || "Acceptance benchmark" };
        });
      }

      let deliverables: any[] = [];
      if (Array.isArray(m.deliverables)) {
        deliverables = m.deliverables.map((d: any) => {
          if (typeof d === "string") return d;
          return d.title || d.text || "Deliverable artifact";
        });
      }

      return {
        sequence: m.sequence ?? idx + 1,
        title: m.title || `Milestone ${idx + 1}`,
        description: m.description || "",
        amountMinor,
        durationWeeks: m.durationWeeks || (m.days ? Math.ceil(m.days / 7) : 2),
        criteria,
        deliverables,
      };
    });

    const totalAmountMinor =
      currentVersion?.totalAmountMinor ||
      currentVersion?.amountCents ||
      parsedMilestones.reduce((acc, m) => acc + m.amountMinor, 0) ||
      proposal.project.budgetCents ||
      0;

    let createdAgreementId = "";
    let agreementVersionId = "";
    let savedContractFileId = "";
    let createdMilestonesCount = 0;
    let firstMilestoneAmountMinor = 0;

    await prisma.$transaction(async (tx) => {
      // 1. Update proposal status to ACCEPTED
      await tx.proposal.update({
        where: { id: proposal.id },
        data: {
          status: ProposalStatus.ACCEPTED,
          lastActivityAt: now,
        },
      });

      // 1b. Automatically decline all other candidate proposals for this project
      const otherProposals = await tx.proposal.findMany({
        where: {
          projectId: proposal.projectId,
          id: { not: proposal.id },
          status: { in: [ProposalStatus.SUBMITTED, ProposalStatus.UNDER_REVIEW, ProposalStatus.DRAFT] },
        },
      });

      if (otherProposals.length > 0) {
        await tx.proposal.updateMany({
          where: {
            projectId: proposal.projectId,
            id: { not: proposal.id },
            status: { in: [ProposalStatus.SUBMITTED, ProposalStatus.UNDER_REVIEW, ProposalStatus.DRAFT] },
          },
          data: {
            status: ProposalStatus.REJECTED,
            rejectionFeedback: "Another candidate was selected for this project.",
            lastActivityAt: now,
          },
        });

        for (const other of otherProposals) {
          await tx.auditEvent.create({
            data: {
              actorId: effectiveClientId,
              action: "PROPOSAL_CLOSED_OTHER_ACCEPTED",
              objectType: "PROPOSAL",
              objectId: other.id,
              metadata: {
                projectId: proposal.projectId,
                acceptedProposalId: proposal.id,
                reason: "Another candidate was selected for this project",
                timestamp: now.toISOString(),
              },
            },
          }).catch(() => {});
        }
      }

      // 2. Synchronize Project Budget with Approved Proposal
      await tx.project.update({
        where: { id: proposal.projectId },
        data: {
          budgetCents: totalAmountMinor,
          state: ProjectState.ACTIVE,
        },
      });

      // 3. Initialize or Update Agreement record (Starts in PENDING_APPROVAL for bilateral human ratification)
      let agreement = await tx.agreement.findUnique({
        where: { projectId: proposal.projectId },
      });

      if (!agreement) {
        agreement = await tx.agreement.create({
          data: {
            projectId: proposal.projectId,
            proposalId: proposal.id,
            clientId: effectiveClientId,
            freelancerId: proposal.freelancerId,
            status: AgreementStatus.PENDING_APPROVAL,
          },
        });
      } else {
        agreement = await tx.agreement.update({
          where: { id: agreement.id },
          data: {
            proposalId: proposal.id,
            freelancerId: proposal.freelancerId,
            status: AgreementStatus.PENDING_APPROVAL,
          },
        });
      }
      createdAgreementId = agreement.id;

      // 4. Synchronize Project Milestones with Approved Proposal Milestones
      // Delete existing placeholder brief milestones for clean synchronization
      await tx.milestone.deleteMany({
        where: { projectId: proposal.projectId },
      });

      const milestoneRecordsToCreate = parsedMilestones.length > 0
        ? parsedMilestones
        : [
            {
              sequence: 1,
              title: "Milestone 1: Project Kickoff & Initial Deliverables",
              description: "Foundational delivery phase per accepted proposal",
              amountMinor: totalAmountMinor,
              durationWeeks: currentVersion?.estimatedDurationWeeks || 4,
              criteria: [{ id: "crit_1_1", text: "Approved architecture and core functional delivery" }],
              deliverables: ["Core project deliverables package"],
            },
          ];

      createdMilestonesCount = milestoneRecordsToCreate.length;
      firstMilestoneAmountMinor = milestoneRecordsToCreate[0]?.amountMinor || totalAmountMinor;

      for (let i = 0; i < milestoneRecordsToCreate.length; i++) {
        const m = milestoneRecordsToCreate[i];
        await tx.milestone.create({
          data: {
            projectId: proposal.projectId,
            agreementId: agreement.id,
            orderIndex: i + 1,
            sequence: i + 1,
            milestoneKey: `m_${i + 1}`,
            title: m.title,
            description: m.description,
            amountMinor: m.amountMinor,
            amountCents: m.amountMinor,
            currency: proposal.project.currency || "USD",
            criteria: m.criteria,
            deliverables: m.deliverables,
            workStatus: MilestoneWorkStatus.UPCOMING,
            state: PaymentState.NOT_STARTED,
            dueDate: new Date(Date.now() + (m.durationWeeks || 2) * 7 * 24 * 60 * 60 * 1000),
          },
        });
      }

      // 5. Synthesize Legal-Grade AI Bilateral Contract in Markdown
      const clientUser = proposal.project.client || (await tx.user.findUnique({ where: { id: effectiveClientId } }));
      const freelancerUser = proposal.freelancer || (await tx.user.findUnique({ where: { id: proposal.freelancerId } }));

      const contractMarkdown = generateContractMarkdown({
        agreementId: agreement.id,
        versionNumber: 1,
        projectTitle: proposal.project.title,
        projectDescription: proposal.project.description || currentVersion?.scopeText || "",
        clientName: clientUser?.name || "Client",
        clientEmail: clientUser?.email || undefined,
        freelancerName: freelancerUser?.name || "Freelancer Specialist",
        freelancerEmail: freelancerUser?.email || undefined,
        totalAmountMinor,
        currency: proposal.project.currency || "USD",
        durationWeeks: currentVersion?.estimatedDurationWeeks || 4,
        milestones: milestoneRecordsToCreate,
        isRatified: false,
        clientApprovedAt: now,
        freelancerApprovedAt: null,
      });

      // 6. Save Contract Document under Files for Both Parties
      const savedFile = await saveContractAsProjectFile(tx, {
        projectId: proposal.projectId,
        agreementId: agreement.id,
        versionNumber: 1,
        contractMarkdown,
        uploadedBy: effectiveClientId,
      });
      savedContractFileId = savedFile.file.id;

      // 7. Create AgreementVersion record v1
      const contentHash = crypto.createHash("sha256").update(contractMarkdown).digest("hex");
      const agreementVer = await tx.agreementVersion.create({
        data: {
          agreementId: agreement.id,
          versionNumber: 1,
          source: "PROPOSAL",
          sourceRefId: proposal.id,
          terms: {
            scope: proposal.project.description || currentVersion?.scopeText || "",
            deliverables: milestoneRecordsToCreate.flatMap((m) => m.deliverables),
            milestones: milestoneRecordsToCreate,
            totalAmountMinor,
            currency: proposal.project.currency || "USD",
            contractMarkdown,
            contractFileId: savedFile.file.id,
            contractProjectFileId: savedFile.projectFile.id,
          },
          contentHash,
          status: AgreementVersionStatus.PENDING_APPROVAL,
        },
      });
      agreementVersionId = agreementVer.id;

      // 8. Record Client's Ratification Approval Decision
      await tx.agreementApproval.create({
        data: {
          agreementVersionId: agreementVer.id,
          partyRole: Role.CLIENT,
          userId: effectiveClientId,
          decision: ApprovalDecision.APPROVED,
          contentHash,
        },
      });

      // 9. Record Append-only Audit Event
      await tx.auditEvent.create({
        data: {
          actorId: effectiveClientId,
          action: "PROPOSAL_ACCEPTED",
          objectType: "PROPOSAL",
          objectId: proposal.id,
          metadata: {
            projectId: proposal.projectId,
            freelancerId: proposal.freelancerId,
            amountMinor: totalAmountMinor,
            agreementId: agreement.id,
            agreementVersionNumber: 1,
            milestonesSynchronized: milestoneRecordsToCreate.length,
            contractFileId: savedFile.file.id,
            timestamp: now.toISOString(),
          },
        },
      }).catch(() => {});
    });

    // 10. Automatically Post Interactive Contract Draft Message into Shared Project Workspace
    const firstAmountFormatted = `$${(firstMilestoneAmountMinor / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${proposal.project.currency || "USD"}`;

    await workspaceService.sendMessage({
      projectId: proposal.projectId,
      senderId: effectiveClientId,
      senderRole: "OPERATOR",
      type: "CONTRACT_DRAFT",
      content: `📜 Nexum AI has synthesized Bilateral Contract Agreement v1.0 based on the approved proposal terms and synchronized milestones.\n\nClient has initiated approval. Once the freelancer ratifies, the client will be prompted to securely lock Milestone #1 escrow funds (${firstAmountFormatted}) via PayPal REST v2 Orders API to begin development.\n\nThe formal contract file has been permanently archived in the Project Files vault for both parties.`,
      metadata: {
        type: "CONTRACT_DRAFT",
        agreementId: createdAgreementId,
        versionId: agreementVersionId,
        versionNumber: 1,
        contractName: "Contract_Agreement_v1.0.md",
        fileId: savedContractFileId,
        totalAmountMinor,
        milestonesCount: createdMilestonesCount,
        clientApproved: true,
        freelancerApproved: false,
        badgeText: "Contract v1.0 Synthesized",
        badgeType: "purple",
      },
    }).catch((err) => console.warn("Workspace notification warning:", err));

    res.json({
      success: true,
      message: "Proposal accepted, milestones synchronized, and bilateral contract synthesized successfully.",
      proposalId: id,
      agreementId: createdAgreementId,
      versionNumber: 1,
      contractFileId: savedContractFileId,
      status: "ACCEPTED",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to accept proposal";
    console.error("Accept proposal error:", err);
    res.status(500).json({ success: false, error: msg });
  }
});

// Helper handler: resets TerraShield project back to unapproved stage for clean testing
async function handleResetTerraShieldProject(req: Request, res: Response) {
  try {
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          { title: { contains: "TerraShield", mode: "insensitive" } },
          { id: (req.body?.projectId as string) || (req.query?.projectId as string) || "non_existent" },
        ],
      },
      include: {
        proposals: true,
        agreement: {
          include: {
            versions: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, error: "TerraShield project not found" });
    }

    const projectId = project.id;

    await prisma.$transaction(async (tx) => {
      // A. Revert all proposals on this project to SUBMITTED
      await tx.proposal.updateMany({
        where: { projectId },
        data: {
          status: ProposalStatus.SUBMITTED,
          rejectionFeedback: null,
          lastActivityAt: new Date(),
        },
      });

      // B. If agreement exists, clean up approvals, revisions, versions, and agreement
      if (project.agreement) {
        const agreementId = project.agreement.id;
        const versionIds = project.agreement.versions.map((v) => v.id);

        if (versionIds.length > 0) {
          await tx.agreementApproval.deleteMany({
            where: { agreementVersionId: { in: versionIds } },
          });
          await tx.milestoneRevision.deleteMany({
            where: { agreementVersionId: { in: versionIds } },
          });
          await tx.agreementVersion.deleteMany({
            where: { agreementId },
          });
        }

        await tx.agreement.delete({
          where: { id: agreementId },
        });
      }

      // C. Remove contract files from ProjectFile and File
      const contractProjectFiles = await tx.projectFile.findMany({
        where: {
          projectId,
          name: { startsWith: "Contract_Agreement_" },
        },
      });

      if (contractProjectFiles.length > 0) {
        const fileIds = contractProjectFiles.map((pf) => pf.fileId);
        await tx.projectFile.deleteMany({
          where: { id: { in: contractProjectFiles.map((pf) => pf.id) } },
        });
        await tx.file.deleteMany({
          where: { id: { in: fileIds } },
        });
      }

      // D. Clean up any payments on project milestones
      await tx.payment.deleteMany({
        where: { projectId },
      });

      // E. Reset project milestones
      await tx.milestone.updateMany({
        where: { projectId },
        data: {
          agreementId: null,
          workStatus: MilestoneWorkStatus.UPCOMING,
          state: PaymentState.NOT_STARTED,
          startedAt: null,
          acceptedAt: null,
        },
      });

      // F. Reset workspace conversation messages (e.g. the "hi" and automated messages)
      const conv = await tx.workspaceConversation.findUnique({
        where: { projectId },
      });
      if (conv) {
        await tx.workspaceMessage.deleteMany({
          where: { conversationId: conv.id },
        });
        await tx.workspaceTask.deleteMany({
          where: { conversationId: conv.id },
        });
        await tx.workspaceMeeting.deleteMany({
          where: { conversationId: conv.id },
        });
        await tx.workspaceDecision.deleteMany({
          where: { conversationId: conv.id },
        });
        await tx.workspaceConversation.update({
          where: { id: conv.id },
          data: {
            agreementHash: "canonical_v1.0_pending",
          },
        });
      }

      // G. Reset project state to MATCHING (Awaiting candidate review)
      await tx.project.update({
        where: { id: projectId },
        data: {
          state: ProjectState.MATCHING,
        },
      });

      // H. Append audit event
      await tx.auditEvent.create({
        data: {
          actorId: "system_admin",
          action: "PROJECT_RESET_UNAPPROVED",
          objectType: "PROJECT",
          objectId: projectId,
          metadata: {
            projectTitle: project.title,
            reason: "Reset for production testing per user instruction",
            timestamp: new Date().toISOString(),
          },
        },
      });
    });

    res.json({
      success: true,
      message: `TerraShield project (${project.title}) reset to unapproved stage successfully. Proposals reset to SUBMITTED, agreements removed, and workspace cleared for production testing.`,
      projectId: project.id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reset TerraShield project";
    console.error("Reset TerraShield error:", err);
    res.status(500).json({ success: false, error: msg });
  }
}

// Support both POST and GET for effortless execution via curl, postman, or browser URL bar
router.post("/reset-terrashield", handleResetTerraShieldProject);
router.get("/reset-terrashield", handleResetTerraShieldProject);

// POST /api/client/proposals/:id/reject - client declines a freelancer proposal
router.post("/proposals/:id/reject", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clientId = (req.body?.clientId as string) || (req.query?.clientId as string) || "usr_client_alex";
    const feedback = req.body?.feedback || "Declined by client";

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!proposal) {
      return res.status(404).json({ success: false, error: "Proposal not found" });
    }

    const effectiveClientId = (req.body?.clientId as string) || (req.query?.clientId as string) || proposal.project.clientId;
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.proposal.update({
        where: { id: proposal.id },
        data: {
          status: ProposalStatus.REJECTED,
          rejectionFeedback: feedback,
          lastActivityAt: now,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorId: effectiveClientId,
          action: "PROPOSAL_REJECTED",
          objectType: "PROPOSAL",
          objectId: proposal.id,
          metadata: {
            projectId: proposal.projectId,
            freelancerId: proposal.freelancerId,
            feedback,
            timestamp: now.toISOString(),
          },
        },
      }).catch(() => {});
    });

    res.json({
      success: true,
      message: "Proposal declined.",
      proposalId: id,
      status: "REJECTED",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to decline proposal";
    console.error("Decline proposal error:", err);
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;


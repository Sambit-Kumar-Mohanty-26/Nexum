import { Router, Request, Response } from "express";
import { clientOverviewService } from "../services/clientOverviewService.js";
import projectAiRouter from "./client/projectAi.js";
import { prisma } from "../prisma.js";
import { Role, ProposalStatus, ProjectState, AgreementStatus, AgreementVersionStatus } from "@prisma/client";
import { createAgreementTermsFromProposalVersion } from "../domain/agreements/createTerms.js";

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


// POST /api/client/proposals/:id/accept - client accepts a freelancer proposal and initializes agreement
router.post("/proposals/:id/accept", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clientId = (req.body?.clientId as string) || (req.query?.clientId as string) || "usr_client_alex";

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        project: true,
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
    });

    if (!proposal) {
      return res.status(404).json({ success: false, error: "Proposal not found" });
    }

    const effectiveClientId = (req.body?.clientId as string) || (req.query?.clientId as string) || proposal.project.clientId;
    const currentVersion = proposal.versions[0];
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      // 1. Update proposal status to ACCEPTED
      await tx.proposal.update({
        where: { id: proposal.id },
        data: {
          status: ProposalStatus.ACCEPTED,
          lastActivityAt: now,
        },
      });

      // 2. Initialize Agreement if not already existing
      const existingAgreement = await tx.agreement.findUnique({
        where: { projectId: proposal.projectId },
      });

      let agreement = existingAgreement;
      if (!existingAgreement) {
        const { terms: agTerms, contentHash } = currentVersion
          ? createAgreementTermsFromProposalVersion(currentVersion)
          : {
              terms: {
                scope: proposal.project.description || "Project scope",
                deliverables: [],
                exclusions: [],
                assumptions: [],
                paymentModel: "FIXED_PRICE" as const,
                currency: proposal.project.currency || "USD",
                totalAmountMinor: proposal.project.budgetCents || 0,
                durationWeeks: 4,
                milestones: [],
              },
              contentHash: `hash_${proposal.id}`,
            };

        agreement = await tx.agreement.create({
          data: {
            projectId: proposal.projectId,
            proposalId: proposal.id,
            clientId: effectiveClientId,
            freelancerId: proposal.freelancerId,
            status: AgreementStatus.ACTIVE,
            versions: {
              create: {
                versionNumber: 1,
                source: "PROPOSAL",
                sourceRefId: proposal.id,
                terms: agTerms as any,
                contentHash,
                status: AgreementVersionStatus.ACTIVE,
              },
            },
          },
        });
      }

      // Link project milestones to agreement so freelancer workspace immediately reflects real deliverable schedule
      if (agreement) {
        await tx.milestone.updateMany({
          where: {
            projectId: proposal.projectId,
            agreementId: null,
          },
          data: {
            agreementId: agreement.id,
          },
        });
      }

      // 3. Update project state to ACTIVE
      await tx.project.update({
        where: { id: proposal.projectId },
        data: {
          state: ProjectState.ACTIVE,
        },
      });

      // 4. Record append-only audit event
      await tx.auditEvent.create({
        data: {
          actorId: effectiveClientId,
          action: "PROPOSAL_ACCEPTED",
          objectType: "PROPOSAL",
          objectId: proposal.id,
          metadata: {
            projectId: proposal.projectId,
            freelancerId: proposal.freelancerId,
            amountMinor: currentVersion?.totalAmountMinor || currentVersion?.amountCents || 0,
            timestamp: now.toISOString(),
          },
        },
      }).catch(() => {});
    });

    res.json({
      success: true,
      message: "Proposal accepted and agreement initialized successfully.",
      proposalId: id,
      status: "ACCEPTED",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to accept proposal";
    console.error("Accept proposal error:", err);
    res.status(500).json({ success: false, error: msg });
  }
});

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


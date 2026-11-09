import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../prisma.js";
import { Role, ApprovalDecision, AgreementStatus, AgreementVersionStatus } from "@prisma/client";
import { tryActivateAgreementVersion } from "../domain/agreements/activation.js";
import { workspaceService } from "../services/workspaceService.js";

const router = Router();

/**
 * GET /api/agreements/:id
 * Retrieve details of an agreement by ID or projectId, including its versions, approvals, and milestones.
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const agreement = await prisma.agreement.findFirst({
      where: {
        OR: [{ id }, { projectId: id }],
      },
      include: {
        project: {
          include: {
            client: { select: { id: true, name: true, email: true } },
          },
        },
        freelancer: { select: { id: true, name: true, email: true } },
        versions: {
          include: {
            approvals: {
              include: {
                user: { select: { id: true, name: true, role: true } },
              },
            },
          },
          orderBy: { versionNumber: "desc" },
        },
        milestones: {
          where: { removedAt: null },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!agreement) {
      res.status(404).json({ success: false, error: "Agreement not found" });
      return;
    }

    const activeVersion =
      agreement.versions.find((v) => v.id === agreement.activeVersionId) ||
      agreement.versions.find((v) => v.status === AgreementVersionStatus.ACTIVE) ||
      agreement.versions[0];

    res.json({
      success: true,
      data: {
        ...agreement,
        activeVersion,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/agreements/:id/approve
 * Human party (Client or Freelancer) ratifies an agreement version.
 * When both parties have approved, triggers atomic activation, milestone ratification,
 * and alerts the workspace that Milestone #1 PayPal escrow deposit is requested.
 */
router.post("/:id/approve", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const agreement = await prisma.agreement.findFirst({
      where: {
        OR: [{ id }, { projectId: id }],
      },
      include: {
        project: {
          include: {
            client: { select: { id: true, name: true, email: true } },
          },
        },
        freelancer: { select: { id: true, name: true, email: true } },
        versions: {
          include: { approvals: true },
          orderBy: { versionNumber: "desc" },
        },
        milestones: {
          where: { removedAt: null },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!agreement) {
      res.status(404).json({ success: false, error: "Agreement not found" });
      return;
    }

    // Determine acting user ID and Role
    const sessionUser = (req as any).user;
    let actingUserId = sessionUser?.id || body.userId || (req.headers["x-user-id"] as string);
    let partyRole: Role | undefined = sessionUser?.role || body.role;

    if (!actingUserId) {
      // Default to client if role is specified as client, or freelancer if specified as freelancer
      if (partyRole === Role.FREELANCER) {
        actingUserId = agreement.freelancerId;
      } else {
        actingUserId = agreement.clientId;
        partyRole = Role.CLIENT;
      }
    } else {
      if (!partyRole) {
        if (actingUserId === agreement.freelancerId) {
          partyRole = Role.FREELANCER;
        } else {
          partyRole = Role.CLIENT;
        }
      }
    }

    // Identify target version
    let targetVersion = body.versionNumber
      ? agreement.versions.find((v) => v.versionNumber === Number(body.versionNumber))
      : agreement.versions.find((v) => v.status === AgreementVersionStatus.PENDING_APPROVAL) ||
        agreement.versions[0];

    if (!targetVersion) {
      res.status(400).json({ success: false, error: "No pending agreement version available for approval" });
      return;
    }

    // Upsert human approval decision
    await prisma.agreementApproval.upsert({
      where: {
        agreementVersionId_partyRole: {
          agreementVersionId: targetVersion.id,
          partyRole: partyRole!,
        },
      },
      create: {
        agreementVersionId: targetVersion.id,
        partyRole: partyRole!,
        userId: actingUserId,
        decision: ApprovalDecision.APPROVED,
        contentHash: targetVersion.contentHash,
      },
      update: {
        decision: ApprovalDecision.APPROVED,
        contentHash: targetVersion.contentHash,
        decidedAt: new Date(),
      },
    });

    // Attempt atomic activation if both parties have ratified
    const activationResult = await tryActivateAgreementVersion(targetVersion.id, prisma);

    if (activationResult.activated) {
      // Both ratified!
      const firstMilestone = agreement.milestones[0];
      const firstAmountFormatted = firstMilestone
        ? `$${(firstMilestone.amountMinor / 100).toFixed(2)} ${firstMilestone.currency || "USD"}`
        : "$0.00";

      // Broadcast system notification into shared workspace
      await workspaceService.sendMessage({
        projectId: agreement.projectId,
        senderId: actingUserId,
        senderRole: "OPERATOR",
        type: "AGREEMENT_RATIFIED",
        content: `🎉 Both parties have signed Contract Agreement v${targetVersion.versionNumber}.0!\n\nThe contract is officially active. Client, please deposit Milestone #1 funds (${firstAmountFormatted}) into secure PayPal Escrow to authorize development kickoff.`,
        metadata: {
          type: "AGREEMENT_RATIFIED",
          agreementId: agreement.id,
          versionNumber: targetVersion.versionNumber,
          badgeText: "Both Parties Signed",
          badgeType: "green",
          firstMilestoneId: firstMilestone?.id,
          firstMilestoneAmountMinor: firstMilestone?.amountMinor,
        },
      }).catch((err) => console.warn("Workspace notification warning:", err));

      res.json({
        success: true,
        ratified: true,
        versionNumber: targetVersion.versionNumber,
        agreementId: agreement.id,
        nextMilestone: firstMilestone,
        message: "Agreement ratified by both parties. Milestone #1 escrow deposit is now requested from client.",
      });
    } else {
      // Only one party ratified so far
      await workspaceService.sendMessage({
        projectId: agreement.projectId,
        senderId: actingUserId,
        senderRole: partyRole!,
        type: "AGREEMENT_APPROVAL_PENDING",
        content: `✍️ ${partyRole === Role.CLIENT ? "Client" : "Freelancer"} has ratified Contract Agreement v${targetVersion.versionNumber}.0. Awaiting counterpart ratification to finalize and unlock escrow deposit.`,
        metadata: {
          type: "AGREEMENT_APPROVAL_PENDING",
          agreementId: agreement.id,
          versionNumber: targetVersion.versionNumber,
          approvedRole: partyRole,
          badgeText: `${partyRole} Signed`,
          badgeType: "purple",
        },
      }).catch((err) => console.warn("Workspace notification warning:", err));

      res.json({
        success: true,
        ratified: false,
        versionNumber: targetVersion.versionNumber,
        agreementId: agreement.id,
        message: `${partyRole} approval recorded. Awaiting counterpart ratification.`,
      });
    }
  } catch (err) {
    next(err);
  }
});

export default router;


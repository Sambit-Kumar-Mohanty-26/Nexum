import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../prisma.js";
import { PaymentState, MilestoneWorkStatus, ProjectState } from "@prisma/client";
import { createPayPalOrder, capturePayPalOrder } from "../domain/payments/paypal.js";
import { workspaceService } from "../services/workspaceService.js";
import { z } from "zod";

const router = Router();

// Zod schemas for validation
const createOrderSchema = z.object({
  milestoneId: z.string().optional(),
  projectId: z.string().optional(),
  mode: z.enum(["MILESTONE", "FULL_PROJECT"]).optional(),
});

const captureOrderSchema = z.object({
  orderId: z.string().min(1, "orderId is required"),
  milestoneId: z.string().optional(),
  projectId: z.string().optional(),
  mode: z.enum(["MILESTONE", "FULL_PROJECT"]).optional(),
});

const simulateLockSchema = z.object({
  milestoneId: z.string().optional(),
  projectId: z.string().optional(),
  mode: z.enum(["MILESTONE", "FULL_PROJECT"]).optional(),
});

const approveReleaseSchema = z.object({
  feedback: z.string().optional(),
  actorId: z.string().optional(),
});

const refundUnreleasedSchema = z.object({
  projectId: z.string().min(1, "projectId is required"),
  reason: z.string().optional(),
});

// GET /api/payments/attempts - list payment attempts with evidence
router.get("/attempts", async (_req: Request, res: Response) => {
  try {
    const attempts = await prisma.paymentAttempt.findMany({
      include: {
        milestone: true,
        reconciliationJobs: true,
        paymentIncidents: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, count: attempts.length, data: attempts });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch payment attempts";
    res.status(500).json({ error: { code: "FETCH_FAILED", message: msg, details: null } });
  }
});

// GET /api/payments/timeline - audit log & evidence timeline
router.get("/timeline", async (_req: Request, res: Response) => {
  try {
    const events = await prisma.auditEvent.findMany({
      orderBy: { timestamp: "desc" },
      take: 50,
    });

    res.json({ success: true, count: events.length, data: events });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch timeline";
    res.status(500).json({ error: { code: "FETCH_FAILED", message: msg, details: null } });
  }
});

/**
 * POST /api/payments/escrow/create-order
 * Creates a PayPal REST Orders v2 intent order for locking milestone escrow OR full project escrow.
 * Amount is strictly retrieved from verified database records in integer minor units (never trusted from client).
 */
router.post("/escrow/create-order", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid order parameters", details: parsed.error.flatten() },
      });
      return;
    }

    const { milestoneId, projectId, mode } = parsed.data;
    const isFullProject = mode === "FULL_PROJECT" || (!milestoneId && !!projectId);

    if (isFullProject) {
      const targetProjectId = projectId || (milestoneId ? (await prisma.milestone.findUnique({ where: { id: milestoneId } }))?.projectId : null);
      if (!targetProjectId) {
        res.status(400).json({ error: { code: "BAD_REQUEST", message: "projectId is required for full project escrow", details: null } });
        return;
      }

      const project = await prisma.project.findUnique({
        where: { id: targetProjectId },
        include: {
          projectMilestones: { where: { removedAt: null }, orderBy: { orderIndex: "asc" } },
        },
      });

      if (!project) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found", details: null } });
        return;
      }

      const milestones = project.projectMilestones;
      if (milestones.length === 0) {
        res.status(400).json({ error: { code: "NO_MILESTONES", message: "No milestones found for project", details: null } });
        return;
      }

      const unfundedMilestones = milestones.filter((m) => m.state === PaymentState.NOT_STARTED);
      const totalAmountMinor = unfundedMilestones.reduce(
        (sum, m) => sum + (m.amountMinor || m.amountCents || 0),
        0
      );

      if (totalAmountMinor <= 0) {
        res.status(400).json({ error: { code: "ALREADY_FUNDED", message: "All milestones for this project are already funded", details: null } });
        return;
      }

      const currency = milestones[0]?.currency || "USD";
      const requestId = `escrow_full_${project.id}_${Date.now()}`;

      const order = await createPayPalOrder({
        amountMinor: totalAmountMinor,
        currency,
        referenceId: project.id,
        requestId,
        description: `Nexum Full Project Escrow Lock: ${milestones.length} milestones - ${project.title}`,
      });

      res.json({
        success: true,
        mode: "FULL_PROJECT",
        orderId: order.orderId,
        status: order.status,
        approvalUrl: order.links?.find((l) => l.rel === "approve")?.href || null,
        amountMinor: totalAmountMinor,
        currency,
        milestonesCount: unfundedMilestones.length,
      });
      return;
    }

    // Single Milestone Mode
    if (!milestoneId) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "milestoneId is required for milestone escrow", details: null } });
      return;
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        project: true,
        agreement: {
          include: {
            versions: { orderBy: { versionNumber: "desc" }, take: 1 },
          },
        },
      },
    });

    if (!milestone) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Milestone not found", details: null } });
      return;
    }

    const amountMinor = milestone.amountMinor || milestone.amountCents || 0;
    if (amountMinor <= 0) {
      res.status(400).json({ error: { code: "INVALID_AMOUNT", message: "Milestone has no valid non-zero amount defined", details: null } });
      return;
    }

    const currency = milestone.currency || "USD";
    const requestId = `escrow_${milestone.id}_${Date.now()}`;

    const order = await createPayPalOrder({
      amountMinor,
      currency,
      referenceId: milestone.id,
      requestId,
      description: `Nexum Escrow Lock: Milestone #${milestone.sequence || milestone.orderIndex} - ${milestone.title}`,
    });

    res.json({
      success: true,
      mode: "MILESTONE",
      orderId: order.orderId,
      status: order.status,
      approvalUrl: order.links?.find((l) => l.rel === "approve")?.href || null,
      amountMinor,
      currency,
      milestoneId: milestone.id,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/escrow/capture
 * Captures PayPal order and commits escrow lock.
 * Supports both FULL_PROJECT mode (locks all project milestones) and MILESTONE mode.
 */
router.post("/escrow/capture", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = captureOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid capture parameters", details: parsed.error.flatten() },
      });
      return;
    }

    const { orderId, milestoneId, projectId, mode } = parsed.data;
    const isFullProject = mode === "FULL_PROJECT" || (!milestoneId && !!projectId);
    const requestId = `cap_${orderId}_${Date.now()}`;
    const capture = await capturePayPalOrder(orderId, requestId);
    const now = new Date();

    if (isFullProject) {
      const targetProjectId = projectId || (milestoneId ? (await prisma.milestone.findUnique({ where: { id: milestoneId } }))?.projectId : null);
      if (!targetProjectId) {
        res.status(400).json({ error: { code: "BAD_REQUEST", message: "projectId is required for full project escrow", details: null } });
        return;
      }

      const project = await prisma.project.findUnique({
        where: { id: targetProjectId },
        include: {
          projectMilestones: { where: { removedAt: null }, orderBy: { orderIndex: "asc" } },
          agreement: {
            include: {
              versions: { orderBy: { versionNumber: "desc" }, take: 1 },
            },
          },
        },
      });

      if (!project) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found", details: null } });
        return;
      }

      const milestones = project.projectMilestones;
      const unfundedMilestones = milestones.filter((m) => m.state === PaymentState.NOT_STARTED);
      const totalAmountMinor = unfundedMilestones.reduce((sum, m) => sum + (m.amountMinor || m.amountCents || 0), 0);
      const currency = milestones[0]?.currency || capture.currency || "USD";

      await prisma.$transaction(async (tx) => {
        // Lock escrow on all unfunded milestones
        for (const m of unfundedMilestones) {
          const mMinor = m.amountMinor || m.amountCents || 0;
          await tx.payment.create({
            data: {
              projectId: project.id,
              milestoneId: m.id,
              milestoneKey: m.milestoneKey,
              amountMinor: mMinor,
              currency,
              status: PaymentState.CAPTURED,
              paypalOrderId: `${orderId}_m_${m.id.slice(-8)}`,
              paypalCaptureId: `${capture.captureId}_m_${m.id.slice(-8)}`,
              agreementVersionHash: project.agreement?.versions[0]?.contentHash || null,
            },
          });

          await tx.milestone.update({
            where: { id: m.id },
            data: {
              state: PaymentState.CAPTURED,
              // First milestone begins work; subsequent ones remain UPCOMING until previous is accepted
              workStatus: m.orderIndex === 1 ? MilestoneWorkStatus.IN_PROGRESS : m.workStatus,
              startedAt: m.orderIndex === 1 ? now : undefined,
            },
          });
        }

        // Append-only audit record
        await tx.auditEvent.create({
          data: {
            actorId: project.clientId || "client",
            action: "FULL_PROJECT_ESCROW_LOCKED",
            objectType: "PROJECT",
            objectId: project.id,
            metadata: {
              projectId: project.id,
              orderId,
              captureId: capture.captureId,
              totalAmountMinor,
              currency,
              milestonesCount: unfundedMilestones.length,
              timestamp: now.toISOString(),
            },
          },
        });
      });

      const formattedTotal = `$${(totalAmountMinor / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${currency}`;

      await workspaceService.sendMessage({
        projectId: project.id,
        senderId: "nexum_escrow",
        senderRole: "OPERATOR",
        type: "ESCROW_LOCKED",
        content: `🔒 Full Project Escrow Locked: ${formattedTotal} has been deposited and securely locked in Nexum bilateral escrow for all ${unfundedMilestones.length} milestones. Milestone #1 is officially authorized to begin development.`,
        metadata: {
          type: "ESCROW_LOCKED",
          mode: "FULL_PROJECT",
          projectId: project.id,
          totalAmountMinor,
          currency,
          paypalOrderId: orderId,
          paypalCaptureId: capture.captureId,
          badgeText: "Full Escrow Locked",
          badgeType: "green",
        },
      }).catch((err) => console.warn("Workspace notification warning:", err));

      res.json({
        success: true,
        status: "FULL_PROJECT_ESCROW_LOCKED",
        mode: "FULL_PROJECT",
        projectId: project.id,
        captureId: capture.captureId,
        orderId,
        totalAmountMinor,
        currency,
        milestonesFunded: unfundedMilestones.length,
        message: `Entire project escrow (${formattedTotal}) locked across ${unfundedMilestones.length} milestones.`,
      });
      return;
    }

    // Single Milestone Mode
    if (!milestoneId) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "milestoneId is required for milestone escrow capture", details: null } });
      return;
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        project: true,
        agreement: {
          include: {
            versions: { orderBy: { versionNumber: "desc" }, take: 1 },
          },
        },
      },
    });

    if (!milestone) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Milestone not found", details: null } });
      return;
    }

    const amountMinor = milestone.amountMinor || milestone.amountCents || capture.amountMinor || 0;
    const currency = milestone.currency || capture.currency || "USD";

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          projectId: milestone.projectId!,
          milestoneId: milestone.id,
          milestoneKey: milestone.milestoneKey,
          amountMinor,
          currency,
          status: PaymentState.CAPTURED,
          paypalOrderId: orderId,
          paypalCaptureId: capture.captureId,
          agreementVersionHash: milestone.agreement?.versions[0]?.contentHash || null,
        },
      });

      await tx.milestone.update({
        where: { id: milestone.id },
        data: {
          state: PaymentState.CAPTURED,
          workStatus: MilestoneWorkStatus.IN_PROGRESS,
          startedAt: now,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorId: milestone.project?.clientId || "client",
          action: "PAYMENT_ESCROW_LOCKED",
          objectType: "MILESTONE",
          objectId: milestone.id,
          metadata: {
            milestoneId: milestone.id,
            orderId,
            captureId: capture.captureId,
            amountMinor,
            currency,
            timestamp: now.toISOString(),
          },
        },
      });
    });

    const formattedAmount = `$${(amountMinor / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;

    await workspaceService.sendMessage({
      projectId: milestone.projectId!,
      senderId: "nexum_escrow",
      senderRole: "OPERATOR",
      type: "ESCROW_LOCKED",
      content: `🔒 Escrow Locked: ${formattedAmount} has been deposited and securely locked in Nexum bilateral escrow for Milestone #${milestone.sequence || milestone.orderIndex}: "${milestone.title}". Development is officially authorized to begin.`,
      metadata: {
        type: "ESCROW_LOCKED",
        mode: "MILESTONE",
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        amountMinor,
        currency,
        paypalOrderId: orderId,
        paypalCaptureId: capture.captureId,
        badgeText: "Escrow Locked",
        badgeType: "green",
      },
    }).catch((err) => console.warn("Workspace notification warning:", err));

    res.json({
      success: true,
      captureId: capture.captureId,
      status: "ESCROW_LOCKED",
      milestoneId: milestone.id,
      amountMinor,
      currency,
      message: `Escrow funds successfully locked for Milestone #${milestone.sequence || milestone.orderIndex}.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/escrow/simulate-lock
 * Fallback sandbox lock for instant automated testing.
 * Supports both FULL_PROJECT mode and MILESTONE mode with real DB state transition and audit events.
 */
router.post("/escrow/simulate-lock", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = simulateLockSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid simulation parameters", details: parsed.error.flatten() },
      });
      return;
    }

    const { milestoneId, projectId, mode } = parsed.data;
    const isFullProject = mode === "FULL_PROJECT" || (!milestoneId && !!projectId);
    const now = new Date();

    if (isFullProject) {
      const targetProjectId = projectId || (milestoneId ? (await prisma.milestone.findUnique({ where: { id: milestoneId } }))?.projectId : null);
      if (!targetProjectId) {
        res.status(400).json({ error: { code: "BAD_REQUEST", message: "projectId is required for full project escrow simulation", details: null } });
        return;
      }

      const project = await prisma.project.findUnique({
        where: { id: targetProjectId },
        include: {
          projectMilestones: { where: { removedAt: null }, orderBy: { orderIndex: "asc" } },
          agreement: {
            include: {
              versions: { orderBy: { versionNumber: "desc" }, take: 1 },
            },
          },
        },
      });

      if (!project) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found", details: null } });
        return;
      }

      const milestones = project.projectMilestones;
      const unfundedMilestones = milestones.filter((m) => m.state === PaymentState.NOT_STARTED);
      const totalAmountMinor = unfundedMilestones.reduce((sum, m) => sum + (m.amountMinor || m.amountCents || 0), 0);
      const currency = milestones[0]?.currency || "USD";

      const mockOrderId = `PAYPAL_ORD_FULL_SANDBOX_${project.id.slice(0, 8)}_${Date.now()}`;
      const mockCaptureId = `PAYPAL_CAP_FULL_SANDBOX_${project.id.slice(0, 8)}_${Date.now()}`;

      await prisma.$transaction(async (tx) => {
        for (const m of unfundedMilestones) {
          const mMinor = m.amountMinor || m.amountCents || 0;
          await tx.payment.create({
            data: {
              projectId: project.id,
              milestoneId: m.id,
              milestoneKey: m.milestoneKey,
              amountMinor: mMinor,
              currency,
              status: PaymentState.CAPTURED,
              paypalOrderId: `${mockOrderId}_m_${m.id.slice(-8)}`,
              paypalCaptureId: `${mockCaptureId}_m_${m.id.slice(-8)}`,
              agreementVersionHash: project.agreement?.versions[0]?.contentHash || null,
            },
          });

          await tx.milestone.update({
            where: { id: m.id },
            data: {
              state: PaymentState.CAPTURED,
              workStatus: m.orderIndex === 1 ? MilestoneWorkStatus.IN_PROGRESS : m.workStatus,
              startedAt: m.orderIndex === 1 ? now : undefined,
            },
          });
        }

        await tx.auditEvent.create({
          data: {
            actorId: project.clientId || "client",
            action: "FULL_PROJECT_ESCROW_LOCKED",
            objectType: "PROJECT",
            objectId: project.id,
            metadata: {
              projectId: project.id,
              orderId: mockOrderId,
              captureId: mockCaptureId,
              totalAmountMinor,
              currency,
              mode: "SANDBOX_SIMULATED",
              milestonesCount: unfundedMilestones.length,
              timestamp: now.toISOString(),
            },
          },
        });
      });

      const formattedTotal = `$${(totalAmountMinor / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${currency}`;

      await workspaceService.sendMessage({
        projectId: project.id,
        senderId: "nexum_escrow",
        senderRole: "OPERATOR",
        type: "ESCROW_LOCKED",
        content: `🔒 Full Project Escrow Locked: ${formattedTotal} has been deposited and securely locked in Nexum bilateral escrow for all ${unfundedMilestones.length} milestones. Milestone #1 is officially authorized to begin development.`,
        metadata: {
          type: "ESCROW_LOCKED",
          mode: "FULL_PROJECT",
          projectId: project.id,
          totalAmountMinor,
          currency,
          paypalOrderId: mockOrderId,
          paypalCaptureId: mockCaptureId,
          badgeText: "Full Escrow Locked",
          badgeType: "green",
        },
      }).catch((err) => console.warn("Workspace notification warning:", err));

      res.json({
        success: true,
        mode: "FULL_PROJECT",
        captureId: mockCaptureId,
        orderId: mockOrderId,
        status: "FULL_PROJECT_ESCROW_LOCKED",
        projectId: project.id,
        totalAmountMinor,
        currency,
        milestonesFunded: unfundedMilestones.length,
        message: `Entire project escrow (${formattedTotal}) locked across ${unfundedMilestones.length} milestones.`,
      });
      return;
    }

    // Single Milestone Mode
    if (!milestoneId) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "milestoneId is required for simulation", details: null } });
      return;
    }

    const milestone = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: {
        project: true,
        agreement: {
          include: {
            versions: { orderBy: { versionNumber: "desc" }, take: 1 },
          },
        },
      },
    });

    if (!milestone) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Milestone not found", details: null } });
      return;
    }

    const mockOrderId = `PAYPAL_ORD_SANDBOX_${milestone.id.slice(0, 8)}_${Date.now()}`;
    const mockCaptureId = `PAYPAL_CAP_SANDBOX_${milestone.id.slice(0, 8)}_${Date.now()}`;
    const amountMinor = milestone.amountMinor || milestone.amountCents || 0;
    const currency = milestone.currency || "USD";

    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          projectId: milestone.projectId!,
          milestoneId: milestone.id,
          milestoneKey: milestone.milestoneKey,
          amountMinor,
          currency,
          status: PaymentState.CAPTURED,
          paypalOrderId: mockOrderId,
          paypalCaptureId: mockCaptureId,
          agreementVersionHash: milestone.agreement?.versions[0]?.contentHash || null,
        },
      });

      await tx.milestone.update({
        where: { id: milestone.id },
        data: {
          state: PaymentState.CAPTURED,
          workStatus: MilestoneWorkStatus.IN_PROGRESS,
          startedAt: now,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorId: milestone.project?.clientId || "client",
          action: "PAYMENT_ESCROW_LOCKED",
          objectType: "MILESTONE",
          objectId: milestone.id,
          metadata: {
            milestoneId: milestone.id,
            orderId: mockOrderId,
            captureId: mockCaptureId,
            amountMinor,
            currency,
            mode: "SANDBOX_SIMULATED",
            timestamp: now.toISOString(),
          },
        },
      });
    });

    const formattedAmount = `$${(amountMinor / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;

    await workspaceService.sendMessage({
      projectId: milestone.projectId!,
      senderId: "nexum_escrow",
      senderRole: "OPERATOR",
      type: "ESCROW_LOCKED",
      content: `🔒 Escrow Locked: ${formattedAmount} has been deposited and securely locked in Nexum bilateral escrow for Milestone #${milestone.sequence || milestone.orderIndex}: "${milestone.title}". Development is officially authorized to begin.`,
      metadata: {
        type: "ESCROW_LOCKED",
        mode: "MILESTONE",
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        amountMinor,
        currency,
        paypalOrderId: mockOrderId,
        paypalCaptureId: mockCaptureId,
        badgeText: "Escrow Locked",
        badgeType: "green",
      },
    }).catch((err) => console.warn("Workspace notification warning:", err));

    res.json({
      success: true,
      captureId: mockCaptureId,
      orderId: mockOrderId,
      status: "ESCROW_LOCKED",
      milestoneId: milestone.id,
      amountMinor,
      currency,
      message: `Escrow funds successfully locked for Milestone #${milestone.sequence || milestone.orderIndex}.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/milestones/:id/approve-and-release
 * Approves a milestone deliverable and releases escrow funds to the freelancer.
 * If the next milestone was pre-funded from full escrow, auto-activates Milestone #2 into IN_PROGRESS!
 * If not pre-funded, prompts the client to deposit Milestone #2 escrow.
 */
router.post("/milestones/:id/approve-and-release", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const parsed = approveReleaseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid approval payload", details: parsed.error.flatten() },
      });
      return;
    }

    const { feedback, actorId } = parsed.data;
    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            projectMilestones: { where: { removedAt: null }, orderBy: { orderIndex: "asc" } },
          },
        },
      },
    });

    if (!milestone) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Milestone not found", details: null } });
      return;
    }

    if (milestone.state !== PaymentState.CAPTURED) {
      res.status(400).json({
        error: {
          code: "NOT_FUNDED",
          message: `Cannot release escrow: milestone payment state is ${milestone.state}, expected CAPTURED`,
          details: null,
        },
      });
      return;
    }

    const now = new Date();
    const amountMinor = milestone.amountMinor || milestone.amountCents || 0;
    const currency = milestone.currency || "USD";
    const formattedAmount = `$${(amountMinor / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;

    const allMilestones = milestone.project?.projectMilestones || [];
    const nextMilestone = allMilestones.find((m) => m.orderIndex === (milestone.sequence || milestone.orderIndex) + 1);

    await prisma.$transaction(async (tx) => {
      // 1. Release milestone escrow to freelancer
      await tx.milestone.update({
        where: { id: milestone.id },
        data: {
          workStatus: MilestoneWorkStatus.ACCEPTED,
          acceptedAt: now,
          state: PaymentState.APPROVED,
        },
      });

      await tx.payment.updateMany({
        where: { milestoneId: milestone.id },
        data: { status: PaymentState.APPROVED },
      });

      // 2. Append-only audit record
      await tx.auditEvent.create({
        data: {
          actorId: actorId || milestone.project?.clientId || "client",
          action: "MILESTONE_ACCEPTED_AND_RELEASED",
          objectType: "MILESTONE",
          objectId: milestone.id,
          metadata: {
            milestoneId: milestone.id,
            amountMinor,
            currency,
            feedback: feedback || "Approved by client",
            timestamp: now.toISOString(),
          },
        },
      });

      // 3. Next Milestone Progression Handling
      if (nextMilestone) {
        if (nextMilestone.state === PaymentState.CAPTURED) {
          // Pre-funded from full escrow! Auto-start development!
          await tx.milestone.update({
            where: { id: nextMilestone.id },
            data: {
              workStatus: MilestoneWorkStatus.IN_PROGRESS,
              startedAt: now,
            },
          });
        }
      } else {
        // All milestones completed! Transition project to COMPLETED
        await tx.project.update({
          where: { id: milestone.projectId! },
          data: { state: ProjectState.COMPLETED },
        });
      }
    });

    // Broadcast workspace notification
    if (nextMilestone) {
      if (nextMilestone.state === PaymentState.CAPTURED) {
        await workspaceService.sendMessage({
          projectId: milestone.projectId!,
          senderId: "nexum_escrow",
          senderRole: "OPERATOR",
          type: "MILESTONE_APPROVED_PREFUNDED",
          content: `✅ Milestone #${milestone.sequence || milestone.orderIndex} Approved! ${formattedAmount} has been released to Freelancer.\n\nMilestone #${nextMilestone.sequence || nextMilestone.orderIndex} ("${nextMilestone.title}") is already pre-funded in escrow and has automatically kicked off!`,
          metadata: {
            type: "MILESTONE_APPROVED",
            milestoneId: milestone.id,
            releasedAmountMinor: amountMinor,
            nextMilestoneId: nextMilestone.id,
            nextMilestoneStatus: "IN_PROGRESS",
            badgeText: "Milestone Paid & Next Active",
            badgeType: "green",
          },
        }).catch((err) => console.warn("Workspace notification warning:", err));
      } else {
        const nextAmountFormatted = `$${((nextMilestone.amountMinor || nextMilestone.amountCents || 0) / 100).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} ${nextMilestone.currency || "USD"}`;

        await workspaceService.sendMessage({
          projectId: milestone.projectId!,
          senderId: "nexum_escrow",
          senderRole: "OPERATOR",
          type: "MILESTONE_APPROVED_AWAITING_FUNDS",
          content: `✅ Milestone #${milestone.sequence || milestone.orderIndex} Approved! ${formattedAmount} has been released to Freelancer.\n\nClient, please deposit Milestone #${nextMilestone.sequence || nextMilestone.orderIndex} funds (${nextAmountFormatted}) into escrow to authorize kickoff for "${nextMilestone.title}".`,
          metadata: {
            type: "MILESTONE_APPROVED",
            milestoneId: milestone.id,
            releasedAmountMinor: amountMinor,
            nextMilestoneId: nextMilestone.id,
            nextMilestoneStatus: "AWAITING_FUNDS",
            badgeText: "Milestone Paid",
            badgeType: "green",
          },
        }).catch((err) => console.warn("Workspace notification warning:", err));
      }
    } else {
      await workspaceService.sendMessage({
        projectId: milestone.projectId!,
        senderId: "nexum_escrow",
        senderRole: "OPERATOR",
        type: "PROJECT_ALL_MILESTONES_COMPLETED",
        content: `🎉 All project milestones completed and approved! Total contract funds have been fully released to Freelancer. Handover and final closure protocols are now available.`,
        metadata: {
          type: "PROJECT_COMPLETED",
          milestoneId: milestone.id,
          badgeText: "Project Completed",
          badgeType: "green",
        },
      }).catch((err) => console.warn("Workspace notification warning:", err));
    }

    res.json({
      success: true,
      milestoneId: milestone.id,
      releasedAmountMinor: amountMinor,
      currency,
      nextMilestone: nextMilestone
        ? {
            id: nextMilestone.id,
            orderIndex: nextMilestone.orderIndex,
            isPreFunded: nextMilestone.state === PaymentState.CAPTURED,
          }
        : null,
      message: `Milestone #${milestone.sequence || milestone.orderIndex} released successfully.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/escrow/refund-unreleased
 * In case of dispute or mutual cancellation:
 * Safely refunds all unreleased escrow tranches back to the client while protecting earnings for already-accepted milestones.
 */
router.post("/escrow/refund-unreleased", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = refundUnreleasedSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid refund payload", details: parsed.error.flatten() },
      });
      return;
    }

    const { projectId, reason } = parsed.data;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectMilestones: { where: { removedAt: null } },
      },
    });

    if (!project) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Project not found", details: null } });
      return;
    }

    const refundableMilestones = project.projectMilestones.filter(
      (m) => m.state === PaymentState.CAPTURED && m.workStatus !== MilestoneWorkStatus.ACCEPTED
    );

    if (refundableMilestones.length === 0) {
      res.status(400).json({ error: { code: "NOTHING_TO_REFUND", message: "No unreleased escrow funds found to refund", details: null } });
      return;
    }

    const now = new Date();
    const totalRefundMinor = refundableMilestones.reduce((sum, m) => sum + (m.amountMinor || m.amountCents || 0), 0);
    const currency = refundableMilestones[0]?.currency || "USD";

    await prisma.$transaction(async (tx) => {
      for (const m of refundableMilestones) {
        await tx.milestone.update({
          where: { id: m.id },
          data: { state: PaymentState.REFUNDED },
        });

        await tx.payment.updateMany({
          where: { milestoneId: m.id, status: PaymentState.CAPTURED },
          data: { status: PaymentState.REFUNDED },
        });
      }

      await tx.auditEvent.create({
        data: {
          actorId: project.clientId || "operator",
          action: "ESCROW_UNRELEASED_REFUNDED",
          objectType: "PROJECT",
          objectId: project.id,
          metadata: {
            projectId: project.id,
            refundedMilestonesCount: refundableMilestones.length,
            totalRefundMinor,
            currency,
            reason: reason || "Mutual cancellation or dispute refund",
            timestamp: now.toISOString(),
          },
        },
      });
    });

    const formattedRefund = `$${(totalRefundMinor / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`;

    await workspaceService.sendMessage({
      projectId: project.id,
      senderId: "nexum_escrow",
      senderRole: "OPERATOR",
      type: "ESCROW_REFUNDED",
      content: `🛡️ Escrow Refunded: Unreleased funds (${formattedRefund}) have been returned to Client. Completed milestone earnings remain secured by Freelancer.`,
      metadata: {
        type: "ESCROW_REFUNDED",
        projectId: project.id,
        totalRefundMinor,
        currency,
        badgeText: "Escrow Refunded",
        badgeType: "gray",
      },
    }).catch((err) => console.warn("Workspace notification warning:", err));

    res.json({
      success: true,
      totalRefundMinor,
      currency,
      refundedMilestonesCount: refundableMilestones.length,
      message: `Successfully refunded ${formattedRefund} of unreleased escrow to Client.`,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

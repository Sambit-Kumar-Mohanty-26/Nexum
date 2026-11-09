import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../prisma.js";
import { PaymentState, MilestoneWorkStatus } from "@prisma/client";
import { createPayPalOrder, capturePayPalOrder } from "../domain/payments/paypal.js";
import { workspaceService } from "../services/workspaceService.js";

const router = Router();

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
    res.status(500).json({ success: false, error: msg });
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
    res.status(500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/payments/escrow/create-order
 * Creates a PayPal REST Orders v2 intent order for locking milestone escrow.
 * Amount is strictly retrieved from the database milestone record (never trusted from client).
 */
router.post("/escrow/create-order", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { milestoneId } = req.body;

    if (!milestoneId) {
      res.status(400).json({ success: false, error: "milestoneId is required" });
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
      res.status(404).json({ success: false, error: "Milestone not found" });
      return;
    }

    const amountMinor = milestone.amountMinor || milestone.amountCents || 0;
    if (amountMinor <= 0) {
      res.status(400).json({ success: false, error: "Milestone has no valid non-zero amount defined" });
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
      orderId: order.orderId,
      status: order.status,
      approvalUrl: order.links?.find((l) => l.rel === "approve")?.href || null,
      amountMinor,
      currency,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/payments/escrow/capture
 * Captures PayPal order and commits escrow lock.
 * Records Payment record, updates Milestone payment status to CAPTURED,
 * and posts system verified notification in workspace to both client and freelancer.
 */
router.post("/escrow/capture", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { orderId, milestoneId } = req.body;

    if (!orderId || !milestoneId) {
      res.status(400).json({ success: false, error: "orderId and milestoneId are required" });
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
      res.status(404).json({ success: false, error: "Milestone not found" });
      return;
    }

    const requestId = `cap_${orderId}_${Date.now()}`;
    const capture = await capturePayPalOrder(orderId, requestId);

    const now = new Date();
    const amountMinor = milestone.amountMinor || milestone.amountCents || capture.amountMinor || 0;
    const currency = milestone.currency || capture.currency || "USD";

    await prisma.$transaction(async (tx) => {
      // 1. Create Payment record with HELD_IN_ESCROW / CAPTURED state
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

      // 2. Transition Milestone status to CAPTURED and IN_PROGRESS
      await tx.milestone.update({
        where: { id: milestone.id },
        data: {
          state: PaymentState.CAPTURED,
          workStatus: MilestoneWorkStatus.IN_PROGRESS,
          startedAt: now,
        },
      });

      // 3. Record append-only audit event
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

    // 4. Automatically post system-verified notification in project workspace
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
 * Produces real DB state change and workspace notification.
 */
router.post("/escrow/simulate-lock", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { milestoneId } = req.body;
    if (!milestoneId) {
      res.status(400).json({ success: false, error: "milestoneId is required" });
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
      res.status(404).json({ success: false, error: "Milestone not found" });
      return;
    }

    const mockOrderId = `PAYPAL_ORD_SANDBOX_${milestone.id.slice(0, 8)}_${Date.now()}`;
    const mockCaptureId = `PAYPAL_CAP_SANDBOX_${milestone.id.slice(0, 8)}_${Date.now()}`;
    const amountMinor = milestone.amountMinor || milestone.amountCents || 0;
    const currency = milestone.currency || "USD";
    const now = new Date();

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

export default router;

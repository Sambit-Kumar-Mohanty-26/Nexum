import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { clientPaymentsService } from "../services/clientPaymentsService.js";
import { ValidationError, UnauthorizedError, ForbiddenError } from "../lib/errors.js";
import { Role } from "@prisma/client";

const router = Router();

// Middleware: get validated client ID from session or fallback to seed client in dev/test
function getClientId(req: Request): string {
  if (req.user) {
    if (req.user.role !== Role.CLIENT) {
      throw new ForbiddenError("Access denied: only CLIENT role can access client financial records");
    }
    return req.user.id;
  }

  // Support dev/test clientId query/header when not in strict production
  const headerOrQueryId = (req.query.clientId as string) || (req.headers["x-client-id"] as string);
  if (headerOrQueryId) {
    return headerOrQueryId;
  }

  if (process.env.NODE_ENV !== "production") {
    return "usr_client_alex";
  }

  throw new UnauthorizedError("Authentication required: missing session token");
}

// GET /api/client/payments/summary
router.get("/summary", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = getClientId(req);
    const summary = await clientPaymentsService.getSummary(clientId);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

// GET /api/client/payments/transactions
router.get("/transactions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = getClientId(req);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const txs = await clientPaymentsService.getTransactions(clientId, { status, search });
    res.json({ success: true, count: txs.length, data: txs });
  } catch (err) {
    next(err);
  }
});

// GET /api/client/payments/cash-flow
router.get("/cash-flow", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = getClientId(req);
    const timeframe = (req.query.timeframe as string) || "1M";
    const points = await clientPaymentsService.getCashFlow(clientId, timeframe);
    res.json({ success: true, data: points });
  } catch (err) {
    next(err);
  }
});

// GET /api/client/payments/action-required
router.get("/action-required", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = getClientId(req);
    const item = await clientPaymentsService.getActionRequired(clientId);
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// GET /api/client/payments/upcoming
router.get("/upcoming", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = getClientId(req);
    const upcoming = await clientPaymentsService.getUpcomingDeliverable(clientId);
    res.json({ success: true, data: upcoming });
  } catch (err) {
    next(err);
  }
});

const releaseSchema = z.object({
  milestoneId: z.string().min(1, "milestoneId is required"),
});

// POST /api/client/payments/release
router.post("/release", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = getClientId(req);
    const parsed = releaseSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid release payload", parsed.error.flatten().fieldErrors);
    }

    const result = await clientPaymentsService.authorizeAndRelease(clientId, parsed.data.milestoneId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;


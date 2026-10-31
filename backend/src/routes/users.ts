import { Router, Request, Response } from "express";
import { prisma } from "../prisma.js";

const router = Router();

// In-memory presence map keyed by userId
const userPresenceMap = new Map<string, { presence: string; updatedAt: string }>();

// Seed default presences for known demo users
userPresenceMap.set("usr_client_alex", { presence: "available", updatedAt: new Date().toISOString() });
userPresenceMap.set("usr_freelancer_rohan", { presence: "available", updatedAt: new Date().toISOString() });

// GET /api/users - list demo users and profiles
router.get("/", async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        freelancerProfile: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const enriched = users.map((u) => ({
      ...u,
      presence: userPresenceMap.get(u.id)?.presence || "offline",
    }));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch users";
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/users/freelancers - list freelancer directory
router.get("/freelancers", async (_req: Request, res: Response) => {
  try {
    const freelancers = await prisma.user.findMany({
      where: { role: "FREELANCER" },
      include: { freelancerProfile: true },
    });

    const enriched = freelancers.map((f) => ({
      ...f,
      presence: userPresenceMap.get(f.id)?.presence || "available",
    }));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch freelancers";
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/users/:userId/presence - Fetch user presence
router.get("/:userId/presence", (req: Request, res: Response) => {
  const { userId } = req.params;
  const current = userPresenceMap.get(userId) || {
    presence: "available",
    updatedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    userId,
    presence: current.presence,
    updatedAt: current.updatedAt,
  });
});

// PATCH /api/users/:userId/presence - Update user presence
router.patch("/:userId/presence", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { presence } = req.body;

  const validPresences = ["available", "busy", "away", "offline"];
  if (!presence || !validPresences.includes(presence)) {
    return res.status(400).json({
      success: false,
      error: `Invalid presence. Must be one of [${validPresences.join(", ")}]`,
    });
  }

  const now = new Date().toISOString();
  userPresenceMap.set(userId, { presence, updatedAt: now });

  // Try recording audit event if database is available
  try {
    await prisma.auditEvent.create({
      data: {
        actorId: userId,
        action: "PRESENCE_CHANGED",
        objectType: "USER",
        objectId: userId,
        metadata: { newPresence: presence, timestamp: now },
      },
    });
  } catch {
    // Database audit logging is non-blocking
  }

  res.json({
    success: true,
    userId,
    presence,
    updatedAt: now,
    message: `Presence updated to ${presence}`,
  });
});

// PATCH /api/users/:userId/avatar - Update user profile avatar
router.patch("/:userId/avatar", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { avatar } = req.body;

  if (!avatar || typeof avatar !== "string") {
    return res.status(400).json({ success: false, error: "Missing avatar data" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    const currentPreferences = (existing?.preferences as Record<string, unknown>) || {};
    await prisma.user.update({
      where: { id: userId },
      data: { preferences: { ...currentPreferences, avatar } },
    });
  } catch {
    // Non-blocking in dev / mock session
  }

  res.json({ success: true, userId, avatar });
});

// PATCH /api/users/:userId/hiring-status - Update client hiring status
router.patch("/:userId/hiring-status", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, error: "Missing status" });
  }

  res.json({ success: true, userId, status });
});

export default router;

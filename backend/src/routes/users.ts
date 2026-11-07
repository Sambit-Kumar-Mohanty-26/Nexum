import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { appendAuditEvent } from "../lib/audit.js";
import { ValidationError, ForbiddenError, UnauthorizedError } from "../lib/errors.js";

const router = Router();

// In-memory presence map keyed by userId for ultra-fast query performance
const userPresenceMap = new Map<string, { presence: string; updatedAt: string }>();

// Supported presence values
export const VALID_PRESENCES = ["available", "busy", "away", "offline"] as const;
export type ValidPresence = (typeof VALID_PRESENCES)[number];

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

// GET /api/users/presence - Fetch authenticated user presence from session
router.get("/presence", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    let current = userPresenceMap.get(userId);

    if (!current) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true },
      });
      const prefs = user?.preferences as Record<string, any> | null;
      if (prefs?.presence && VALID_PRESENCES.includes(prefs.presence)) {
        current = {
          presence: prefs.presence,
          updatedAt: prefs.presenceUpdatedAt || new Date().toISOString(),
        };
        userPresenceMap.set(userId, current);
      }
    }

    const finalPresence = current || {
      presence: "available",
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      userId,
      presence: finalPresence.presence,
      updatedAt: finalPresence.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/presence - Update authenticated user presence from session
router.patch("/presence", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { presence } = req.body;

    if (!presence || typeof presence !== "string" || !VALID_PRESENCES.includes(presence as ValidPresence)) {
      throw new ValidationError(
        `Invalid presence status. Must be one of [${VALID_PRESENCES.join(", ")}]`
      );
    }

    const now = new Date().toISOString();

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });

    const currentPrefs =
      existingUser?.preferences && typeof existingUser.preferences === "object"
        ? (existingUser.preferences as Record<string, unknown>)
        : {};

    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          ...currentPrefs,
          presence,
          presenceUpdatedAt: now,
        },
      },
    });

    userPresenceMap.set(userId, { presence, updatedAt: now });

    await appendAuditEvent({
      actorId: userId,
      action: "PRESENCE_CHANGED",
      objectType: "USER",
      objectId: userId,
      metadata: { newPresence: presence, timestamp: now },
    });

    res.json({
      success: true,
      userId,
      presence,
      updatedAt: now,
      message: `Presence updated to ${presence}`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:userId/presence - Fetch user presence
router.get("/:userId/presence", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    let current = userPresenceMap.get(userId);

    // If not found in memory, query PostgreSQL preferences
    if (!current) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true },
      });
      const prefs = user?.preferences as Record<string, any> | null;
      if (prefs?.presence && VALID_PRESENCES.includes(prefs.presence)) {
        current = {
          presence: prefs.presence,
          updatedAt: prefs.presenceUpdatedAt || new Date().toISOString(),
        };
        userPresenceMap.set(userId, current);
      }
    }

    const finalPresence = current || {
      presence: "available",
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      userId,
      presence: finalPresence.presence,
      updatedAt: finalPresence.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:userId/presence - Update user presence (Authenticated + Ownership enforced)
router.patch(
  "/:userId/presence",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { userId } = req.params;
      const { presence } = req.body;

      if (!req.user) {
        throw new UnauthorizedError("Authentication required to update presence");
      }

      // 1. Strict ownership enforcement: Cannot alter another user's presence
      if (req.user.id !== userId) {
        throw new ForbiddenError("You are not authorized to update another user's presence");
      }

      // 2. Validate presence enum
      if (!presence || typeof presence !== "string" || !VALID_PRESENCES.includes(presence as ValidPresence)) {
        throw new ValidationError(
          `Invalid presence status. Must be one of [${VALID_PRESENCES.join(", ")}]`
        );
      }

      const now = new Date().toISOString();

      // 3. Persist to PostgreSQL User.preferences (do not swallow DB failures)
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true },
      });

      const currentPrefs =
        existingUser?.preferences && typeof existingUser.preferences === "object"
          ? (existingUser.preferences as Record<string, unknown>)
          : {};

      await prisma.user.update({
        where: { id: userId },
        data: {
          preferences: {
            ...currentPrefs,
            presence,
            presenceUpdatedAt: now,
          },
        },
      });

      // 4. Update memory cache
      userPresenceMap.set(userId, { presence, updatedAt: now });

      // 5. Append immutable audit event
      await appendAuditEvent({
        actorId: req.user.id,
        action: "PRESENCE_CHANGED",
        objectType: "USER",
        objectId: userId,
        metadata: { newPresence: presence, timestamp: now },
      });

      res.json({
        success: true,
        userId,
        presence,
        updatedAt: now,
        message: `Presence updated to ${presence}`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/users/:userId/avatar - Update user profile avatar
router.patch("/:userId/avatar", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { avatar } = req.body;

  if (!avatar || typeof avatar !== "string") {
    return res.status(400).json({ success: false, error: "Missing avatar data" });
  }

  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userId },
          { email: userId },
        ],
      },
    });
    if (existing) {
      const currentPreferences = (existing.preferences as Record<string, unknown>) || {};
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          avatarUrl: avatar.length <= 2048 ? avatar : undefined,
          preferences: { ...currentPreferences, avatar },
        },
      });
    }
  } catch (err) {
    console.warn("User avatar update in DB non-blocking warning:", err);
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

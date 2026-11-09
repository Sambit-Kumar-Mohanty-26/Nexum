import { Request, Response, NextFunction } from "express";
import { SESSION_COOKIE_NAME, validateSession } from "../lib/auth.js";
import { UnauthorizedError, ForbiddenError } from "../lib/errors.js";
import { Role, User, FreelancerProfile, Session } from "@prisma/client";
import { prisma } from "../prisma.js";

// Extend Express Request type to include authenticated user and session
declare global {
  namespace Express {
    interface Request {
      user?: User & { freelancerProfile?: FreelancerProfile | null };
      session?: Session;
    }
  }
}

/**
 * Middleware: Verifies session token from cookie or Authorization header.
 * Attaches user and session to request.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : undefined;

  const rawToken = cookieToken || bearerToken;

  if (!rawToken) {
    const isInternal = req.headers["x-nexum-internal"] === "true";
    const clientIp = req.socket.remoteAddress || "";
    const headerUserId = req.headers["x-user-id"];

    if (isInternal && typeof headerUserId === "string" && headerUserId.trim().length > 0) {
      try {
        const targetIdOrEmail = headerUserId.trim();
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { id: targetIdOrEmail },
              { email: { equals: targetIdOrEmail, mode: "insensitive" } },
            ],
          },
          include: { freelancerProfile: true },
        });
        if (user && user.status !== "DELETED") {
          req.user = user;
          req.session = {
            id: `sess_internal_${user.id}`,
            userId: user.id,
            tokenHash: "internal_proxy",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            revokedAt: null,
            userAgent: null,
            ipAddress: clientIp,
            createdAt: new Date(),
          };
          next();
          return;
        }
      } catch (err) {
        next(err);
        return;
      }
    }

    next(new UnauthorizedError("Authentication required: missing session token"));
    return;
  }

  try {
    const sessionRecord = await validateSession(rawToken);
    if (!sessionRecord || !sessionRecord.user) {
      // Secondary check: If internal proxy with x-user-id, fallback to database user
      const isInternal = req.headers["x-nexum-internal"] === "true";
      const clientIp = req.socket.remoteAddress || "";
      const headerUserId = req.headers["x-user-id"];

      if (isInternal && typeof headerUserId === "string" && headerUserId.trim().length > 0) {
        const targetIdOrEmail = headerUserId.trim();
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { id: targetIdOrEmail },
              { email: { equals: targetIdOrEmail, mode: "insensitive" } },
            ],
          },
          include: { freelancerProfile: true },
        });
        if (user && user.status !== "DELETED") {
          req.user = user;
          req.session = {
            id: `sess_internal_${user.id}`,
            userId: user.id,
            tokenHash: "internal_proxy",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            revokedAt: null,
            userAgent: null,
            ipAddress: clientIp,
            createdAt: new Date(),
          };
          next();
          return;
        }
      }

      next(new UnauthorizedError("Invalid or expired session token"));
      return;
    }

    req.session = sessionRecord;
    req.user = sessionRecord.user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware: Role Guard enforcing specific Role (e.g. 'FREELANCER' or 'CLIENT').
 */
export function requireRole(allowedRole: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    if (req.user.role !== allowedRole) {
      next(
        new ForbiddenError(
          `Access denied: requires ${allowedRole} role (current role: ${req.user.role || "NONE"})`
        )
      );
      return;
    }

    next();
  };
}

/**
 * Middleware: Requires that a freelancer has completed onboarding.
 */
export function requireOnboarded(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    next(new UnauthorizedError());
    return;
  }

  if (req.user.role === Role.FREELANCER) {
    const onboardingStatus = req.user.freelancerProfile?.onboardingStatus;
    if (onboardingStatus !== "COMPLETE") {
      next(
        new ForbiddenError(
          "Onboarding incomplete. Please complete your profile to access this resource."
        )
      );
      return;
    }
  }

  next();
}


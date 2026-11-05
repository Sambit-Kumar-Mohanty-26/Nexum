import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import {
  hashPassword,
  verifyPassword,
  createSession,
  revokeSession,
  SESSION_COOKIE_NAME,
  checkLoginRateLimit,
  recordFailedLogin,
  clearFailedLogins,
} from "../lib/auth.js";
import { appendAuditEvent } from "../lib/audit.js";
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from "../lib/errors.js";
import { requireAuth } from "../middleware/auth.js";
import { Role } from "@prisma/client";
import crypto from "crypto";
import { env } from "../lib/env.js";

const router = Router();

const signupSchema = z.object({
  email: z.string().email("A valid email address is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  name: z.string().optional(),
  role: z.enum(["CLIENT", "FREELANCER"]).optional(),
});

const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

const roleSchema = z.object({
  role: z.enum(["CLIENT", "FREELANCER"], {
    errorMap: () => ({ message: "Role must be CLIENT or FREELANCER" }),
  }),
  companyName: z.string().optional(),
  interests: z.array(z.string()).optional(),
  budget: z.string().optional(),
  title: z.string().optional(),
  skills: z.array(z.string()).optional(),
  profileType: z.string().optional(),
  workExperience: z.string().optional(),
  hourlyRate: z.number().optional(),
});

function setSessionCookie(res: Response, rawToken: string, expiresAt: Date) {
  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

// POST /api/auth/signup - Register user with Argon2id and set session cookie
router.post(
  "/signup",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid signup parameters", {
          issues: parsed.error.issues,
        });
      }

      const { email, password, name, role } = parsed.data;
      const normalizedEmail = email.trim().toLowerCase();

      // Check uniqueness case-insensitively
      const existing = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      });

      if (existing) {
        throw new ConflictError(
          `An account with email "${normalizedEmail}" already exists. Please sign in instead.`,
          { code: "EMAIL_IN_USE" }
        );
      }

      const passwordHash = await hashPassword(password);
      const displayName = name?.trim() || normalizedEmail.split("@")[0];

      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: displayName,
          passwordHash,
          role: role ? (role as Role) : null,
          status: "ACTIVE",
          ...(role === "FREELANCER"
            ? {
                freelancerProfile: {
                  create: {
                    title: "Freelancer Specialist",
                    bio: "Independent specialist on the Nexum protocol.",
                    skills: [],
                    onboardingStatus: "NOT_STARTED",
                    availabilityStatus: "AVAILABLE",
                  },
                },
              }
            : {}),
        },
      });

      // Audit event
      await appendAuditEvent({
        actorId: user.id,
        action: "USER_SIGNED_UP",
        objectType: "USER",
        objectId: user.id,
        metadata: { role: user.role, registeredAt: new Date().toISOString() },
      });

      // Issue database session & set httpOnly cookie
      const { rawToken, expiresAt } = await createSession(user.id, req);
      setSessionCookie(res, rawToken, expiresAt);

      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        message: "Account created successfully",
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login - Database credentials verification with Argon2id
router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Email and password are required");
      }

      const { email, password } = parsed.data;
      const normalizedEmail = email.trim().toLowerCase();
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || req.socket.remoteAddress || "127.0.0.1";

      // 1. Multi-layer rate limiting check (IP & IP+email)
      const rateCheck = checkLoginRateLimit(normalizedEmail, clientIp);
      if (!rateCheck.allowed) {
        res.setHeader("Retry-After", String(rateCheck.retryAfterSeconds));
        res.status(429).json({
          error: {
            code: "RATE_LIMITED",
            message: `Too many failed login attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
            details: { retryAfterSeconds: rateCheck.retryAfterSeconds },
          },
        });
        return;
      }

      if (rateCheck.progressiveDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, rateCheck.progressiveDelayMs));
      }

      // 2. Query user
      const user = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
        include: { freelancerProfile: true },
      });

      // 3. Argon2id password verification (NO DEMO BYPASS)
      const passwordValid = user?.passwordHash
        ? await verifyPassword(password, user.passwordHash)
        : false;

      if (!user || !passwordValid) {
        recordFailedLogin(normalizedEmail, clientIp);
        throw new UnauthorizedError("Invalid email or password");
      }

      // Successful login clears failed tracker for this IP+email
      clearFailedLogins(normalizedEmail, clientIp);

      // Audit log
      await appendAuditEvent({
        actorId: user.id,
        action: "USER_LOGGED_IN",
        objectType: "USER",
        objectId: user.id,
        metadata: { role: user.role, timestamp: new Date().toISOString() },
      });

      // Issue session and cookie
      const { rawToken, expiresAt } = await createSession(user.id, req);
      setSessionCookie(res, rawToken, expiresAt);

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        message: `Logged in as ${user.name}`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/logout - Server-side session revocation
router.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.[SESSION_COOKIE_NAME];
      if (token) {
        await revokeSession(token);
      }

      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me - Authenticated user session state
router.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const user = req.user!;
    const profile = user.freelancerProfile;

    const isOnboarded =
      user.role === Role.FREELANCER
        ? profile?.onboardingStatus === "COMPLETE"
        : true;

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      onboarding: {
        required: user.role === Role.FREELANCER && !isOnboarded,
        status: profile?.onboardingStatus || "NOT_STARTED",
        nextStep:
          !user.role
            ? "ROLE_SELECTION"
            : !isOnboarded
            ? "PROFILE_DETAILS"
            : "COMPLETE",
      },
    });
  }
);

// POST /api/auth/role - Role assignment (allowed once, concurrency-safe via FOR UPDATE)
router.post(
  "/role",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = roleSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Role must be CLIENT or FREELANCER");
      }

      const user = req.user!;

      // Concurrency protection: Lock the user row with SELECT ... FOR UPDATE inside an interactive transaction.
      // This guarantees that concurrent requests serialize at the database level and only one can assign a role.
      const updated = await prisma.$transaction(async (tx) => {
        const lockedUsers = await tx.$queryRaw<
          Array<{ id: string; role: Role | null; email: string }>
        >`
          SELECT id, role, email FROM "User" WHERE id = ${user.id} FOR UPDATE
        `;

        const lockedUser = lockedUsers[0];
        if (!lockedUser) {
          throw new NotFoundError("User", user.id);
        }

        if (lockedUser.role !== null) {
          throw new ConflictError("User role has already been set", {
            code: "ROLE_ALREADY_SET",
            currentRole: lockedUser.role,
          });
        }

        const pType = parsed.data.profileType;
        const expLevel = pType === "Experienced / Senior" ? "SENIOR" : pType === "Student / Beginner" ? "BEGINNER" : "MID";
        return await tx.user.update({
          where: { id: user.id },
          data: {
            role: parsed.data.role,
            preferences: {
              ...(parsed.data.companyName ? { companyName: parsed.data.companyName } : {}),
              ...(parsed.data.interests ? { interests: parsed.data.interests } : {}),
              ...(parsed.data.budget ? { budget: parsed.data.budget } : {}),
            },
            ...(parsed.data.role === "FREELANCER"
              ? {
                  freelancerProfile: {
                    upsert: {
                      create: {
                        title: parsed.data.title?.trim() || "Freelancer Specialist",
                        bio: parsed.data.workExperience?.trim() || "Independent specialist on the Nexum protocol.",
                        skills: parsed.data.skills || [],
                        experienceLevel: expLevel,
                        onboardingStatus: parsed.data.skills && parsed.data.skills.length > 0 ? "COMPLETED" : "NOT_STARTED",
                        rateHourlyMinor: parsed.data.hourlyRate ? parsed.data.hourlyRate * 100 : 5000,
                        availability: "AVAILABLE",
                      },
                      update: {
                        title: parsed.data.title?.trim() || undefined,
                        bio: parsed.data.workExperience?.trim() || undefined,
                        skills: parsed.data.skills || undefined,
                        experienceLevel: expLevel,
                        onboardingStatus: parsed.data.skills && parsed.data.skills.length > 0 ? "COMPLETED" : undefined,
                      },
                    },
                  },
                }
              : {}),
          },
        });
      });

      await appendAuditEvent({
        actorId: user.id,
        action: "USER_ROLE_ASSIGNED",
        objectType: "USER",
        objectId: user.id,
        metadata: { newRole: updated.role },
      });

      res.json({
        success: true,
        user: {
          id: updated.id,
          email: updated.email,
          role: updated.role,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

const googleCallbackSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  simulated: z.boolean().optional(),
});

// GET /api/auth/google/url - Get authorization URL for Google OAuth
router.get("/google/url", (req: Request, res: Response) => {
  if (env.GOOGLE_CLIENT_ID) {
    const state = crypto.randomBytes(24).toString("hex");
    res.cookie("nexum_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60 * 1000,
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      env.GOOGLE_CLIENT_ID
    )}&redirect_uri=${encodeURIComponent(
      env.GOOGLE_CALLBACK_URL
    )}&response_type=code&scope=openid%20email%20profile&state=${state}&access_type=offline&prompt=select_account`;
    res.json({ url, simulated: false });
  } else {
    // Development simulation fallback when credentials are not yet configured
    res.json({
      url: `${env.CORS_ORIGIN.split(",")[0]}/api/auth/google/callback?simulated=true`,
      simulated: true,
    });
  }
});

// GET /api/auth/google - Direct browser initiation redirect
router.get("/google", (req: Request, res: Response) => {
  if (env.GOOGLE_CLIENT_ID) {
    const state = crypto.randomBytes(24).toString("hex");
    res.cookie("nexum_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60 * 1000,
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      env.GOOGLE_CLIENT_ID
    )}&redirect_uri=${encodeURIComponent(
      env.GOOGLE_CALLBACK_URL
    )}&response_type=code&scope=openid%20email%20profile&state=${state}&access_type=offline&prompt=select_account`;
    res.redirect(url);
  } else {
    // Development fallback
    res.redirect(
      `${env.CORS_ORIGIN.split(",")[0]}/api/auth/google/callback?simulated=true`
    );
  }
});

// GET /api/auth/google/callback - Handle direct browser redirect from Google OAuth consent screen
router.get(
  "/google/callback",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const frontendOrigin = env.CORS_ORIGIN.split(",")[0] || "http://localhost:3000";

    const { code, state, error } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    if (error) {
      res.redirect(`${frontendOrigin}/login?error=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!code) {
      res.redirect(`${frontendOrigin}/login?error=missing_authorization_code`);
      return;
    }

    // CSRF validation
    const expectedState = req.cookies?.nexum_oauth_state;
    if (expectedState && state && expectedState !== state) {
      res.redirect(`${frontendOrigin}/login?error=oauth_state_mismatch`);
      return;
    }
    res.clearCookie("nexum_oauth_state", { path: "/" });

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      res.redirect(`${frontendOrigin}/login?error=google_oauth_not_configured`);
      return;
    }

    try {
      const requestRedirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
      const configuredUri = env.GOOGLE_CALLBACK_URL || requestRedirectUri;

      let tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: String(code),
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: configuredUri,
          grant_type: "authorization_code",
        }).toString(),
      });

      // If mismatch occurred on redirect_uri, fallback to actual incoming URI
      if (!tokenRes.ok && configuredUri !== requestRedirectUri) {
        tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code: String(code),
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: requestRedirectUri,
            grant_type: "authorization_code",
          }).toString(),
        });
      }

      if (!tokenRes.ok) {
        const errText = await tokenRes.text().catch(() => "");
        console.error("Google token exchange failure:", errText);
        res.redirect(`${frontendOrigin}/login?error=google_token_exchange_failed`);
        return;
      }

      const tokens = (await tokenRes.json()) as { access_token: string; id_token?: string };

      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userInfoRes.ok) {
        res.redirect(`${frontendOrigin}/login?error=google_profile_fetch_failed`);
        return;
      }

      const profile = (await userInfoRes.json()) as {
        sub: string;
        email: string;
        name?: string;
        picture?: string;
        email_verified?: boolean;
      };

      if (!profile.email) {
        res.redirect(`${frontendOrigin}/login?error=no_email_provided`);
        return;
      }

      const normalizedEmail = profile.email.trim().toLowerCase();

      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId: profile.sub },
            { email: { equals: normalizedEmail, mode: "insensitive" } },
          ],
        },
        include: { freelancerProfile: true },
      });

      if (user) {
        if (!user.googleId || !user.avatarUrl) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: user.googleId || profile.sub,
              avatarUrl: user.avatarUrl || profile.picture || null,
            },
            include: { freelancerProfile: true },
          });
        }
      } else {
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: profile.name?.trim() || normalizedEmail.split("@")[0],
            googleId: profile.sub,
            avatarUrl: profile.picture || null,
            role: null,
            status: "ACTIVE",
          },
          include: { freelancerProfile: true },
        });
      }

      try {
        await appendAuditEvent({
          actorId: user.id,
          action: "USER_AUTHENTICATED_GOOGLE",
          objectType: "USER",
          objectId: user.id,
          metadata: { googleId: profile.sub, role: user.role },
        });
      } catch (auditErr) {
        console.warn("Audit log warning (non-fatal):", auditErr);
      }

      const { rawToken, expiresAt } = await createSession(user.id, req);
      setSessionCookie(res, rawToken, expiresAt);

      if (!user.role) {
        res.redirect(`${frontendOrigin}/choose-role`);
      } else if (user.role === "FREELANCER") {
        res.redirect(`${frontendOrigin}/freelancer/dashboard`);
      } else {
        res.redirect(`${frontendOrigin}/client/dashboard`);
      }
    } catch (err: any) {
      console.error("Google OAuth callback error:", err);
      const isDbError = err?.name === "PrismaClientInitializationError" || err?.message?.includes("database") || err?.code === "P1001";
      const errParam = isDbError ? "database_offline" : "auth_processing_error";
      res.redirect(`${frontendOrigin}/login?error=${errParam}`);
    }
  }
);

// POST /api/auth/google/callback - Process Google authorization code or simulated login
router.post(
  "/google/callback",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = googleCallbackSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid Google callback parameters");
      }

      const { code, state, simulated } = parsed.data;

      // Handle simulated OAuth in development
      if (simulated) {
        if (env.NODE_ENV === "production") {
          throw new ValidationError("Simulation is not permitted in production");
        }

        const simulatedEmail = "alex.google@nexum.demo";
        let user = await prisma.user.findFirst({
          where: { email: simulatedEmail },
          include: { freelancerProfile: true },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: simulatedEmail,
              name: "Alex Rivera (Google)",
              googleId: "google_oauth_sub_demo_001",
              avatarUrl:
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces",
              role: null, // role is intentionally null so user is redirected to role selection!
              status: "ACTIVE",
            },
            include: { freelancerProfile: true },
          });
        }

        await appendAuditEvent({
          actorId: user.id,
          action: "USER_AUTHENTICATED_GOOGLE",
          objectType: "USER",
          objectId: user.id,
          metadata: { simulated: true, role: user.role },
        });

        const { rawToken, expiresAt } = await createSession(user.id, req);
        setSessionCookie(res, rawToken, expiresAt);

        res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarUrl: user.avatarUrl,
          },
          requiresRole: !user.role,
        });
        return;
      }

      // Live Google OAuth 2.0 flow
      if (!code) {
        throw new ValidationError("Authorization code is required");
      }

      // Validate CSRF state cookie if present
      const expectedState = req.cookies?.nexum_oauth_state;
      if (expectedState && state && expectedState !== state) {
        throw new ValidationError("OAuth state mismatch (potential CSRF attempt)");
      }
      res.clearCookie("nexum_oauth_state", { path: "/" });

      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
        throw new ValidationError("Google OAuth is not configured on the server");
      }

      // Exchange authorization code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: env.GOOGLE_CALLBACK_URL,
          grant_type: "authorization_code",
        }).toString(),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text().catch(() => "");
        throw new UnauthorizedError(`Google token exchange failed: ${tokenRes.statusText}`);
      }

      const tokens = (await tokenRes.json()) as { access_token: string; id_token?: string };

      // Fetch user profile from Google UserInfo endpoint
      const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userInfoRes.ok) {
        throw new UnauthorizedError("Failed to retrieve user profile from Google");
      }

      const profile = (await userInfoRes.json()) as {
        sub: string;
        email: string;
        name?: string;
        picture?: string;
        email_verified?: boolean;
      };

      if (!profile.email) {
        throw new ValidationError("Google account did not provide a valid email");
      }

      const normalizedEmail = profile.email.trim().toLowerCase();

      // Find user by Google ID or normalized email
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { googleId: profile.sub },
            { email: { equals: normalizedEmail, mode: "insensitive" } },
          ],
        },
        include: { freelancerProfile: true },
      });

      if (user) {
        // Link googleId or avatar if not yet attached
        if (!user.googleId || !user.avatarUrl) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: user.googleId || profile.sub,
              avatarUrl: user.avatarUrl || profile.picture || null,
            },
            include: { freelancerProfile: true },
          });
        }
      } else {
        // Create new user without a role (requires role selection)
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: profile.name?.trim() || normalizedEmail.split("@")[0],
            googleId: profile.sub,
            avatarUrl: profile.picture || null,
            role: null, // User must choose a role on the role-selection screen
            status: "ACTIVE",
          },
          include: { freelancerProfile: true },
        });
      }

      await appendAuditEvent({
        actorId: user.id,
        action: "USER_AUTHENTICATED_GOOGLE",
        objectType: "USER",
        objectId: user.id,
        metadata: { googleId: profile.sub, role: user.role },
      });

      const { rawToken, expiresAt } = await createSession(user.id, req);
      setSessionCookie(res, rawToken, expiresAt);

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        requiresRole: !user.role,
      });
    } catch (err) {
      next(err);
    }
  }
);


// ─────────────────────────────────────────────────────────────────────────────
// Microsoft OAuth 2.0
// ─────────────────────────────────────────────────────────────────────────────

const microsoftCallbackSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  simulated: z.boolean().optional(),
});

// GET /api/auth/microsoft/url - Return authorization URL for Microsoft OAuth
router.get("/microsoft/url", (req: Request, res: Response) => {
  if (env.MICROSOFT_CLIENT_ID) {
    const state = crypto.randomBytes(24).toString("hex");
    res.cookie("nexum_ms_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60 * 1000,
    });
    const params = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      response_type: "code",
      redirect_uri: env.MICROSOFT_CALLBACK_URL,
      response_mode: "query",
      scope: "openid email profile User.Read",
      state,
      prompt: "select_account",
    });
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
    res.json({ url, simulated: false });
  } else {
    // Development simulation fallback
    res.json({
      url: `${env.CORS_ORIGIN.split(",")[0]}/api/auth/microsoft/callback?simulated=true`,
      simulated: true,
    });
  }
});

// GET /api/auth/microsoft - Direct browser initiation redirect
router.get("/microsoft", (req: Request, res: Response) => {
  if (env.MICROSOFT_CLIENT_ID) {
    const state = crypto.randomBytes(24).toString("hex");
    res.cookie("nexum_ms_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60 * 1000,
    });
    const params = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      response_type: "code",
      redirect_uri: env.MICROSOFT_CALLBACK_URL,
      response_mode: "query",
      scope: "openid email profile User.Read",
      state,
      prompt: "select_account",
    });
    res.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`);
  } else {
    res.redirect(`${env.CORS_ORIGIN.split(",")[0]}/api/auth/microsoft/callback?simulated=true`);
  }
});

// GET /api/auth/microsoft/callback - Handle direct browser redirect from Microsoft
router.get(
  "/microsoft/callback",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const frontendOrigin = env.CORS_ORIGIN.split(",")[0] || "http://localhost:3000";
    const { code, state, error } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    if (error) {
      res.redirect(`${frontendOrigin}/login?error=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!code) {
      res.redirect(`${frontendOrigin}/login?error=missing_authorization_code`);
      return;
    }

    // CSRF validation
    const expectedState = req.cookies?.nexum_ms_oauth_state;
    if (expectedState && state && expectedState !== state) {
      res.redirect(`${frontendOrigin}/login?error=oauth_state_mismatch`);
      return;
    }
    res.clearCookie("nexum_ms_oauth_state", { path: "/" });

    if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
      res.redirect(`${frontendOrigin}/login?error=microsoft_oauth_not_configured`);
      return;
    }

    try {
      // Exchange authorization code for tokens
      const tokenRes = await fetch(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: env.MICROSOFT_CLIENT_ID,
            client_secret: env.MICROSOFT_CLIENT_SECRET,
            code: String(code),
            redirect_uri: env.MICROSOFT_CALLBACK_URL,
            grant_type: "authorization_code",
          }).toString(),
        }
      );

      if (!tokenRes.ok) {
        const errText = await tokenRes.text().catch(() => "");
        console.error("Microsoft token exchange failure:", errText);
        res.redirect(`${frontendOrigin}/login?error=microsoft_token_exchange_failed`);
        return;
      }

      const tokens = (await tokenRes.json()) as { access_token: string };

      // Fetch user profile from Microsoft Graph
      const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!profileRes.ok) {
        res.redirect(`${frontendOrigin}/login?error=microsoft_profile_fetch_failed`);
        return;
      }

      const profile = (await profileRes.json()) as {
        id: string;
        displayName?: string;
        mail?: string;
        userPrincipalName?: string;
      };

      const email = profile.mail || profile.userPrincipalName || "";
      if (!email) {
        res.redirect(`${frontendOrigin}/login?error=no_email_provided`);
        return;
      }
      const normalizedEmail = email.trim().toLowerCase();

      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { microsoftId: profile.id },
            { email: { equals: normalizedEmail, mode: "insensitive" } },
          ],
        },
        include: { freelancerProfile: true },
      });

      if (user) {
        if (!user.microsoftId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { microsoftId: profile.id },
            include: { freelancerProfile: true },
          });
        }
      } else {
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: profile.displayName?.trim() || normalizedEmail.split("@")[0],
            microsoftId: profile.id,
            role: null,
            status: "ACTIVE",
          },
          include: { freelancerProfile: true },
        });
      }

      try {
        await appendAuditEvent({
          actorId: user.id,
          action: "USER_AUTHENTICATED_MICROSOFT",
          objectType: "USER",
          objectId: user.id,
          metadata: { microsoftId: profile.id, role: user.role },
        });
      } catch (auditErr) {
        console.warn("Audit log warning (non-fatal):", auditErr);
      }

      const { rawToken, expiresAt } = await createSession(user.id, req);
      setSessionCookie(res, rawToken, expiresAt);

      if (!user.role) {
        res.redirect(`${frontendOrigin}/choose-role`);
      } else if (user.role === "FREELANCER") {
        res.redirect(`${frontendOrigin}/freelancer/dashboard`);
      } else {
        res.redirect(`${frontendOrigin}/client/dashboard`);
      }
    } catch (err: any) {
      console.error("Microsoft OAuth callback error:", err);
      const isDbError =
        err?.name === "PrismaClientInitializationError" ||
        err?.message?.includes("database") ||
        err?.code === "P1001";
      const errParam = isDbError ? "database_offline" : "auth_processing_error";
      res.redirect(`${frontendOrigin}/login?error=${errParam}`);
    }
  }
);

// POST /api/auth/microsoft/callback - Process Microsoft authorization code or simulated login
router.post(
  "/microsoft/callback",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = microsoftCallbackSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid Microsoft callback parameters");
      }

      const { code, state, simulated } = parsed.data;

      // Handle simulated OAuth in development
      if (simulated) {
        if (env.NODE_ENV === "production") {
          throw new ValidationError("Simulation is not permitted in production");
        }

        const simulatedEmail = "alex.microsoft@nexum.demo";
        let user = await prisma.user.findFirst({
          where: { email: simulatedEmail },
          include: { freelancerProfile: true },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: simulatedEmail,
              name: "Alex Rivera (Microsoft)",
              microsoftId: "microsoft_oauth_oid_demo_001",
              role: null,
              status: "ACTIVE",
            },
            include: { freelancerProfile: true },
          });
        }

        await appendAuditEvent({
          actorId: user.id,
          action: "USER_AUTHENTICATED_MICROSOFT",
          objectType: "USER",
          objectId: user.id,
          metadata: { simulated: true, role: user.role },
        });

        const { rawToken, expiresAt } = await createSession(user.id, req);
        setSessionCookie(res, rawToken, expiresAt);

        res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarUrl: user.avatarUrl,
          },
          requiresRole: !user.role,
        });
        return;
      }

      // Live Microsoft OAuth 2.0 flow
      if (!code) {
        throw new ValidationError("Authorization code is required");
      }

      // CSRF validation
      const expectedState = req.cookies?.nexum_ms_oauth_state;
      if (expectedState && state && expectedState !== state) {
        throw new ValidationError("OAuth state mismatch (potential CSRF attempt)");
      }
      res.clearCookie("nexum_ms_oauth_state", { path: "/" });

      if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
        throw new ValidationError("Microsoft OAuth is not configured on the server");
      }

      const tokenRes = await fetch(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: env.MICROSOFT_CLIENT_ID,
            client_secret: env.MICROSOFT_CLIENT_SECRET,
            code,
            redirect_uri: env.MICROSOFT_CALLBACK_URL,
            grant_type: "authorization_code",
          }).toString(),
        }
      );

      if (!tokenRes.ok) {
        const errText = await tokenRes.text().catch(() => "");
        throw new UnauthorizedError(`Microsoft token exchange failed: ${tokenRes.statusText}`);
      }

      const tokens = (await tokenRes.json()) as { access_token: string };

      const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!profileRes.ok) {
        throw new UnauthorizedError("Failed to retrieve user profile from Microsoft");
      }

      const profile = (await profileRes.json()) as {
        id: string;
        displayName?: string;
        mail?: string;
        userPrincipalName?: string;
      };

      const email = profile.mail || profile.userPrincipalName || "";
      if (!email) {
        throw new ValidationError("Microsoft account did not provide a valid email");
      }

      const normalizedEmail = email.trim().toLowerCase();

      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { microsoftId: profile.id },
            { email: { equals: normalizedEmail, mode: "insensitive" } },
          ],
        },
        include: { freelancerProfile: true },
      });

      if (user) {
        if (!user.microsoftId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { microsoftId: profile.id },
            include: { freelancerProfile: true },
          });
        }
      } else {
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: profile.displayName?.trim() || normalizedEmail.split("@")[0],
            microsoftId: profile.id,
            role: null,
            status: "ACTIVE",
          },
          include: { freelancerProfile: true },
        });
      }

      await appendAuditEvent({
        actorId: user.id,
        action: "USER_AUTHENTICATED_MICROSOFT",
        objectType: "USER",
        objectId: user.id,
        metadata: { microsoftId: profile.id, role: user.role },
      });

      const { rawToken, expiresAt } = await createSession(user.id, req);
      setSessionCookie(res, rawToken, expiresAt);

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        requiresRole: !user.role,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GitHub OAuth 2.0
// ─────────────────────────────────────────────────────────────────────────────

const githubCallbackSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  simulated: z.boolean().optional(),
});

// GET /api/auth/github/url - Return authorization URL for GitHub OAuth
router.get("/github/url", (req: Request, res: Response) => {
  if (env.GITHUB_CLIENT_ID) {
    const state = crypto.randomBytes(24).toString("hex");
    res.cookie("nexum_gh_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60 * 1000,
    });
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      scope: "read:user user:email",
      state,
    });
    const url = `https://github.com/login/oauth/authorize?${params.toString()}`;
    res.json({ url, simulated: false });
  } else {
    res.json({
      url: `${env.CORS_ORIGIN.split(",")[0]}/api/auth/github/callback?simulated=true`,
      simulated: true,
    });
  }
});

// GET /api/auth/github - Direct browser initiation redirect
router.get("/github", (req: Request, res: Response) => {
  if (env.GITHUB_CLIENT_ID) {
    const state = crypto.randomBytes(24).toString("hex");
    res.cookie("nexum_gh_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60 * 1000,
    });
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL,
      scope: "read:user user:email",
      state,
    });
    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  } else {
    res.redirect(`${env.CORS_ORIGIN.split(",")[0]}/api/auth/github/callback?simulated=true`);
  }
});

// GET /api/auth/github/callback - Direct browser redirect handling from GitHub
router.get(
  "/github/callback",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const frontendOrigin = env.CORS_ORIGIN.split(",")[0] || "http://localhost:3000";
    const { code, state, error } = req.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    if (error) {
      res.redirect(`${frontendOrigin}/login?error=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!code) {
      res.redirect(`${frontendOrigin}/login?error=missing_authorization_code`);
      return;
    }

    const expectedState = req.cookies?.nexum_gh_oauth_state;
    if (expectedState && state && expectedState !== state) {
      res.redirect(`${frontendOrigin}/login?error=oauth_state_mismatch`);
      return;
    }
    res.clearCookie("nexum_gh_oauth_state", { path: "/" });

    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
      res.redirect(`${frontendOrigin}/login?error=github_oauth_not_configured`);
      return;
    }

    try {
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "Nexum-App",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code: String(code),
          redirect_uri: env.GITHUB_CALLBACK_URL,
        }),
      });

      if (!tokenRes.ok) {
        res.redirect(`${frontendOrigin}/login?error=github_token_exchange_failed`);
        return;
      }

      const tokens = (await tokenRes.json()) as { access_token?: string; error?: string };
      if (!tokens.access_token) {
        res.redirect(`${frontendOrigin}/login?error=${encodeURIComponent(tokens.error || "github_token_exchange_failed")}`);
        return;
      }

      const profileRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "User-Agent": "Nexum-App",
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!profileRes.ok) {
        res.redirect(`${frontendOrigin}/login?error=github_profile_fetch_failed`);
        return;
      }

      const profile = (await profileRes.json()) as {
        id: number;
        login: string;
        name?: string;
        avatar_url?: string;
        email?: string;
      };

      let email = profile.email || "";
      if (!email) {
        const emailRes = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            "User-Agent": "Nexum-App",
            Accept: "application/vnd.github.v3+json",
          },
        });
        if (emailRes.ok) {
          const emails = (await emailRes.json()) as Array<{
            email: string;
            primary: boolean;
            verified: boolean;
          }>;
          const primaryEmail = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) || emails[0];
          if (primaryEmail) {
            email = primaryEmail.email;
          }
        }
      }

      if (!email) {
        email = `${profile.login}@users.noreply.github.com`;
      }

      const normalizedEmail = email.trim().toLowerCase();

      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { githubId: String(profile.id) },
            { email: { equals: normalizedEmail, mode: "insensitive" } },
          ],
        },
        include: { freelancerProfile: true },
      });

      if (user) {
        if (!user.githubId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              githubId: String(profile.id),
              avatarUrl: user.avatarUrl || profile.avatar_url,
            },
            include: { freelancerProfile: true },
          });
        }
      } else {
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: profile.name?.trim() || profile.login || normalizedEmail.split("@")[0],
            githubId: String(profile.id),
            avatarUrl: profile.avatar_url || null,
            role: null,
            status: "ACTIVE",
          },
          include: { freelancerProfile: true },
        });
      }

      await appendAuditEvent({
        actorId: user.id,
        action: "USER_AUTHENTICATED_GITHUB",
        objectType: "USER",
        objectId: user.id,
        metadata: { githubId: String(profile.id), role: user.role },
      });

      const { rawToken, expiresAt } = await createSession(user.id, req);
      setSessionCookie(res, rawToken, expiresAt);

      if (!user.role) {
        res.redirect(`${frontendOrigin}/choose-role`);
      } else if (user.role === "FREELANCER") {
        res.redirect(`${frontendOrigin}/freelancer/dashboard`);
      } else {
        res.redirect(`${frontendOrigin}/client/dashboard`);
      }
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/github/callback - Handle code from Next.js proxy route
router.post(
  "/github/callback",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = githubCallbackSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError("Invalid GitHub callback payload", parsed.error.format());
      }

      const { code, state, simulated } = parsed.data;

      if (simulated) {
        const simEmail = "github.demo@nexum.local";
        let user = await prisma.user.findFirst({
          where: { email: { equals: simEmail, mode: "insensitive" } },
          include: { freelancerProfile: true },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: simEmail,
              name: "GitHub Developer",
              githubId: "gh_simulated_999",
              avatarUrl: "https://avatars.githubusercontent.com/u/9919?v=4",
              role: null,
              status: "ACTIVE",
            },
            include: { freelancerProfile: true },
          });
        }

        await appendAuditEvent({
          actorId: user.id,
          action: "USER_AUTHENTICATED_GITHUB",
          objectType: "USER",
          objectId: user.id,
          metadata: { simulated: true, role: user.role },
        });

        const { rawToken, expiresAt } = await createSession(user.id, req);
        setSessionCookie(res, rawToken, expiresAt);

        res.json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarUrl: user.avatarUrl,
          },
          requiresRole: !user.role,
        });
        return;
      }

      if (!code) {
        throw new ValidationError("Authorization code is required");
      }

      const expectedState = req.cookies?.nexum_gh_oauth_state;
      if (expectedState && state && expectedState !== state) {
        throw new ValidationError("OAuth state mismatch (potential CSRF attempt)");
      }
      res.clearCookie("nexum_gh_oauth_state", { path: "/" });

      if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
        throw new ValidationError("GitHub OAuth is not configured on the server");
      }

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "Nexum-App",
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
          redirect_uri: env.GITHUB_CALLBACK_URL,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text().catch(() => "");
        throw new UnauthorizedError(`GitHub token exchange failed: ${tokenRes.statusText}`);
      }

      const tokens = (await tokenRes.json()) as { access_token?: string; error?: string };
      if (!tokens.access_token) {
        throw new UnauthorizedError(`GitHub token error: ${tokens.error || "no access_token returned"}`);
      }

      const profileRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          "User-Agent": "Nexum-App",
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!profileRes.ok) {
        throw new UnauthorizedError("Failed to retrieve user profile from GitHub");
      }

      const profile = (await profileRes.json()) as {
        id: number;
        login: string;
        name?: string;
        avatar_url?: string;
        email?: string;
      };

      let email = profile.email || "";
      if (!email) {
        const emailRes = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            "User-Agent": "Nexum-App",
            Accept: "application/vnd.github.v3+json",
          },
        });
        if (emailRes.ok) {
          const emails = (await emailRes.json()) as Array<{
            email: string;
            primary: boolean;
            verified: boolean;
          }>;
          const primaryEmail = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) || emails[0];
          if (primaryEmail) {
            email = primaryEmail.email;
          }
        }
      }

      if (!email) {
        email = `${profile.login}@users.noreply.github.com`;
      }

      const normalizedEmail = email.trim().toLowerCase();

      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { githubId: String(profile.id) },
            { email: { equals: normalizedEmail, mode: "insensitive" } },
          ],
        },
        include: { freelancerProfile: true },
      });

      if (user) {
        if (!user.githubId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              githubId: String(profile.id),
              avatarUrl: user.avatarUrl || profile.avatar_url,
            },
            include: { freelancerProfile: true },
          });
        }
      } else {
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            name: profile.name?.trim() || profile.login || normalizedEmail.split("@")[0],
            githubId: String(profile.id),
            avatarUrl: profile.avatar_url || null,
            role: null,
            status: "ACTIVE",
          },
          include: { freelancerProfile: true },
        });
      }

      await appendAuditEvent({
        actorId: user.id,
        action: "USER_AUTHENTICATED_GITHUB",
        objectType: "USER",
        objectId: user.id,
        metadata: { githubId: String(profile.id), role: user.role },
      });

      const { rawToken, expiresAt } = await createSession(user.id, req);
      setSessionCookie(res, rawToken, expiresAt);

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatarUrl: user.avatarUrl,
        },
        requiresRole: !user.role,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

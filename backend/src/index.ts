import express from "express";
import path from "path";
import cors from "cors";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { env } from "./lib/env.js";
import { defaultStorage } from "./lib/files.js";

import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import projectsRouter from "./routes/projects.js";
import paymentsRouter from "./routes/payments.js";
import freelancerOnboardingRouter from "./routes/freelancer/onboarding.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { csrfProtection } from "./middleware/csrf.js";
import { backgroundWorker } from "./jobs/worker.js";
import "./jobs/resumeExtractor.js";
import freelancerProfileRouter from "./routes/freelancer/profile.js";
import {
  freelancerFilesRouter,
  publicFilesRouter,
  publicFreelancersRouter,
} from "./routes/freelancer/files.js";
import freelancerProjectsRouter from "./routes/freelancer/projects.js";
import freelancerProposalsRouter from "./routes/freelancer/proposals.js";
import freelancerAgreementsRouter from "./routes/freelancer/agreements.js";
import freelancerMilestonesRouter from "./routes/freelancer/milestones.js";
import freelancerChangeRequestsRouter from "./routes/freelancer/changeRequests.js";
import devProposalsRouter from "./routes/dev/proposals.js";
import devAgreementsRouter from "./routes/dev/agreements.js";
import devMilestonesRouter from "./routes/dev/milestones.js";
import freelancerConversationsRouter from "./routes/freelancer/conversations.js";
import freelancerTasksRouter from "./routes/freelancer/tasks.js";
import freelancerMeetingsRouter from "./routes/freelancer/meetings.js";
import freelancerProjectFilesRouter from "./routes/freelancer/projectFiles.js";
import freelancerDecisionsRouter from "./routes/freelancer/decisions.js";
import freelancerPrivateAiRouter from "./routes/freelancer/privateAi.js";
import devWorkspaceRouter from "./routes/dev/workspace.js";
import clientRouter from "./routes/client.js";
import agreementsRouter from "./routes/agreements.js";
import freelancerEarningsRouter from "./routes/freelancer/earnings.js";
import freelancerPayoutsRouter from "./routes/freelancer/payouts.js";
import paypalWebhooksRouter from "./routes/webhooks/paypal.js";
import devPaymentsRouter from "./routes/dev/payments.js";
import freelancerDashboardRouter from "./routes/freelancer/dashboard.js";
import notificationsRouter from "./routes/notifications.js";
import freelancerSettingsRouter from "./routes/freelancer/settings.js";
import freelancerAssistantRouter from "./routes/freelancer/assistant.js";
import workspaceRouter from "./routes/workspace.js";
import telegramRouter from "./routes/telegram.js";
import { telegramService } from "./services/telegramService.js";
import clientPaymentsRouter from "./routes/clientPayments.js";
import milestonesVerifierRouter from "./routes/milestonesVerifier.js";
import handoverRouter from "./routes/handover.js";

// Load environment variables
dotenv.config();

const app = express();
const port = env.PORT || 4000;
const allowedOrigins = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : ["http://localhost:3000", "http://127.0.0.1:3000"];

// Request ID and Basic Audit Logging Middleware
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requestId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  res.setHeader("X-Request-Id", requestId);
  (req as express.Request & { id?: string }).id = requestId;
  next();
});

// Middlewares
app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, curl, Next.js server-side fetch)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(
  express.json({
    verify: (req: express.Request & { rawBody?: Buffer }, _res: express.Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  })
);
app.use(cookieParser());
app.use(csrfProtection);

// Routes
app.use("/health", healthRouter);
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/payments", paymentsRouter);

// Phase 8: Dashboard Summary, Notifications, Settings & Scoped Nexum AI Assistant
app.use("/api/freelancer/dashboard", freelancerDashboardRouter);
app.use("/api/freelancer/settings", freelancerSettingsRouter);
app.use("/api/freelancer/assistant", freelancerAssistantRouter);
app.use("/api/notifications", notificationsRouter);

// Freelancer Onboarding & Resume Routes
app.use("/api/freelancer", freelancerOnboardingRouter);
app.use("/api/freelancer/onboarding", freelancerOnboardingRouter);

// Freelancer Proposals Routes
app.use("/api/freelancer/proposals", freelancerProposalsRouter);

// Freelancer Agreements, Milestones & Change Requests Routes
app.use("/api/freelancer/agreements", freelancerAgreementsRouter);
app.use("/api/freelancer/milestones", freelancerMilestonesRouter);
app.use("/api/freelancer/change-requests", freelancerChangeRequestsRouter);

// Phase 6: Workspace, Mediated Chat, Tasks, Meetings, Decisions & Private AI
app.use("/api/freelancer/conversations", freelancerConversationsRouter);
app.use("/api/freelancer/tasks", freelancerTasksRouter);
app.use("/api/freelancer/meetings", freelancerMeetingsRouter);
app.use("/api/freelancer/project-files", freelancerProjectFilesRouter);
app.use("/api/freelancer/decisions", freelancerDecisionsRouter);
app.use("/api/freelancer/ai", freelancerPrivateAiRouter);
app.use("/api/freelancer", freelancerConversationsRouter);

// Freelancer Profile, Portfolio & Files Routes
app.use("/api/freelancer/profile", freelancerProfileRouter);
app.use("/api/freelancer/projects", freelancerProjectsRouter);
app.use("/api/freelancer", freelancerProjectsRouter);
app.use("/api/freelancer", freelancerFilesRouter);
app.use("/api/files", publicFilesRouter);
app.use("/api/public/freelancers", publicFreelancersRouter);

// Object Storage & Static Uploads Streaming
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
app.use("/uploads", express.static(path.resolve(process.cwd(), "frontend", "public", "uploads")));
app.get("/api/storage/*", async (req, res, next) => {
  try {
    const rawKey = (req.params as any)[0] || (req.params as any)["*"] || req.path.replace(/^\/api\/storage\//, "");
    const cleanKey = decodeURIComponent(rawKey).replace(/^[/\\]+/, "");
    const stream = await defaultStorage.getStream(cleanKey);
    const isDownload = req.query.download === "true" || req.query.download === "1";
    const filename = path.basename(cleanKey);
    res.setHeader("Content-Disposition", `${isDownload ? "attachment" : "inline"}; filename="${encodeURIComponent(filename)}"`);
    res.setHeader("Cache-Control", "public, max-age=86400");
    (stream as any).pipe(res);
  } catch (err) {
    next(err);
  }
});

// Dev-Only Client Stand-in Routes (guards internally for ENABLE_DEV_TOOLS)
app.use("/api/dev/proposals", devProposalsRouter);
app.use("/api/dev/agreements", devAgreementsRouter);
app.use("/api/dev/milestones", devMilestonesRouter);
app.use("/api/dev", devMilestonesRouter);
app.use("/api/dev", devWorkspaceRouter);

// Freelancer Earnings & Payouts Routes
app.use("/api/freelancer/earnings", freelancerEarningsRouter);
app.use("/api/freelancer", freelancerEarningsRouter);
app.use("/api/freelancer", freelancerPayoutsRouter);

// PayPal Webhook Route
app.use("/api/webhooks/paypal", paypalWebhooksRouter);

// Dev-Only Payments Stand-in Routes
app.use("/api/dev/payments", devPaymentsRouter);

// Client Overview & Payments Routes
app.use("/api/client/payments", clientPaymentsRouter);
app.use("/api/client", clientRouter);
app.use("/api/agreements", agreementsRouter);
app.use("/api/milestones", milestonesVerifierRouter);
app.use("/api/workspace", workspaceRouter);
app.use("/api/telegram", telegramRouter);
app.use("/api/projects", handoverRouter);

// Reset TerraShield alias for testing in production
app.post("/api/dev/reset-terrashield", (_req, res) => res.redirect(307, "/api/client/reset-terrashield"));
app.all("/api/client/projects/reset-terrashield", (_req, res) => res.redirect(307, "/api/client/reset-terrashield"));

// Root fallback
app.get("/", (_req: express.Request, res: express.Response) => {
  res.json({
    service: "nexum-backend",
    version: "0.1.0",
    docs: "/health",
    tagline: "AI drafts, humans approve, PayPal proves.",
  });
});

// 404 handler for unregistered routes
app.use(notFoundHandler);

// Global Standardized Error Handler: { error: { code, message, details } }
app.use(errorHandler);

if (env.NODE_ENV !== "test") {
  const server = app.listen(Number(port), "0.0.0.0", () => {
    console.log(`🚀 Nexum Express Backend running on port ${port}`);
    console.log(`📡 Health endpoint: http://localhost:${port}/health`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`⚠️  Port ${port} in use; skipping standalone listen.`);
    } else {
      console.error("Server listen error:", err);
    }
  });

  // Start persistent PostgreSQL-backed background job worker unless explicitly disabled (e.g. in test suites)
  if (process.env.DISABLE_BACKGROUND_WORKER !== "true") {
    backgroundWorker.start(2000);
    console.log("⚙️  PostgreSQL background worker started (polling interval: 2000ms)");
  }

  // Start automated Telegram Mobile Gateway polling
  if (process.env.TELEGRAM_BOT_TOKEN) {
    telegramService.startPolling();
  }
}

export { app };
export default app;

import dotenv from "dotenv";
import path from "path";
import fs from "fs";

if (!process.env.DATABASE_URL) {
  const backendEnv = path.resolve(process.cwd(), "backend/.env");
  if (fs.existsSync(backendEnv)) {
    dotenv.config({ path: backendEnv });
  } else {
    dotenv.config();
  }
}

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { computeCanonicalHash, computeTimelineSeal, canonicalStringify } from "../src/lib/canonicalHash.js";
import { workspaceService } from "../src/services/workspaceService.js";
import { prisma } from "../src/prisma.js";

describe("Workspace Backend Service & End-to-End Cryptographic Execution Engine", () => {
  const testProjectId = "proj_test_workspace_001";
  const testClientId = "usr_client_alex";
  const testFreelancerId = "usr_freelancer_rohan";

  beforeAll(async () => {
    // 1. Ensure test users exist in DB
    await prisma.user.upsert({
      where: { id: testClientId },
      update: { name: "Alex Rivera", role: "CLIENT" },
      create: {
        id: testClientId,
        email: "alex.rivera.test@nexum.demo",
        name: "Alex Rivera",
        role: "CLIENT",
      },
    });

    await prisma.user.upsert({
      where: { id: testFreelancerId },
      update: { name: "Rohan Verma", role: "FREELANCER" },
      create: {
        id: testFreelancerId,
        email: "rohan.verma.test@nexum.demo",
        name: "Rohan Verma",
        role: "FREELANCER",
      },
    });

    // 2. Ensure test project exists
    await prisma.project.upsert({
      where: { id: testProjectId },
      update: { title: "TechKart Bilateral Payment Rails", state: "ACTIVE" },
      create: {
        id: testProjectId,
        clientId: testClientId,
        title: "TechKart Bilateral Payment Rails",
        description: "PayPal Orders v2 integration test workspace",
        budgetCents: 450000,
        state: "ACTIVE",
      },
    });

    // 3. Clean any residual workspace records for clean test run
    await prisma.workspaceMessage.deleteMany({
      where: { conversation: { projectId: testProjectId } },
    });
    await prisma.workspaceDecision.deleteMany({
      where: { conversation: { projectId: testProjectId } },
    });
    await prisma.workspaceMeeting.deleteMany({
      where: { conversation: { projectId: testProjectId } },
    });
    await prisma.workspaceTask.deleteMany({
      where: { conversation: { projectId: testProjectId } },
    });
    await prisma.workspaceConversation.deleteMany({
      where: { projectId: testProjectId },
    });
  });

  afterAll(async () => {
    try {
      await prisma.workspaceMessage.deleteMany({
        where: { conversation: { projectId: testProjectId } },
      });
      await prisma.workspaceDecision.deleteMany({
        where: { conversation: { projectId: testProjectId } },
      });
      await prisma.workspaceMeeting.deleteMany({
        where: { conversation: { projectId: testProjectId } },
      });
      await prisma.workspaceTask.deleteMany({
        where: { conversation: { projectId: testProjectId } },
      });
      await prisma.workspaceConversation.deleteMany({
        where: { projectId: testProjectId },
      });
      await prisma.project.deleteMany({
        where: { id: testProjectId },
      });
    } catch {
      // Ignore teardown errors
    }
  });

  describe("Canonical Hash & Cryptographic Seals", () => {
    it("should produce strictly identical SHA-256 hashes irrespective of key insertion order", () => {
      const objA = { z: 1, a: "hello", m: [3, 2, 1], nested: { y: true, b: false } };
      const objB = { a: "hello", nested: { b: false, y: true }, m: [3, 2, 1], z: 1 };

      const stringifiedA = canonicalStringify(objA);
      const stringifiedB = canonicalStringify(objB);
      expect(stringifiedA).toBe(stringifiedB);

      const hashA = computeCanonicalHash(objA);
      const hashB = computeCanonicalHash(objB);
      expect(hashA).toBe(hashB);
      expect(hashA).toHaveLength(64);
    });

    it("should compute deterministic blockchain-style timeline seals", () => {
      const parentHash = "canonical_v1.0_baseline_123456";
      const eventPayload = { senderId: "usr_alex", content: "Kickoff payment rails" };
      const seal = computeTimelineSeal(eventPayload, parentHash);
      expect(seal).toHaveLength(64);
      expect(seal).not.toBe(parentHash);
    });
  });

  describe("Workspace Conversation & Tier 1 Bot Triage", () => {
    it("should initialize or retrieve a conversation and seal initial agreement baseline", async () => {
      const conv = await workspaceService.getOrCreateWorkspaceConversation(testProjectId);
      expect(conv).toBeDefined();
      expect(conv.projectId).toBe(testProjectId);
      expect(conv.agreementHash).toContain("canonical_v1.0_");
      expect(conv.messages.length).toBeGreaterThanOrEqual(1);
      expect(conv.messages[0].type).toBe("system_alert");
    });

    it("should pass normal collaboration messages without triggering scope or tone flags", async () => {
      const res = await workspaceService.sendMessage({
        projectId: testProjectId,
        senderId: testFreelancerId,
        senderRole: "FREELANCER",
        content: "I have set up the sandbox webhook listener on port 4000.",
      });

      expect(res.message).toBeDefined();
      expect(res.botInsights.hasScopeTrigger).toBe(false);
      expect(res.botInsights.hasToneWarning).toBe(false);
      expect(res.botInsights.sha256Seal).toHaveLength(64);
    });

    it("should detect scope modification triggers and flag with zero tokens", async () => {
      const res = await workspaceService.sendMessage({
        projectId: testProjectId,
        senderId: testClientId,
        senderRole: "CLIENT",
        content: "Can we also add Google Pay integration? I can pay an extra $400 for this.",
      });

      expect(res.botInsights.hasScopeTrigger).toBe(true);
      const metadata = res.message.metadata as Record<string, unknown>;
      expect(metadata.hasScopeTrigger).toBe(true);
      expect(metadata.scopeAlert).toBeDefined();
    });

    it("should detect hostile or frustrated tone and flag for diplomatic smoothing", async () => {
      const res = await workspaceService.sendMessage({
        projectId: testProjectId,
        senderId: testClientId,
        senderRole: "CLIENT",
        content: "This delay is completely unacceptable and a waste of time. Fix this right now.",
      });

      expect(res.botInsights.hasToneWarning).toBe(true);
      const metadata = res.message.metadata as Record<string, unknown>;
      expect(metadata.hasToneWarning).toBe(true);
    });
  });

  describe("Scope Amendments & Fund Re-Allocation (Pathway 4A & 4B)", () => {
    it("should propose a scope amendment and require bilateral consensus", async () => {
      const card = await workspaceService.proposeScopeAmendment({
        projectId: testProjectId,
        proposerId: testClientId,
        amendmentType: "ADD_NEW_MILESTONE",
        newMilestoneTitle: "Milestone 5: Google Pay & Subscriptions",
        priceDeltaCents: 40000, // +$400.00
        timelineDaysDelta: 3,
        newAcceptanceCriteria: ["Google Pay sandbox button renders", "Webhook logs payment.capture.completed"],
        justification: "Adding Google Pay checkout per product requirement",
      });

      expect(card.type).toBe("draft_counteroffer_card");
      const metadata = card.metadata as Record<string, unknown>;
      expect(metadata.status).toBe("PENDING_ACCEPTANCE");
      expect(metadata.clientAccepted).toBe(true);
      expect(metadata.freelancerAccepted).toBe(false);

      // Freelancer accepts: seals new agreement hash and creates milestone
      const sealResult = await workspaceService.respondToScopeAmendment(
        testProjectId,
        card.id,
        testFreelancerId,
        "ACCEPT"
      );

      expect(sealResult.success).toBe(true);
      expect(sealResult.status).toBe("SEALED");
      expect(sealResult.newAgreementHash).toContain("canonical_v");

      // Verify ADR decision created
      const decisions = await prisma.workspaceDecision.findMany({
        where: { conversation: { projectId: testProjectId } },
      });
      expect(decisions.length).toBeGreaterThanOrEqual(1);
      expect(decisions[0].signedByClient).toBe(true);
      expect(decisions[0].signedByFreelancer).toBe(true);
    });
  });

  describe("Deliverable Submission & 72-Hour Inspection Buffer", () => {
    it("should submit deliverable, compute SHA-256 payload seal, and start 72-hour timer", async () => {
      const result = await workspaceService.submitDeliverable({
        projectId: testProjectId,
        milestoneId: "ms_m2_paypal",
        freelancerId: testFreelancerId,
        repoUrl: "https://github.com/nexum/paypal-rails/pull/42",
        previewUrl: "https://staging.nexum.app/preview/m2",
        notes: "Completed webhook HMAC signature verification test suite with 100% green runs.",
      });

      expect(result.deliverableHash).toHaveLength(64);
      expect(result.inspectionExpiresAt).toBeDefined();

      const expiresDate = new Date(result.inspectionExpiresAt);
      const now = new Date();
      const diffHours = (expiresDate.getTime() - now.getTime()) / (1000 * 3600);
      expect(diffHours).toBeGreaterThan(71);
      expect(diffHours).toBeLessThanOrEqual(72);
    });
  });

  describe("Bilateral Meeting Scheduler & Autonomous Multilingual AI Notetaker", () => {
    let meetingId: string;

    it("should propose meeting with 1-3 slots and stay in PROPOSED until confirmed", async () => {
      const slot1 = new Date(Date.now() + 86400000).toISOString();
      const slot2 = new Date(Date.now() + 172800000).toISOString();

      const meeting = await workspaceService.proposeMeeting({
        projectId: testProjectId,
        proposedByUserId: testClientId,
        title: "Sprint Review & Webhook Retries",
        agenda: "1. Review M2 PR #42\n2. Discuss PayPal webhook retries\n3. Next milestone plan",
        durationMinutes: 30,
        proposedSlots: [
          { id: "slot_1", startTime: slot1, endTime: new Date(new Date(slot1).getTime() + 1800000).toISOString() },
          { id: "slot_2", startTime: slot2, endTime: new Date(new Date(slot2).getTime() + 1800000).toISOString() },
        ],
      });

      expect(meeting).toBeDefined();
      expect(meeting.status).toBe("PROPOSED");
      expect(meeting.roomUrl).toContain("/workspace/meetings/room-");
      meetingId = meeting.id;
    });

    it("should confirm meeting upon mutual acceptance and generate Google Calendar sync link", async () => {
      const res = await workspaceService.respondToMeeting(
        meetingId,
        testFreelancerId,
        "CONFIRM",
        new Date(Date.now() + 86400000).toISOString()
      );

      expect(res.success).toBe(true);
      expect(res.status).toBe("CONFIRMED");
      expect(res.googleCalendarHtmlLink).toContain("calendar.google.com/calendar/render?action=TEMPLATE");
      expect(res.googleCalendarHtmlLink).toContain("Nexum%20Sync");
    });

    it("should process AI Notetaker post-meeting summary, auto-creating Kanban tasks and ADRs", async () => {
      const summaryResult = await workspaceService.saveMeetingNotetakerSummary({
        meetingId,
        executiveSummary: "Alex and Rohan agreed that PR #42 meets all requirements. Rohan will deploy to staging tomorrow morning.",
        actionItems: [
          {
            task: "Deploy PR #42 to staging sandbox",
            assigneeId: testFreelancerId,
            dueDate: new Date(Date.now() + 86400000).toISOString(),
          },
          {
            task: "Verify PayPal IPN fallback in sandbox environment",
            assigneeId: testClientId,
          },
        ],
        decisions: [
          {
            title: "Selected SHA-256 HMAC for PayPal Webhooks",
            description: "Use Node.js crypto createHmac instead of external library to minimize dependencies.",
          },
        ],
        verbalScopeAlert: {
          detected: true,
          verbalAgreementSnippet: "We will add recurring billing next month for $600",
          suggestedDeltaCents: 60000,
        },
      });

      expect(summaryResult.status).toBe("COMPLETED");

      // Verify tasks auto-created in Kanban (Subtab 4)
      const tasks = await prisma.workspaceTask.findMany({
        where: { conversation: { projectId: testProjectId } },
      });
      expect(tasks.length).toBeGreaterThanOrEqual(2);
      expect(tasks[0].origin).toBe("AI_MEETING_EXTRACTED");
      expect(tasks[0].title).toBe("Deploy PR #42 to staging sandbox");

      // Verify decisions auto-created in ADR (Subtab 6)
      const adrs = await prisma.workspaceDecision.findMany({
        where: { conversation: { projectId: testProjectId }, origin: "AI_MEETING_EXTRACTED" },
      });
      expect(adrs.length).toBeGreaterThanOrEqual(1);
      expect(adrs[0].title).toContain("Selected SHA-256 HMAC");

      // Verify messages in timeline include summary and verbal scope alert
      const timelineMessages = await prisma.workspaceMessage.findMany({
        where: { conversation: { projectId: testProjectId } },
      });
      const hasSummary = timelineMessages.some((m) => m.type === "meeting_summary_card");
      const hasVerbalAlert = timelineMessages.some((m) => (m.metadata as any)?.isVerbalScopeAddendum === true);
      expect(hasSummary).toBe(true);
      expect(hasVerbalAlert).toBe(true);
    });
  });

  describe("Tasks Kanban Board CRUD (Subtab 4)", () => {
    it("should create and transition task columns in real time", async () => {
      const task = await workspaceService.createTask({
        projectId: testProjectId,
        title: "Configure Cloudflare Tunnel for PayPal Webhooks",
        priority: "HIGH",
        status: "TODO",
        assignedToId: testFreelancerId,
      });

      expect(task.title).toBe("Configure Cloudflare Tunnel for PayPal Webhooks");
      expect(task.status).toBe("TODO");
      expect(task.priority).toBe("HIGH");

      const moved = await workspaceService.updateTaskStatus(task.id, "IN_PROGRESS");
      expect(moved.status).toBe("IN_PROGRESS");

      const completed = await workspaceService.updateTaskStatus(task.id, "DONE");
      expect(completed.status).toBe("DONE");
    });
  });
});

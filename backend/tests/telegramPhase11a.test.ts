import { describe, it, expect, beforeAll, afterAll } from "vitest";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "backend", ".env") });

import { geminiService } from "../src/services/geminiService.js";
import { telegramService } from "../src/services/telegramService.js";
import { workspaceService } from "../src/services/workspaceService.js";
import prisma from "../src/prisma.js";

describe("Phase 11A: Telegram Full Parity & Gemini Scope Add-on Intelligence Suite", () => {
  const TEST_PROJECT_ID = "prj_phase11a_test";
  const TEST_CLIENT_ID = "usr_client_alex";
  const TEST_FREELANCER_ID = "usr_freelancer_rohan";
  const TEST_CHAT_ID = 987654321;
  const TEST_FL_CHAT_ID = 123456789;

  beforeAll(async () => {
    // 1. Ensure test users exist with telegramChatId linked
    await prisma.user.upsert({
      where: { id: TEST_CLIENT_ID },
      update: {
        name: "Alex Rivera",
        role: "CLIENT",
        telegramChatId: String(TEST_CHAT_ID),
        telegramUsername: "alex_tg",
        telegramNotifications: true,
      },
      create: {
        id: TEST_CLIENT_ID,
        email: "alex.rivera@nexum.demo",
        name: "Alex Rivera",
        role: "CLIENT",
        telegramChatId: String(TEST_CHAT_ID),
        telegramUsername: "alex_tg",
        telegramNotifications: true,
      },
    });

    await prisma.user.upsert({
      where: { id: TEST_FREELANCER_ID },
      update: {
        name: "Rohan Verma",
        role: "FREELANCER",
        telegramChatId: String(TEST_FL_CHAT_ID),
        telegramUsername: "rohan_tg",
        telegramNotifications: true,
      },
      create: {
        id: TEST_FL_CHAT_ID.toString(),
        email: "rohan.verma@nexum.demo",
        name: "Rohan Verma",
        role: "FREELANCER",
        telegramChatId: String(TEST_FL_CHAT_ID),
        telegramUsername: "rohan_tg",
        telegramNotifications: true,
      },
    });

    // 2. Ensure test project exists
    await prisma.project.upsert({
      where: { id: TEST_PROJECT_ID },
      update: { state: "ACTIVE" },
      create: {
        id: TEST_PROJECT_ID,
        clientId: TEST_CLIENT_ID,
        title: "E-Commerce Payment Gateway Expansion",
        description: "Full checkout overhaul with PayPal Orders v2 and webhook reconciliation",
        goals: "Deliver production payment pipeline",
        state: "ACTIVE",
        budgetCents: 1000000,
      },
    });

    // Ensure agreement links project to freelancer
    await prisma.agreement.upsert({
      where: { projectId: TEST_PROJECT_ID },
      update: { freelancerId: TEST_FREELANCER_ID, status: "ACTIVE" },
      create: {
        projectId: TEST_PROJECT_ID,
        clientId: TEST_CLIENT_ID,
        freelancerId: TEST_FREELANCER_ID,
        status: "ACTIVE",
      },
    });

    // Ensure conversation exists
    await workspaceService.getOrCreateWorkspaceConversation(TEST_PROJECT_ID);

    // Set active test project for both test users
    telegramService.userActiveProjects.set(TEST_CLIENT_ID, TEST_PROJECT_ID);
    telegramService.userActiveProjects.set(TEST_FREELANCER_ID, TEST_PROJECT_ID);

    // Mock send Telegram message so it doesn't fail on network in test environment
    telegramService.sendMessage = async () => ({ ok: true });
    telegramService.answerCallbackQuery = async () => ({ ok: true });
  }, 40000);

  describe("1. Gemini Scope Add-on & Requirements Intelligence", () => {
    it("evaluates a scope add-on request and computes minor unit pricing delta and timeline", async () => {
      const evaluation = await geminiService.evaluateScopeAddon({
        projectTitle: "E-Commerce Payment Gateway Expansion",
        projectDescription: "Stripe and PayPal integration for multi-currency checkout",
        currentMilestones: [
          {
            title: "Milestone 1: Architecture & UI Mockups",
            amountCents: 200000,
            workStatus: "IN_PROGRESS",
            dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
          },
          {
            title: "Milestone 2: Backend Webhook Idempotency Engine",
            amountCents: 400000,
            workStatus: "NOT_STARTED",
            dueDate: new Date(Date.now() + 86400000 * 21).toISOString(),
          },
        ],
        addonDescription: "Add automated SMS notifications via Twilio whenever an order status updates to Shipped or Refunded",
        requestedByRole: "CLIENT",
      });

      expect(evaluation).toBeDefined();
      expect(["AMEND_EXISTING_MILESTONE", "ADD_NEW_MILESTONE"]).toContain(evaluation.recommendation);
      expect(typeof evaluation.suggestedPriceCents).toBe("number");
      expect(evaluation.suggestedPriceCents).toBeGreaterThan(0);
      expect(typeof evaluation.suggestedTimelineDays).toBe("number");
      expect(evaluation.suggestedTimelineDays).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(evaluation.acceptanceCriteria)).toBe(true);
      expect(evaluation.acceptanceCriteria.length).toBeGreaterThan(0);
      expect(evaluation.justification).toBeTruthy();
    });

    it("summarizes client specification document and extracts milestones", async () => {
      const specDoc = `
Project Overview:
We require a real-time dashboard for crypto portfolio tracking with WebSocket feeds.
Core Deliverables:
1. WebSocket engine for Binance and Coinbase tickers.
2. Alerting system via email and Telegram bot when prices fluctuate by > 5%.
3. PostgreSQL storage with TimescaleDB for candlestick charting.
      `;

      const summary = await geminiService.summarizeDocument(specDoc, "Crypto Portfolio Monitor PRD");
      expect(summary).toBeDefined();
      expect(summary.summary).toBeTruthy();
      expect(Array.isArray(summary.suggestedMilestones)).toBe(true);
      expect(summary.suggestedMilestones.length).toBeGreaterThanOrEqual(1);
      expect(summary.keyRisks).toBeDefined();
    });
  });

  describe("2. Telegram Webhook Command Parity (/tasks, /task add, /files, /decisions)", () => {
    it("executes /tasks command and returns Kanban status", async () => {
      const update = {
        message: {
          message_id: 1001,
          from: { id: TEST_CHAT_ID },
          chat: { id: TEST_CHAT_ID, type: "private" },
          text: "/tasks",
        },
      };

      const result = await telegramService.handleWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(["TASKS_SENT", "TASKS_EMPTY"]).toContain(result.action);
    });

    it("executes /task add <title> and creates task in PostgreSQL", async () => {
      const uniqueTitle = `Verify Telegram Webhook Dispatch ${Date.now()}`;
      const update = {
        message: {
          message_id: 1002,
          from: { id: TEST_CHAT_ID },
          chat: { id: TEST_CHAT_ID, type: "private" },
          text: `/task add ${uniqueTitle}`,
        },
      };

      const result = await telegramService.handleWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(result.action).toBe("TASK_CREATED");

      // Verify task in DB
      const taskInDb = await prisma.workspaceTask.findFirst({
        where: { projectId: TEST_PROJECT_ID, title: uniqueTitle },
      });
      expect(taskInDb).toBeDefined();
      expect(taskInDb?.title).toBe(uniqueTitle);
      expect(taskInDb?.status).toBe("TODO");
    }, 20000);

    it("executes /files command and lists repository files", async () => {
      const update = {
        message: {
          message_id: 1003,
          from: { id: TEST_CHAT_ID },
          chat: { id: TEST_CHAT_ID, type: "private" },
          text: "/files",
        },
      };

      const result = await telegramService.handleWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(["FILES_SENT", "FILES_EMPTY"]).toContain(result.action);
    }, 20000);

    it("executes /decisions command and returns immutable audit record", async () => {
      const update = {
        message: {
          message_id: 1004,
          from: { id: TEST_CHAT_ID },
          chat: { id: TEST_CHAT_ID, type: "private" },
          text: "/decisions",
        },
      };

      const result = await telegramService.handleWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(["DECISIONS_SENT", "DECISIONS_EMPTY"]).toContain(result.action);
    }, 20000);
  });

  describe("3. Telegram Postponement & Emergency Actions", () => {
    it("handles /postpone meeting <reason>", async () => {
      const update = {
        message: {
          message_id: 1005,
          from: { id: TEST_CHAT_ID },
          chat: { id: TEST_CHAT_ID, type: "private" },
          text: "/postpone meeting Sudden production deployment conflict",
        },
      };

      const result = await telegramService.handleWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(["MEETING_POSTPONE_REQUESTED", "MEETING_POSTPONE_NO_MEETING", "NO_MEETING_TO_POSTPONE"]).toContain(result.action);
    }, 20000);

    it("handles /postpone milestone <days> <reason>", async () => {
      const update = {
        message: {
          message_id: 1006,
          from: { id: TEST_CHAT_ID },
          chat: { id: TEST_CHAT_ID, type: "private" },
          text: "/postpone milestone 4 Need extra verification for 3D Secure 2.0 flow",
        },
      };

      const result = await telegramService.handleWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(["MILESTONE_POSTPONE_REQUESTED", "MILESTONE_POSTPONE_NO_MILESTONES", "NO_MS_TO_POSTPONE", "MS_POSTPONED_TELEGRAM"]).toContain(result.action);
    }, 20000);
  });

  describe("4. Telegram Gemini Add-on Ingestion & Scope Amendment Proposal", () => {
    it("processes /addon command, queries Gemini AI, and creates draft amendment card", async () => {
      const update = {
        message: {
          message_id: 1007,
          from: { id: TEST_CHAT_ID },
          chat: { id: TEST_CHAT_ID, type: "private" },
          text: "/addon Implement Apple Pay & Google Pay direct buttons on product drawer",
        },
      };

      const result = await telegramService.handleWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(result.action).toBe("ADDON_EVALUATED_GEMINI");

      // Verify draft amendment card dropped in workspace messages
      const lastMessage = await prisma.workspaceMessage.findFirst({
        where: { conversation: { projectId: TEST_PROJECT_ID }, type: "draft_counteroffer_card" },
        orderBy: { createdAt: "desc" },
      });

      expect(lastMessage).toBeDefined();
      expect(lastMessage?.type).toBe("draft_counteroffer_card");
      const metadata = lastMessage?.metadata as Record<string, any>;
      expect(metadata.status).toBe("PENDING_ACCEPTANCE");
      expect(metadata.amendmentPayload).toBeDefined();
    }, 25000);
  });

  describe("5. Role-Aware /help Documentation & Inline Callbacks", () => {
    it("renders client-tailored help options for Client role", async () => {
      const update = {
        message: {
          message_id: 1008,
          from: { id: TEST_CHAT_ID },
          chat: { id: TEST_CHAT_ID, type: "private" },
          text: "/help",
        },
      };

      const result = await telegramService.handleWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(result.action).toBe("HELP_SENT");
    });

    it("executes accept_amend inline callback query to cryptographically seal amendment", async () => {
      const lastMessage = await prisma.workspaceMessage.findFirst({
        where: { conversation: { projectId: TEST_PROJECT_ID }, type: "draft_counteroffer_card" },
        orderBy: { createdAt: "desc" },
      });

      if (lastMessage) {
        const update = {
          callback_query: {
            id: "cq_amend_123",
            from: { id: TEST_CHAT_ID },
            data: `accept_amend:${TEST_PROJECT_ID}:${lastMessage.id}`,
            message: {
              message_id: 2001,
              chat: { id: TEST_CHAT_ID },
            },
          },
        };

        const result = await telegramService.handleWebhookUpdate(update);
        expect(result.handled).toBe(true);
        expect(result.action).toBe("AMENDMENT_ACCEPTED");
      }
    });
    it("renders freelancer-tailored help options when user role is FREELANCER", async () => {
      const update = {
        message: {
          message_id: 1009,
          from: { id: TEST_FL_CHAT_ID },
          chat: { id: TEST_FL_CHAT_ID, type: "private" },
          text: "/help",
        },
      };

      const result = await telegramService.handleWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(result.action).toBe("HELP_SENT");
    });

    it("handles /earnings command for Freelancer and reports released vs locked escrow", async () => {
      const update = {
        message: {
          message_id: 1010,
          from: { id: TEST_FL_CHAT_ID },
          chat: { id: TEST_FL_CHAT_ID, type: "private" },
          text: "/earnings",
        },
      };

      const result = await telegramService.handleWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(result.action).toBe("EARNINGS_SENT");
    });

    it("handles /submit command from Freelancer to submit repository deliverables", async () => {
      // Create a test milestone in progress if none exists
      await prisma.milestone.upsert({
        where: { id: "ms_fl_submit_test" },
        update: { workStatus: "IN_PROGRESS" },
        create: {
          id: "ms_fl_submit_test",
          projectId: TEST_PROJECT_ID,
          title: "Milestone 1: Webhook Engine & Idempotency",
          description: "Deliver production PayPal webhook handlers",
          amountMinor: 250000,
          workStatus: "IN_PROGRESS",
          orderIndex: 1,
        },
      });

      const update = {
        message: {
          message_id: 1011,
          from: { id: TEST_FL_CHAT_ID },
          chat: { id: TEST_FL_CHAT_ID, type: "private" },
          text: "/submit https://github.com/nexum-repo/pull/10 Completed full test suite and webhook idempotent retry logic",
        },
      };

      const result = await telegramService.handleWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(result.action).toBe("DELIVERABLE_SUBMITTED_TELEGRAM");

      // Verify deliverable card created in DB
      const deliverableMsg = await prisma.workspaceMessage.findFirst({
        where: { conversation: { projectId: TEST_PROJECT_ID }, type: "deliverable_submission_card" },
        orderBy: { createdAt: "desc" },
      });
      expect(deliverableMsg).toBeDefined();
      expect(deliverableMsg?.type).toBe("deliverable_submission_card");
    });
  });
});

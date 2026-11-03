import { describe, it, expect, beforeAll } from "vitest";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "backend", ".env") });

import { groqService } from "../src/services/groqService.js";
import { telegramService } from "../src/services/telegramService.js";
import prisma from "../src/prisma.js";

describe("Phase 4 & 5: Groq AI Notetaker & Telegram Mobile Gateway Suite", () => {
  beforeAll(async () => {
    // Ensure test user exists
    await prisma.user.upsert({
      where: { id: "usr_client_alex" },
      update: { name: "Alex Rivera", role: "CLIENT" },
      create: {
        id: "usr_client_alex",
        email: "alex.rivera@nexum.demo",
        name: "Alex Rivera",
        role: "CLIENT",
      },
    });
  });

  describe("Phase 4: Groq Meeting Intelligence & Verbal Scope Creep Shield", () => {
    it("synthesizes meeting transcript into executive summary, Kanban tasks, and ADR records", async () => {
      const mockTranscript = `
Alex: Hey Sambit, let's verify Milestone 2. Are webhook retries working?
Sambit: Yes, we deduplicate orders within 30 seconds.
Alex: Great. Could we also add Apple Pay mobile checkout for +$400?
Sambit: Sure, I agree to add Apple Pay for +$400 USD and will finish the retry tests by Wednesday.
Alex: Perfect, deal.
`;
      const result = await groqService.synthesizeMeeting({ transcript: mockTranscript });

      expect(result.executiveSummary).toBeDefined();
      expect(result.executiveSummary.length).toBeGreaterThan(20);
      expect(result.actionItems.length).toBeGreaterThanOrEqual(1);
      expect(result.decisions.length).toBeGreaterThanOrEqual(1);

      // Verify verbal scope alert was detected
      expect(result.verbalScopeAlert).toBeDefined();
      expect(result.verbalScopeAlert?.detected).toBe(true);
      expect(result.verbalScopeAlert?.suggestedDeltaCents).toBeGreaterThan(0);
    }, 25000);
  });

  describe("Phase 5: Telegram Bi-Directional Gateway & Handshake Protocol", () => {
    it("generates 1-click deep link handshake URL for account pairing", () => {
      const deepLink = telegramService.getDeepLink("usr_client_alex");
      expect(deepLink).toContain("t.me/");
      expect(deepLink).toContain("start=link_usr_client_alex");
    });

    it("handles /start link_<userId> handshake in webhook to pair telegramChatId", async () => {
      const update = {
        message: {
          message_id: 101,
          from: { id: 987654321, username: "alex_telegram_test" },
          chat: { id: 987654321, type: "private" },
          text: "/start link_usr_client_alex",
        },
      };

      const result = await telegramService.handleWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(result.action).toBe("PAIRED");

      // Verify database persistence
      const user = await prisma.user.findUnique({
        where: { id: "usr_client_alex" },
      });
      expect(user?.telegramChatId).toBe("987654321");
      expect(user?.telegramUsername).toBe("alex_telegram_test");
      expect(user?.telegramNotifications).toBe(true);
    });

    it("handles callback query for 1-click milestone approval from Telegram", async () => {
      const update = {
        callback_query: {
          id: "cq_test_123",
          from: { id: 987654321 },
          data: "approve_ms:prj_test:ms_test_2",
          message: {
            message_id: 202,
            chat: { id: 987654321 },
          },
        },
      };

      const result = await telegramService.handleWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(result.action).toBe("MILESTONE_APPROVED");
    }, 15000);

    it("relays text message from linked Telegram user into bilateral workspace timeline", async () => {
      // Create project for alex if needed
      await prisma.project.upsert({
        where: { id: "prj_tg_relay_test" },
        update: { state: "ACTIVE" },
        create: {
          id: "prj_tg_relay_test",
          clientId: "usr_client_alex",
          title: "Telegram Relay Test Project",
          description: "Relay verification for telegram edge node",
          goals: "Verify mobile telegram messages",
          state: "ACTIVE",
          budgetCents: 500000,
        },
      });

      const update = {
        message: {
          message_id: 303,
          from: { id: 987654321, username: "alex_telegram_test" },
          chat: { id: 987654321, type: "private" },
          text: "Checking in from mobile Telegram: Did you finish the tests?",
        },
      };

      const result = await telegramService.handleWebhookUpdate(update);
      expect(result.handled).toBe(true);
      expect(result.action).toBe("RELAYED_TO_WORKSPACE");
    }, 15000);
  });
});

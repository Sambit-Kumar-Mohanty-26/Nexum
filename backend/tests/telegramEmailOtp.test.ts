import { describe, it, expect, beforeAll } from "vitest";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "backend", ".env") });

import { telegramService } from "../src/services/telegramService.js";
import { emailService } from "../src/services/emailService.js";
import prisma from "../src/prisma.js";

describe("Phase 9: Telegram Mobile OTP Email Login & Authentication Suite", () => {
  const testChatId = "9988776655";
  const testEmail = "mobile.tester@nexum.demo";
  const testUserId = "usr_client_mobile_tester";

  beforeAll(async () => {
    // Ensure test user exists in database
    await prisma.user.upsert({
      where: { id: testUserId },
      update: {
        email: testEmail,
        name: "Mobile Travel Tester",
        role: "CLIENT",
        telegramChatId: null,
      },
      create: {
        id: testUserId,
        email: testEmail,
        name: "Mobile Travel Tester",
        role: "CLIENT",
        telegramChatId: null,
      },
    });
  });

  it("checks emailService configuration methods", () => {
    expect(typeof emailService.sendOtpEmail).toBe("function");
    expect(typeof emailService.isConfigured).toBe("function");
  });

  it("sends OTP email without crashing, falling back to simulated logger in dev", async () => {
    const res = await emailService.sendOtpEmail(testEmail, "Tester", "123456");
    expect(res).toBeDefined();
    expect(typeof res.success).toBe("boolean");
  });

  it("handles /login prompt when user is unpaired", async () => {
    const update = {
      message: {
        message_id: 201,
        chat: { id: testChatId },
        from: { id: testChatId, first_name: "Mobile", username: "mobile_tester" },
        text: "/login",
      },
    };

    const res = await telegramService.handleWebhookUpdate(update);
    expect(res.handled).toBe(true);
    expect(res.action).toBe("AWAITING_EMAIL_PROMPT");
  });

  it("rejects invalid or unknown email address", async () => {
    const update = {
      message: {
        message_id: 202,
        chat: { id: testChatId },
        from: { id: testChatId, first_name: "Mobile", username: "mobile_tester" },
        text: "nonexistent.user.999@nexum.invalid",
      },
    };

    const res = await telegramService.handleWebhookUpdate(update);
    expect(res.handled).toBe(false);
    expect(res.action).toBe("USER_NOT_FOUND");
  });

  it("initiates OTP generation and dispatch when registered email is provided", async () => {
    const update = {
      message: {
        message_id: 203,
        chat: { id: testChatId },
        from: { id: testChatId, first_name: "Mobile", username: "mobile_tester" },
        text: testEmail,
      },
    };

    const res = await telegramService.handleWebhookUpdate(update);
    expect(res.handled).toBe(true);
    expect(res.action).toBe("OTP_SENT");

    // Verify pending auth is saved in telegramService
    const pending = (telegramService as any).pendingAuth.get(testChatId);
    expect(pending).toBeDefined();
    expect(pending.email).toBe(testEmail);
    expect(pending.otp).toMatch(/^\d{6}$/);
    expect(pending.expiresAt).toBeGreaterThan(Date.now());
  });

  it("rejects incorrect 6-digit OTP code", async () => {
    const update = {
      message: {
        message_id: 204,
        chat: { id: testChatId },
        from: { id: testChatId, first_name: "Mobile", username: "mobile_tester" },
        text: "000000", // deliberate incorrect code
      },
    };

    const res = await telegramService.handleWebhookUpdate(update);
    expect(res.handled).toBe(false);
    expect(res.action).toBe("OTP_MISMATCH");

    const pending = (telegramService as any).pendingAuth.get(testChatId);
    expect(pending.attempts).toBe(1);
  });

  it("successfully validates correct 6-digit OTP and pairs user in Neon DB", async () => {
    const pending = (telegramService as any).pendingAuth.get(testChatId);
    const validOtp = pending.otp;

    const update = {
      message: {
        message_id: 205,
        chat: { id: testChatId },
        from: { id: testChatId, first_name: "Mobile", username: "mobile_tester" },
        text: validOtp,
      },
    };

    const res = await telegramService.handleWebhookUpdate(update);
    expect(res.handled).toBe(true);
    expect(res.action).toBe("LOGIN_SUCCESS");

    // Verify DB update
    const userInDb = await prisma.user.findUnique({
      where: { id: testUserId },
      select: { telegramChatId: true, telegramUsername: true, telegramNotifications: true },
    });

    expect(userInDb?.telegramChatId).toBe(testChatId);
    expect(userInDb?.telegramUsername).toBe("mobile_tester");
    expect(userInDb?.telegramNotifications).toBe(true);
  });

  it("handles /logout and safely unlinks Telegram session", async () => {
    const update = {
      message: {
        message_id: 206,
        chat: { id: testChatId },
        from: { id: testChatId, first_name: "Mobile", username: "mobile_tester" },
        text: "/logout",
      },
    };

    const res = await telegramService.handleWebhookUpdate(update);
    expect(res.handled).toBe(true);
    expect(res.action).toBe("LOGGED_OUT");

    const userInDb = await prisma.user.findUnique({
      where: { id: testUserId },
      select: { telegramChatId: true },
    });

    expect(userInDb?.telegramChatId).toBeNull();
  });
});


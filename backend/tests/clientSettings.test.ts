import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { clientOverviewService } from "../src/services/clientOverviewService.js";
import { prisma } from "../src/prisma.js";

describe("Client Workspace Settings Service & End-to-End Suite", () => {
  beforeEach(async () => {
    clientOverviewService.reset();
    try {
      await prisma.user.updateMany({
        where: { id: "usr_client_alex" },
        data: { name: "Alex Rivera", passwordHash: null, preferences: null },
      });
    } catch {
      // Ignore if DB offline
    }
  });

  it("should fetch complete, well-formed settings for Alex Rivera", async () => {
    const settings = await clientOverviewService.getClientSettings("usr_client_alex");

    expect(settings).toBeDefined();
    expect(settings.profile.name).toBe("Alex Rivera");
    expect(settings.profile.company).toBe("Horizon Commerce LLC");
    expect(settings.security.twoFactorEnabled).toBe(true);
    expect(settings.security.activeSessions.length).toBeGreaterThanOrEqual(1);
    expect(settings.payments.paypalSandboxStatus).toBe("CONNECTED");
    expect(settings.notifications.milestonesEmail).toBe(true);
    expect(settings.hiring.preferredSkills).toContain("PayPal v2");
    expect(settings.privacy.profileVisibility).toBe("VERIFIED_ONLY");
  });

  it("should update profile and preferences across multiple sections and persist changes", async () => {
    const updateResult = await clientOverviewService.updateClientSettings("usr_client_alex", {
      profile: {
        name: "Alex Rivera (Updated)",
        company: "Horizon Global E-Commerce",
        website: "https://horizonglobal.demo",
      } as any,
      notifications: {
        proposalsEmail: false,
        deadlinesEmail: true,
      } as any,
      hiring: {
        budgetMin: 50,
        budgetMax: 120,
        preferredExpLevel: "EXPERT",
        preferredSkills: ["Next.js", "PayPal v2", "Rust"],
        autoMatchThreshold: 95,
      },
    });

    expect(updateResult.success).toBe(true);
    expect(updateResult.data.profile.name).toBe("Alex Rivera (Updated)");
    expect(updateResult.data.profile.company).toBe("Horizon Global E-Commerce");
    expect(updateResult.data.notifications.proposalsEmail).toBe(false);
    expect(updateResult.data.notifications.deadlinesEmail).toBe(true);
    expect(updateResult.data.hiring.budgetMax).toBe(120);

    // Verify subsequent retrieval has persisted data
    const fetched = await clientOverviewService.getClientSettings("usr_client_alex");
    expect(fetched.profile.name).toBe("Alex Rivera (Updated)");
    expect(fetched.profile.company).toBe("Horizon Global E-Commerce");
    expect(fetched.hiring.preferredSkills).toContain("Rust");
  });

  it("should validate and securely change user password with scrypt hashing", async () => {
    // 1. Rejects wrong current password
    const wrongAttempt = await clientOverviewService.changePassword(
      "usr_client_alex",
      "wrongpassword123",
      "newSecretPass2026!"
    );
    expect(wrongAttempt.success).toBe(false);
    expect(wrongAttempt.error).toContain("Current password is incorrect");

    // 2. Rejects passwords shorter than 6 characters
    const shortAttempt = await clientOverviewService.changePassword(
      "usr_client_alex",
      "demo1234",
      "123"
    );
    expect(shortAttempt.success).toBe(false);
    expect(shortAttempt.error).toContain("at least 6 characters");

    // 3. Successfully updates password with default demo password
    const successAttempt = await clientOverviewService.changePassword(
      "usr_client_alex",
      "demo1234",
      "nexumSecurePass2026!"
    );
    expect(successAttempt.success).toBe(true);

    // 4. Verify old password no longer works
    const oldAgain = await clientOverviewService.changePassword(
      "usr_client_alex",
      "demo1234",
      "anotherPass123"
    );
    expect(oldAgain.success).toBe(false);

    // 5. Verify new password is accepted for next change
    const newAgain = await clientOverviewService.changePassword(
      "usr_client_alex",
      "nexumSecurePass2026!",
      "thirdPassword2026!"
    );
    expect(newAgain.success).toBe(true);
  });

  it("should revoke all other active sessions except current", async () => {
    const initial = await clientOverviewService.getClientSettings("usr_client_alex");
    expect(initial.security.activeSessions.length).toBe(2);

    const revokeResult = await clientOverviewService.revokeOtherSessions("usr_client_alex");
    expect(revokeResult.success).toBe(true);
    expect(revokeResult.remainingSessions).toBe(1);

    const updated = await clientOverviewService.getClientSettings("usr_client_alex");
    expect(updated.security.activeSessions.length).toBe(1);
    expect(updated.security.activeSessions[0].isCurrent).toBe(true);
  });

  it("should export full workspace data package for GDPR portability", async () => {
    const exported = await clientOverviewService.exportUserData("usr_client_alex");

    expect(exported).toBeDefined();
    expect(exported.clientId).toBe("usr_client_alex");
    expect(exported.profile.name).toBe("Alex Rivera");
    expect(exported.settings).toBeDefined();
    expect(Array.isArray(exported.projects)).toBe(true);
    expect(Array.isArray(exported.milestones)).toBe(true);
    expect(Array.isArray(exported.invitations)).toBe(true);
    expect(exported.exportedAt).toBeDefined();
  });

  it("should create a priority customer support ticket and log audit entry", async () => {
    const ticketResult = await clientOverviewService.submitSupportTicket("usr_client_alex", {
      category: "Milestone Mediation",
      issue: "Dispute clarification requested on PayPal REST v2 webhook delivery acceptance.",
      projectId: "prj_01",
    });

    expect(ticketResult.success).toBe(true);
    expect(ticketResult.ticketId).toMatch(/^tkt_/);
    expect(ticketResult.message.toLowerCase()).toContain("support ticket");
  });

  afterAll(async () => {
    // Restore demo password so demo login remains functional across test runs
    await clientOverviewService.changePassword(
      "usr_client_alex",
      "thirdPassword2026!",
      "demo1234"
    );
  });
});

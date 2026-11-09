import { describe, it, expect } from "vitest";
import {
  INITIAL_ACCOUNT_INFO,
  INITIAL_ACTIVE_SESSIONS,
  INITIAL_SAVED_PROJECTS,
  INITIAL_NOTIFICATION_PREFS,
  INITIAL_AVAILABILITY_PREFS,
  INITIAL_CONNECTED_ACCOUNTS,
  INITIAL_AI_PREFERENCES,
  INITIAL_PRIVACY_PREFERENCES,
  INITIAL_APPEARANCE_PREFERENCES,
} from "../src/lib/freelancer-settings-data";

describe("Freelancer Settings Data Contracts & Security Rules", () => {
  it("validates account and security configuration", () => {
    expect(INITIAL_ACCOUNT_INFO.email).toBe("sambit.mohanty@example.com");
    expect(INITIAL_ACCOUNT_INFO.isEmailVerified).toBe(true);
    expect(INITIAL_ACCOUNT_INFO.phone).toBe("+91 9876543210");
    expect(INITIAL_ACCOUNT_INFO.isPhoneVerified).toBe(true);
    expect(INITIAL_ACCOUNT_INFO.twoFactorEnabled).toBe(true);
    expect(INITIAL_ACCOUNT_INFO.active2FAMethod).toBe("authenticator");
  });

  it("ensures active sessions include current session with valid metadata", () => {
    expect(INITIAL_ACTIVE_SESSIONS.length).toBeGreaterThanOrEqual(2);
    const currentSession = INITIAL_ACTIVE_SESSIONS.find((s) => s.isCurrent);
    expect(currentSession).toBeDefined();
    expect(currentSession?.device).toContain("Windows • Chrome");
    expect(currentSession?.location).toContain("Bhubaneswar, India");
  });

  it("verifies saved projects data structures and skills", () => {
    expect(Array.isArray(INITIAL_SAVED_PROJECTS)).toBe(true);
    INITIAL_SAVED_PROJECTS.forEach((proj) => {
      expect(proj.title).toBeDefined();
      expect(proj.budget).toBeDefined();
      expect(proj.skills.length).toBeGreaterThan(0);
      expect(["OPEN", "IN_REVIEW", "CONTRACTED"]).toContain(proj.status);
    });
  });

  it("verifies notification preferences defaults across delivery channels", () => {
    expect(INITIAL_NOTIFICATION_PREFS.projectInvitations).toBe(true);
    expect(INITIAL_NOTIFICATION_PREFS.clientMessages).toBe(true);
    expect(INITIAL_NOTIFICATION_PREFS.paymentCaptures).toBe(true);
    expect(INITIAL_NOTIFICATION_PREFS.emailChannel).toBe(true);
    expect(INITIAL_NOTIFICATION_PREFS.inAppChannel).toBe(true);
  });

  it("checks availability preferences and preferred project categories", () => {
    expect(INITIAL_AVAILABILITY_PREFS.status).toBe("AVAILABLE");
    expect(INITIAL_AVAILABILITY_PREFS.hourlyRate).toBe("65.00");
    expect(INITIAL_AVAILABILITY_PREFS.preferredCategories).toContain("Web Development");
    expect(INITIAL_AVAILABILITY_PREFS.preferredCategories).toContain("AI & Data");
  });

  it("confirms connected accounts list includes PayPal Sandbox and GitHub", () => {
    const paypal = INITIAL_CONNECTED_ACCOUNTS.find((a) => a.provider === "PayPal");
    expect(paypal?.isConnected).toBe(true);
    expect(paypal?.isSandbox).toBe(true);

    const github = INITIAL_CONNECTED_ACCOUNTS.find((a) => a.provider === "GitHub");
    expect(github?.isConnected).toBe(true);
  });

  it("verifies AI copilot preferences and privacy segregation settings", () => {
    expect(INITIAL_AI_PREFERENCES.proposalDrafting).toBe(true);
    expect(INITIAL_AI_PREFERENCES.messageDrafting).toBe(true);
    expect(INITIAL_AI_PREFERENCES.responseStyle).toBe("Balanced");
    expect(INITIAL_PRIVACY_PREFERENCES.profileVisibility).toBe("PUBLIC");
    expect(INITIAL_PRIVACY_PREFERENCES.shareMediationTelemetry).toBe(true);
  });

  it("verifies default appearance preserves clean white/light theme", () => {
    expect(INITIAL_APPEARANCE_PREFERENCES.theme).toBe("light");
    expect(INITIAL_APPEARANCE_PREFERENCES.currency).toBe("INR");
  });
});


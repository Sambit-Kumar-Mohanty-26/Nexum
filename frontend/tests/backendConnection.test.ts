import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  BACKEND_URL,
  checkBackendHealth,
  fetchBackendUsers,
  fetchBackendProjects,
  fetchBackendPaymentAttempts,
} from "../src/lib/api-client";

describe("Frontend to Backend Connection Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should have a defined BACKEND_URL for same-origin proxying", () => {
    expect(BACKEND_URL).toBeDefined();
    // In browser / same-origin proxy architecture, BACKEND_URL is relative ("") or points to API
    expect(typeof BACKEND_URL).toBe("string");
  });

  it("checkBackendHealth() should handle successful response cleanly", async () => {
    const mockHealth = {
      status: "ok",
      service: "nexum-backend",
      version: "0.1.0",
      timestamp: new Date().toISOString(),
      database: { provider: "postgresql", status: "CONNECTED", latencyMs: 4 },
      truthStatement: "AI drafts, humans approve, PayPal proves.",
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockHealth,
    } as unknown as Response);

    const result = await checkBackendHealth();
    expect(result.connected).toBe(true);
    expect(result.data?.service).toBe("nexum-backend");
    expect(result.data?.truthStatement).toBe("AI drafts, humans approve, PayPal proves.");
  });

  it("checkBackendHealth() should handle offline backend gracefully without throwing", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await checkBackendHealth();
    expect(result.connected).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
  });

  it("fetchBackendProjects() should format project responses", async () => {
    const mockProjects = {
      success: true,
      count: 1,
      data: [
        {
          id: "prj_test",
          title: "Test Project",
          description: "Testing",
          budgetCents: 1000,
          currency: "USD",
          state: "ACTIVE",
        },
      ],
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => mockProjects,
    } as unknown as Response);

    const res = await fetchBackendProjects();
    expect(res.success).toBe(true);
    expect(res.data?.length).toBe(1);
    expect(res.data?.[0].budgetCents).toBe(1000);
  });
});


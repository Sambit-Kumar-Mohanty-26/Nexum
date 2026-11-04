import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { app } from "../src/index.js";
import { prisma } from "../src/prisma.js";

describe("GitHub OAuth 2.0 & Role Selection Suite", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: { email: "github.demo@nexum.local" },
      });
    } catch {
      // Ignore if DB not reachable
    }

    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("should return OAuth URL or dev simulation link from /api/auth/github/url", async () => {
    const res = await fetch(`${baseUrl}/api/auth/github/url`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("url");
    expect(typeof body.url).toBe("string");
    expect(body.url).toContain("/api/auth/github/callback");
  });

  it("should redirect from /api/auth/github to GitHub or simulated endpoint", async () => {
    const res = await fetch(`${baseUrl}/api/auth/github`, {
      redirect: "manual",
    });
    expect([302, 307]).toContain(res.status);
    const location = res.headers.get("location");
    expect(location).toBeTruthy();
    expect(location).toContain("/api/auth/github/callback");
  });

  it("should reject real OAuth code callback if state CSRF cookie mismatches", async () => {
    const res = await fetch(`${baseUrl}/api/auth/github/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "nexum_gh_oauth_state=correct_state_val",
      },
      body: JSON.stringify({
        code: "invalid_test_code",
        state: "tampered_state_val",
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain("OAuth state mismatch");
  });

  it("should process simulated GitHub authentication in dev and return role status", async () => {
    const res = await fetch(`${baseUrl}/api/auth/github/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        simulated: true,
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.email).toBe("github.demo@nexum.local");
    expect(body).toHaveProperty("requiresRole");
    // Verify session cookie was set
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("nexum_session=");
  });

  it("should handle browser GET /api/auth/github/callback and redirect on missing code", async () => {
    const res = await fetch(`${baseUrl}/api/auth/github/callback`, {
      redirect: "manual",
    });
    expect(res.status).toBe(302);
    const location = res.headers.get("location");
    expect(location).toContain("error=missing_authorization_code");
  });
});

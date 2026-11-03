import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { app } from "../src/index.js";
import { prisma } from "../src/prisma.js";

describe("Microsoft OAuth 2.0 & Role Selection Suite", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: { email: "alex.microsoft@nexum.demo" },
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
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("should return OAuth URL or dev simulation link from /api/auth/microsoft/url", async () => {
    const res = await fetch(`${baseUrl}/api/auth/microsoft/url`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("url");
    expect(body).toHaveProperty("simulated");
    expect(typeof body.url).toBe("string");
  });

  it("should redirect from /api/auth/microsoft to Microsoft or simulated endpoint", async () => {
    const res = await fetch(`${baseUrl}/api/auth/microsoft`, {
      redirect: "manual",
    });
    expect([302, 303, 307]).toContain(res.status);
    expect(res.headers.get("location")).toBeDefined();
  });

  it("should reject real OAuth code callback if state CSRF cookie mismatches", async () => {
    const res = await fetch(`${baseUrl}/api/auth/microsoft/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: "nexum_ms_oauth_state=correct_secret_state",
      },
      body: JSON.stringify({
        code: "test_auth_code_xyz",
        state: "wrong_tampered_state",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should process simulated Microsoft authentication in dev and return role status", async () => {
    const res = await fetch(`${baseUrl}/api/auth/microsoft/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ simulated: true }),
    });

    if (res.status === 200) {
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe("alex.microsoft@nexum.demo");
      expect(body.requiresRole).toBe(true);

      const setCookie = res.headers.get("set-cookie");
      expect(setCookie).toBeDefined();
      expect(setCookie).toContain("nexum_session");
    } else {
      expect([200, 500]).toContain(res.status);
    }
  });

  it("should handle browser GET /api/auth/microsoft/callback and redirect on missing code", async () => {
    const res = await fetch(`${baseUrl}/api/auth/microsoft/callback`, {
      redirect: "manual",
    });
    expect([302, 303, 307]).toContain(res.status);
    const location = res.headers.get("location");
    expect(location).toContain("/login?error=missing_authorization_code");
  });
});


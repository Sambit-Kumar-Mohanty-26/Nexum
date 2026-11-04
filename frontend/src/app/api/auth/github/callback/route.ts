import { NextRequest, NextResponse } from "next/server";
import { setSession, UserRole, DemoUser } from "@/lib/auth";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const simulated = searchParams.get("simulated");
  const oauthError = searchParams.get("error");

  const baseUrl = request.nextUrl.origin;

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(oauthError)}`, baseUrl)
    );
  }

  try {
    const cookieHeader = request.headers.get("cookie") || "";

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/github/callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        code: code || undefined,
        state: state || undefined,
        simulated: simulated === "true",
      }),
    });

    if (!backendRes.ok) {
      const errorData = await backendRes.json().catch(() => ({}));
      const msg = errorData?.error?.message || "GitHub authentication failed";
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(msg)}`, baseUrl)
      );
    }

    const data = await backendRes.json();
    const user = data.user;

    const loggedInUser: DemoUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.role as UserRole) || "CLIENT",
      avatar:
        user.avatarUrl ||
        (user.role === "FREELANCER"
          ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=faces"
          : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces"),
      title: user.role === "FREELANCER" ? "Verified Freelancer" : "Verified Client",
      companyOrHandle: `@${user.name?.toLowerCase().replace(/\s+/g, "_") || "user"}`,
      location: "Remote",
      timezone: "UTC",
      statusBadge: user.role === "FREELANCER" ? "Verified Talent" : "Verified Buyer",
      summary: "Authenticated securely via GitHub OAuth 2.0.",
      canLogin: true,
      isDemoData: false,
    };

    // Issue signed Next.js session cookie
    await setSession(loggedInUser);

    // Determine target redirect
    const targetPath =
      data.requiresRole || !user.role
        ? "/choose-role"
        : user.role === "FREELANCER"
        ? "/freelancer/dashboard"
        : "/client/dashboard";

    const response = NextResponse.redirect(new URL(targetPath, baseUrl));

    // Forward Set-Cookie headers from Express (PostgreSQL session)
    const rawSetCookie = backendRes.headers.get("set-cookie");
    if (rawSetCookie) {
      response.headers.set("set-cookie", rawSetCookie);
    }

    return response;
  } catch (err) {
    console.error("GitHub callback handling failure:", err);
    return NextResponse.redirect(
      new URL("/login?error=github_callback_failed", baseUrl)
    );
  }
}


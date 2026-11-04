import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, setSession, UserRole } from "@/lib/auth";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { role } = body as { role?: string };

    if (!role || (role !== "CLIENT" && role !== "FREELANCER")) {
      return NextResponse.json(
        { error: "Valid role ('CLIENT' or 'FREELANCER') is required." },
        { status: 400 }
      );
    }

    const cookieHeader = request.headers.get("cookie") || "";

    const backendRes = await fetch(`${BACKEND_URL}/api/auth/role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify(body),
    });

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData?.error?.message || "Failed to assign role." },
        { status: backendRes.status }
      );
    }

    const backendData = await backendRes.json();

    // Update current Next.js user session
    const currentUser = await getCurrentUser();
    if (currentUser) {
      currentUser.role = role as UserRole;
      currentUser.title = role === "CLIENT" ? "Verified Client" : "Verified Freelancer";
      currentUser.statusBadge = role === "CLIENT" ? "Verified Buyer" : "Verified Freelancer";
      await setSession(currentUser);
    }

    const response = NextResponse.json({
      success: true,
      role: backendData.user.role,
      user: backendData.user,
    });

    const rawSetCookie = backendRes.headers.get("set-cookie");
    if (rawSetCookie) {
      response.headers.set("set-cookie", rawSetCookie);
    }

    return response;
  } catch (error) {
    console.error("Assign role error:", error);
    return NextResponse.json(
      { error: "Internal role assignment error" },
      { status: 500 }
    );
  }
}


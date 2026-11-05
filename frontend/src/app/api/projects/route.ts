import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = await getCurrentUser();
    const query = new URLSearchParams(searchParams);

    if (!query.has("clientId") && user?.id) {
      query.set("clientId", user.id);
    } else if (!query.has("clientId")) {
      query.set("clientId", "usr_client_alex");
    }

    const cookieHeader = request.headers.get("cookie") || "";
    const res = await fetch(`${BACKEND_URL}/api/projects?${query.toString()}`, {
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    console.error("Failed to proxy GET /api/projects:", err);
  }

  return NextResponse.json({
    success: true,
    count: 0,
    data: [],
    stats: {
      totalCount: 0,
      inProgressCount: 0,
      needsActionCount: 0,
      countsByStatus: {
        ALL: 0,
        IN_PROGRESS: 0,
        IN_REVIEW: 0,
        NEGOTIATION: 0,
        FINDING_FREELANCERS: 0,
        DRAFT: 0,
        COMPLETED: 0,
        DISPUTED: 0,
      },
    },
  });
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    const clientId = body.clientId || user?.id || "usr_client_alex";
    const payload = {
      ...body,
      clientId,
    };

    const cookieHeader = request.headers.get("cookie") || "";

    // Forward to Express backend
    const res = await fetch(`${BACKEND_URL}/api/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { status: 201 });
    }

    const errorJson = await res.json().catch(() => ({}));
    const errorMessage = errorJson.error || `Backend returned status ${res.status}`;
    console.error("Backend project creation failed:", errorMessage);

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: res.status || 500 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create project";
    console.error("POST /api/projects exception:", err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

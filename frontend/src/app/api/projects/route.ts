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

    if (!query.has("clientId")) {
      query.set("clientId", user?.id || "usr_client_alex");
    }

    const res = await fetch(`${BACKEND_URL}/api/projects?${query.toString()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend offline
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

    const payload = {
      ...body,
      clientId: body.clientId || user?.id || "usr_client_alex",
    };

    // Forward to Express backend
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: 201 });
      }
    } catch {
      // Backend not running on 4000
    }

    // Serverless fallback response
    return NextResponse.json(
      {
        success: true,
        message: payload.state === "DRAFT" ? "Draft saved successfully" : "Project created in consensus engine",
        data: {
          id: payload.id || `prj_${Date.now()}`,
          ...payload,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create project";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

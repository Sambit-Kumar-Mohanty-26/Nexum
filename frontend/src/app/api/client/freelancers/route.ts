import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { INITIAL_FREELANCERS } from "@/lib/mock-freelancers";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    if (!searchParams.has("clientId") && user?.id) {
      searchParams.set("clientId", user.id);
    }

    // Attempt to proxy to Express backend
    try {
      const res = await fetch(`${BACKEND_URL}/api/client/freelancers?${searchParams.toString()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        return NextResponse.json(json, {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });
      }
    } catch {
      // Backend offline / local fallback
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "9", 10));
    const offset = (page - 1) * limit;
    const paginated = INITIAL_FREELANCERS.slice(offset, offset + limit);

    return NextResponse.json(
      {
        success: true,
        count: paginated.length,
        total: INITIAL_FREELANCERS.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(INITIAL_FREELANCERS.length / limit)),
        hasMore: page * limit < INITIAL_FREELANCERS.length,
        data: paginated,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}


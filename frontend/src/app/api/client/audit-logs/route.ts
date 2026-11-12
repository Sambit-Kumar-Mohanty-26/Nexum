import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getBackendUrl } from "@/lib/backend-url";

const BACKEND_URL = getBackendUrl();

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const cookieHeader = request.headers.get("cookie");

    if (user?.id && !searchParams.has("clientId")) {
      searchParams.set("clientId", user.id);
    }
    const q = searchParams.toString();

    // Proxy to Express backend with auth credentials
    try {
      const res = await fetch(`${BACKEND_URL}/api/client/audit-logs?${q}`, {
        cache: "no-store",
        headers: {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          ...(user?.id ? { "x-user-id": user.id, "x-client-id": user.id } : {}),
        },
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
      logs: [],
      total: 0,
      page: 1,
      totalPages: 1,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch audit logs";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}


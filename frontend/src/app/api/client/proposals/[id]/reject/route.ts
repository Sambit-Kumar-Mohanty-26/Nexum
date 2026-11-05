import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();
    const body = await request.json().catch(() => ({}));
    const clientId = body.clientId || user?.id || "usr_client_alex";
    const cookieHeader = request.headers.get("cookie") || "";

    const res = await fetch(`${BACKEND_URL}/api/client/proposals/${id}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ ...body, clientId }),
    });

    if (res.ok) {
      const json = await res.json();
      return NextResponse.json(json);
    }

    const errData = await res.json().catch(() => ({}));
    return NextResponse.json(
      { success: false, error: errData.error || `Backend returned HTTP ${res.status}` },
      { status: res.status }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to decline proposal";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}


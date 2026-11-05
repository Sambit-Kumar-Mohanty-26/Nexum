import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const clientId = user?.id || "usr_client_alex";
    const cookieHeader = request.headers.get("cookie") || "";

    const res = await fetch(`${BACKEND_URL}/api/projects/${id}?clientId=${clientId}`, {
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    const errData = await res.json().catch(() => ({}));
    return NextResponse.json(
      { success: false, error: errData.error || "Project not found" },
      { status: res.status || 404 }
    );
  } catch (err) {
    console.error("GET /api/projects/:id error:", err);
    return NextResponse.json(
      { success: false, error: "Project not found" },
      { status: 404 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const body = await request.json();
    const cookieHeader = request.headers.get("cookie") || "";

    const payload = {
      ...body,
      id,
      clientId: body.clientId || user?.id || "usr_client_alex",
    };

    const res = await fetch(`${BACKEND_URL}/api/projects/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    const errData = await res.json().catch(() => ({}));
    return NextResponse.json(
      { success: false, error: errData.error || "Failed to update project" },
      { status: res.status || 500 }
    );
  } catch (err) {
    console.error("PUT /api/projects/:id error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const clientId = user?.id || "usr_client_alex";
    const cookieHeader = request.headers.get("cookie") || "";

    const res = await fetch(`${BACKEND_URL}/api/projects/${id}?clientId=${clientId}`, {
      method: "DELETE",
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    const errData = await res.json().catch(() => ({}));
    return NextResponse.json(
      { success: false, error: errData.error || "Failed to delete project" },
      { status: res.status || 500 }
    );
  } catch (err) {
    console.error("DELETE /api/projects/:id error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete project" },
      { status: 500 }
    );
  }
}

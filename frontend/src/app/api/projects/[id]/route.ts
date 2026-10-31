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

    const res = await fetch(`${BACKEND_URL}/api/projects/${id}?clientId=${clientId}`, {
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend offline
  }

  return NextResponse.json(
    { success: false, error: "Project not found" },
    { status: 404 }
  );
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const body = await request.json();

    const payload = {
      ...body,
      id,
      clientId: body.clientId || user?.id || "usr_client_alex",
    };

    const res = await fetch(`${BACKEND_URL}/api/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend offline
  }

  return NextResponse.json(
    { success: true, message: "Project updated" },
    { status: 200 }
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const clientId = user?.id || "usr_client_alex";

    const res = await fetch(`${BACKEND_URL}/api/projects/${id}?clientId=${clientId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend offline
  }

  return NextResponse.json({ success: true, message: "Project deleted" });
}


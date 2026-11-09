import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getProjectByIdFromStore,
  saveProjectToStore,
  deleteProjectFromStore,
} from "@/lib/projects-store";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

const FALLBACK_RENDER_URL = "https://nexum-79g2.onrender.com";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  const clientId = user?.id || "usr_client_alex";
  const cookieHeader = request.headers.get("cookie") || "";

  const isCloudOrProd =
    process.env.VERCEL === "1" ||
    process.env.NODE_ENV === "production" ||
    (typeof window === "undefined" && Boolean(process.env.AWS_REGION));

  const isLocalhost =
    !BACKEND_URL ||
    BACKEND_URL.includes("localhost") ||
    BACKEND_URL.includes("127.0.0.1");

  const targetUrls =
    isCloudOrProd && isLocalhost
      ? [`${FALLBACK_RENDER_URL}/api/projects/${id}?clientId=${clientId}`]
      : [
          `${BACKEND_URL}/api/projects/${id}?clientId=${clientId}`,
          `${FALLBACK_RENDER_URL}/api/projects/${id}?clientId=${clientId}`,
        ];

  // 1. Try Express backend
  for (const url of targetUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          "x-user-id": clientId,
          "x-nexum-internal": "true",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(35000),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Backend offline / closed
    }
  }

  // 2. Fallback to projects store
  const project = getProjectByIdFromStore(id, clientId);
  if (project) {
    return NextResponse.json({ success: true, data: project });
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
    const cookieHeader = request.headers.get("cookie") || "";
    const originHeader = request.headers.get("origin") || request.headers.get("referer") || "http://localhost:3000";

    const clientId = user?.id || body.clientId || "usr_client_alex";
    const payload = {
      ...body,
      id,
      clientId,
    };

    // Save in local projects store
    const saved = saveProjectToStore(payload, clientId);

    // Forward to backend if online
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": clientId,
          "Origin": originHeader,
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify(payload),
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
      message: "Project updated successfully",
      data: saved,
    });
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
    const originHeader = request.headers.get("origin") || request.headers.get("referer") || "http://localhost:3000";

    // Delete from store
    deleteProjectFromStore(id, clientId);

    // Delete from backend if online
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${id}?clientId=${clientId}`, {
        method: "DELETE",
        headers: {
          "x-user-id": clientId,
          "Origin": originHeader,
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
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
      message: "Project deleted successfully",
    });
  } catch (err) {
    console.error("DELETE /api/projects/:id error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete project" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const search = request.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/api/files/${id}${search}`;

  const cookieHeader = request.headers.get("cookie") || "";
  const originHeader =
    request.headers.get("origin") ||
    request.headers.get("referer") ||
    "http://localhost:3000";

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Origin": originHeader,
        "x-nexum-internal": "true",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: { message: "File not found or access denied" } },
        { status: res.status }
      );
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const contentDisposition = res.headers.get("content-disposition") || `inline; filename="${id}"`;
    const contentLength = res.headers.get("content-length");

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": contentDisposition,
      "Cache-Control": "public, max-age=86400",
    };
    if (contentLength) headers["Content-Length"] = contentLength;

    const arrayBuffer = await res.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error(`[Files Proxy] Failed to fetch ${targetUrl}:`, err);
    return NextResponse.json(
      { error: { message: "File service unavailable" } },
      { status: 502 }
    );
  }
}


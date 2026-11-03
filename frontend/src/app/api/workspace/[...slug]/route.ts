import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");
  const url = `${BACKEND_URL}/api/workspace/${path}${request.nextUrl.search}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }

    const errData = await res.json().catch(() => ({}));
    return NextResponse.json(errData, { status: res.status });
  } catch (err) {
    console.error(`[Workspace Proxy GET] Error forwarding to ${url}:`, err);
    return NextResponse.json(
      {
        success: false,
        error: "Backend workspace service is temporarily unavailable",
      },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");
  const url = `${BACKEND_URL}/api/workspace/${path}`;

  try {
    const body = await request.json().catch(() => ({}));
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const errData = await res.json().catch(() => ({}));
    return NextResponse.json(errData, { status: res.status });
  } catch (err) {
    console.error(`[Workspace Proxy POST] Error forwarding to ${url}:`, err);
    return NextResponse.json(
      {
        success: false,
        error: "Backend workspace service is temporarily unavailable",
      },
      { status: 502 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");
  const url = `${BACKEND_URL}/api/workspace/${path}`;

  try {
    const body = await request.json().catch(() => ({}));
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const errData = await res.json().catch(() => ({}));
    return NextResponse.json(errData, { status: res.status });
  } catch (err) {
    console.error(`[Workspace Proxy PATCH] Error forwarding to ${url}:`, err);
    return NextResponse.json(
      {
        success: false,
        error: "Backend workspace service is temporarily unavailable",
      },
      { status: 502 }
    );
  }
}


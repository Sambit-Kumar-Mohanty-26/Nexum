import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllOpenProjectsFromStore } from "@/lib/projects-store";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

function mapStoredProjectToOpportunity(p: any) {
  const budgetCents = p.budgetCents || 0;
  const budgetAmount = budgetCents > 0 ? budgetCents / 100 : 0;
  return {
    id: p.id,
    title: p.title || p.name || "Untitled Project",
    description: p.description || "",
    category: p.category || "Web Development",
    skills: p.skills || p.requiredSkills || [],
    experienceLevel: p.experienceLevel || "MID",
    budgetType: p.budgetType === "HOURLY" ? "Hourly" : "Fixed-price",
    budgetCents,
    budgetMinCents: null,
    budgetMaxCents: null,
    budgetAmount,
    budgetDisplay: p.totalBudget || `$${budgetAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    currency: p.currency || "USD",
    location: "Remote",
    visibility: "PUBLIC",
    state: "ACTIVE",
    postedAt: new Date(p.createdAtTimestamp || Date.now()).toISOString(),
    proposalsCount: 0,
    isSaved: false,
    client: {
      id: p.clientId || "usr_client",
      name: p.clientName || "Client",
      company: p.clientCompany || "Client Team",
      location: "Remote",
      isVerified: true,
    },
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");
  const user = await getCurrentUser();
  const search = request.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/api/freelancer/${path}${search}`;

  const cookieHeader = request.headers.get("cookie") || "";
  const originHeader =
    request.headers.get("origin") ||
    request.headers.get("referer") ||
    "http://localhost:3000";

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Origin": originHeader,
        "x-nexum-internal": "true",
        ...(user?.id ? { "x-user-id": user.id } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (err) {
    console.warn(`[Freelancer Proxy GET] Backend fetch failed for ${targetUrl}:`, err);
  }

  // Fallback for project discovery if backend is offline or returning empty
  if (slug[0] === "projects" && (slug[1] === "search" || slug.length === 1)) {
    const stored = getAllOpenProjectsFromStore();
    const mapped = stored.map(mapStoredProjectToOpportunity);
    return NextResponse.json({
      success: true,
      projects: mapped,
      items: mapped,
      pagination: {
        page: 1,
        limit: mapped.length,
        pageSize: mapped.length,
        total: mapped.length,
        totalPages: 1,
      },
    });
  }

  return NextResponse.json(
    {
      success: false,
      error: "Freelancer service temporarily unavailable",
    },
    { status: 502 }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");
  const user = await getCurrentUser();
  const targetUrl = `${BACKEND_URL}/api/freelancer/${path}`;

  const cookieHeader = request.headers.get("cookie") || "";
  const originHeader =
    request.headers.get("origin") ||
    request.headers.get("referer") ||
    "http://localhost:3000";

  try {
    const contentType = request.headers.get("content-type") || "";
    let forwardBody: any;
    const forwardHeaders: Record<string, string> = {
      Origin: originHeader,
      "x-nexum-internal": "true",
      ...(user?.id ? { "x-user-id": user.id } : {}),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    };

    if (contentType.includes("multipart/form-data")) {
      forwardBody = await request.formData();
      // Leave Content-Type header unset so fetch sets multipart boundary automatically
    } else {
      const body = await request.json().catch(() => ({}));
      forwardBody = JSON.stringify(body);
      forwardHeaders["Content-Type"] = "application/json";
    }

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: forwardHeaders,
      body: forwardBody,
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error(`[Freelancer Proxy POST] Error forwarding to ${targetUrl}:`, err);
    return NextResponse.json(
      { success: false, error: "Backend service temporarily unavailable" },
      { status: 502 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");
  const user = await getCurrentUser();
  const targetUrl = `${BACKEND_URL}/api/freelancer/${path}`;

  const cookieHeader = request.headers.get("cookie") || "";
  const originHeader =
    request.headers.get("origin") ||
    request.headers.get("referer") ||
    "http://localhost:3000";

  try {
    const body = await request.json().catch(() => ({}));
    const res = await fetch(targetUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Origin": originHeader,
        "x-nexum-internal": "true",
        ...(user?.id ? { "x-user-id": user.id } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error(`[Freelancer Proxy PUT] Error forwarding to ${targetUrl}:`, err);
    return NextResponse.json(
      { success: false, error: "Backend service temporarily unavailable" },
      { status: 502 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");
  const user = await getCurrentUser();
  const targetUrl = `${BACKEND_URL}/api/freelancer/${path}${request.nextUrl.search}`;

  const cookieHeader = request.headers.get("cookie") || "";
  const originHeader =
    request.headers.get("origin") ||
    request.headers.get("referer") ||
    "http://localhost:3000";

  try {
    const res = await fetch(targetUrl, {
      method: "DELETE",
      headers: {
        "Origin": originHeader,
        "x-nexum-internal": "true",
        ...(user?.id ? { "x-user-id": user.id } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error(`[Freelancer Proxy DELETE] Error forwarding to ${targetUrl}:`, err);
    return NextResponse.json(
      { success: false, error: "Backend service temporarily unavailable" },
      { status: 502 }
    );
  }
}


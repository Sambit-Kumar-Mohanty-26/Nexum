import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAllOpenProjectsFromStore } from "@/lib/projects-store";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

const FALLBACK_RENDER_URL = "https://nexum-79g2.onrender.com";

function getTargetUrls(pathWithQuery: string): string[] {
  const isCloudOrProd =
    process.env.VERCEL === "1" ||
    process.env.NODE_ENV === "production" ||
    (typeof window === "undefined" && Boolean(process.env.AWS_REGION));

  const isLocalhost =
    !BACKEND_URL ||
    BACKEND_URL.includes("localhost") ||
    BACKEND_URL.includes("127.0.0.1");

  // In production / Vercel cloud serverless, never block on unreachable localhost
  if (isCloudOrProd && isLocalhost) {
    return [`${FALLBACK_RENDER_URL}/api/freelancer/${pathWithQuery}`];
  }

  const primary = `${BACKEND_URL}/api/freelancer/${pathWithQuery}`;
  if (isLocalhost && !BACKEND_URL.includes("onrender.com")) {
    return [primary, `${FALLBACK_RENDER_URL}/api/freelancer/${pathWithQuery}`];
  }
  return [primary];
}

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
  const cookieHeader = request.headers.get("cookie") || "";

  let effectiveUserId = user?.id;
  const rawCookieToken = request.cookies.get("nexum_session")?.value || "";
  if (!effectiveUserId && (rawCookieToken || cookieHeader)) {
    const rawVal = rawCookieToken || (cookieHeader.match(/nexum_session=([^;]+)/)?.[1] ?? "");
    if (rawVal) {
      try {
        const decoded = decodeURIComponent(rawVal);
        const [payloadEncoded] = decoded.split(".");
        if (payloadEncoded) {
          const raw = Buffer.from(payloadEncoded, "base64url").toString("utf-8");
          const parsed = JSON.parse(raw);
          if (parsed?.userId) {
            effectiveUserId = parsed.userId;
          }
        }
      } catch {}
    }
  }

  const search = request.nextUrl.search;
  const targetUrls = getTargetUrls(`${path}${search}`);

  const originHeader =
    request.headers.get("origin") ||
    request.headers.get("referer") ||
    "http://localhost:3000";

  for (const targetUrl of targetUrls) {
    try {
      const res = await fetch(targetUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Origin": originHeader,
          "x-nexum-internal": "true",
          ...(effectiveUserId ? { "x-user-id": effectiveUserId } : {}),
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(35000),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
      console.warn(`[Freelancer Proxy GET] ${targetUrl} returned HTTP ${res.status}`);
    } catch (err) {
      console.warn(`[Freelancer Proxy GET] Fetch failed for ${targetUrl}:`, err);
    }
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
  const targetUrls = getTargetUrls(path);

  const cookieHeader = request.headers.get("cookie") || "";
  let effectiveUserId = user?.id;
  const rawCookieToken = request.cookies.get("nexum_session")?.value || "";
  if (!effectiveUserId && (rawCookieToken || cookieHeader)) {
    const rawVal = rawCookieToken || (cookieHeader.match(/nexum_session=([^;]+)/)?.[1] ?? "");
    if (rawVal) {
      try {
        const decoded = decodeURIComponent(rawVal);
        const [payloadEncoded] = decoded.split(".");
        if (payloadEncoded) {
          const raw = Buffer.from(payloadEncoded, "base64url").toString("utf-8");
          const parsed = JSON.parse(raw);
          if (parsed?.userId) {
            effectiveUserId = parsed.userId;
          }
        }
      } catch {}
    }
  }
  const originHeader =
    request.headers.get("origin") ||
    request.headers.get("referer") ||
    "http://localhost:3000";

  let lastStatus = 502;
  let lastData: any = { success: false, error: "Backend service temporarily unavailable" };

  try {
    const contentType = request.headers.get("content-type") || "";
    let forwardBody: any;
    const forwardHeaders: Record<string, string> = {
      Origin: originHeader,
      "x-nexum-internal": "true",
      ...(effectiveUserId ? { "x-user-id": effectiveUserId } : {}),
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    };

    if (contentType.includes("multipart/form-data")) {
      forwardBody = await request.formData();
    } else {
      const body = await request.json().catch(() => ({}));
      forwardBody = JSON.stringify(body);
      forwardHeaders["Content-Type"] = "application/json";
    }

    for (const targetUrl of targetUrls) {
      try {
        const res = await fetch(targetUrl, {
          method: "POST",
          headers: forwardHeaders,
          body: forwardBody,
          cache: "no-store",
          signal: AbortSignal.timeout(35000),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok || res.status < 500) {
          return NextResponse.json(data, { status: res.status });
        }
        lastStatus = res.status;
        lastData = data;
      } catch (err) {
        console.warn(`[Freelancer Proxy POST] Fetch failed for ${targetUrl}:`, err);
      }
    }
    return NextResponse.json(lastData, { status: lastStatus });
  } catch (err) {
    console.error(`[Freelancer Proxy POST] Error:`, err);
    return NextResponse.json(lastData, { status: lastStatus });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const path = slug.join("/");
  const user = await getCurrentUser();
  const targetUrls = getTargetUrls(path);

  const cookieHeader = request.headers.get("cookie") || "";
  let effectiveUserId = user?.id;
  const rawCookieToken = request.cookies.get("nexum_session")?.value || "";
  if (!effectiveUserId && (rawCookieToken || cookieHeader)) {
    const rawVal = rawCookieToken || (cookieHeader.match(/nexum_session=([^;]+)/)?.[1] ?? "");
    if (rawVal) {
      try {
        const decoded = decodeURIComponent(rawVal);
        const [payloadEncoded] = decoded.split(".");
        if (payloadEncoded) {
          const raw = Buffer.from(payloadEncoded, "base64url").toString("utf-8");
          const parsed = JSON.parse(raw);
          if (parsed?.userId) {
            effectiveUserId = parsed.userId;
          }
        }
      } catch {}
    }
  }

  const originHeader =
    request.headers.get("origin") ||
    request.headers.get("referer") ||
    "http://localhost:3000";

  try {
    const body = await request.json().catch(() => ({}));
    for (const targetUrl of targetUrls) {
      try {
        const res = await fetch(targetUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Origin: originHeader,
            "x-nexum-internal": "true",
            ...(effectiveUserId ? { "x-user-id": effectiveUserId } : {}),
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
          body: JSON.stringify(body),
          cache: "no-store",
          signal: AbortSignal.timeout(35000),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok || res.status < 500) {
          return NextResponse.json(data, { status: res.status });
        }
      } catch (err) {
        console.warn(`[Freelancer Proxy PUT] Failed for ${targetUrl}:`, err);
      }
    }
    return NextResponse.json(
      { success: false, error: "Backend service temporarily unavailable" },
      { status: 502 }
    );
  } catch (err) {
    console.error(`[Freelancer Proxy PUT] Error:`, err);
    return NextResponse.json(
      { success: false, error: "Backend service temporarily unavailable" },
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
  const user = await getCurrentUser();
  const targetUrls = getTargetUrls(path);

  const cookieHeader = request.headers.get("cookie") || "";
  let effectiveUserId = user?.id;
  const rawCookieToken = request.cookies.get("nexum_session")?.value || "";
  if (!effectiveUserId && (rawCookieToken || cookieHeader)) {
    const rawVal = rawCookieToken || (cookieHeader.match(/nexum_session=([^;]+)/)?.[1] ?? "");
    if (rawVal) {
      try {
        const decoded = decodeURIComponent(rawVal);
        const [payloadEncoded] = decoded.split(".");
        if (payloadEncoded) {
          const raw = Buffer.from(payloadEncoded, "base64url").toString("utf-8");
          const parsed = JSON.parse(raw);
          if (parsed?.userId) {
            effectiveUserId = parsed.userId;
          }
        }
      } catch {}
    }
  }

  const originHeader =
    request.headers.get("origin") ||
    request.headers.get("referer") ||
    "http://localhost:3000";

  try {
    const body = await request.json().catch(() => ({}));
    for (const targetUrl of targetUrls) {
      try {
        const res = await fetch(targetUrl, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Origin: originHeader,
            "x-nexum-internal": "true",
            ...(effectiveUserId ? { "x-user-id": effectiveUserId } : {}),
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
          body: JSON.stringify(body),
          cache: "no-store",
          signal: AbortSignal.timeout(35000),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok || res.status < 500) {
          return NextResponse.json(data, { status: res.status });
        }
      } catch (err) {
        console.warn(`[Freelancer Proxy PATCH] Failed for ${targetUrl}:`, err);
      }
    }
    return NextResponse.json(
      { success: false, error: "Backend service temporarily unavailable" },
      { status: 502 }
    );
  } catch (err) {
    console.error(`[Freelancer Proxy PATCH] Error:`, err);
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
  const search = request.nextUrl.search;
  const targetUrls = getTargetUrls(`${path}${search}`);

  const cookieHeader = request.headers.get("cookie") || "";
  let effectiveUserId = user?.id;
  const rawCookieToken = request.cookies.get("nexum_session")?.value || "";
  if (!effectiveUserId && (rawCookieToken || cookieHeader)) {
    const rawVal = rawCookieToken || (cookieHeader.match(/nexum_session=([^;]+)/)?.[1] ?? "");
    if (rawVal) {
      try {
        const decoded = decodeURIComponent(rawVal);
        const [payloadEncoded] = decoded.split(".");
        if (payloadEncoded) {
          const raw = Buffer.from(payloadEncoded, "base64url").toString("utf-8");
          const parsed = JSON.parse(raw);
          if (parsed?.userId) {
            effectiveUserId = parsed.userId;
          }
        }
      } catch {}
    }
  }

  const originHeader =
    request.headers.get("origin") ||
    request.headers.get("referer") ||
    "http://localhost:3000";

  try {
    for (const targetUrl of targetUrls) {
      try {
        const res = await fetch(targetUrl, {
          method: "DELETE",
          headers: {
            Origin: originHeader,
            "x-nexum-internal": "true",
            ...(effectiveUserId ? { "x-user-id": effectiveUserId } : {}),
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
          cache: "no-store",
          signal: AbortSignal.timeout(35000),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok || res.status < 500) {
          return NextResponse.json(data, { status: res.status });
        }
      } catch (err) {
        console.warn(`[Freelancer Proxy DELETE] Failed for ${targetUrl}:`, err);
      }
    }
    return NextResponse.json(
      { success: false, error: "Backend service temporarily unavailable" },
      { status: 502 }
    );
  } catch (err) {
    console.error(`[Freelancer Proxy DELETE] Error:`, err);
    return NextResponse.json(
      { success: false, error: "Backend service temporarily unavailable" },
      { status: 502 }
    );
  }
}


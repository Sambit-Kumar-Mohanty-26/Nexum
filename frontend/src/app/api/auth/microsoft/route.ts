import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

export async function GET(request: NextRequest) {
  try {
    const backendRes = await fetch(`${BACKEND_URL}/api/auth/microsoft/url`, {
      method: "GET",
      cache: "no-store",
    });

    if (!backendRes.ok) {
      return NextResponse.redirect(
        new URL("/login?error=microsoft_service_unavailable", request.nextUrl.origin)
      );
    }

    const data = await backendRes.json();
    const destinationUrl = data.url || "/login?error=microsoft_not_configured";

    const response = NextResponse.redirect(
      destinationUrl.startsWith("http")
        ? destinationUrl
        : new URL(destinationUrl, request.nextUrl.origin)
    );

    // Forward any state cookie set by Express
    const setCookie = backendRes.headers.get("set-cookie");
    if (setCookie) {
      response.headers.set("set-cookie", setCookie);
    }

    return response;
  } catch (err) {
    console.error("Microsoft OAuth initiation error:", err);
    return NextResponse.redirect(
      new URL("/login?error=microsoft_initiation_failed", request.nextUrl.origin)
    );
  }
}


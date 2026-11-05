import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();

    // Forward to backend
    try {
      const res = await fetch(`${BACKEND_URL}/api/client/projects/ai/assist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.id ? { "x-user-id": user.id } : {}),
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const json = await res.json();
        return NextResponse.json(json);
      }
    } catch (proxyErr) {
      console.warn("[Frontend API] Proxy to backend failed, using Next.js assistant fallback:", proxyErr);
    }

    // Direct fallback if backend is unreachable
    const { action, title, overview } = body;
    if (action === "IMPROVE_OVERVIEW") {
      const base = (overview || "").trim() || `Production-grade architecture and implementation for ${title || "the project"}.`;
      return NextResponse.json({
        success: true,
        data: {
          improvedOverview: `${base}\n\nTechnical Architecture & Standards:\n• Sub-200ms API latency targets with idempotent payload handling\n• Strict TypeScript typings with zero unchecked runtime exceptions\n• Dual SHA-256 state tracking for transparent deliverable verification\n• Comprehensive unit & integration test coverage with automated assertion logs`,
        },
      });
    }

    if (action === "SUGGEST_SKILLS") {
      return NextResponse.json({
        success: true,
        data: {
          suggestedSkills: ["TypeScript", "Next.js", "Docker", "PostgreSQL", "Redis", "TailwindCSS"],
        },
      });
    }

    if (action === "REFINE_REQUIREMENTS" || action === "GENERATE_REQUIREMENTS") {
      const baseReq = body.existingRequirements || "• Develop core application modules";
      return NextResponse.json({
        success: true,
        data: {
          refinedRequirements: `${baseReq}\n• Build REST/GraphQL backend APIs with automated test assert logs\n• Adhere to Dual SHA-256 state consensus and cryptographic ledger audit\n• Implement role-based access control and strict Zod schema validation\n• Comprehensive test suite with >90% coverage on critical payment and milestone paths`,
          suggestedScope: ["Frontend development", "Backend development", "Database design", "Testing and deployment"],
        },
      });
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Assistant request failed";
    return NextResponse.json(
      {
        error: {
          code: "AI_ASSIST_ERROR",
          message: msg,
          details: null,
        },
      },
      { status: 500 }
    );
  }
}


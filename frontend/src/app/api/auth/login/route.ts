import { NextResponse } from "next/server";
import { DEMO_USERS, setSession, UserRole } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { role, personaKey, email, password } = body as {
      role?: UserRole;
      personaKey?: string;
      email?: string;
      password?: string;
    };

    if (email !== undefined && email.trim() === "") {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 }
      );
    }

    if (password !== undefined && password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters." },
        { status: 400 }
      );
    }

    let targetUser = null;

    if (personaKey && DEMO_USERS[personaKey]) {
      targetUser = DEMO_USERS[personaKey];
    } else if (email) {
      targetUser = Object.values(DEMO_USERS).find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    } else if (role) {
      if (role === "CLIENT") {
        targetUser = DEMO_USERS.CLIENT;
      } else if (role === "FREELANCER") {
        targetUser = DEMO_USERS.FREELANCER_A;
      }
    }

    if (!targetUser) {
      return NextResponse.json(
        {
          error: email
            ? `No workspace found for "${email}". Use alex.rivera@proofloop.demo (Client) or rohan.verma@proofloop.demo (Freelancer).`
            : "Invalid persona or user not found. Select Client or Freelancer A.",
        },
        { status: 400 }
      );
    }

    if (!targetUser.canLogin) {
      return NextResponse.json(
        {
          error: `${targetUser.name} is a seeded candidate profile for match discovery and cannot be directly logged into.`,
        },
        { status: 403 }
      );
    }

    await setSession(targetUser);

    return NextResponse.json({
      success: true,
      user: targetUser,
      message: `Signed in as ${targetUser.name} (${targetUser.role})`,
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json({ error: "Internal authentication error" }, { status: 500 });
  }
}

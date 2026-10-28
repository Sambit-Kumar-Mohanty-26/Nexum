import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listConversations,
  createConversation,
  searchConversations,
} from "@/lib/ai/conversation-store";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    const convs = query
      ? searchConversations(user.id, query)
      : listConversations(user.id);

    return NextResponse.json({ conversations: convs });
  } catch (err) {
    console.error("GET /api/assistant/conversations error:", err);
    return NextResponse.json(
      { error: "Failed to list conversations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const title = typeof body.title === "string" ? body.title : "New Conversation";

    const conv = createConversation(user.id, title);
    return NextResponse.json({ conversation: conv }, { status: 201 });
  } catch (err) {
    console.error("POST /api/assistant/conversations error:", err);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}

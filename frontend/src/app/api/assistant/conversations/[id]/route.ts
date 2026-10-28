import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getConversation,
  renameConversation,
  deleteConversation,
} from "@/lib/ai/conversation-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const conv = getConversation(user.id, id);
    if (!conv) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ conversation: conv });
  } catch (err) {
    console.error("GET /api/assistant/conversations/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const updated = renameConversation(user.id, id, body.title);
    if (!updated) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ conversation: updated });
  } catch (err) {
    console.error("PATCH /api/assistant/conversations/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to rename conversation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const deleted = deleteConversation(user.id, id);
    if (!deleted) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/assistant/conversations/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to delete conversation" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getConversation,
  createConversation,
  addMessage,
} from "@/lib/ai/conversation-store";
import { generateGeminiResponse } from "@/lib/ai/gemini";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let conversationId = body.conversationId as string | undefined;
    const content = body.content as string | undefined;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Message content cannot be empty" },
        { status: 400 }
      );
    }

    // If no conversationId provided or conversation doesn't exist, create one
    if (!conversationId) {
      const newConv = createConversation(user.id);
      conversationId = newConv.id;
    }

    let conv = getConversation(user.id, conversationId);
    if (!conv) {
      const newConv = createConversation(user.id);
      conversationId = newConv.id;
      conv = getConversation(user.id, conversationId);
    }

    if (!conv) {
      return NextResponse.json(
        { error: "Could not create or find conversation" },
        { status: 500 }
      );
    }

    // 1. Persist the user message
    const userMsg = addMessage(user.id, conversationId, "user", content.trim());
    if (!userMsg) {
      return NextResponse.json(
        { error: "Failed to persist user message" },
        { status: 500 }
      );
    }

    // Reload conversation to get full context including newly added message
    const updatedConv = getConversation(user.id, conversationId);
    const messagesHistory = updatedConv?.messages || [userMsg];

    // 2. Query Gemini
    let aiResponse;
    try {
      aiResponse = await generateGeminiResponse(messagesHistory);
    } catch (err: unknown) {
      const error = err as Error;
      // Persist error message for transparency
      const errMsg = addMessage(
        user.id,
        conversationId,
        "assistant",
        `⚠️ **Gemini Generation Error:** ${error.message}\n\nPlease verify your network connection or API configuration and retry.`
      );
      return NextResponse.json(
        {
          error: error.message,
          conversationId,
          userMessage: userMsg,
          assistantMessage: errMsg,
        },
        { status: 502 }
      );
    }

    // 3. Persist the completed assistant response
    const assistantMsg = addMessage(
      user.id,
      conversationId,
      "assistant",
      aiResponse.text
    );

    return NextResponse.json({
      success: true,
      conversationId,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      model: aiResponse.model,
      isFallback: aiResponse.isFallback,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("POST /api/assistant/chat error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

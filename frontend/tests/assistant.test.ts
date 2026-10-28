import { describe, it, expect } from "vitest";
import {
  createConversation,
  getConversation,
  listConversations,
  renameConversation,
  deleteConversation,
  addMessage,
  searchConversations,
} from "../src/lib/ai/conversation-store";
import {
  getClientProjectContext,
  buildSystemPrompt,
  MODEL_FALLBACK_CASCADE,
} from "../src/lib/ai/gemini";

describe("Nexum AI Assistant & Persistent Conversation Store", () => {
  const TEST_USER_A = "usr_client_alex_test";
  const TEST_USER_B = "usr_other_tenant_test";

  it("creates a conversation with default title and isolates it to the user", () => {
    const conv = createConversation(TEST_USER_A, "Initial Scope Brief");
    expect(conv.id).toBeDefined();
    expect(conv.userId).toBe(TEST_USER_A);
    expect(conv.title).toBe("Initial Scope Brief");
    expect(conv.messageCount).toBe(0);

    // Tenant B cannot access Tenant A's conversation
    const accessedByB = getConversation(TEST_USER_B, conv.id);
    expect(accessedByB).toBeNull();

    // Tenant A can access
    const accessedByA = getConversation(TEST_USER_A, conv.id);
    expect(accessedByA).not.toBeNull();
    expect(accessedByA?.title).toBe("Initial Scope Brief");

    const userList = listConversations(TEST_USER_A);
    expect(userList.length).toBeGreaterThan(0);
    expect(userList.some((c) => c.id === conv.id)).toBe(true);
  });

  it("adds user and assistant messages and updates messageCount", () => {
    const conv = createConversation(TEST_USER_A, "Milestone Q&A");
    
    const userMsg = addMessage(
      TEST_USER_A,
      conv.id,
      "user",
      "What is the status of Milestone 2?"
    );
    expect(userMsg).not.toBeNull();
    expect(userMsg?.role).toBe("user");
    expect(userMsg?.content).toBe("What is the status of Milestone 2?");

    const aiMsg = addMessage(
      TEST_USER_A,
      conv.id,
      "assistant",
      "Milestone 2 is awaiting your review. Pre-funded in Sandbox Order #6DE714998H998261C."
    );
    expect(aiMsg).not.toBeNull();
    expect(aiMsg?.role).toBe("assistant");

    const detail = getConversation(TEST_USER_A, conv.id);
    expect(detail?.messages.length).toBe(2);
    expect(detail?.messageCount).toBe(2);
    expect(detail?.lastMessageSnippet).toContain("Milestone 2 is awaiting your review");
  });

  it("renames conversation title cleanly", () => {
    const conv = createConversation(TEST_USER_A, "Temporary Title");
    const renamed = renameConversation(TEST_USER_A, conv.id, "Bilateral Contract Review");
    expect(renamed?.title).toBe("Bilateral Contract Review");

    const detail = getConversation(TEST_USER_A, conv.id);
    expect(detail?.title).toBe("Bilateral Contract Review");
  });

  it("searches conversations by title and message content", () => {
    const conv = createConversation(TEST_USER_A, "PayPal Integration Questions");
    addMessage(TEST_USER_A, conv.id, "user", "Need info about webhook idempotency");

    const searchResults = searchConversations(TEST_USER_A, "idempotency");
    expect(searchResults.some((c) => c.id === conv.id)).toBe(true);

    const noResults = searchConversations(TEST_USER_A, "nonexistent_query_xyz");
    expect(noResults.some((c) => c.id === conv.id)).toBe(false);
  });

  it("deletes a conversation safely", () => {
    const conv = createConversation(TEST_USER_A, "To Be Deleted");
    const deleted = deleteConversation(TEST_USER_A, conv.id);
    expect(deleted).toBe(true);

    const detail = getConversation(TEST_USER_A, conv.id);
    expect(detail).toBeNull();
  });

  it("builds authorized client project context with honest accounting facts", () => {
    const ctx = getClientProjectContext();
    expect(ctx.projectName).toBe("Bilateral E-Commerce Payment Rails");
    expect(ctx.budgetCeiling).toBe("$4,500.00 USD");
    expect(ctx.capturedAmount).toBe("$1,200.00 USD");
    expect(ctx.preFundedAmount).toBe("$1,500.00 USD");
    expect(ctx.reserveAmount).toBe("$1,800.00 USD");
    expect(ctx.contractor.name).toBe("Rohan Verma");
    expect(ctx.milestones.length).toBe(4);
  });

  it("constructs system prompt with AI safety boundaries and accounting rules", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Bilateral E-Commerce Payment Rails");
    expect(prompt).toContain("canonical_v1.2_#9f8c2b7e");
    expect(prompt).toContain("You CANNOT independently approve agreements");
    expect(prompt).toContain("PayPal Sandbox captured order confirms payment provider authorization");
  });

  it("defines a resilient multi-model fallback cascade using latest modern Gemini models", () => {
    expect(MODEL_FALLBACK_CASCADE.length).toBeGreaterThanOrEqual(4);
    expect(MODEL_FALLBACK_CASCADE).toContain("gemini-2.0-flash");
    expect(MODEL_FALLBACK_CASCADE).toContain("gemini-2.5-flash");
    expect(MODEL_FALLBACK_CASCADE).toContain("gemini-1.5-pro");
  });
});

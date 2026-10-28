export type MessageRole = "user" | "assistant" | "system";

export interface AssistantMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: string; // ISO string
  status?: "sent" | "generating" | "error";
  error?: string;
}

export interface AssistantConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  messageCount: number;
  lastMessageSnippet?: string;
}

export interface ConversationWithMessages extends AssistantConversation {
  messages: AssistantMessage[];
}

import fs from "fs";
import path from "path";
import {
  AssistantConversation,
  AssistantMessage,
  ConversationWithMessages,
  MessageRole,
} from "./conversation-types";

interface StorageSchema {
  conversations: Record<string, AssistantConversation>;
  messages: Record<string, AssistantMessage[]>; // Keyed by conversationId
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "conversations.json");

function ensureStorage(): StorageSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initial: StorageSchema = { conversations: {}, messages: {} };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as StorageSchema;
  } catch (err) {
    console.error("Error reading conversation storage:", err);
    return { conversations: {}, messages: {} };
  }
}

function saveStorage(data: StorageSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error("Error saving conversation storage:", err);
  }
}

export function listConversations(userId: string): AssistantConversation[] {
  const data = ensureStorage();
  const list = Object.values(data.conversations).filter((c) => c.userId === userId);
  return list.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getConversation(
  userId: string,
  conversationId: string
): ConversationWithMessages | null {
  const data = ensureStorage();
  const conv = data.conversations[conversationId];
  if (!conv || conv.userId !== userId) {
    return null;
  }
  const messages = data.messages[conversationId] || [];
  return {
    ...conv,
    messages: [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    ),
  };
}

export function createConversation(
  userId: string,
  initialTitle = "New Conversation"
): ConversationWithMessages {
  const data = ensureStorage();
  const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const conv: AssistantConversation = {
    id,
    userId,
    title: initialTitle,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };

  data.conversations[id] = conv;
  data.messages[id] = [];
  saveStorage(data);

  return { ...conv, messages: [] };
}

export function renameConversation(
  userId: string,
  conversationId: string,
  title: string
): AssistantConversation | null {
  const data = ensureStorage();
  const conv = data.conversations[conversationId];
  if (!conv || conv.userId !== userId) {
    return null;
  }

  conv.title = title.trim() || "Untitled Conversation";
  conv.updatedAt = new Date().toISOString();
  saveStorage(data);
  return conv;
}

export function deleteConversation(userId: string, conversationId: string): boolean {
  const data = ensureStorage();
  const conv = data.conversations[conversationId];
  if (!conv || conv.userId !== userId) {
    return false;
  }

  delete data.conversations[conversationId];
  delete data.messages[conversationId];
  saveStorage(data);
  return true;
}

export function addMessage(
  userId: string,
  conversationId: string,
  role: MessageRole,
  content: string
): AssistantMessage | null {
  const data = ensureStorage();
  const conv = data.conversations[conversationId];
  if (!conv || conv.userId !== userId) {
    return null;
  }

  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const msg: AssistantMessage = {
    id: msgId,
    conversationId,
    role,
    content,
    createdAt: now,
    status: "sent",
  };

  if (!data.messages[conversationId]) {
    data.messages[conversationId] = [];
  }
  data.messages[conversationId].push(msg);

  // Update conversation metadata
  conv.updatedAt = now;
  conv.messageCount = data.messages[conversationId].length;
  conv.lastMessageSnippet = content.substring(0, 80);

  // Auto-generate title on first user message if title is default
  if (conv.title === "New Conversation" && role === "user") {
    const cleanSnippet = content.trim().replace(/\n+/g, " ");
    conv.title =
      cleanSnippet.length > 36 ? `${cleanSnippet.substring(0, 36)}...` : cleanSnippet;
  }

  saveStorage(data);
  return msg;
}

export function searchConversations(
  userId: string,
  query: string
): AssistantConversation[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return listConversations(userId);

  const data = ensureStorage();
  const userConvs = Object.values(data.conversations).filter((c) => c.userId === userId);

  return userConvs.filter((conv) => {
    if (conv.title.toLowerCase().includes(clean)) return true;
    const msgs = data.messages[conv.id] || [];
    return msgs.some((m) => m.content.toLowerCase().includes(clean));
  });
}

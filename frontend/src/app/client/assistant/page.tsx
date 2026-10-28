"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Plus,
  Search,
  MessageSquare,
  Send,
  Trash2,
  Edit2,
  Copy,
  Check,
  RefreshCw,
  Menu,
  X,
  FileText,
  Clock,
  ArrowRight,
  Code2,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import { useAuth } from "@/context/AuthContext";
import {
  AssistantConversation,
  AssistantMessage,
  ConversationWithMessages,
} from "@/lib/ai/conversation-types";

const SUGGESTED_PROMPTS = [
  {
    icon: Search,
    title: "Find freelancers for my project",
    prompt: "Find freelancers for my active project who have verified PayPal REST v2 and Next.js experience.",
  },
  {
    icon: Clock,
    title: "Summarize my milestone progress",
    prompt: "Summarize my milestone progress and tell me what deliverable requires my immediate attention.",
  },
  {
    icon: FileText,
    title: "Explain the current payment status",
    prompt: "Explain the current payment status, including captured funds, pre-funded escrow, and reserves.",
  },
  {
    icon: Code2,
    title: "Summarize my active agreement",
    prompt: "Summarize my active agreement, the canonical hash #9f8c2b7e, and how dual-approval works.",
  },
  {
    icon: Sparkles,
    title: "Help me prepare a project scope",
    prompt: "Help me prepare a project scope and acceptance criteria for Milestone 3 state machine replay.",
  },
  {
    icon: ArrowRight,
    title: "Explain an audit trail event",
    prompt: "Explain the recent audit events and verify why PayPal Sandbox order #6DE714998H998261C was logged.",
  },
];

export default function AssistantPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Conversations state
  const [conversations, setConversations] = useState<AssistantConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<ConversationWithMessages | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

  // Chat message state
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [activeModel, setActiveModel] = useState<string>("gemini-2.0-flash");
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit title state
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");

  // Mobile drawer state
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const counterRef = useRef(100);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Auth enforcement
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "CLIENT") {
        router.push("/dashboard");
      }
    }
  }, [user, isLoading, router]);

  // Load conversation list helper (invoked after user actions)
  const refreshConversations = useCallback(async (selectId?: string) => {
    try {
      const res = await fetch("/api/assistant/conversations");
      if (res.ok) {
        const data = await res.json();
        const convList: AssistantConversation[] = data.conversations || [];
        setConversations(convList);
        if (selectId) {
          setSelectedConvId(selectId);
        }
      }
    } catch (err) {
      console.error("Failed to refresh conversations:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (!user || user.role !== "CLIENT") return;
    let isMounted = true;

    async function initialFetch() {
      try {
        setIsHistoryLoading(true);
        const res = await fetch("/api/assistant/conversations");
        if (res.ok && isMounted) {
          const data = await res.json();
          const convList: AssistantConversation[] = data.conversations || [];
          setConversations(convList);
          if (convList.length > 0) {
            setSelectedConvId((cur) => cur || convList[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch conversations:", err);
      } finally {
        if (isMounted) setIsHistoryLoading(false);
      }
    }

    initialFetch();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Load selected conversation detail
  useEffect(() => {
    if (!selectedConvId) return;

    let isMounted = true;
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/assistant/conversations/${selectedConvId}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setActiveConversation(data.conversation);
        }
      } catch (err) {
        console.error("Error loading conversation detail:", err);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedConvId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (activeConversation?.messages && activeConversation.messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConversation?.messages, isSending]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  // Create new conversation
  const handleNewChat = async () => {
    try {
      const res = await fetch("/api/assistant/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Conversation" }),
      });
      if (res.ok) {
        const data = await res.json();
        const newConv = data.conversation;
        setConversations((prev) => [newConv, ...prev]);
        setSelectedConvId(newConv.id);
        setActiveConversation(newConv);
        setIsMobileHistoryOpen(false);
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      const res = await fetch(`/api/assistant/conversations/${convId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (selectedConvId === convId) {
          const remaining = conversations.filter((c) => c.id !== convId);
          if (remaining.length > 0) {
            setSelectedConvId(remaining[0].id);
          } else {
            setSelectedConvId(null);
            setActiveConversation(null);
          }
        }
        showToast("Conversation deleted.");
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  // Save renamed title
  const handleSaveRename = async (convId: string, e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editTitleInput.trim()) {
      setEditingConvId(null);
      return;
    }

    try {
      const res = await fetch(`/api/assistant/conversations/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitleInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: data.conversation.title } : c))
        );
        if (activeConversation && activeConversation.id === convId) {
          setActiveConversation((prev) =>
            prev ? { ...prev, title: data.conversation.title } : null
          );
        }
        setEditingConvId(null);
        showToast("Conversation renamed.");
      }
    } catch (err) {
      console.error("Failed to rename conversation:", err);
    }
  };

  // Send message
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputValue.trim();
    if (!textToSend || isSending) return;

    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setIsSending(true);

    counterRef.current += 1;
    const tempMsgId = `temp_msg_${counterRef.current}`;
    const tempConvId = selectedConvId || `temp_conv_${counterRef.current}`;

    // Optimistically update conversation UI with user message
    const tempUserMsg: AssistantMessage = {
      id: tempMsgId,
      conversationId: tempConvId,
      role: "user",
      content: textToSend,
      createdAt: new Date().toISOString(),
      status: "sent",
    };

    setActiveConversation((prev) => {
      if (!prev) {
        return {
          id: tempConvId,
          userId: user?.id || "usr_client_alex",
          title: textToSend.substring(0, 36),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          messageCount: 1,
          messages: [tempUserMsg],
        };
      }
      return {
        ...prev,
        messages: [...prev.messages, tempUserMsg],
      };
    });

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConvId,
          content: textToSend,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate AI response");
      }

      // Replace or refresh active conversation
      if (data.conversationId && data.conversationId !== selectedConvId) {
        setSelectedConvId(data.conversationId);
      }

      // Reload detail
      const detailRes = await fetch(`/api/assistant/conversations/${data.conversationId}`);
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        setActiveConversation(detailData.conversation);
      }

      if (data.model) {
        setActiveModel(data.model);
      }

      // Refresh list to update titles/timestamps
      refreshConversations(data.conversationId);
    } catch (err: unknown) {
      const error = err as Error;
      showToast(error.message || "Error communicating with Gemini");
    } finally {
      setIsSending(false);
    }
  };

  // Copy assistant response
  const handleCopy = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
    showToast("Response copied to clipboard.");
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Global Navigation Sidebar */}
      <DashboardSidebar
        currentRole="CLIENT"
        activeTab="assistant"
        onTabChange={(tab) => {
          if (tab === "overview") router.push("/client/dashboard");
          else if (tab === "freelancers") router.push("/client/freelancers");
          else router.push(`/client/dashboard?tab=${tab}`);
        }}
      />

      {/* 2. Main Client Workspace Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <DashboardTopHeader
          roleLabel="Buyer Workspace"
          title="Nexum AI Workspace"
          subtitle="Modern Gemini 2.0 / 2.5 Multi-Model Cascade"
        />

        {/* 3. Dedicated ChatGPT-Style 2-Column AI Region */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* A. Conversation History Sidebar (Desktop & Mobile Drawer) */}
          <aside
            className={`
              w-72 sm:w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 z-20 transition-all duration-200
              ${
                isMobileHistoryOpen
                  ? "absolute inset-y-0 left-0 shadow-2xl flex"
                  : "hidden md:flex"
              }
            `}
          >
            {/* Header: New Chat & Search */}
            <div className="p-3.5 border-b border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Conversation</span>
                </button>

                {isMobileHistoryOpen && (
                  <button
                    type="button"
                    onClick={() => setIsMobileHistoryOpen(false)}
                    className="p-2 ml-2 rounded-xl text-slate-500 hover:bg-slate-100 md:hidden"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                Recent Chats ({filteredConversations.length})
              </div>

              {isHistoryLoading ? (
                <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Loading history...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  {searchQuery ? "No matching conversations." : "No saved chats yet."}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = selectedConvId === conv.id;
                  const isEditing = editingConvId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setSelectedConvId(conv.id);
                        setIsMobileHistoryOpen(false);
                      }}
                      className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition cursor-pointer ${
                        isSelected
                          ? "bg-blue-50 text-blue-900 font-semibold border border-blue-200"
                          : "text-slate-700 hover:bg-slate-100/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1">
                        <MessageSquare
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? "text-blue-600" : "text-slate-400"
                          }`}
                        />
                        {isEditing ? (
                          <form
                            onSubmit={(e) => handleSaveRename(conv.id, e)}
                            className="flex-1"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editTitleInput}
                              onChange={(e) => setEditTitleInput(e.target.value)}
                              onBlur={(e) => handleSaveRename(conv.id, e)}
                              className="w-full px-1.5 py-0.5 rounded bg-white border border-blue-400 text-xs text-slate-900 focus:outline-none"
                            />
                          </form>
                        ) : (
                          <span className="truncate">{conv.title}</span>
                        )}
                      </div>

                      {/* Action buttons (rename & delete) */}
                      {!isEditing && (
                        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            title="Rename"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingConvId(conv.id);
                              setEditTitleInput(conv.title);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={(e) => handleDeleteConversation(conv.id, e)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Persistent Ledger Store
              </span>
              <span className="font-mono text-[10px] text-slate-400">JSON-v1.2</span>
            </div>
          </aside>

          {/* B. Main Conversation Workspace */}
          <main className="flex-1 flex flex-col bg-white overflow-hidden relative">
            
            {/* Top Assistant Bar */}
            <div className="h-12 border-b border-slate-100 px-4 sm:px-6 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsMobileHistoryOpen(true)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden"
                  title="View chat history"
                >
                  <Menu className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white grid place-items-center">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {activeConversation?.title || "Nexum AI Workspace"}
                  </span>
                </div>
              </div>

              {/* Model Pill */}
              <div className="flex items-center gap-2">
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200"
                  title="Modern Multi-Model Cascade Active: Gemini 2.0 Flash → 2.5 Flash → 2.0 Flash Lite → 1.5 Pro → 1.5 Flash"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{activeModel}</span>
                </div>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
              
              {/* If no conversation or messages, show Welcome State */}
              {(!activeConversation || activeConversation.messages.length === 0) ? (
                <div className="max-w-2xl mx-auto py-8 sm:py-12 space-y-8 animate-in fade-in duration-300">
                  {/* Hero Intro */}
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 grid place-items-center mx-auto mb-3 shadow-xs">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      How can Nexum help you move your project forward?
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                      Intelligent copilot for <strong className="text-slate-800">Horizon Commerce LLC</strong>. Ask about milestones, payment rails, code PRs, or project scopes.
                    </p>
                  </div>

                  {/* 6 Suggested Prompt Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SUGGESTED_PROMPTS.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(item.prompt)}
                          className="p-3.5 rounded-2xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 text-left transition shadow-xs group cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-blue-700">
                            <span className="flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 text-blue-600" />
                              <span>{item.title}</span>
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition -translate-x-0.5 group-hover:translate-x-0" />
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {item.prompt}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Active Message History */
                <div className="max-w-3xl mx-auto space-y-6">
                  {activeConversation.messages.map((msg) => {
                    const isUser = msg.role === "user";

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        {/* Assistant Avatar */}
                        {!isUser && (
                          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white grid place-items-center shrink-0 mt-0.5 shadow-xs">
                            <Sparkles className="w-4 h-4" />
                          </div>
                        )}

                        <div className={`space-y-1.5 max-w-[85%] sm:max-w-[78%]`}>
                          {/* Bubble Container */}
                          <div
                            className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                              isUser
                                ? "bg-blue-600 text-white rounded-tr-xs shadow-xs"
                                : "bg-slate-50 border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-2xs"
                            }`}
                          >
                            <div className="whitespace-pre-wrap font-sans">
                              {msg.content}
                            </div>
                          </div>

                          {/* Footer & Copy Action */}
                          {!isUser && (
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
                              <span>Nexum Copilot</span>
                              <span>·</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(msg.id, msg.content)}
                                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                              >
                                {copiedMsgId === msg.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-600">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Thinking/Generating Indicator */}
                  {isSending && (
                    <div className="flex gap-3.5 justify-start">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white grid place-items-center shrink-0 shadow-xs animate-pulse">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="p-3.5 rounded-2xl rounded-tl-xs bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                        <span>Querying Gemini 1.5 with project consensus state...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

            </div>

            {/* C. Message Composer Area (Sticky Bottom) */}
            <div className="border-t border-slate-200 bg-white p-4 sm:p-5 shrink-0">
              <div className="max-w-3xl mx-auto space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="relative flex items-end gap-2 p-2 rounded-2xl border border-slate-300 focus-within:border-blue-600 bg-white shadow-xs transition"
                >
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask Nexum AI anything about your milestones, payment rails, or code review..."
                    disabled={isSending}
                    className="w-full max-h-40 p-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-transparent resize-none focus:outline-none"
                  />

                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isSending}
                    className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shrink-0 cursor-pointer shadow-xs"
                    title="Send message (Enter)"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                {/* Safety & Compliance Notice */}
                <p className="text-[10px] sm:text-[11px] text-center text-slate-400">
                  Nexum AI provides analysis and drafts. Consequential milestone approvals and payment captures require explicit client authorization.
                </p>
              </div>
            </div>

          </main>

        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

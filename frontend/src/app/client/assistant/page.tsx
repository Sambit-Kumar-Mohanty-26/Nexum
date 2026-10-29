"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  Copy,
  Check,
  RefreshCw,
  Menu,
  X,
  Clock,
  ArrowRight,
  Code2,
  Users,
  CreditCard,
  ShieldCheck,
  Lock,
  CornerDownLeft,
  Activity,
  Layers,
  Bot,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { useAuth } from "@/context/AuthContext";
import {
  AssistantConversation,
  AssistantMessage,
  ConversationWithMessages,
} from "@/lib/ai/conversation-types";

interface PromptCardSpec {
  category: string;
  badgeClass: string;
  iconBg: string;
  iconColor: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  prompt: string;
  description: string;
}

const SUGGESTED_PROMPTS: PromptCardSpec[] = [
  {
    category: "TALENT MATCHING",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    iconBg: "bg-blue-100/80",
    iconColor: "text-[#245BFF]",
    icon: Users,
    title: "Find verified freelancers",
    description: "Match active project needs with freelancers skilled in PayPal REST v2, Next.js, and smart escrow.",
    prompt: "Find freelancers for my active project who have verified PayPal REST v2 and Next.js experience.",
  },
  {
    category: "DELIVERABLES",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconBg: "bg-emerald-100/80",
    iconColor: "text-emerald-600",
    icon: Clock,
    title: "Audit milestone progress",
    description: "Review deliverable approval states and check what requires immediate client verification.",
    prompt: "Summarize my milestone progress and tell me what deliverable requires my immediate attention.",
  },
  {
    category: "PAYMENT RAILS",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    iconBg: "bg-amber-100/80",
    iconColor: "text-amber-600",
    icon: CreditCard,
    title: "Explain payment & escrow status",
    description: "Inspect captured funds ($3,000), pre-funded escrow ($5,000), and pending custody reserves.",
    prompt: "Explain the current payment status, including captured funds, pre-funded escrow, and reserves.",
  },
  {
    category: "CONSENSUS LOCK",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    iconBg: "bg-indigo-100/80",
    iconColor: "text-indigo-600",
    icon: Code2,
    title: "Review agreement #9f8c2b7e",
    description: "Verify the dual SHA-256 agreement hash, canonical terms, and bilateral client/freelancer signatures.",
    prompt: "Summarize my active agreement, the canonical hash #9f8c2b7e, and how dual-approval works.",
  },
  {
    category: "PROJECT SCOPE",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    iconBg: "bg-purple-100/80",
    iconColor: "text-purple-600",
    icon: Sparkles,
    title: "Draft milestone acceptance scope",
    description: "Generate structured acceptance criteria and testing checklist for Milestone 3 state replay.",
    prompt: "Help me prepare a project scope and acceptance criteria for Milestone 3 state machine replay.",
  },
  {
    category: "AUDIT EVIDENCE",
    badgeClass: "bg-cyan-50 text-cyan-800 border-cyan-200",
    iconBg: "bg-cyan-100/80",
    iconColor: "text-cyan-700",
    icon: Activity,
    title: "Verify audit trail event",
    description: "Audit immutable transaction logs and verify why PayPal Sandbox order #6DF71499BH988261C was captured.",
    prompt: "Explain the recent audit events and verify why PayPal Sandbox order #6DF71499BH988261C was logged.",
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
  const [activeModel, setActiveModel] = useState<string>("gemini-3.8-flash");
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
    <div className="min-h-screen bg-[#F6F8FC] text-slate-900 flex font-sans selection:bg-[#245BFF] selection:text-white">
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
          subtitle="Intelligent Copilot · Gemini 3.8 Multi-Model Cascade"
        />

        {/* 3. Dedicated ChatGPT/Copilot 2-Column AI Workspace */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* A. Conversation History Sidebar (Desktop & Mobile Drawer) */}
          <aside
            className={`
              w-72 sm:w-80 border-r border-[#E3EAF3] bg-[#F8FAFD] flex flex-col shrink-0 z-20 transition-all duration-200
              ${
                isMobileHistoryOpen
                  ? "absolute inset-y-0 left-0 shadow-2xl flex bg-white"
                  : "hidden md:flex"
              }
            `}
          >
            {/* Header: New Chat & Search */}
            <div className="p-4 border-b border-[#E3EAF3] bg-white space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="flex-1 flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-[#245BFF] hover:bg-[#1A4EE5] text-white font-semibold text-xs transition shadow-xs hover:shadow-sm cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>New Conversation</span>
                  </span>
                  <span className="text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded font-medium">
                    ⌘K
                  </span>
                </button>

                {isMobileHistoryOpen && (
                  <button
                    type="button"
                    onClick={() => setIsMobileHistoryOpen(false)}
                    className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 md:hidden"
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
                  className="w-full pl-8.5 pr-7 py-2 rounded-xl border border-[#E3EAF3] bg-[#F8FAFD] text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#245BFF] focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="px-2 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Recent Sessions ({filteredConversations.length})</span>
                <span className="text-[9px] lowercase font-normal text-slate-400">auto-saved</span>
              </div>

              {isHistoryLoading ? (
                <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#245BFF]" />
                  <span>Loading sessions...</span>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {searchQuery ? "No matching conversations found." : "No saved chats yet."}
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
                      className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white text-blue-900 font-semibold shadow-2xs border border-blue-200/90"
                          : "text-slate-700 hover:bg-slate-200/50 hover:text-slate-900 border border-transparent"
                      }`}
                    >
                      {/* Left indicator bar for active item */}
                      {isSelected && (
                        <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-[#245BFF]" />
                      )}

                      <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-1 pl-1">
                        <MessageSquare
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected ? "text-[#245BFF]" : "text-slate-400 group-hover:text-slate-600"
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
                              className="w-full px-2 py-0.5 rounded-lg bg-white border border-[#245BFF] text-xs text-slate-900 focus:outline-none"
                            />
                          </form>
                        ) : (
                          <span className="truncate">{conv.title}</span>
                        )}
                      </div>

                      {/* Action buttons (rename & delete) */}
                      {!isEditing && (
                        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            title="Rename"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingConvId(conv.id);
                              setEditTitleInput(conv.title);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={(e) => handleDeleteConversation(conv.id, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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

            {/* Sidebar Security & Sync Footer */}
            <div className="p-3.5 border-t border-[#E3EAF3] bg-white text-[11px] text-slate-600 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Dual SHA-256 Ledger
                </span>
                <span className="font-mono text-[10px] text-slate-400">v1.2</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Consensus lock synchronized with PayPal Sandbox REST v2 orders.
              </p>
            </div>
          </aside>

          {/* B. Main Conversation Workspace */}
          <main className="flex-1 flex flex-col bg-[#F8FAFD] overflow-hidden relative">
            
            {/* Top Assistant Bar */}
            <div className="h-14 border-b border-[#E3EAF3] px-4 sm:px-6 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsMobileHistoryOpen(true)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden"
                  title="View chat history"
                >
                  <Menu className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#245BFF] to-blue-500 text-white grid place-items-center shadow-xs shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {activeConversation?.title || "Nexum AI Workspace"}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate hidden sm:block">
                      Client Copilot · Horizon Commerce LLC
                    </div>
                  </div>
                </div>
              </div>

              {/* Status and Model Pill */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold text-blue-800 bg-blue-50/80 border border-blue-200 shadow-2xs"
                  title="Modern Multi-Model Cascade Active: Gemini 3.8 Flash → 3.7 Flash → 3.5 Flash → Flash Latest → 3.1 Pro"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{activeModel}</span>
                </div>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
              
              {/* If no conversation or messages, show Welcome State */}
              {(!activeConversation || activeConversation.messages.length === 0) ? (
                <div className="max-w-3xl mx-auto py-6 sm:py-10 space-y-8 animate-in fade-in duration-300">
                  {/* Hero Intro */}
                  <div className="text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#245BFF] to-indigo-600 text-white grid place-items-center mx-auto mb-2 shadow-md shadow-blue-500/15 ring-4 ring-blue-50">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-[#245BFF] bg-blue-50 border border-blue-200">
                      <Lock className="w-3 h-3" />
                      <span>Consensus-Verified AI Assistant</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      How can Nexum help you move your project forward?
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                      Intelligent copilot for <strong className="text-slate-800 font-semibold">Horizon Commerce LLC</strong>. Real-time consensus over milestones, PayPal REST v2 escrow custody, and verified code PRs.
                    </p>

                    {/* Quick Context Indicators */}
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px]">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#E3EAF3] text-slate-600 shadow-2xs">
                        <Layers className="w-3 h-3 text-[#245BFF]" />
                        Active Scope: <strong className="font-semibold text-slate-800">Milestone 3 Replay</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#E3EAF3] text-slate-600 shadow-2xs">
                        <CreditCard className="w-3 h-3 text-emerald-600" />
                        Custody: <strong className="font-semibold text-slate-800 font-mono">$5,000.00 Pre-Funded</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#E3EAF3] text-slate-600 shadow-2xs">
                        <ShieldCheck className="w-3 h-3 text-indigo-600" />
                        Hash: <strong className="font-mono font-semibold text-slate-800">#9f8c2b7e</strong>
                      </span>
                    </div>
                  </div>

                  {/* 6 High-Precision Suggested Prompt Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                    {SUGGESTED_PROMPTS.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(item.prompt)}
                          className="p-4 rounded-2xl border border-[#E3EAF3] bg-white hover:border-[#245BFF] hover:shadow-md hover:-translate-y-0.5 text-left transition-all duration-200 group cursor-pointer space-y-2.5 flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-md border ${item.badgeClass}`}>
                              {item.category}
                            </span>
                            <div className="w-7 h-7 rounded-xl bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-[#245BFF] flex items-center justify-center transition">
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg ${item.iconBg} ${item.iconColor} grid place-items-center shrink-0`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#245BFF] transition-colors">
                                {item.title}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed pl-9">
                              {item.description}
                            </p>
                          </div>
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
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#245BFF] to-indigo-600 text-white grid place-items-center shrink-0 mt-0.5 shadow-xs">
                            <Bot className="w-4.5 h-4.5" />
                          </div>
                        )}

                        <div className={`space-y-2 max-w-[85%] sm:max-w-[80%]`}>
                          {/* Bubble Container */}
                          <div
                            className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                              isUser
                                ? "bg-gradient-to-r from-[#245BFF] to-blue-700 text-white rounded-tr-xs shadow-xs font-medium"
                                : "bg-white border border-[#E3EAF3] text-slate-800 rounded-tl-xs shadow-xs"
                            }`}
                          >
                            {isUser ? (
                              <div className="whitespace-pre-wrap font-sans">
                                {msg.content}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-[11px] text-slate-400 font-mono">
                                  <span className="flex items-center gap-1.5 font-semibold text-slate-700 font-sans">
                                    <Sparkles className="w-3.5 h-3.5 text-[#245BFF]" />
                                    Nexum Copilot Response
                                  </span>
                                  <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                    {activeModel}
                                  </span>
                                </div>
                                <MarkdownRenderer content={msg.content} />
                              </div>
                            )}
                          </div>

                          {/* Footer & Copy Action */}
                          {!isUser && (
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 px-1">
                              <span className="font-medium text-slate-500">Verified consensus draft</span>
                              <span>·</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(msg.id, msg.content)}
                                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition cursor-pointer font-medium"
                              >
                                {copiedMsgId === msg.id ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span className="text-emerald-600">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy response</span>
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
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#245BFF] to-indigo-600 text-white grid place-items-center shrink-0 shadow-xs animate-pulse">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="p-4 rounded-2xl rounded-tl-xs bg-white border border-[#E3EAF3] text-xs text-slate-700 flex items-center gap-3 shadow-xs">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#245BFF]" />
                        <div>
                          <div className="font-semibold text-slate-800">Analyzing project consensus state...</div>
                          <div className="text-[11px] text-slate-400 font-mono">Querying {activeModel} with milestone & PayPal rails evidence</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}

            </div>

            {/* C. Message Composer Area (Elevated Floating Bar) */}
            <div className="border-t border-[#E3EAF3] bg-white p-4 sm:p-5 shrink-0">
              <div className="max-w-3xl mx-auto space-y-2.5">
                
                {/* Active Context Chips */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 font-medium">
                      <Layers className="w-3 h-3 text-[#245BFF]" />
                      Horizon Commerce LLC
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-600 font-mono text-[10px]">
                      <Lock className="w-2.5 h-2.5 text-emerald-600" />
                      #9f8c2b7e
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Dual-party consent required for ledger releases
                  </span>
                </div>

                {/* Main Input Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="relative flex flex-col p-2.5 rounded-2xl border border-slate-300 focus-within:border-[#245BFF] focus-within:ring-3 focus-within:ring-blue-100/70 bg-white shadow-xs transition-all duration-200"
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
                    placeholder="Ask Nexum AI anything about milestones, PayPal escrow, code reviews, or contract scope..."
                    disabled={isSending}
                    className="w-full max-h-40 p-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-transparent resize-none focus:outline-none leading-relaxed"
                  />

                  {/* Composer Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
                    <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 pl-1 font-mono">
                      <span>↵ Enter to send</span>
                      <span>·</span>
                      <span>Shift + ↵ for newline</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {inputValue.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            setInputValue("");
                            if (textareaRef.current) textareaRef.current.style.height = "auto";
                          }}
                          className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1"
                        >
                          Clear
                        </button>
                      )}

                      <button
                        type="submit"
                        disabled={!inputValue.trim() || isSending}
                        className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl bg-[#245BFF] hover:bg-[#1A4EE5] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs transition cursor-pointer shadow-xs"
                        title="Send message (Enter)"
                      >
                        <span>Send</span>
                        <CornerDownLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </form>

                {/* Safety & Compliance Notice */}
                <p className="text-[10px] sm:text-[11px] text-center text-slate-400">
                  Nexum AI provides analysis and drafts based on project consensus and PayPal REST evidence. Consequential milestone approvals and payment captures require explicit client authorization.
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

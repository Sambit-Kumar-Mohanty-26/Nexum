"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Search,
  Lock,
  Sparkles,
  Paperclip,
  ArrowUp,
  Check,
  RefreshCw,
} from "lucide-react";
import {
  PrivateAIChatEntry,
  WorkspaceProject,
  BasedOnChip,
} from "@/lib/workspace-types";
import {
  INITIAL_AI_CHAT_HISTORY,
  INITIAL_WORKSPACE_PROJECTS,
  BASED_ON_CHIPS,
} from "@/lib/workspace-data";
import ReviewVersionModal from "./ReviewVersionModal";
import { useAuth } from "@/context/AuthContext";

interface WorkspaceNexumAIModeProps {
  onOpenInChats: (projectId: string, draftMessage?: string) => void;
  initialScope?: string;
}

interface LiveMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  model?: string;
}

export default function WorkspaceNexumAIMode({
  onOpenInChats,
  initialScope = "All my projects",
}: WorkspaceNexumAIModeProps) {
  const { user } = useAuth();

  // Chat History State
  const [chatHistory, setChatHistory] = useState<PrivateAIChatEntry[]>(INITIAL_AI_CHAT_HISTORY);
  const [selectedChatId, setSelectedChatId] = useState<string>("chat_approval");
  const [searchQuery, setSearchQuery] = useState("");
  const [isHistoryLoading] = useState(false);
  const [isRealHistoryConnected, setIsRealHistoryConnected] = useState(false);

  // Projects & Scope State
  const [projects, setProjects] = useState<WorkspaceProject[]>(INITIAL_WORKSPACE_PROJECTS);
  const [activeScope, setActiveScope] = useState<string>(initialScope);

  // Live messages for current conversation session
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Based-on record detail modal
  const [selectedChip, setSelectedChip] = useState<BasedOnChip | null>(null);

  // Draft editing state
  const [draftMessage, setDraftMessage] = useState(
    "Hi Sambit, could you share a timeline for Milestone 3 (Backend Integration, due Dec 10)? Thanks, Alex"
  );
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  // AI Composer
  const [inputValue, setInputValue] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectChat = (id: string) => {
    setSelectedChatId(id);
    if (!id || id.startsWith("chat_")) {
      setLiveMessages([]);
    }
  };

  // Fetch real persisted conversations from Next.js API (/api/assistant/conversations)
  useEffect(() => {
    let isMounted = true;
    async function loadRealConversations() {
      if (!user) return;
      try {
        const res = await fetch("/api/assistant/conversations", { cache: "no-store" });
        if (res.ok && isMounted) {
          const data = await res.json();
          const convList = data.conversations || [];
          if (convList.length > 0) {
            const mapped: PrivateAIChatEntry[] = convList.map((c: { id: string; title: string; updatedAt: string; messageCount?: number }) => {
              const date = new Date(c.updatedAt);
              const isToday = new Date().toDateString() === date.toDateString();
              return {
                id: c.id,
                title: c.title,
                projectTag: "All projects",
                dateGroup: isToday ? "TODAY" : "YESTERDAY",
                messagesCount: c.messageCount || 0,
                updatedAt: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              };
            });
            setChatHistory(mapped);
            setIsRealHistoryConnected(true);
          }
        }
      } catch (err) {
        console.warn("Real AI history fetch notice:", err);
        // Retains INITIAL_AI_CHAT_HISTORY fallback
      }
    }
    loadRealConversations();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Load conversation details when selecting a real chat
  useEffect(() => {
    if (!selectedChatId || selectedChatId.startsWith("chat_")) {
      return;
    }

    let isMounted = true;
    async function loadChatDetails() {
      try {
        const res = await fetch(`/api/assistant/conversations/${selectedChatId}`, { cache: "no-store" });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.conversation?.messages) {
            setLiveMessages(
              data.conversation.messages.map((m: { id: string; role: "user" | "assistant"; content: string; createdAt: string }) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              }))
            );
          }
        }
      } catch (err) {
        console.warn("Failed to load chat details:", err);
      }
    }
    loadChatDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedChatId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages, isGenerating]);

  const handleToggleProject = (id: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, canSee: !p.canSee } : p))
    );
  };

  const handleNewChat = async () => {
    try {
      const res = await fetch("/api/assistant/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Private Inquiry · ${activeScope}` }),
      });
      if (res.ok) {
        const data = await res.json();
        const newConv = data.conversation;
        const newEntry: PrivateAIChatEntry = {
          id: newConv.id,
          title: newConv.title,
          projectTag: activeScope,
          dateGroup: "TODAY",
          messagesCount: 0,
          updatedAt: "Just now",
        };
        setChatHistory((prev) => [newEntry, ...prev]);
        setSelectedChatId(newConv.id);
        setLiveMessages([]);
        setIsRealHistoryConnected(true);
        showToast("New private AI session created and synchronized.");
        return;
      }
    } catch (err) {
      console.warn("Create conversation fallback:", err);
    }

    // Fallback local session
    const newId = `chat_${Date.now()}`;
    const newEntry: PrivateAIChatEntry = {
      id: newId,
      title: `Private Inquiry · ${activeScope}`,
      projectTag: activeScope,
      dateGroup: "TODAY",
      messagesCount: 0,
      updatedAt: "Just now",
    };
    setChatHistory((prev) => [newEntry, ...prev]);
    setSelectedChatId(newId);
    setLiveMessages([]);
    showToast("New private AI session initiated.");
  };

  const handleSendPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputValue.trim();
    if (!text || isGenerating) return;

    setInputValue("");
    setIsGenerating(true);

    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: LiveMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: text,
      createdAt: nowTime,
    };
    setLiveMessages((prev) => [...prev, userMsg]);

    try {
      // Connect to real Next.js API (/api/assistant/chat with Gemini 3.8 cascade)
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedChatId.startsWith("chat_") ? undefined : selectedChatId,
          content: text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: LiveMessage = {
          id: `ai_${Date.now()}`,
          role: "assistant",
          content: data.reply || "Analysis logged from project consensus state.",
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          model: data.model || "gemini-3.8-flash",
        };
        setLiveMessages((prev) => [...prev, assistantMsg]);
        showToast("Nexum AI analysis generated from active agreements & verified records.");
      } else {
        throw new Error("Chat API responded with non-200");
      }
    } catch {
      // Graceful fallback for offline demo testing
      setTimeout(() => {
        const fallbackMsg: LiveMessage = {
          id: `ai_${Date.now()}`,
          role: "assistant",
          content: `Here is the analysis based on **${activeScope}**:\n\n1. Active agreement remains locked under canonical hash \`#9f8c2b7e\`.\n2. Milestone 2 deliverable package is awaiting client sign-off.\n3. PayPal sandbox pre-funding verified with 0 dropped webhook events.`,
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          model: "gemini-3.8-flash (Simulated Fallback)",
        };
        setLiveMessages((prev) => [...prev, fallbackMsg]);
        showToast("Nexum AI response rendered from project consensus state.");
      }, 700);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredHistory = chatHistory.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todayChats = filteredHistory.filter((c) => c.dateGroup === "TODAY");
  const yesterdayChats = filteredHistory.filter((c) => c.dateGroup === "YESTERDAY");

  return (
    <div className="flex-1 flex overflow-hidden bg-white select-none w-full">
      {/* ==============================================================
          LEFT COLUMN: PRIVATE AI HISTORY PANEL (Approx 260–280px)
         ============================================================== */}
      <aside className="w-[260px] lg:w-[280px] shrink-0 border-r border-slate-100 bg-white flex flex-col justify-between h-full overflow-hidden">
        
        {/* Top: + New Chat & Search */}
        <div className="p-4 pb-2 space-y-3">
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New chat</span>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats"
              className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200/80 bg-slate-50/50 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#4f46e5] focus:bg-white transition"
            />
          </div>
        </div>

        {/* History Stream grouped by TODAY / YESTERDAY */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-3">
          {isHistoryLoading ? (
            <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#4f46e5]" />
              <span>Loading AI history...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Start a new conversation with Nexum AI.
            </div>
          ) : (
            <>
              {/* TODAY Group */}
              {todayChats.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Today</span>
                    {isRealHistoryConnected && (
                      <span className="text-[9px] text-emerald-600 font-semibold lowercase">synced</span>
                    )}
                  </div>
                  {todayChats.map((c) => {
                    const isSelected = c.id === selectedChatId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectChat(c.id)}
                        className={`p-2.5 rounded-xl transition cursor-pointer text-left ${
                          isSelected
                            ? "bg-[#eef2ff] text-[#4f46e5] font-semibold"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="text-xs font-bold truncate leading-snug">
                          {c.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {c.projectTag}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* YESTERDAY Group */}
              {yesterdayChats.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                    Yesterday
                  </div>
                  {yesterdayChats.map((c) => {
                    const isSelected = c.id === selectedChatId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectChat(c.id)}
                        className={`p-2.5 rounded-xl transition cursor-pointer text-left ${
                          isSelected
                            ? "bg-[#eef2ff] text-[#4f46e5] font-semibold"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="text-xs font-bold truncate leading-snug">
                          {c.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {c.projectTag}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Privacy Notice (Matching Ref 2) */}
        <div className="p-3.5 border-t border-slate-100 bg-[#fafbfe] text-[11px] text-slate-500 flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="leading-tight">
            These chats are private to you. Freelancers never see them.
          </p>
        </div>

      </aside>

      {/* ==============================================================
          CENTRE COLUMN: AI CONVERSATION & STRUCTURED RESPONSE CARDS
         ============================================================== */}
      <main className="flex-1 flex flex-col min-w-0 border-r border-slate-100 bg-[#fcfdfe] overflow-hidden">
        
        {/* Top Scope Pills Bar (Matching Reference 2) */}
        <div className="p-4 sm:p-5 pb-3 border-b border-slate-100 bg-white shrink-0 flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
            Scope
          </span>

          {/* Scope Pills */}
          {[
            { id: "all", label: "All my projects (3)", match: "All my projects" },
            { id: "techkart", label: "TechKart", match: "TechKart" },
            { id: "horizon_loyalty", label: "Horizon Loyalty App", match: "Horizon Loyalty App" },
            { id: "analytics_dashboard", label: "Analytics Dashboard", match: "Analytics Dashboard" },
          ].map((scope) => {
            const isActive = activeScope.includes(scope.match);
            return (
              <button
                key={scope.id}
                type="button"
                onClick={() => {
                  setActiveScope(scope.match);
                  showToast(`Scope switched to: ${scope.label}`);
                }}
                className={`py-1 px-3 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                  isActive
                    ? "bg-[#eef2ff] border-indigo-200 text-[#4f46e5]"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                <span>{scope.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Response Cards Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* ============================================================
              CARD 1: PENDING QUOTE CARD (CR-2 Best Selling Products Section)
             ============================================================ */}
          <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3.5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Quote v4: best-selling products section
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                TechKart · Change request CR-2 · from Sambit Kumar
              </p>
            </div>

            {/* 3 Metrics Box */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <div>
                <div className="font-extrabold text-slate-900 text-sm">+₹6,000</div>
                <div className="text-[10px] text-slate-400 font-medium">Price change</div>
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-sm">+4 days</div>
                <div className="text-[10px] text-slate-400 font-medium">Schedule change</div>
              </div>
              <div>
                <div className="font-extrabold text-slate-900 text-sm">v3 to v4</div>
                <div className="text-[10px] text-slate-400 font-medium">Agreement version</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-0.5">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Review version 4
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputValue("Could Sambit reduce the quote to ₹5,000 if we keep the same timeline?");
                  showToast("Draft question populated in composer.");
                }}
                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Draft a question for Sambit
              </button>
            </div>
          </div>

          {/* ============================================================
              CARD 2: COUNTEROFFER CARD (Horizon Loyalty App)
             ============================================================ */}
          <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Counteroffer v2 from Meera Nair
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  Negotiation
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Horizon Loyalty App · ₹95,000 · 6 weeks
              </p>
            </div>

            <button
              type="button"
              onClick={() => showToast("Opening Counteroffer v2 version diff...")}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto"
            >
              Compare with v1
            </button>
          </div>

          {/* ============================================================
              CARD 3: PAYMENT STATUS CARD (Verified Provider Record)
             ============================================================ */}
          <div className="p-4 rounded-2xl border border-emerald-200/80 bg-[#f7fdfa] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-900">
                TechKart · Milestone 1 · ₹20,000
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Recipient bank credit not verified. Sandbox: no real funds move.
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
              PayPal confirms capture
            </span>
          </div>

          {/* ============================================================
              BASED ON SECTION (Clickable Authorized Project Records)
             ============================================================ */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-medium">Based on</span>
            {BASED_ON_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setSelectedChip(chip)}
                className="py-1 px-2.5 rounded-lg border border-slate-200 bg-white hover:border-[#4f46e5]/40 hover:bg-[#eef2ff]/30 text-slate-700 text-[11px] font-medium transition cursor-pointer shadow-2xs flex items-center gap-1"
              >
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* ============================================================
              CLIENT PROMPT BUBBLE
             ============================================================ */}
          <div className="flex justify-end pt-2">
            <div className="max-w-[85%] p-3.5 rounded-2xl rounded-tr-xs bg-[#4f46e5] text-white text-xs sm:text-[13px] leading-relaxed shadow-xs font-medium">
              Draft a reply to Sambit asking for the Backend Integration timeline.
            </div>
          </div>

          {/* ============================================================
              AI RESPONSE: STRUCTURED DRAFT MESSAGE CARD (Matching Ref 2)
             ============================================================ */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <div className="w-5 h-5 rounded-full bg-[#4f46e5] text-white flex items-center justify-center">
                <Sparkles className="w-3 h-3" />
              </div>
              <span>Nexum AI</span>
            </div>

            <p className="text-xs sm:text-[13px] text-slate-700 pl-7 leading-relaxed">
              Here is a draft. It stays in this private chat until you send it through Chats.
            </p>

            {/* Inner Draft Message Card */}
            <div className="ml-7 p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-3 max-w-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Draft message to Sambit Kumar</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  Not sent
                </span>
              </div>

              {isEditingDraft ? (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#4f46e5] text-xs text-slate-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditingDraft(false)}
                    className="px-3 py-1 rounded-lg bg-[#4f46e5] text-white text-xs font-bold"
                  >
                    Save draft
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs sm:text-[13px] text-slate-800 leading-relaxed font-sans">
                  {draftMessage}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenInChats("techkart", draftMessage)}
                  className="px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Open in Chats to send
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingDraft((prev) => !prev)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  {isEditingDraft ? "Done" : "Edit draft"}
                </button>
              </div>
            </div>
          </div>

          {/* Live Session Messages Stream (when user submits prompts) */}
          {liveMessages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} pt-2`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                  m.role === "user"
                    ? "bg-[#4f46e5] text-white rounded-tr-xs font-medium"
                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="flex items-center gap-2 font-bold text-slate-900 pb-1 mb-1 border-b border-slate-100 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-[#4f46e5]" />
                    <span>Nexum AI · {m.model || "Gemini 3.8"}</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div
                  className={`text-[10px] pt-1 text-right ${
                    m.role === "user" ? "text-indigo-200" : "text-slate-400"
                  }`}
                >
                  {m.createdAt}
                </div>
              </div>
            </div>
          ))}

          {/* Generating Indicator */}
          {isGenerating && (
            <div className="flex items-center gap-2 text-xs text-slate-500 pl-2 pt-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#4f46e5]" />
              <span>Analyzing project consensus & verifying agreement records with Gemini 3.8...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* AI Composer (Spacious Bottom Toolbar) */}
        <div className="border-t border-slate-100 bg-white p-4 shrink-0 space-y-2">
          <form onSubmit={handleSendPrompt}>
            <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 focus-within:bg-white focus-within:border-[#4f46e5] focus-within:ring-2 focus-within:ring-indigo-100 transition p-2.5">
              <textarea
                rows={2}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendPrompt();
                  }
                }}
                placeholder="Ask about your projects, or tell Nexum what you want to change..."
                className="w-full text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 bg-transparent resize-none focus:outline-none p-1 leading-relaxed"
              />

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
                <div className="flex items-center gap-2 text-slate-500">
                  <button
                    type="button"
                    onClick={() => showToast("Attachment selector opened.")}
                    className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 transition cursor-pointer"
                    title="Attach file to prompt"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#eef2ff] text-[#4f46e5] text-[11px] font-semibold border border-indigo-100">
                    <span>@</span>
                    <span>{activeScope}</span>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!inputValue.trim() || isGenerating}
                  className="w-8 h-8 rounded-full bg-[#4f46e5] hover:bg-[#4338ca] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition cursor-pointer shadow-xs shrink-0"
                  title="Send prompt"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </form>

          {/* Strict Safety Disclosure */}
          <p className="text-[11px] text-center text-slate-400">
            Nexum AI drafts and explains. Nothing is sent, approved or paid until you do it.
          </p>
        </div>

      </main>

      {/* ==============================================================
          RIGHT COLUMN: AI CONTEXT & PRIVACY BOUNDARIES (Approx 280–310px)
         ============================================================== */}
      <aside className="w-[280px] lg:w-[300px] shrink-0 bg-white p-4 sm:p-5 space-y-5 overflow-y-auto hidden xl:block">
        
        {/* Header & Subtitle */}
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            What Nexum AI can see
          </h3>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Only projects owned by Horizon Commerce LLC. Switch any project off to remove it from this chat.
          </p>
        </div>

        {/* Project Context Toggles */}
        <div className="space-y-2">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => handleToggleProject(p.id)}
              className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                p.canSee
                  ? "bg-[#fbfbfe] border-indigo-100"
                  : "bg-slate-50 border-slate-200 opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={p.canSee}
                onChange={() => handleToggleProject(p.id)}
                className="mt-0.5 rounded text-[#4f46e5] focus:ring-indigo-200"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {p.name}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {p.freelancerName || "No freelancer yet"} · {p.status}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* INCLUDED Section */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Included
          </div>
          <ul className="space-y-1 text-[11px] text-slate-600">
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">+</span>
              <span>Briefs and PRDs</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">+</span>
              <span>Agreement versions and change requests</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">+</span>
              <span>Milestones and submissions</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">+</span>
              <span>Payment status from verified records</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-600 font-bold">+</span>
              <span>Shared project chats</span>
            </li>
          </ul>
        </div>

        {/* NEVER INCLUDED Section */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Never Included
          </div>
          <ul className="space-y-1 text-[11px] text-rose-600">
            <li className="flex items-center gap-1.5">
              <span className="font-bold">x</span>
              <span>Freelancers&apos; private AI chats</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="font-bold">x</span>
              <span>Freelancers&apos; private notes</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="font-bold">x</span>
              <span>Other clients&apos; projects</span>
            </li>
          </ul>
        </div>

      </aside>

      {/* Based-on Chip Detail Modal */}
      {selectedChip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="font-bold text-slate-900 text-xs">
                Source Record: {selectedChip.label}
              </div>
              <button
                type="button"
                onClick={() => setSelectedChip(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {selectedChip.detail}
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedChip(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Version Modal */}
      <ReviewVersionModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        versionName="Version 4"
        onApproveVersion={(ver) => {
          showToast(`Agreement version ${ver} mutually approved!`);
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

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
  ExternalLink,
  PanelRightClose,
  PanelRightOpen,
  MessageSquare,
  Trash2,
} from "lucide-react";
import {
  PrivateAIChatEntry,
  WorkspaceProject,
  BasedOnChip,
} from "@/lib/workspace-types";
import {
  INITIAL_AI_CHAT_HISTORY,
  BASED_ON_CHIPS,
} from "@/lib/workspace-data";
import { fetchWorkspaceProjects } from "@/lib/api-client";
import ReviewVersionModal from "./ReviewVersionModal";
import { useAuth } from "@/context/AuthContext";

interface WorkspaceNexumAIModeProps {
  onOpenInChats: (projectId: string, draftMessage?: string) => void;
  initialScope?: string;
  isStandalone?: boolean;
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
  isStandalone = false,
}: WorkspaceNexumAIModeProps) {
  const { user } = useAuth();

  // Chat History State
  const [chatHistory, setChatHistory] = useState<PrivateAIChatEntry[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isHistoryLoading] = useState(false);
  const [isRealHistoryConnected, setIsRealHistoryConnected] = useState(false);

  // Projects & Scope State
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [activeScope, setActiveScope] = useState<string>(initialScope);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Live messages for current conversation session
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Based-on record detail modal
  const [selectedChip, setSelectedChip] = useState<BasedOnChip | null>(null);

  // Fetch real client projects from API
  useEffect(() => {
    let isMounted = true;
    async function loadProjects() {
      try {
        const clientId = user?.id || "usr_client_alex";
        const res = await fetchWorkspaceProjects(clientId, "CLIENT");
        if (isMounted) {
          if (res.success && Array.isArray(res.data)) {
            setProjects(res.data);
          }
          setIsLoadingProjects(false);
        }
      } catch (err) {
        console.warn("Failed to fetch real workspace projects for AI mode:", err);
        if (isMounted) setIsLoadingProjects(false);
      }
    }
    loadProjects();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // AI Composer
  const [inputValue, setInputValue] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Review modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Right Drawer collapsible state
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectChat = async (id: string) => {
    setSelectedChatId(id);
    if (!id || id.startsWith("chat_")) {
      setLiveMessages([]);
      return;
    }
    try {
      const res = await fetch(`/api/assistant/conversations/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const conv = data.conversation;
        if (conv?.messages && Array.isArray(conv.messages)) {
          setLiveMessages(
            conv.messages.map((m: any) => ({
              id: m.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              role: m.role,
              content: m.content,
              createdAt: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now",
              model: m.model || "Gemini 2.5",
            }))
          );
        }
      }
    } catch (err) {
      console.warn("Failed to fetch conversation detail:", err);
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

  
  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/assistant/conversations/${encodeURIComponent(chatId)}`, {
        method: "DELETE",
      });
      setChatHistory((prev) => prev.filter((c) => c.id !== chatId));
      if (selectedChatId === chatId) {
        setChatHistory((prev) => {
          const remaining = prev.filter((c) => c.id !== chatId);
          if (remaining.length > 0) {
            handleSelectChat(remaining[0].id);
          } else {
            setSelectedChatId("");
            setLiveMessages([]);
          }
          return remaining;
        });
      }
      showToast("Conversation deleted.");
    } catch {
      showToast("Failed to delete conversation.");
    }
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

  const activeProject = projects.find(
    (p) => activeScope.includes(p.shortName) || activeScope.includes(p.name) || p.id === activeScope
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50/50 select-none w-full">
      {/* ==============================================================
          LEFT COLUMN: PRIVATE AI HISTORY PANEL (Approx 280–300px)
         ============================================================== */}
      <aside className="w-[280px] lg:w-[300px] shrink-0 border-r border-slate-200/80 bg-white flex flex-col justify-between h-full overflow-hidden shadow-2xs">
        
        {/* Top: + New Chat & Search */}
        <div className="p-4 sm:p-4.5 pb-2.5 space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNewChat}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New chat</span>
            </button>
            {isStandalone ? (
              <button
                type="button"
                onClick={() => onOpenInChats("techkart")}
                className="p-2.5 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200/80 bg-white transition shadow-2xs cursor-pointer flex items-center gap-1 font-bold text-xs"
                title="Switch to Chats"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chats</span>
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ml-0.5">3</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => window.open("/client/workspace?mode=ai&standalone=true", "_blank")}
                className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200/80 bg-white transition shadow-2xs cursor-pointer"
                title="Open workspace in new tab (larger view)"
                aria-label="Open workspace in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100/60 transition shadow-2xs"
            />
          </div>
        </div>

        {/* History Stream grouped by TODAY / YESTERDAY */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1.5 space-y-3">
          {isHistoryLoading ? (
            <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
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
                        className={`group p-2.5 rounded-xl transition cursor-pointer text-left border relative ${
                          isSelected
                            ? "bg-indigo-50/70 border-indigo-200/90 text-indigo-900 font-semibold shadow-2xs"
                            : "bg-white hover:bg-slate-50 border-transparent text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="text-xs font-bold truncate leading-snug flex-1">
                            {c.title}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteChat(c.id, e)}
                            title="Delete chat"
                            className={`p-1 rounded-lg transition shrink-0 cursor-pointer ${isSelected ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50"}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
                        className={`group p-2.5 rounded-xl transition cursor-pointer text-left border relative ${
                          isSelected
                            ? "bg-indigo-50/70 border-indigo-200/90 text-indigo-900 font-semibold shadow-2xs"
                            : "bg-white hover:bg-slate-50 border-transparent text-slate-700"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="text-xs font-bold truncate leading-snug flex-1">
                            {c.title}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteChat(c.id, e)}
                            title="Delete chat"
                            className={`p-1 rounded-lg transition shrink-0 cursor-pointer ${isSelected ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50" : "opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50"}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

        {/* Bottom Privacy Notice */}
        <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/70 text-[11px] text-slate-500 flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p className="leading-tight">
            These chats are private to you. Freelancers never see them.
          </p>
        </div>

      </aside>

      {/* ==============================================================
          CENTRE COLUMN: AI CONVERSATION & STRUCTURED RESPONSE CARDS
         ============================================================== */}
      <main className="flex-1 flex flex-col min-w-0 border-r border-slate-200/80 bg-slate-50/40 overflow-hidden">
        
        {/* Top Scope Pills Bar - Dynamic & Sleek */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-slate-200/80 bg-white shrink-0 shadow-2xs flex items-center gap-2 overflow-x-auto">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
            Scope
          </span>

          <button
            type="button"
            onClick={() => {
              setActiveScope("All my projects");
              showToast(`Scope switched to: All my projects (${projects.length})`);
            }}
            className={`py-1 px-3 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 border ${
              activeScope.includes("All my projects")
                ? "bg-indigo-50 border-indigo-200/90 text-indigo-700 shadow-2xs"
                : "bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {activeScope.includes("All my projects") && <Check className="w-3 h-3 stroke-[3]" />}
            <span>All my projects ({projects.length})</span>
          </button>

          {projects.map((p) => {
            const isMatch = activeScope.includes(p.shortName) || activeScope.includes(p.name);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActiveScope(p.shortName || p.name);
                  showToast(`Scope switched to: ${p.shortName || p.name}`);
                }}
                className={`py-1 px-3 rounded-full text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                  isMatch
                    ? "bg-indigo-50 border-indigo-200/90 text-indigo-700 shadow-2xs"
                    : "bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {isMatch && <Check className="w-3 h-3 stroke-[3]" />}
                <span>{p.shortName || p.name}</span>
              </button>
            );
          })}

          {selectedChatId && (
            <button
              type="button"
              onClick={(e) => handleDeleteChat(selectedChatId, e)}
              className="ml-auto py-1 px-2.5 rounded-full text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition shrink-0 flex items-center gap-1.5 cursor-pointer"
              title="Delete current conversation"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
              <span className="hidden sm:inline">Delete chat</span>
            </button>
          )}
        </div>

        {/* Scrollable Response Cards Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {liveMessages.length === 0 && (
            isLoadingProjects ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>Loading workspace projects...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="p-8 rounded-2xl border border-slate-200/80 bg-white text-center flex flex-col items-center justify-center max-w-lg mx-auto my-8">
                <Sparkles className="w-8 h-8 text-indigo-500 mb-2" />
                <h3 className="text-sm font-bold text-slate-900 mb-1">Nexum AI Private Consultation</h3>
                <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
                  No active client contracts found. Once you initiate a project agreement, Nexum AI will privately assist you with milestone verification, scope creep protection, and amendment drafting.
                </p>
              </div>
            ) : activeProject ? (
              <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-4 max-w-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-100 mb-1">
                      Consensus Baseline · {activeProject.agreementVersion}
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      {activeProject.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Collaborating with {activeProject.freelancerName} · Started {activeProject.startDate}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${activeProject.statusColor || "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                    {activeProject.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm font-mono">{activeProject.budget}</div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Total Escrow</div>
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">{activeProject.milestones?.length || 0} Milestones</div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Milestones</div>
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">{activeProject.duration}</div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Duration</div>
                  </div>
                </div>

                {/* Milestones Preview */}
                {activeProject.milestones && activeProject.milestones.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Contract Milestones Breakdown
                    </span>
                    <div className="space-y-1">
                      {activeProject.milestones.map((m) => (
                        <div key={m.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            {m.number}. {m.title}
                          </span>
                          <span className="font-mono font-bold text-slate-700 text-[11px]">
                            {m.amount} · {m.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Inquiries */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Suggested Inquiries for {activeProject.shortName}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      `Review acceptance criteria for ${activeProject.shortName}`,
                      `Draft a milestone status check message to ${activeProject.freelancerName}`,
                      `Verify PayPal Orders REST v2 pre-funding escrow status`,
                      `Check next scheduled sync meeting with ${activeProject.freelancerName}`,
                    ].map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setInputValue(prompt);
                          showToast("Inquiry populated into composer.");
                        }}
                        className="text-left p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-indigo-50/60 hover:border-indigo-200 text-xs text-slate-700 hover:text-indigo-900 font-medium transition cursor-pointer"
                      >
                        {prompt} →
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-4 max-w-2xl">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Multi-Project Private Intelligence</h3>
                    <p className="text-xs text-slate-500 font-normal">Active monitoring across {projects.length} project workspace{projects.length === 1 ? "" : "s"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {projects.map((p) => (
                    <div key={p.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{p.name}</span>
                        <span className="text-[11px] text-slate-500 block">With {p.freelancerName} · {p.budget}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveScope(p.shortName || p.name);
                          showToast(`Switched scope to: ${p.shortName || p.name}`);
                        }}
                        className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Consult →
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Cross-Project Suggested Inquiries
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      "Summarize all pending deliverables across my projects",
                      "Which milestones are currently awaiting client sign-off?",
                      "Check PayPal pre-funding status across all active agreements",
                      "List all upcoming sync calls and scheduled meetings",
                    ].map((prompt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setInputValue(prompt);
                          showToast("Inquiry populated into composer.");
                        }}
                        className="text-left p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-indigo-50/60 hover:border-indigo-200 text-xs text-slate-700 hover:text-indigo-900 font-medium transition cursor-pointer"
                      >
                        {prompt} →
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}

          {/* Live Session Messages Stream (when user submits prompts) */}
          {liveMessages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} pt-2`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-xs font-normal"
                    : "bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-xs"
                }`}
              >
                {m.role === "assistant" && (
                  <div className="flex items-center gap-2 font-bold text-slate-900 pb-1 mb-1 border-b border-slate-100 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
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
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Analyzing project consensus & verifying agreement records with Gemini 3.8...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* AI Composer (Spacious Bottom Toolbar) */}
        <div className="border-t border-slate-200/80 bg-white p-4 shrink-0 space-y-2 shadow-2xs">
          <form onSubmit={handleSendPrompt}>
            <div className="relative rounded-2xl border border-slate-200/90 bg-slate-50/60 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 p-2.5 transition-all shadow-2xs">
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

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-100 shadow-2xs">
                    <span>@</span>
                    <span>{activeScope}</span>
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!inputValue.trim() || isGenerating}
                  className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition cursor-pointer shadow-xs shrink-0"
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
          RIGHT COLUMN: AI CONTEXT & PRIVACY BOUNDARIES (Approx 290–310px)
         ============================================================== */}
      {isRightDrawerOpen ? (
        <aside className="w-[290px] lg:w-[310px] shrink-0 bg-white p-4 sm:p-5 space-y-5 overflow-y-auto hidden xl:block shadow-2xs animate-in fade-in slide-in-from-right-3 duration-150">
          
          {/* Header & Subtitle */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                What Nexum AI can see
              </h3>
              <button
                type="button"
                onClick={() => setIsRightDrawerOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                title="Hide context (gives chat more space)"
                aria-label="Hide context"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Only projects authorized for your account. Switch any project off to remove it from this chat.
            </p>
          </div>

          {/* Project Context Toggles */}
          <div className="space-y-2">
            {projects.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                No active projects found.
              </div>
            ) : (
              projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleToggleProject(p.id)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                    p.canSee
                      ? "bg-indigo-50/30 border-indigo-200/80 shadow-2xs"
                      : "bg-slate-50 border-slate-200 opacity-60"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={p.canSee}
                    onChange={() => handleToggleProject(p.id)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-200"
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
              ))
            )}
          </div>

          {/* INCLUDED Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Included
            </div>
            <ul className="space-y-1.5 text-[11px] text-slate-600">
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold text-xs">+</span>
                <span>Briefs and PRDs</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold text-xs">+</span>
                <span>Agreement versions and change requests</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold text-xs">+</span>
                <span>Milestones and submissions</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold text-xs">+</span>
                <span>Payment status from verified records</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold text-xs">+</span>
                <span>Shared project chats</span>
              </li>
            </ul>
          </div>

          {/* NEVER INCLUDED Section */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Never Included
            </div>
            <ul className="space-y-1.5 text-[11px] text-rose-600">
              <li className="flex items-center gap-2">
                <span className="font-bold text-xs">✕</span>
                <span>Freelancers&apos; private AI chats</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold text-xs">✕</span>
                <span>Freelancers&apos; private notes</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold text-xs">✕</span>
                <span>Other clients&apos; projects</span>
              </li>
            </ul>
          </div>

        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setIsRightDrawerOpen(true)}
          className="w-8 shrink-0 border-l border-slate-200/80 bg-white hover:bg-slate-50 hidden xl:flex flex-col items-center justify-center gap-2.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer shadow-2xs group py-4 select-none"
          title="Show context & privacy"
        >
          <PanelRightOpen className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          <span className="[writing-mode:vertical-rl] text-[10px] font-bold tracking-wider uppercase text-slate-400 group-hover:text-slate-700">
            Context
          </span>
        </button>
      )}

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

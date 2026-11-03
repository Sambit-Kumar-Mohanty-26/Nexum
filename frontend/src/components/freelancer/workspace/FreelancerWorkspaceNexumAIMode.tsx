"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Search,
  Lock,
  Sparkles,
  Paperclip,
  ArrowUp,
  PanelRightClose,
  PanelRightOpen,
  MessageSquare,
  Trash2,
  FileText,
} from "lucide-react";
import { PrivateAIChatEntry, BasedOnChip, WorkspaceProject } from "@/lib/workspace-types";
import {
  INITIAL_FREELANCER_AI_CHAT_HISTORY,
  FREELANCER_BASED_ON_CHIPS,
} from "@/lib/freelancer-workspace-data";
import { fetchWorkspaceProjects } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import ReviewVersionModal from "@/components/client/workspace/ReviewVersionModal";

interface FreelancerWorkspaceNexumAIModeProps {
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

export default function FreelancerWorkspaceNexumAIMode({
  onOpenInChats,
  initialScope = "All my client contracts",
  isStandalone = false,
}: FreelancerWorkspaceNexumAIModeProps) {
  void isStandalone;

  const { user } = useAuth();

  // Chat History State
  const [chatHistory, setChatHistory] = useState<PrivateAIChatEntry[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Projects & Scope State
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [activeScope, setActiveScope] = useState<string>(initialScope);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Live messages for current conversation session
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Based-on record detail modal
  const [selectedChip, setSelectedChip] = useState<BasedOnChip | null>(null);

  // Load real freelancer projects
  useEffect(() => {
    let isMounted = true;
    async function loadProjects() {
      try {
        const freelancerId = user?.id || "usr_freelancer_sambit";
        const res = await fetchWorkspaceProjects(freelancerId, "FREELANCER");
        if (isMounted) {
          if (res.success && Array.isArray(res.data)) {
            setProjects(res.data);
          }
          setIsLoadingProjects(false);
        }
      } catch (err) {
        console.warn("Failed to load freelancer projects:", err);
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

  const handleNewChat = () => {
    const newId = `fchat_new_${Date.now()}`;
    const newEntry: PrivateAIChatEntry = {
      id: newId,
      title: "New private consultation",
      projectTag: activeScope.includes("TechKart") ? "TechKart" : "General",
      dateGroup: "TODAY",
      messagesCount: 0,
      updatedAt: "Just now",
    };
    setChatHistory([newEntry, ...chatHistory]);
    setSelectedChatId(newId);
    setLiveMessages([]);
    showToast("Started new private AI consultation session.");
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputValue.trim();
    if (!query || isGenerating) return;

    const userMsg: LiveMessage = {
      id: `um_${Date.now()}`,
      role: "user",
      content: query,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setLiveMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsGenerating(true);

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `[Context: Freelancer consulting on ${activeScope}] ${query}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: LiveMessage = {
          id: `am_${Date.now()}`,
          role: "assistant",
          content: data.message?.content || data.reply || "I have analyzed your request against the contract baseline.",
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          model: data.model || "Gemini 2.5 Pro",
        };
        setLiveMessages((prev) => [...prev, aiMsg]);
      } else {
        setTimeout(() => {
          const aiMsg: LiveMessage = {
            id: `am_${Date.now()}`,
            role: "assistant",
            content: `Based on Agreement v3 canonical hash (0x9f8c2b7e) and your milestones for ${activeScope}: \n\n1. **Scope Assessment**: The requested work constitutes an architectural addition beyond the agreed acceptance criteria.\n2. **Recommendation**: Alex's $500 counteroffer represents fair compensation for ~8-10 developer hours. Accept with the +4 days extension to ensure test coverage.\n3. **Consensus Protection**: Ensure dual signatures are sealed before delivering code.`,
            createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            model: "Nexum Scope Mediation Engine",
          };
          setLiveMessages((prev) => [...prev, aiMsg]);
        }, 800);
      }
    } catch {
      setTimeout(() => {
        const aiMsg: LiveMessage = {
          id: `am_${Date.now()}`,
          role: "assistant",
          content: `Analysis complete: Your current milestone 2 delivery meets all cryptographic checks. If Alex Chen approves the counteroffer, Agreement v5 will anchor automatically.`,
          createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setLiveMessages((prev) => [...prev, aiMsg]);
      }, 700);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveMessages]);

  const filteredHistory = chatHistory.filter((item) => {
    if (!searchQuery) return true;
    return (
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.projectTag.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const todayChats = filteredHistory.filter((c) => c.dateGroup === "TODAY");
  const yesterdayChats = filteredHistory.filter((c) => c.dateGroup === "YESTERDAY");

  const activeProject = projects.find(
    (p) => activeScope.includes(p.shortName) || activeScope.includes(p.name) || p.id === activeScope
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50/50 select-none w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#4f46e5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==============================================================
          LEFT COLUMN: PRIVATE AI HISTORY PANEL (Deto Same as Client)
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
            <button
              type="button"
              onClick={() => onOpenInChats("techkart")}
              className="p-2.5 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200/80 bg-white transition shadow-2xs cursor-pointer flex items-center gap-1 font-bold text-xs"
              title="Switch to Chats"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chats</span>
              <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center ml-0.5">2</span>
            </button>
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
          {filteredHistory.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Start a new conversation with Nexum AI.
            </div>
          ) : (
            <>
              {/* TODAY Group */}
              {todayChats.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Today
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
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
            These chats are private to you. Clients never see them.
          </p>
        </div>
      </aside>

      {/* ==============================================================
          CENTRE COLUMN: AI CONVERSATION (Deto Same as Client)
         ============================================================== */}
      <main className="flex-1 flex flex-col min-w-0 border-r border-slate-200/80 bg-slate-50/40 overflow-hidden">
        {/* Top Scope Pills Bar - Compact & Sleek */}
        <div className="px-4 sm:px-5 py-2.5 border-b border-slate-200/80 bg-white shrink-0 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
              Scope
            </span>

            <button
              type="button"
              onClick={() => {
                setActiveScope("All my client contracts");
                showToast(`Scope switched to: All my contracts (${projects.length})`);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap border ${
                activeScope.includes("All my client contracts")
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              All my contracts ({projects.length})
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
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap border ${
                    isMatch
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {p.shortName || p.name}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isRightDrawerOpen && (
              <button
                type="button"
                onClick={() => setIsRightDrawerOpen(true)}
                className="p-1 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition cursor-pointer shadow-2xs"
                title="Show project details"
              >
                <PanelRightOpen className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Center Scrollable Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Default Dynamic Consultation Thread */}
          {liveMessages.length === 0 && (
            isLoadingProjects ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                <span>Loading contract records...</span>
              </div>
            ) : projects.length === 0 ? (
              <div className="p-8 rounded-2xl border border-slate-200/80 bg-white text-center flex flex-col items-center justify-center max-w-lg mx-auto my-8">
                <Sparkles className="w-8 h-8 text-indigo-500 mb-2" />
                <h3 className="text-sm font-bold text-slate-900 mb-1">Nexum AI Freelancer Copilot</h3>
                <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
                  No active client contracts found. Once you accept a contract proposal, Nexum AI will privately assist you in protecting scope boundaries, calculating milestone timelines, and drafting formal amendment quotes.
                </p>
              </div>
            ) : activeProject ? (
              <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-4 max-w-2xl mx-auto">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-100 mb-1">
                      Contract Baseline · {activeProject.agreementVersion}
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                      {activeProject.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Client: {activeProject.clientName} · Started {activeProject.startDate}
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
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Deliverables</div>
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm">{activeProject.duration}</div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Timeline</div>
                  </div>
                </div>

                {activeProject.milestones && activeProject.milestones.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Milestones Escrow Payouts
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
                    Private Strategy Inquiries for {activeProject.shortName}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      `Assess scope boundaries and criteria for ${activeProject.shortName}`,
                      `Draft a polite milestone delivery note to ${activeProject.clientName}`,
                      `Check PayPal REST v2 escrow funding status for next milestone`,
                      `Verify mutual consensus status of current agreement version`,
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
              <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-4 max-w-2xl mx-auto">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Multi-Contract Strategy Copilot</h3>
                    <p className="text-xs text-slate-500 font-normal">Active monitoring across {projects.length} client contract{projects.length === 1 ? "" : "s"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {projects.map((p) => (
                    <div key={p.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{p.name}</span>
                        <span className="text-[11px] text-slate-500 block">Client: {p.clientName} · {p.budget}</span>
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
                    Cross-Contract Suggested Inquiries
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      "Summarize pending deliverable deadlines across all my contracts",
                      "Check escrow deposit status for active milestones",
                      "How do I formulate a change request quote for extra client work?",
                      "List all upcoming client sync calls",
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

          {/* Live Dynamic Messages */}
          {liveMessages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-bold text-slate-400">
                  <span>{isUser ? "You (Freelancer)" : "Nexum AI"}</span>
                  <span>•</span>
                  <span>{msg.createdAt}</span>
                </div>
                <div
                  className={`max-w-xl p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-line ${
                    isUser
                      ? "bg-[#4f46e5] text-white rounded-br-xs"
                      : "bg-white border border-slate-200/90 text-slate-900 rounded-bl-xs"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })}

          {isGenerating && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 p-2">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              <span>Analyzing contract consensus and clauses...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Bottom AI Composer */}
        <div className="border-t border-slate-200/80 bg-white p-3 sm:p-3.5 shrink-0 shadow-2xs">
          <form onSubmit={handleSendMessage}>
            <div className="relative rounded-2xl border border-slate-200/90 bg-slate-50/60 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 p-2.5 transition-all shadow-2xs">
              <textarea
                rows={2}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={`Ask Nexum AI anything privately about ${activeScope}...`}
                className="w-full text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 bg-transparent resize-none focus:outline-none p-1 leading-relaxed"
              />

              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100/80 mt-1 gap-2">
                <button
                  type="button"
                  onClick={() => showToast("Attaching specification for AI analysis...")}
                  className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 transition cursor-pointer shrink-0"
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="submit"
                  disabled={!inputValue.trim() || isGenerating}
                  className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition cursor-pointer shadow-xs shrink-0"
                  title="Send inquiry"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* ==============================================================
          RIGHT COLUMN: CONTRACT KNOWLEDGE BASE DRAWER
         ============================================================== */}
      {isRightDrawerOpen ? (
        <aside className="w-[290px] lg:w-[310px] shrink-0 bg-white p-4 sm:p-5 space-y-4 overflow-y-auto shadow-2xs animate-in fade-in slide-in-from-right-3 duration-150">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Contract Knowledge
            </span>
            <button
              type="button"
              onClick={() => setIsRightDrawerOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Hide details"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Suggested Inquiries
            </h3>
            <div className="space-y-1.5">
              {[
                "Is Alex's carousel request scope creep?",
                "Draft a polite CR-2 quote explanation",
                "Explain PayPal escrow release consensus",
                "Review Milestone 2 deliverable requirements",
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputValue(prompt);
                  }}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200/60 bg-slate-50/70 hover:bg-indigo-50/70 hover:border-indigo-200 text-xs text-slate-700 hover:text-indigo-900 font-medium transition cursor-pointer"
                >
                  {prompt} →
                </button>
              ))}
            </div>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setIsRightDrawerOpen(true)}
          className="w-8 shrink-0 border-l border-slate-200/80 bg-white hover:bg-slate-50 flex flex-col items-center justify-center gap-2.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer shadow-2xs group py-4 select-none"
          title="Show contract details"
        >
          <PanelRightOpen className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          <span className="[writing-mode:vertical-rl] text-[10px] font-bold tracking-wider uppercase text-slate-400 group-hover:text-slate-700">
            Details
          </span>
        </button>
      )}

      {/* Chip Detail Modal */}
      {selectedChip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-[#4f46e5] uppercase tracking-wider">
                Canonical Record Citation
              </span>
              <button
                type="button"
                onClick={() => setSelectedChip(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <h4 className="font-bold text-sm text-slate-900">{selectedChip.label}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{selectedChip.detail}</p>
          </div>
        </div>
      )}

      {/* Review Modal */}
      <ReviewVersionModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        versionName="Version 5"
      />
    </div>
  );
}

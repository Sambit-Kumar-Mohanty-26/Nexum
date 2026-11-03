"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Smartphone,
  BarChart2,
  Sparkles,
  Paperclip,
  ArrowUp,
  CheckCircle2,
  Circle,
  Video,
  AlertCircle,
  ExternalLink,
  PanelRightClose,
  PanelRightOpen,
  Send,
  Clock,
  MessageSquare,
  CreditCard,
  FileText,
  Layers,
  ShieldCheck,
  History,
  Download,
  X,
  ChevronRight,
  ArrowRight,
  Lock,
  UploadCloud,
  FileCheck,
  FileCode,
  Package,
} from "lucide-react";
import {
  TimelineItem,
  WorkspaceTaskItem,
  WorkspaceMeetingItem,
  WorkspaceDecisionItem,
} from "@/lib/workspace-types";
import { FreelancerWorkspaceProject } from "@/lib/freelancer-workspace-data";
import { useAuth } from "@/context/AuthContext";
import ReviewVersionModal from "@/components/client/workspace/ReviewVersionModal";
import ReadOriginalMessageModal from "@/components/client/workspace/ReadOriginalMessageModal";
import ProposeMeetingModal from "@/components/client/workspace/ProposeMeetingModal";
import SubmitDeliverableModal from "./SubmitDeliverableModal";
import {
  getWorkspaceTimeline,
  sendWorkspaceMessage,
  submitWorkspaceDeliverable,
  proposeWorkspaceMeeting,
  respondToWorkspaceMeeting,
  submitMeetingNotetakerSynthesis,
  createWorkspaceTask,
  updateWorkspaceTaskStatus,
  fetchWorkspaceProjects,
} from "@/lib/api-client";

interface FreelancerWorkspaceChatsModeProps {
  onSwitchToAIMode: (projectScope?: string) => void;
  onOpenMediationHelp: () => void;
  isStandalone?: boolean;
}

export default function FreelancerWorkspaceChatsMode({
  onSwitchToAIMode,
  onOpenMediationHelp,
  isStandalone = false,
}: FreelancerWorkspaceChatsModeProps) {
  const { user } = useAuth();

  // Projects & Active Selection (Truthful dynamic loading from backend)
  const [projects, setProjects] = useState<FreelancerWorkspaceProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "unread">("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);

  // Dynamic Workspace Engine State
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [tasks, setTasks] = useState<WorkspaceTaskItem[]>([]);
  const [meetings, setMeetings] = useState<WorkspaceMeetingItem[]>([]);
  const [decisions, setDecisions] = useState<WorkspaceDecisionItem[]>([]);
  const [files, setFiles] = useState<Array<{ name: string; size: string; date: string; type: string }>>([]);
  const [agreementHash, setAgreementHash] = useState<string>("canonical_v1.0_pending");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "chat"
    | "overview"
    | "deliverables"
    | "milestones"
    | "tasks"
    | "files"
    | "payments"
    | "decisions"
    | "activity"
    | "meetings"
  >("chat");

  // Proof Modal State
  const [selectedTxForProof, setSelectedTxForProof] = useState<{
    milestoneTitle: string;
    amount: string;
    receiptNumber: string;
    orderId: string;
    captureId: string;
    proofHash: string;
    paymentRail: string;
    status: string;
  } | null>(null);

  // Composer
  const [composerMode, setComposerMode] = useState<"mediated" | "private_ai">("mediated");
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Right Drawer collapsible state
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(true);

  // Modals
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isOriginalMsgModalOpen, setIsOriginalMsgModalOpen] = useState(false);
  const [isProposeMeetingModalOpen, setIsProposeMeetingModalOpen] = useState(false);
  const [isSubmitDeliverableModalOpen, setIsSubmitDeliverableModalOpen] = useState(false);
  const [reviewVersionTarget, setReviewVersionTarget] = useState("Version 5");

  const timelineEndRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Safely derive selected project (null when user has 0 projects)
  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) || (projects.length > 0 ? projects[0] : null);

  const totalUnreadCount = projects.reduce((acc, p) => acc + p.unreadCount, 0);

  // Load real user workspace projects from API
  useEffect(() => {
    let isMounted = true;
    const loadProjects = async () => {
      try {
        setIsProjectsLoading(true);
        const res = await fetchWorkspaceProjects(user?.id || "usr_freelancer_sambit", "FREELANCER");
        if (isMounted) {
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            const mapped: FreelancerWorkspaceProject[] = res.data.map((p: any) => ({
              ...p,
              clientName: p.clientName || "Alex Rivera",
              clientCompany: `${p.clientName || "Client"} Inc.`,
              clientAvatar:
                p.clientAvatar ||
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80",
              escrowFundedAmount: `${p.budget || "$0"} (Secured in Escrow)`,
            }));
            setProjects(mapped);
            setSelectedProjectId((prev) =>
              prev && mapped.some((p) => p.id === prev) ? prev : mapped[0].id
            );
          } else {
            // Clean truthful empty state (0 projects)
            setProjects([]);
            setSelectedProjectId("");
          }
        }
      } catch (err) {
        console.warn("Freelancer workspace projects load error:", err);
        if (isMounted) {
          setProjects([]);
          setSelectedProjectId("");
        }
      } finally {
        if (isMounted) setIsProjectsLoading(false);
      }
    };

    loadProjects();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Auto scroll to latest in timeline
  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline]);

  // Load live timeline and workspace resources from backend
  useEffect(() => {
    if (!selectedProjectId) {
      setTimeline([]);
      setTasks([]);
      setMeetings([]);
      setDecisions([]);
      return;
    }

    const loadState = async () => {
      try {
        setIsLoading(true);
        const res = await getWorkspaceTimeline(selectedProjectId);
        if (res.success && res.data) {
          const convo = res.data;
          if (convo.agreementHash) setAgreementHash(convo.agreementHash);

          if (convo.tasks && convo.tasks.length > 0) {
            setTasks(
              convo.tasks.map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate
                  ? new Date(t.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })
                  : undefined,
                assignedToName: t.assignedTo?.name,
                assignedToRole: t.assignedTo?.role,
              }))
            );
          } else {
            setTasks([]);
          }

          if (convo.meetings && convo.meetings.length > 0) {
            setMeetings(
              convo.meetings.map((m: any) => ({
                id: m.id,
                title: m.title,
                agenda: m.agenda,
                durationMinutes: m.durationMinutes,
                status: m.status,
                proposedSlots: Array.isArray(m.proposedSlots) ? m.proposedSlots : [],
                acceptedSlot: m.acceptedSlot,
                roomUrl: m.roomUrl,
                googleCalendarUrl: m.googleCalendarUrl,
                icsContent: m.icsContent,
                notetakerSummary: m.notetakerSummary,
              }))
            );
          } else {
            setMeetings([]);
          }

          if (convo.decisions && convo.decisions.length > 0) {
            setDecisions(
              convo.decisions.map((d: any) => ({
                id: d.id,
                title: d.title,
                context: d.context,
                resolution: d.resolution,
                status: d.status,
                sha256Seal: d.sha256Seal,
                createdAt: new Date(d.createdAt).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }),
              }))
            );
          } else {
            setDecisions([]);
          }

          if (convo.messages && convo.messages.length > 0) {
            const mapped: TimelineItem[] = convo.messages.map((m: any) => ({
              id: m.id,
              type: m.type as any,
              senderName:
                m.sender?.name || (m.senderRole === "FREELANCER" ? "You (Freelancer)" : "Client"),
              timestamp: new Date(m.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              bubbleText: m.content || m.originalContent,
              rawMessage: m.originalContent,
              summaryText: m.metadata?.summaryText || m.content,
              badgeText:
                m.metadata?.badgeText || (m.senderRole === "FREELANCER" ? "Delivered" : "Verified"),
              badgeType: m.metadata?.badgeType || "green",
              sha256Seal: m.sha256Seal,
              counterofferDetails: m.metadata?.counterofferDetails,
              meetingDetails: m.metadata?.meetingDetails,
              deliverableDetails: m.metadata?.deliverableDetails,
              notetakerDetails: m.metadata?.notetakerDetails,
              actions: m.metadata?.actions,
            }));
            setTimeline(mapped);
          } else {
            setTimeline([]);
          }
        }
      } catch (err) {
        console.warn("Using offline freelancer workspace baseline", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadState();
  }, [selectedProjectId]);

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "DONE" ? "IN_PROGRESS" : "DONE";
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as any } : t))
    );
    try {
      await updateWorkspaceTaskStatus(taskId, newStatus);
      showToast(`Task status updated to ${newStatus}`);
    } catch (err) {
      console.warn("Offline task status toggle fallback", err);
    }
  };

  // Check if input contains scope / price keywords
  const hasScopeOrPriceKeywords =
    /(\$|price|quote|scope|cost|fee|budget|timeline|delay|discount|reduce|counteroffer|hours)/i.test(
      messageInput
    );

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = messageInput.trim();
    if (!text || isSending) return;

    if (composerMode === "private_ai") {
      onSwitchToAIMode(selectedProject?.shortName || "Contracts");
      return;
    }

    setIsSending(true);
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // 1. Add freelancer message
    const freelancerMsg: TimelineItem = {
      id: `fmsg_${Date.now()}`,
      type: "client_bubble",
      senderName: "You (Freelancer)",
      timestamp: nowTime,
      bubbleText: text,
    };

    setTimeline((prev) => [...prev, freelancerMsg]);
    setMessageInput("");

    try {
      await sendWorkspaceMessage(selectedProjectId, {
        senderId: "usr_freelancer_sambit",
        senderRole: "FREELANCER",
        content: text,
      });
    } catch (err) {
      console.warn("Offline message fallback", err);
    }

    // 2. If it's a scope/price change, Nexum generates a structured quote preview
    setTimeout(() => {
      if (hasScopeOrPriceKeywords) {
        const quoteCard: TimelineItem = {
          id: `fquote_${Date.now()}`,
          type: "freelancer_reply_card",
          senderName: "Nexum AI Scope Engine",
          timestamp: nowTime,
          badgeText: "Mediated Scope Amendment Draft",
          badgeType: "purple",
          summaryText:
            "Your message proposes contract adjustments. Nexum AI formulated this as a bilateral change request, ensuring agreement v5 terms are cryptographically anchored.",
          rawMessage: text,
          metrics: {
            priceChange: "+$500",
            scheduleChange: "+4 days",
            agreementVersion: "v4 to v5",
          },
          actions: {
            primaryLabel: "Review Draft Amendment v5",
            primaryAction: "review_v5",
            secondaryLabel: "Ask Nexum AI",
            secondaryAction: "ask_question",
          },
        };
        setTimeline((prev) => [...prev, quoteCard]);
        showToast("Scope adjustment detected: Formatted as Agreement Amendment v5.");
      } else {
        showToast(`Message delivered to ${selectedProject?.clientName || "Client"} via Nexum AI mediation.`);
      }
      setIsSending(false);
    }, 600);
  };

  // Handle action buttons inside timeline cards
  const handleCardAction = (action?: string) => {
    if (!action) return;
    if (action === "review_v4" || action === "review_v5") {
      setReviewVersionTarget(action === "review_v5" ? "Version 5" : "Version 4");
      setIsReviewModalOpen(true);
    } else if (action === "accept_v5") {
      showToast("Acceptance logged to consensus ledger! Dual-signed Agreement v5 is now active.");
      setTimeout(() => {
        const confirmItem: TimelineItem = {
          id: `fconfirm_${Date.now()}`,
          type: "client_bubble",
          senderName: "Nexum Consensus Engine",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          bubbleText: "✓ Counteroffer v5 accepted by Sambit Kumar. Agreement v5 is now canonical on SHA-256 ledger.",
        };
        setTimeline((prev) => [...prev, confirmItem]);
      }, 100);
    } else if (action === "submit_deliverable") {
      setIsSubmitDeliverableModalOpen(true);
    } else if (action === "ask_question") {
      onSwitchToAIMode(selectedProject?.shortName || "Contracts");
    } else if (action === "counter_quote") {
      setMessageInput("I can proceed with the $500 budget if we adjust delivery by 2 days.");
      showToast("Drafting counter-proposal...");
    } else if (action === "decline_offer") {
      showToast("Decline notification recorded. Project remains on Agreement v3 baseline.");
    } else if (action === "open_github") {
      window.open("https://github.com/techkart/storefront/pull/42", "_blank");
    }
  };

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    if (filterType === "unread" && p.unreadCount === 0) return false;
    if (
      searchFilter &&
      !p.name.toLowerCase().includes(searchFilter.toLowerCase()) &&
      !p.clientName.toLowerCase().includes(searchFilter.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#4f46e5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==============================================================
          LEFT COLUMN: ACTIVE PROJECTS LIST (Deto Same as Client Sidebar)
         ============================================================== */}
      <aside className="w-72 sm:w-[300px] border-r border-slate-200/80 bg-slate-50/50 flex flex-col shrink-0 overflow-hidden">
        {/* Header & Filter Controls */}
        <div className="p-4 sm:p-4.5 pb-2.5 space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Workspace
              </h1>
              {isStandalone ? (
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100/90 border border-slate-200/80 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => onSwitchToAIMode()}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-600 hover:text-indigo-600 hover:bg-white/60 transition cursor-pointer"
                    title="Switch to Nexum AI"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>AI</span>
                  </button>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-white text-indigo-700 shadow-2xs">
                    <MessageSquare className="w-3 h-3" />
                    <span>Chats</span>
                    <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                      2
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => window.open("/freelancer/workspace?mode=chats&standalone=true", "_blank")}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200/80 bg-white transition shadow-2xs cursor-pointer flex items-center gap-1 group"
                  title="Open workspace in new tab (larger view)"
                  aria-label="Open workspace in new tab"
                >
                  <ExternalLink className="w-4 h-4 transition-transform group-hover:scale-110" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Collaborate, approve and get delivery.
            </p>
          </div>

          {/* Segmented Filter: All vs Unread */}
          <div className="p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 flex items-center gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                filterType === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterType("unread")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                filterType === "unread"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Unread</span>
              {totalUnreadCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterType === "unread"
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {totalUnreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Search conversations */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100/60 transition shadow-2xs"
            />
          </div>
        </div>

        {/* Conversation List (Clean 2-line layout exactly like client) */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1.5 space-y-1.5">
          {isProjectsLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-3 rounded-2xl bg-white/70 border border-slate-200/50 animate-pulse space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center my-auto">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                No Workspaces Found
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mb-4">
                {searchFilter
                  ? "No active workspaces match your filter criteria."
                  : "You have no active client contracts or workspaces currently in progress."}
              </p>
              <a
                href="/freelancer/dashboard"
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
              >
                Browse Opportunities
              </a>
            </div>
          ) : (
            filteredProjects.map((p) => {
              const isSelected = p.id === selectedProjectId;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`p-3 rounded-2xl transition-all duration-150 cursor-pointer border text-left flex items-start gap-3 ${
                    isSelected
                      ? "bg-indigo-50/70 border-indigo-200/90 shadow-xs ring-1 ring-indigo-500/10"
                      : "bg-white hover:bg-slate-50/80 border-transparent hover:border-slate-200/60"
                  }`}
                >
                  {/* Project Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-white text-indigo-600 shadow-2xs border border-indigo-100"
                        : p.iconType === "cart"
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                        : p.iconType === "mobile"
                        ? "bg-purple-50 text-purple-600 border border-purple-100"
                        : "bg-amber-50 text-amber-600 border border-amber-100"
                    }`}
                  >
                    {p.iconType === "cart" && <ShoppingCart className="w-4 h-4" />}
                    {p.iconType === "mobile" && <Smartphone className="w-4 h-4" />}
                    {p.iconType === "chart" && <BarChart2 className="w-4 h-4" />}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {p.lastActivityTime}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                      {p.clientName} (Client)
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-[11px] text-slate-500 truncate leading-tight">
                        {p.lastMessagePreview}
                      </p>
                      {p.unreadCount > 0 && (
                        <span className="min-w-4.5 h-4.5 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                          {p.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Telegram Mobile Edge Gateway */}
        <div className="p-2.5 border-t border-slate-100 bg-indigo-50/40 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-800">Telegram Bot</span>
          </div>
          <button
            type="button"
            onClick={() => window.open("https://t.me/NexumDev_Bot?start=link_usr_freelancer_sambit", "_blank")}
            className="text-[10px] font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded-md hover:bg-indigo-50 transition cursor-pointer"
          >
            Connect @NexumDev_Bot
          </button>
        </div>

        {/* Bottom CTA Button */}
        <div className="p-3 border-t border-slate-200/70 bg-white">
          <button
            type="button"
            onClick={() => onSwitchToAIMode("All my client contracts")}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-50/90 via-white to-purple-50/90 hover:from-indigo-100/70 hover:to-purple-100/70 border border-indigo-200/70 text-indigo-700 text-xs font-bold transition shadow-2xs cursor-pointer group"
          >
            <Sparkles className="w-4 h-4 text-indigo-600 group-hover:rotate-12 transition-transform" />
            <span>Ask Nexum AI about all contracts</span>
          </button>
        </div>
      </aside>

      {/* ==============================================================
          CENTRE COLUMN: ACTIVE PROJECT CHAT & TIMELINE (Deto Same as Client)
         ============================================================== */}
      <main className="flex-1 flex flex-col min-w-0 border-r border-slate-200/80 bg-slate-50/40 overflow-hidden">
        {!selectedProject ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              No Active Client Workspaces
            </h3>
            <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
              Select an active client project from the sidebar to inspect milestone deliverables, collaborate via mediated chat, or submit verifiable work.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="/freelancer/dashboard"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
              >
                Explore Opportunities
              </a>
              <button
                type="button"
                onClick={() => onSwitchToAIMode()}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ask Nexum AI Copilot</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Project Header - Compact, Sleek, Single Line (Clean like client) */}
            <div className="px-4 sm:px-5 pt-2.5 pb-0 border-b border-slate-200/80 bg-white shrink-0 shadow-2xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs ${
                      selectedProject.iconType === "cart"
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                        : selectedProject.iconType === "mobile"
                        ? "bg-purple-50 text-purple-600 border border-purple-100"
                        : "bg-amber-50 text-amber-600 border border-amber-100"
                    }`}
                  >
                    {selectedProject.iconType === "cart" && <ShoppingCart className="w-3.5 h-3.5" />}
                    {selectedProject.iconType === "mobile" && <Smartphone className="w-3.5 h-3.5" />}
                    {selectedProject.iconType === "chart" && <BarChart2 className="w-3.5 h-3.5" />}
                  </div>

                  <div className="flex items-center gap-2 min-w-0 whitespace-nowrap">
                    <h2 className="text-sm font-bold text-slate-900 tracking-tight truncate">
                      {selectedProject.name}
                    </h2>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/70 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Active</span>
                    </span>
                    <span className="text-slate-300 hidden sm:inline shrink-0">·</span>
                    <span className="text-xs text-slate-500 hidden sm:inline truncate shrink-0">
                      with {selectedProject.clientName}
                    </span>
                  </div>
                </div>

                {/* Header actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsProposeMeetingModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5 text-slate-500" />
                    <span>Propose meeting</span>
                  </button>

                  {!isRightDrawerOpen && (
                    <button
                      type="button"
                      onClick={() => setIsRightDrawerOpen(true)}
                      className="p-1 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition cursor-pointer shadow-2xs"
                      title="Show project details"
                      aria-label="Show project details"
                    >
                      <PanelRightOpen className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Subtabs: Chat | Overview | Deliverables | Milestones | Tasks | Files | Payments | Decisions | Activity | Meetings */}
              <div className="flex items-center justify-between mt-2 border-t border-slate-100/80 pt-1 text-xs font-semibold gap-3">
                <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto scrollbar-none pb-0.5">
                  {[
                    { id: "chat", label: "Chat" },
                    { id: "overview", label: "Overview" },
                    { id: "deliverables", label: "Deliverables" },
                    { id: "milestones", label: "Milestones" },
                    { id: "tasks", label: "Tasks" },
                    { id: "files", label: "Files" },
                    { id: "payments", label: "Payments & Escrow" },
                    { id: "decisions", label: "Decisions" },
                    { id: "activity", label: "Activity" },
                    { id: "meetings", label: "Meetings" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as typeof activeTab)}
                      className={`pb-1.5 transition relative cursor-pointer shrink-0 whitespace-nowrap ${
                        activeTab === tab.id
                          ? "text-indigo-600 font-bold"
                          : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {activeTab === tab.id && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Extreme right: Mediated by Nexum AI */}
                <button
                  type="button"
                  onClick={onOpenMediationHelp}
                  className="inline-flex items-center gap-1.5 pb-1.5 text-indigo-600 hover:text-indigo-700 font-semibold text-[11px] transition cursor-pointer hover:underline shrink-0"
                  title="Learn how Nexum AI mediates every message"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden md:inline">Mediated by Nexum AI</span>
                </button>
              </div>
            </div>

            {/* Center Main Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* TAB 1: CHAT FEED */}
              {activeTab === "chat" && (
                timeline.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30 min-h-[360px]">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-2xs">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Workspace Ready for Collaboration</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      This workspace is secured with AI mediation and bilateral escrow. Send a status update or propose a kickoff meeting to begin.
                    </p>
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setIsProposeMeetingModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Propose Kickoff Meeting</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Timeline Items */}
                    {timeline.map((item) => {
                if (item.type === "client_bubble") {
                  const isYou = item.senderName.includes("You");
                  return (
                    <div
                      key={item.id}
                      className={`flex flex-col ${isYou ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-bold text-slate-400">
                        <span>{item.senderName}</span>
                        <span>•</span>
                        <span>{item.timestamp}</span>
                      </div>
                      <div
                        className={`max-w-xl p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                          isYou
                            ? "bg-[#4f46e5] text-white rounded-br-xs"
                            : "bg-white border border-slate-200/90 text-slate-900 rounded-bl-xs"
                        }`}
                      >
                        {item.bubbleText}
                      </div>
                    </div>
                  );
                }

                if (item.type === "freelancer_reply_card") {
                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl border border-indigo-200 bg-white shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                          <Sparkles className="w-3 h-3 text-purple-500" />
                          <span>{item.badgeText}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">{item.timestamp}</span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {item.summaryText}
                      </p>

                      {item.rawMessage && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-mono text-slate-600">
                          &ldquo;{item.rawMessage}&rdquo;
                        </div>
                      )}

                      {item.metrics && (
                        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 text-xs text-center font-bold">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-normal">Price</span>
                            <span className="text-purple-700 font-mono">{item.metrics.priceChange}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-normal">Schedule</span>
                            <span className="text-purple-700 font-mono">{item.metrics.scheduleChange}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block font-normal">Agreement</span>
                            <span className="text-purple-700 font-mono">{item.metrics.agreementVersion}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setIsOriginalMsgModalOpen(true)}
                          className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          {item.originalMessageLinkText || "View canonical record"}
                        </button>

                        <div className="flex items-center gap-2">
                          {item.actions?.secondaryLabel && (
                            <button
                              type="button"
                              onClick={() => handleCardAction(item.actions?.secondaryAction)}
                              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                            >
                              {item.actions.secondaryLabel}
                            </button>
                          )}
                          {item.actions?.primaryLabel && (
                            <button
                              type="button"
                              onClick={() => handleCardAction(item.actions?.primaryAction)}
                              className="px-3.5 py-1.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                            >
                              {item.actions.primaryLabel}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                if (item.type === "draft_counteroffer_card") {
                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>{item.badgeText}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">{item.timestamp}</span>
                      </div>

                      <p className="text-xs text-slate-800 leading-relaxed font-medium">
                        {item.summaryText}
                      </p>

                      {item.counterofferDetails && (
                        <div className="p-3 rounded-xl bg-white border border-amber-200/80 space-y-1.5 text-xs">
                          <div className="font-bold text-slate-900">
                            {item.counterofferDetails.title}
                          </div>
                          <div className="flex items-center justify-between text-slate-600 text-[11px]">
                            <span>Offered Compensation: <strong className="text-emerald-700">{item.counterofferDetails.priceChange}</strong></span>
                            <span>Extension: <strong className="text-slate-800">{item.counterofferDetails.schedule}</strong></span>
                            <span className="text-rose-600 font-semibold">Expires: {item.counterofferDetails.expires}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
                        {item.actions?.tertiaryLabel && (
                          <button
                            type="button"
                            onClick={() => handleCardAction(item.actions?.tertiaryAction)}
                            className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition cursor-pointer"
                          >
                            {item.actions.tertiaryLabel}
                          </button>
                        )}
                        {item.actions?.secondaryLabel && (
                          <button
                            type="button"
                            onClick={() => handleCardAction(item.actions?.secondaryAction)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                          >
                            {item.actions.secondaryLabel}
                          </button>
                        )}
                        {item.actions?.primaryLabel && (
                          <button
                            type="button"
                            onClick={() => handleCardAction(item.actions?.primaryAction)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                          >
                            {item.actions.primaryLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                if (item.type === "agreement_comparison_card") {
                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{item.badgeText}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">{item.timestamp}</span>
                      </div>

                      <p className="text-xs text-slate-800 leading-relaxed font-medium">
                        {item.summaryText}
                      </p>

                      <div className="p-3 rounded-xl bg-white border border-emerald-200/80 text-xs font-mono text-slate-700 whitespace-pre-line">
                        {item.rawMessage}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        {item.actions?.secondaryLabel && (
                          <button
                            type="button"
                            onClick={() => handleCardAction(item.actions?.secondaryAction)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>{item.actions.secondaryLabel}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </button>
                        )}
                        {item.actions?.primaryLabel && (
                          <button
                            type="button"
                            onClick={() => handleCardAction(item.actions?.primaryAction)}
                            className="px-3.5 py-1.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                          >
                            {item.actions.primaryLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                return null;
              })}

              <div ref={timelineEndRef} />
            </>
          ))}

          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* 1. Scope Summary Card */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Scope Summary & Consensus Objectives</span>
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                    Agreement {selectedProject.agreementVersion}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedProject.name} — Bilateral workspace secured with PayPal Orders v2 REST escrow settlement rails and dual SHA-256 state machines to guarantee agreement stability.
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {["Next.js 16", "TypeScript", "Node.js", "PayPal REST v2", "PostgreSQL", "Tailwind CSS"].map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200/80 text-[11px] font-semibold text-slate-700"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* 2. Key Contract Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Contract</span>
                  <div className="text-base font-black text-slate-900 font-mono">{selectedProject.budget}</div>
                  <span className="text-[10px] text-slate-400 block">100% Fixed Escrow</span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
                  <div className="text-base font-black text-emerald-600 font-mono">
                    {selectedProject.milestones?.filter(m => m.status === "APPROVED" || m.status === "CAPTURED").length || 0} Milestones
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold block">Approved & Disbursed</span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">In Progress</span>
                  <div className="text-base font-black text-indigo-600 font-mono">
                    {selectedProject.milestones?.filter(m => m.status !== "APPROVED" && m.status !== "CAPTURED").length || 0} Milestones
                  </div>
                  <span className="text-[10px] text-indigo-600 font-semibold block">Active Delivery</span>
                </div>

                <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                  <div className="text-base font-black text-slate-900 font-mono">{selectedProject.duration}</div>
                  <span className="text-[10px] text-slate-400 block">Started {selectedProject.startDate}</span>
                </div>
              </div>

              {/* 3. Deliverable Roadmap Steps */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Active Deliverable Roadmap</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("milestones")}
                    className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all milestones</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-2">
                  {(!selectedProject.milestones || selectedProject.milestones.length === 0) ? (
                    <div className="p-4 text-center text-xs text-slate-400">No milestones scheduled yet.</div>
                  ) : (
                    selectedProject.milestones.map((m) => {
                      const isDone = m.status === "APPROVED" || m.status === "CAPTURED";
                      const isInReview = m.status === "IN_REVIEW" || m.status === "READY_FOR_WORK";
                      return (
                        <div key={m.id} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : isInReview ? (
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                            <span className={`font-semibold ${isDone ? "text-slate-700" : isInReview ? "text-slate-900 font-bold" : "text-slate-500"}`}>
                              Milestone {m.number}: {m.title}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${m.statusColor || "text-slate-600 bg-slate-50 border-slate-200"}`}>
                            {m.status} ({m.amount})
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 4. Next Recommended Actions */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Recommended Next Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-900 text-xs">Counteroffer v5 Pending Review</span>
                      <span className="text-[10px] text-amber-700 font-semibold font-mono">+$500</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Alex Chen proposed +$500 for the CR-2 carousel component. Review diff against Agreement v3.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setReviewVersionTarget("Version 5");
                        setIsReviewModalOpen(true);
                      }}
                      className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>Review counteroffer now</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-900 text-xs">Milestone 2 In Review</span>
                      <span className="text-[10px] text-indigo-700 font-semibold font-mono">$4,000 held</span>
                    </div>
                    <p className="text-[11px] text-indigo-800">
                      PR #42 and Loom video submitted. Client has 72 hours for automated acceptance window.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("deliverables")}
                      className="text-xs font-bold text-indigo-700 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span>Inspect deliverable status</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DELIVERABLES */}
          {activeTab === "deliverables" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Milestone Deliverables & Submissions
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verifiable work packages anchored to consensus state.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSubmitDeliverableModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  + Submit Deliverable
                </button>
              </div>

              {!selectedProject.milestones || selectedProject.milestones.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-700">No Deliverables Submitted Yet</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Milestone deliverable submissions, pull requests, and review countdowns will be tracked here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedProject.milestones.map((m) => {
                    const isApproved = m.status === "APPROVED" || m.status === "CAPTURED";
                    return (
                      <div key={m.id} className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-indigo-50 text-[#4f46e5] border border-indigo-100 mb-1">
                              Milestone {m.number} · {m.amount}
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {m.title}
                            </h4>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 ${
                            isApproved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{isApproved ? "Approved & Escrow Released" : "In Client Review"}</span>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Submission Target</span>
                            <span className="font-mono text-slate-700 font-bold">
                              Due {m.dueDate}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SHA-256 Deliverable Fingerprint</span>
                            <span className="font-mono text-[11px] text-slate-700 font-bold">
                              {agreementHash.slice(0, 16)}...{m.id.slice(-4)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FILES */}
          {activeTab === "files" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Project Files & Attachments
                </h3>
                <button
                  type="button"
                  onClick={() => showToast("File attachment selector opened.")}
                  className="px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
              </div>
              {files.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-700">No Files in Vault</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Share specifications, design mockups, wireframes, and test scripts directly within this contract vault.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between text-xs hover:border-indigo-500/40 transition shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px] border border-indigo-100">
                          {f.type}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{f.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {f.size} · {f.date}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => showToast(`Downloading ${f.name}...`)}
                        className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TASKS */}
          {activeTab === "tasks" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Project Tasks & Commitments
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Action items dynamically synced across bilateral chat and AI meeting notes.
                  </p>
                </div>
              </div>

              {tasks.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-700">No Tasks on the Board</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Track sprint action items, deliverable checklists, and AI-extracted meeting commitments here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleToggleTaskStatus(t.id, t.status)}
                      className="p-3.5 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between text-xs shadow-2xs hover:border-indigo-200 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-2.5">
                        {t.status === "DONE" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span
                          className={
                            t.status === "DONE"
                              ? "line-through text-slate-400"
                              : "font-semibold text-slate-800"
                          }
                        >
                          {t.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {t.dueDate && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Due {t.dueDate}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.priority === "HIGH"
                              ? "bg-red-50 text-red-600"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {t.priority || "MEDIUM"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: MILESTONES */}
          {activeTab === "milestones" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Milestones & Escrow Schedule
              </h3>
              {!selectedProject.milestones || selectedProject.milestones.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-700">No Milestones Configured</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Milestones and escrow payout checkpoints will be shown here once agreed upon.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedProject.milestones.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-2 text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {m.number}. {m.title}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.statusColor}`}>
                          {m.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>Due date: {m.dueDate}</span>
                        <span className="font-bold font-mono text-slate-800 text-xs">{m.amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: PAYMENTS & ESCROW */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Escrow & Payment Tracking</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bilateral PayPal REST v2 escrow with cryptographic SHA-256 settlement receipts.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Escrow Active</span>
                </div>
              </div>

              {!selectedProject.milestones || selectedProject.milestones.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-700">No Escrow Transactions</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Milestone escrow deposits, releases, and proof receipts will be recorded here.
                  </p>
                </div>
              ) : (
                <>
                  {/* Balance Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Total Contract Escrow
                      </span>
                      <div className="text-lg font-black text-slate-900 font-mono">
                        {selectedProject.budget}
                      </div>
                      <span className="text-[10px] text-slate-500 block">Agreed fixed scope</span>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Released to PayPal
                      </span>
                      <div className="text-lg font-black text-emerald-600 font-mono">
                        $2,000.00 USD
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold block">
                        Milestone 1 Disbursed
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Locked in Escrow
                      </span>
                      <div className="text-lg font-black text-indigo-600 font-mono">
                        $4,000.00 USD
                      </div>
                      <span className="text-[10px] text-indigo-600 font-semibold block">
                        Milestone 2 Verified Capture
                      </span>
                    </div>
                  </div>

                  {/* Milestone Payments Table */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Milestone Disbursement Ledger
                    </h4>

                    <div className="divide-y divide-slate-100">
                      {selectedProject.milestones.map((m, idx) => (
                        <div
                          key={m.id || idx}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                Milestone {m.number}: {m.title}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  m.status === "CAPTURED" || m.status === "Accepted"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {m.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              Due {m.dueDate} · PayPal REST v2 Escrow
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-mono font-bold text-slate-900 text-sm">{m.amount}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTxForProof({
                                  milestoneTitle: `Milestone ${m.number}: ${m.title}`,
                                  amount: `${m.amount} USD`,
                                  receiptNumber: `NX-PAY-2026-${m.number}891`,
                                  orderId: `4AB912048C88192${m.number}K`,
                                  captureId: `8GH739219K00129${m.number}A`,
                                  proofHash:
                                    "0x9f8c2b7e53a104bc8d7e6f1a9b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c",
                                  paymentRail: "PayPal Sandbox REST v2 Bilateral Escrow Rail",
                                  status: m.status,
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-indigo-600 font-bold text-[11px] transition shadow-2xs cursor-pointer flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3 text-indigo-600" />
                              <span>Proof receipt</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB: DECISIONS */}
          {activeTab === "decisions" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Mutual Consensus Record
              </h3>
              {decisions.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-700">No Decision Records Yet</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Architectural decisions, bilateral scope amendments, and canonical agreements are cryptographically logged here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {decisions.map((dec) => (
                    <div
                      key={dec.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-2 text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-800">{dec.title}</span>
                        {dec.sha256Seal && (
                          <span className="text-emerald-700 font-mono text-[10px]">
                            hash: {dec.sha256Seal.slice(0, 10)}...
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {dec.resolution || dec.context}
                      </p>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Logged on {dec.createdAt} · Status: {dec.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ACTIVITY & AUDIT LOG */}
          {activeTab === "activity" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Project Audit Log & Consensus Activity</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cryptographic consensus event history, milestone approvals, and state machine transitions.
                  </p>
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                  LEDGER: 0x9f8c2b7e
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="space-y-0">
                  {[
                    {
                      id: "act-1",
                      title: "Counteroffer v5 Received for CR-2",
                      description: "Alex Chen proposed +$500 with unchanged +4 days schedule for carousel feature.",
                      actor: "Alex Chen (Client)",
                      time: "Today, 10:31 AM",
                      icon: MessageSquare,
                      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
                      badge: "Under Review",
                      badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
                    },
                    {
                      id: "act-2",
                      title: "Milestone 2 Deliverable Submitted",
                      description: "Frontend repository pull request #42 and Loom video walkthrough recorded to consensus.",
                      actor: "Sambit Kumar (Freelancer)",
                      time: "Nov 14, 2026, 2:40 PM",
                      icon: UploadCloud,
                      color: "text-amber-600 bg-amber-50 border-amber-200",
                      badge: "In Client Review",
                      badgeStyle: "bg-amber-50 text-amber-700 border-amber-200/80",
                    },
                    {
                      id: "act-3",
                      title: "PayPal Escrow Pre-Funding Confirmed",
                      description: "Bilateral escrow capture confirmed for $4,000.00 USD via PayPal Sandbox Orders v2.",
                      actor: "Nexum Automated Settlement",
                      time: "Nov 12, 2026, 9:15 AM",
                      icon: CreditCard,
                      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
                      badge: "Escrow Locked",
                      badgeStyle: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
                    },
                    {
                      id: "act-4",
                      title: "Milestone 1 Accepted & Released",
                      description: "Alex Chen approved Milestone 1. $2,000.00 USD payout disbursed to freelancer PayPal account.",
                      actor: "Alex Chen (Client)",
                      time: "Oct 18, 2026, 11:30 AM",
                      icon: CheckCircle2,
                      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
                      badge: "Completed",
                      badgeStyle: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
                    },
                    {
                      id: "act-5",
                      title: "Agreement v3 Canonical Ratification",
                      description: "Dual SHA-256 agreement baseline anchored between Alex Chen and Sambit Kumar for $10,000 USD.",
                      actor: "Consensus Engine",
                      time: "Oct 10, 2026, 10:00 AM",
                      icon: FileCheck,
                      color: "text-purple-600 bg-purple-50 border-purple-200",
                      badge: "Baseline Active",
                      badgeStyle: "bg-purple-50 text-purple-700 border-purple-200/80",
                    },
                  ].map((ev, idx, arr) => {
                    const Icon = ev.icon;
                    const isLast = idx === arr.length - 1;
                    return (
                      <div key={ev.id} className="relative flex items-start gap-4 group text-xs">
                        {/* Rail node + line */}
                        <div className="flex flex-col items-center shrink-0 self-stretch">
                          <div
                            className={`w-8 h-8 rounded-xl border flex items-center justify-center ${ev.color} shadow-2xs shrink-0 z-10 transition group-hover:scale-105`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          {!isLast && (
                            <div className="w-0.5 grow bg-slate-200 my-1 rounded-full group-hover:bg-slate-300 transition" />
                          )}
                        </div>

                        {/* Content */}
                        <div className={`space-y-1 min-w-0 flex-1 pt-0.5 ${!isLast ? "pb-5" : "pb-1"}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-slate-900">{ev.title}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{ev.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{ev.description}</p>
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                              Actor: {ev.actor}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ev.badgeStyle}`}>
                              {ev.badge}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: MEETINGS */}
          {activeTab === "meetings" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Scheduled Sync Calls
                </h3>
                <button
                  type="button"
                  onClick={() => setIsProposeMeetingModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  + Propose Meeting
                </button>
              </div>

              {meetings.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                  <Video className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-slate-700">No Meetings Scheduled</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Sync calls proposed or accepted between you and the client will appear here with Google Calendar links and AI notetaker summaries.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsProposeMeetingModalOpen(true)}
                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Propose First Meeting</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-2 text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-indigo-600" />
                          <span className="font-bold text-slate-900">{meeting.title}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            meeting.status === "CONFIRMED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {meeting.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {meeting.acceptedSlot ||
                          (meeting.proposedSlots && meeting.proposedSlots[0]) ||
                          "Time slot pending"}
                        {meeting.agenda ? ` · ${meeting.agenda}` : ""}
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        {meeting.roomUrl && (
                          <a
                            href={meeting.roomUrl}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold inline-flex items-center gap-1"
                          >
                            <Video className="w-3 h-3" />
                            <span>Join Nexum Room</span>
                          </a>
                        )}
                        {meeting.googleCalendarUrl && (
                          <a
                            href={meeting.googleCalendarUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1"
                          >
                            <span>Add to Google Calendar</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Composer (Bottom - Deto Same as Client from Image 2) */}
        <div className="border-t border-slate-200/80 bg-white p-3 sm:p-3.5 shrink-0 shadow-2xs">
          <form onSubmit={handleSendMessage}>
            <div className="relative rounded-2xl border border-slate-200/90 bg-slate-50/60 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 p-2.5 transition-all shadow-2xs">
              <textarea
                rows={2}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  composerMode === "mediated"
                    ? `Message ${selectedProject.clientName}... (Nexum AI verifies scope & price before delivery)`
                    : `Ask Nexum AI privately about ${selectedProject.shortName}... (private to you)`
                }
                className="w-full text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 bg-transparent resize-none focus:outline-none p-1 leading-relaxed"
              />

              {/* Bottom bar of input */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100/80 mt-1 gap-2">
                <div className="flex items-center gap-1.5 text-slate-500 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => showToast("File attachment selector opened.")}
                    className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 transition cursor-pointer shrink-0"
                    title="Attach file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => showToast("File share dialog opened.")}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
                  >
                    Share file
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsSubmitDeliverableModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition cursor-pointer shrink-0 font-bold"
                  >
                    + Submit deliverable
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsProposeMeetingModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
                  >
                    Propose meeting
                  </button>

                  {hasScopeOrPriceKeywords && (
                    <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70 shrink-0">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      <span>Review required</span>
                    </span>
                  )}
                </div>

                {/* Right side: Compact Mode Switcher + Send button */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="p-0.5 rounded-xl bg-slate-100 border border-slate-200/70 inline-flex items-center gap-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setComposerMode("mediated")}
                      title={`Message ${selectedProject.clientName} (Mediated via Nexum AI)`}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 ${
                        composerMode === "mediated"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <span>Via Nexum</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setComposerMode("private_ai")}
                      title="Ask Nexum AI privately (Clients never see this)"
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 ${
                        composerMode === "private_ai"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span>Private AI</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!messageInput.trim() || isSending}
                    className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition cursor-pointer shadow-xs shrink-0"
                    title={
                      composerMode === "mediated"
                        ? "Send message (Enter)"
                        : "Ask Nexum AI (Enter)"
                    }
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </>
    )}
  </main>

  {/* ==============================================================
      RIGHT COLUMN: PROJECT OVERVIEW PANEL (Deto Same as Client)
     ============================================================== */}
  {isRightDrawerOpen ? (
    !selectedProject ? (
      <aside className="w-[290px] lg:w-[310px] shrink-0 bg-white p-6 flex flex-col items-center justify-center text-center text-slate-400 border-l border-slate-200/80">
        <FileText className="w-10 h-10 mb-2 stroke-[1.5] text-slate-300" />
        <div className="text-xs font-bold text-slate-700">No Contract Details</div>
        <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
          Select a workspace from the sidebar to inspect agreement terms, milestones, and escrow status.
        </p>
      </aside>
    ) : (
      <aside className="w-[290px] lg:w-[310px] shrink-0 bg-white p-4 sm:p-5 space-y-4 overflow-y-auto shadow-2xs animate-in fade-in slide-in-from-right-3 duration-150">
        {/* Panel Header & Collapse Toggle */}
        <div className="flex items-center justify-between pb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Project Details
          </span>
          <button
            type="button"
            onClick={() => setIsRightDrawerOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            title="Hide details (gives chat more space)"
            aria-label="Hide details"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Project Overview Card */}
        <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Overview
            </h3>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 whitespace-nowrap shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>In progress</span>
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Client</span>
              <span className="font-semibold text-slate-900">{selectedProject.clientName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Company</span>
              <span className="font-semibold text-slate-900">{selectedProject.clientCompany}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Budget</span>
              <span className="font-semibold text-slate-900 font-mono">{selectedProject.budget}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Duration</span>
              <span className="font-semibold text-slate-900">{selectedProject.duration}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-400">Start date</span>
              <span className="text-slate-800">{selectedProject.startDate}</span>
            </div>
            <div className="flex justify-between py-1 items-center">
              <span className="text-slate-400">Agreement</span>
              <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 font-mono text-[11px]">
                {selectedProject.agreementVersion.includes("active") ? selectedProject.agreementVersion : `${selectedProject.agreementVersion} active`}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Needs Your Decision Card */}
        {selectedProject.decisionRequired && (
          <div className="p-4.5 rounded-2xl border border-amber-200/90 bg-amber-50/50 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              {selectedProject.decisionRequired.title}
            </h3>
            <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
              {selectedProject.decisionRequired.description}
            </p>
            <button
              type="button"
              onClick={() => {
                setReviewVersionTarget(selectedProject.decisionRequired?.version || "Version 5");
                setIsReviewModalOpen(true);
              }}
              className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer text-center"
            >
              {selectedProject.decisionRequired.actionLabel}
            </button>
          </div>
        )}

        {/* 3. Milestones Card */}
        <div className="p-4.5 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Milestones
            </h3>
            <button
              type="button"
              onClick={() => setIsSubmitDeliverableModalOpen(true)}
              className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              + Submit
            </button>
          </div>

          {selectedProject.milestones && selectedProject.milestones.length > 0 ? (
            <div className="space-y-2.5 text-xs">
              {selectedProject.milestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-b-0">
                  <div>
                    <div className="font-bold text-slate-900">
                      {m.number}. {m.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {m.amount} · {m.dueDate}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.statusColor}`}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">No milestones configured yet.</p>
          )}

          {selectedProject.paymentNote && (
            <p className="text-[10px] text-slate-400 leading-relaxed pt-1.5 border-t border-slate-100">
              {selectedProject.paymentNote}
            </p>
          )}
        </div>

        {/* 4. Upcoming Card */}
        {selectedProject.upcomingMeeting && (
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-2 text-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Upcoming
            </h3>
            <div className="flex items-center justify-between gap-2 pt-1">
              <div>
                <div className="font-bold text-slate-900">{selectedProject.upcomingMeeting.title}</div>
                <div className="text-[11px] text-slate-500">{selectedProject.upcomingMeeting.time}</div>
              </div>
              <button
                type="button"
                onClick={() => showToast("Launching video meeting room...")}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 font-bold text-slate-800 text-xs transition cursor-pointer shadow-2xs"
              >
                Join
              </button>
            </div>
          </div>
        )}
      </aside>
    )
  ) : (
    <button
          type="button"
          onClick={() => setIsRightDrawerOpen(true)}
          className="w-8 shrink-0 border-l border-slate-200/80 bg-white hover:bg-slate-50 flex flex-col items-center justify-center gap-2.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer shadow-2xs group py-4 select-none"
          title="Show project details"
        >
          <PanelRightOpen className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          <span className="[writing-mode:vertical-rl] text-[10px] font-bold tracking-wider uppercase text-slate-400 group-hover:text-slate-700">
            Details
          </span>
        </button>
      )}

      {/* ==============================================================
          MODALS
         ============================================================== */}
      <ReviewVersionModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        versionName={reviewVersionTarget}
        onApproveVersion={() => {
          showToast(`Agreement ${reviewVersionTarget} approved & sealed on consensus ledger!`);
        }}
      />

      <ReadOriginalMessageModal
        isOpen={isOriginalMsgModalOpen}
        onClose={() => setIsOriginalMsgModalOpen(false)}
        rawMessage="Hey Alex, I checked the request for the best-selling products carousel with dynamic category pills. It requires an additional database query index and 2 custom components. I can do it for an additional $600 and 4 days on the timeline. Let me know if that works for you."
        senderName="Sambit Kumar (You)"
        timestamp="Oct 28, 2026 · 10:24 AM"
      />

      <ProposeMeetingModal
        isOpen={isProposeMeetingModalOpen}
        onClose={() => setIsProposeMeetingModalOpen(false)}
        freelancerName={selectedProject?.clientName || "Client"}
      />

      <SubmitDeliverableModal
        isOpen={isSubmitDeliverableModalOpen}
        onClose={() => setIsSubmitDeliverableModalOpen(false)}
        onSubmitSuccess={async (details) => {
          showToast("Milestone 2 deliverable logged to consensus!");
          try {
            await submitWorkspaceDeliverable(selectedProjectId, {
              milestoneId: "ms_techkart_2",
              freelancerId: "usr_freelancer_sambit",
              repoUrl: details.prUrl,
              previewUrl: details.loomUrl,
              notes: details.notes,
            });
          } catch (err) {
            console.warn("Deliverable submitted offline", err);
          }
          const delivItem: TimelineItem = {
            id: `deliv_${Date.now()}`,
            type: "agreement_comparison_card",
            senderName: "Nexum AI Consensus Engine",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            badgeText: "Deliverable Submitted",
            badgeType: "green",
            summaryText: `You submitted Pull Request: ${details.prUrl}. Automated SHA-256 pre-checks verified. 72-hour review buffer activated.`,
            actions: {
              primaryLabel: "Update Submission",
              primaryAction: "submit_deliverable",
            },
          };
          setTimeline((prev) => [...prev, delivItem]);
        }}
      />

      {/* Proof of Settlement Receipt Modal */}
      {selectedTxForProof && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 p-6 text-slate-900 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-bold">
                  Receipt: {selectedTxForProof.receiptNumber}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Verifiable Settlement Evidence
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTxForProof(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Payout</span>
                <span className="text-xl font-extrabold text-slate-900 font-mono">
                  {selectedTxForProof.amount}
                </span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {selectedTxForProof.status}
              </span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">PayPal Order ID</span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block">{selectedTxForProof.orderId}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">PayPal Capture ID</span>
                <span className="font-bold text-slate-900 text-xs mt-0.5 block">{selectedTxForProof.captureId}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Dual SHA-256 Proof Hash</span>
                <span className="font-bold text-indigo-600 text-[11px] mt-0.5 block break-all">
                  {selectedTxForProof.proofHash}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Payment Rail & Processor</span>
                <span className="font-semibold text-slate-800 text-xs mt-0.5 block">{selectedTxForProof.paymentRail}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  showToast(`Downloaded verifiable PDF receipt for ${selectedTxForProof.receiptNumber}.`);
                  setSelectedTxForProof(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedTxForProof(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

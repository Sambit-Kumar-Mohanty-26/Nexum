"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calendar,
  DollarSign,
  ChevronRight,
  User,
  Sparkles,
  ArrowUpDown,
  RotateCcw,
  ShieldCheck,
  FileText,
  CreditCard,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  FolderKanban,
  Trash2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { fetchClientProjects, deleteProject } from "@/lib/api-client";

export type ProjectLifecycleStatus =
  | "ALL"
  | "DRAFT"
  | "FINDING_FREELANCERS"
  | "NEGOTIATION"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "COMPLETED"
  | "DISPUTED";

export interface ProjectCardData {
  id: string;
  name: string;
  description: string;
  status: ProjectLifecycleStatus;
  statusLabel: string;
  statusColor: string;
  stageSummary: string;
  nextAction: {
    label: string;
    description: string;
    type: "ACTION_REQUIRED" | "AWAITING_REPLY" | "RESUME" | "VIEW";
    urgent?: boolean;
  };
  lastUpdated: string;
  updatedTimestamp: number;
  createdAtTimestamp: number;
  nextMilestoneDueTimestamp: number | null;
  freelancer?: {
    name: string;
    role: string;
    avatar: string;
  };
  nextMilestone?: {
    title: string;
    dueDate: string;
    amount: string;
  };
  totalBudget?: string;
  needsAction: boolean;
  hasDeltaChange?: boolean;
}

interface ClientProjectsViewProps {
  onOpenProjectWorkspace?: (projectId: string, initialTab?: string) => void;
  onCreateNewProject?: () => void;
}

export default function ClientProjectsView({
  onOpenProjectWorkspace,
  onCreateNewProject,
}: ClientProjectsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFilter = searchParams.get("filter") as ProjectLifecycleStatus | null;

  // Real projects and dynamic stats
  const [projects, setProjects] = useState<ProjectCardData[]>([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    inProgressCount: 0,
    needsActionCount: 0,
    countsByStatus: {
      ALL: 0,
      IN_PROGRESS: 0,
      IN_REVIEW: 0,
      NEGOTIATION: 0,
      FINDING_FREELANCERS: 0,
      DRAFT: 0,
      COMPLETED: 0,
      DISPUTED: 0,
    } as Record<string, number>,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ProjectLifecycleStatus>(urlFilter || "ALL");
  const [onlyNeedsAction, setOnlyNeedsAction] = useState(false);
  const [sortBy, setSortBy] = useState<"recently_updated" | "recently_created" | "next_due">("recently_updated");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync url filter param if changed
  useEffect(() => {
    if (urlFilter) {
      setActiveFilter(urlFilter);
    }
  }, [urlFilter]);

  // Load live projects from backend
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetchClientProjects();
      if (res && Array.isArray(res.data)) {
        setProjects(res.data);
        if (res.stats) {
          setStats(res.stats);
        } else {
          const inProg = res.data.filter((p: any) => p.status === "IN_PROGRESS" || p.status === "IN_REVIEW").length;
          const needsAct = res.data.filter((p: any) => p.needsAction).length;
          setStats({
            totalCount: res.data.length,
            inProgressCount: inProg,
            needsActionCount: needsAct,
            countsByStatus: {
              ALL: res.data.length,
              IN_PROGRESS: res.data.filter((p: any) => p.status === "IN_PROGRESS").length,
              IN_REVIEW: res.data.filter((p: any) => p.status === "IN_REVIEW").length,
              NEGOTIATION: res.data.filter((p: any) => p.status === "NEGOTIATION").length,
              FINDING_FREELANCERS: res.data.filter((p: any) => p.status === "FINDING_FREELANCERS").length,
              DRAFT: res.data.filter((p: any) => p.status === "DRAFT").length,
              COMPLETED: res.data.filter((p: any) => p.status === "COMPLETED").length,
              DISPUTED: res.data.filter((p: any) => p.status === "DISPUTED").length,
            },
          });
        }
      }
    } catch {
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleOpenProject = (id: string) => {
    if (onOpenProjectWorkspace) {
      onOpenProjectWorkspace(id);
    } else {
      router.push(`/client/projects/${id}`);
    }
  };

  const handlePostProject = () => {
    if (onCreateNewProject) {
      onCreateNewProject();
    } else {
      router.push("/client/post-project");
    }
  };

  const handleResumeDraft = (draftId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    router.push(`/client/post-project?draftId=${draftId}`);
  };

  const handleDeleteProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = projects.find((p) => p.id === projectId);
    const title = target?.name || "Project";

    // Optimistically remove from state
    const nextList = projects.filter((p) => p.id !== projectId);
    setProjects(nextList);

    // Recompute local counts
    const inProg = nextList.filter((p) => p.status === "IN_PROGRESS" || p.status === "IN_REVIEW").length;
    const needsAct = nextList.filter((p) => p.needsAction).length;
    setStats({
      totalCount: nextList.length,
      inProgressCount: inProg,
      needsActionCount: needsAct,
      countsByStatus: {
        ALL: nextList.length,
        IN_PROGRESS: nextList.filter((p) => p.status === "IN_PROGRESS").length,
        IN_REVIEW: nextList.filter((p) => p.status === "IN_REVIEW").length,
        NEGOTIATION: nextList.filter((p) => p.status === "NEGOTIATION").length,
        FINDING_FREELANCERS: nextList.filter((p) => p.status === "FINDING_FREELANCERS").length,
        DRAFT: nextList.filter((p) => p.status === "DRAFT").length,
        COMPLETED: nextList.filter((p) => p.status === "COMPLETED").length,
        DISPUTED: nextList.filter((p) => p.status === "DISPUTED").length,
      },
    });

    showToast(`"${title}" deleted successfully.`);

    try {
      await deleteProject(projectId);
    } catch {
      // Ignore background error
    }
  };

  // Filter & Search Logic
  const filteredProjects = useMemo(() => {
    return projects.filter((proj) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = proj.name.toLowerCase().includes(q);
        const matchesDesc = proj.description.toLowerCase().includes(q);
        const matchesFreelancer = proj.freelancer?.name.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesFreelancer) return false;
      }

      // 2. Lifecycle Status Filter
      if (activeFilter !== "ALL" && proj.status !== activeFilter) {
        return false;
      }

      // 3. Quick Filter: Needs Action
      if (onlyNeedsAction && !proj.needsAction) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "recently_updated") {
        return b.updatedTimestamp - a.updatedTimestamp;
      }
      if (sortBy === "recently_created") {
        return b.createdAtTimestamp - a.createdAtTimestamp;
      }
      if (sortBy === "next_due") {
        const dueA = a.nextMilestoneDueTimestamp ?? Infinity;
        const dueB = b.nextMilestoneDueTimestamp ?? Infinity;
        return dueA - dueB;
      }
      return 0;
    });
  }, [projects, searchQuery, activeFilter, onlyNeedsAction, sortBy]);

  const filterTabs: { id: ProjectLifecycleStatus; label: string; count?: number }[] = [
    { id: "ALL", label: "All Projects", count: stats.countsByStatus.ALL ?? stats.totalCount },
    { id: "IN_PROGRESS", label: "In Progress", count: stats.countsByStatus.IN_PROGRESS },
    { id: "IN_REVIEW", label: "In Review", count: stats.countsByStatus.IN_REVIEW },
    { id: "NEGOTIATION", label: "Negotiation", count: stats.countsByStatus.NEGOTIATION },
    { id: "FINDING_FREELANCERS", label: "Finding Freelancers", count: stats.countsByStatus.FINDING_FREELANCERS },
    { id: "DRAFT", label: "Drafts", count: stats.countsByStatus.DRAFT },
    { id: "COMPLETED", label: "Completed", count: stats.countsByStatus.COMPLETED },
    { id: "DISPUTED", label: "Disputed", count: stats.countsByStatus.DISPUTED },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700/80 flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==============================================================
          TOP STATS SUMMARY BAR (Exactly matching reference image)
         ============================================================== */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-8 sm:gap-14">
          {/* Stat 1: All Projects */}
          <button
            type="button"
            onClick={() => {
              setActiveFilter("ALL");
              setOnlyNeedsAction(false);
            }}
            className="text-left group cursor-pointer"
          >
            <div className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 transition-colors">
              All Projects
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading mt-0.5">
              {stats.totalCount}
            </div>
          </button>

          {/* Stat 2: In Progress */}
          <button
            type="button"
            onClick={() => {
              setActiveFilter("IN_PROGRESS");
              setOnlyNeedsAction(false);
            }}
            className="text-left group cursor-pointer"
          >
            <div className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 transition-colors">
              In Progress
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading mt-0.5">
              {stats.inProgressCount}
            </div>
          </button>

          {/* Stat 3: Needs Action (Highlighted red when pending) */}
          <button
            type="button"
            onClick={() => setOnlyNeedsAction((prev) => !prev)}
            className="text-left group cursor-pointer"
          >
            <div className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 transition-colors flex items-center gap-1.5">
              <span>Needs Action</span>
              {stats.needsActionCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
              )}
            </div>
            <div
              className={`text-2xl sm:text-3xl font-black tracking-tight font-heading mt-0.5 ${
                onlyNeedsAction ? "text-[#4f46e5]" : "text-slate-900"
              }`}
            >
              {stats.needsActionCount}
            </div>
          </button>
        </div>

        {/* Primary Action Button: Post a New Project */}
        <button
          type="button"
          onClick={handlePostProject}
          className="inline-flex items-center gap-2 py-2.5 px-4 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] active:scale-98 text-white font-bold text-xs sm:text-[13px] shadow-[0_4px_16px_rgba(79,70,229,0.22)] hover:shadow-[0_6px_20px_rgba(79,70,229,0.32)] transition-all cursor-pointer group"
        >
          <Plus className="w-4 h-4 stroke-[3] group-hover:rotate-90 transition-transform duration-200" />
          <span>Post a New Project</span>
        </button>
      </div>

      {/* ==============================================================
          HORIZONTAL LIFECYCLE FILTER BAR & SEARCH CONTROLS
         ============================================================== */}
      <div className="space-y-3">
        {/* Search & Sort Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by name, description, or contractor..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200/90 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/15 focus:border-[#4f46e5] transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Filter Pill: Needs Action & Sort Dropdown */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setOnlyNeedsAction(!onlyNeedsAction)}
              className={`h-10 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                onlyNeedsAction
                  ? "bg-rose-50 text-rose-700 border-rose-300 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${onlyNeedsAction ? "bg-rose-500" : "bg-slate-300"}`} />
              <span>Needs Attention ({stats.needsActionCount})</span>
            </button>

            {/* Sort Dropdown */}
            <div className="relative flex items-center">
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as "recently_updated" | "recently_created" | "next_due"
                  )
                }
                aria-label="Sort projects"
                className="h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f46e5] cursor-pointer shadow-2xs appearance-none"
              >
                <option value="recently_updated">Sort: Recently Updated</option>
                <option value="recently_created">Sort: Recently Created</option>
                <option value="next_due">Sort: Next Milestone Due</option>
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Scrollable Horizontal Lifecycle Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {filterTabs.map((tab) => {
            const isSelected = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? "bg-[#4f46e5] text-white border-[#4f46e5] shadow-xs"
                    : "bg-white text-slate-600 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==============================================================
          PROJECT CARDS LIST & RESILIENT EMPTY STATES
         ============================================================== */}
      {isLoading ? (
        <div className="space-y-3.5 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200/90 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-slate-200 rounded w-1/3" />
                  <div className="h-3.5 bg-slate-100 rounded w-2/3" />
                </div>
                <div className="h-5 bg-slate-200 rounded w-20" />
              </div>
              <div className="h-10 bg-slate-50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        /* Contextual Truthful Empty State */
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 sm:p-12 text-center space-y-6">
          {/* CASE A: 0 total projects in entire workspace */}
          {stats.totalCount === 0 ? (
            <div className="max-w-xl mx-auto space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-linear-to-tr from-[#4f46e5]/10 via-[#6366f1]/15 to-indigo-100 text-[#4f46e5] flex items-center justify-center mx-auto shadow-inner border border-indigo-200/50">
                <FolderKanban className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  No projects in your workspace yet
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Launch your first milestone-governed project with Dual SHA-256 state consensus and automated PayPal escrow protection.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handlePostProject}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] shadow-md hover:shadow-indigo-500/25 transition cursor-pointer active:scale-98"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Post a New Project</span>
                </button>
              </div>

              {/* Starter Templates */}
              <div className="pt-6 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Or kickstart with an instant template
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  <div
                    onClick={() => router.push("/client/post-project?template=web")}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-[#4f46e5]/40 hover:bg-slate-50/80 transition cursor-pointer space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-[#4f46e5]">Full-Stack Web App</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#4f46e5] transition" />
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      Next.js, Node.js & PostgreSQL architecture with verified milestone gates.
                    </p>
                  </div>

                  <div
                    onClick={() => router.push("/client/post-project?template=ai")}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-[#4f46e5]/40 hover:bg-slate-50/80 transition cursor-pointer space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-[#4f46e5]">AI Provider Gateway</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#4f46e5] transition" />
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      Multi-LLM streaming circuit breakers with pgvector semantic caching.
                    </p>
                  </div>

                  <div
                    onClick={() => router.push("/client/post-project?template=design")}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-[#4f46e5]/40 hover:bg-slate-50/80 transition cursor-pointer space-y-1 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-[#4f46e5]">Design System</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 group-hover:text-[#4f46e5] transition" />
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      Figma token synchronization with accessible Radix UI component library.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : searchQuery.trim() ? (
            /* CASE B: Search query has 0 matches */
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto font-bold">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  No projects match &ldquo;{searchQuery}&rdquo;
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  We couldn&apos;t find any project specifications, descriptions, or assigned contractors matching your search.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#4f46e5] bg-[#eef2ff] hover:bg-[#e0e7ff] transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear Search Query</span>
                </button>
              </div>
            </div>
          ) : onlyNeedsAction ? (
            /* CASE C: Needs action filter is on and zero items need attention */
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  All caught up! Zero actions required
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  None of your active projects currently have pending milestone approvals, scope deltas, or blockers awaiting your sign-off.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => setOnlyNeedsAction(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                >
                  <span>Show All Projects</span>
                </button>
              </div>
            </div>
          ) : (
            /* CASE D: Specific tab has 0 projects */
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#4f46e5] flex items-center justify-center mx-auto font-bold">
                {activeFilter === "DRAFT" ? (
                  <FileText className="w-6 h-6" />
                ) : activeFilter === "IN_REVIEW" ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : activeFilter === "DISPUTED" ? (
                  <ShieldCheck className="w-6 h-6" />
                ) : activeFilter === "COMPLETED" ? (
                  <Layers className="w-6 h-6" />
                ) : activeFilter === "NEGOTIATION" ? (
                  <MessageSquare className="w-6 h-6" />
                ) : activeFilter === "FINDING_FREELANCERS" ? (
                  <User className="w-6 h-6" />
                ) : (
                  <FolderKanban className="w-6 h-6" />
                )}
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  {activeFilter === "DRAFT" && "No draft projects found"}
                  {activeFilter === "IN_REVIEW" && "No deliverables awaiting review"}
                  {activeFilter === "DISPUTED" && "Zero disputes on record"}
                  {activeFilter === "COMPLETED" && "No completed projects yet"}
                  {activeFilter === "NEGOTIATION" && "No active contract negotiations"}
                  {activeFilter === "FINDING_FREELANCERS" && "No open listings seeking talent"}
                  {activeFilter === "IN_PROGRESS" && "No active projects in engineering"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  {activeFilter === "DRAFT" &&
                    "All your project specifications are active or published. You can save any project draft during intake to resume it anytime."}
                  {activeFilter === "IN_REVIEW" &&
                    "You're all caught up! When contractors submit deliverable packages for verification, they'll appear here for your sign-off."}
                  {activeFilter === "DISPUTED" &&
                    "Clean consensus record — all projects are operating cleanly within Dual SHA-256 consensus tolerances."}
                  {activeFilter === "COMPLETED" &&
                    "Projects with all milestones delivered, verified, and released via PayPal Orders v2 will be archived here."}
                  {activeFilter === "NEGOTIATION" &&
                    "Counter-offers and contract adjustments currently under bilateral negotiation will be listed here."}
                  {activeFilter === "FINDING_FREELANCERS" &&
                    "Publish a project or brief to start receiving candidate proposals from verified specialists."}
                  {activeFilter === "IN_PROGRESS" &&
                    "Projects with active engineering milestones underway will be tracked here with live telemetry."}
                </p>
              </div>

              <div className="pt-1 flex items-center justify-center gap-2">
                {activeFilter === "DRAFT" ? (
                  <button
                    type="button"
                    onClick={handlePostProject}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] transition cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Start a New Draft</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveFilter("ALL")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#4f46e5] bg-[#eef2ff] hover:bg-[#e0e7ff] transition cursor-pointer"
                  >
                    <span>View All Projects</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              onClick={() => {
                if (project.status === "DRAFT") {
                  handleResumeDraft(project.id);
                } else {
                  handleOpenProject(project.id);
                }
              }}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-[#4f46e5]/40 hover:shadow-xs transition-all duration-200 cursor-pointer space-y-4 group"
            >
              {/* Row 1: Title, Status Badge, Budget & Last Activity */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight group-hover:text-[#4f46e5] transition-colors truncate">
                      {project.name}
                    </h3>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${project.statusColor}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>{project.statusLabel}</span>
                    </span>

                    {/* Scope Delta Warning */}
                    {project.hasDeltaChange && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>Scope Delta Pending</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
                    {project.description}
                  </p>
                </div>

                {/* Right Metadata: Budget & Timestamp */}
                <div className="text-left sm:text-right shrink-0">
                  {project.totalBudget ? (
                    <div className="font-mono text-sm sm:text-base font-black text-slate-900">
                      {project.totalBudget} <span className="text-[10px] text-slate-400 font-sans font-medium">USD</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Budget Pending</span>
                  )}
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center sm:justify-end gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Updated {project.lastUpdated}</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Where it stands (Summary) & Assigned Contractor */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-3 border-t border-slate-100 text-xs">
                {/* Stage Summary */}
                <div className="md:col-span-7 flex items-center gap-2 text-slate-600">
                  <span className="font-semibold text-slate-800 shrink-0">Stage:</span>
                  <span className="truncate">{project.stageSummary}</span>
                </div>

                {/* Assigned Freelancer */}
                <div className="md:col-span-5 flex items-center sm:justify-end gap-2 text-slate-600">
                  {project.freelancer ? (
                    <>
                      <span className="text-slate-400 text-[11px]">Contractor:</span>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Image
                          src={project.freelancer.avatar}
                          alt={project.freelancer.name}
                          width={20}
                          height={20}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span>{project.freelancer.name}</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-slate-400 text-[11px] italic">
                      {project.status === "DRAFT" ? "Draft spec (no contractor)" : "No contractor assigned yet"}
                    </span>
                  )}
                </div>
              </div>

              {/* Row 3: What Needs To Happen Next (Action Callout & CTA Buttons) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      project.nextAction.urgent
                        ? "bg-rose-100 text-rose-700"
                        : project.status === "DRAFT"
                        ? "bg-slate-200 text-slate-700"
                        : "bg-indigo-100 text-[#4f46e5]"
                    }`}
                  >
                    {project.status === "DRAFT" ? (
                      <FileText className="w-3.5 h-3.5" />
                    ) : project.nextAction.urgent ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 leading-snug">
                      Next Step: {project.nextAction.label}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5 truncate">
                      {project.nextAction.description}
                    </p>
                  </div>
                </div>

                {/* Action CTA Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {project.status === "DRAFT" ? (
                    <>
                      {/* Delete Draft Button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        title="Delete this draft"
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 text-slate-500 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Resume Draft Button */}
                      <button
                        type="button"
                        onClick={(e) => handleResumeDraft(project.id, e)}
                        className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-98"
                      >
                        <span>Resume Draft</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenProject(project.id);
                      }}
                      className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer ${
                        project.nextAction.urgent
                          ? "bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-xs"
                          : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200"
                      }`}
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


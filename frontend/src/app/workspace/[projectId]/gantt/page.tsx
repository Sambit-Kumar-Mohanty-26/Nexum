"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  ArrowLeft,
  RefreshCw,
  Zap,
  ShieldCheck,
  Layers,
  ListFilter,
  CalendarDays,
  Check,
  Info,
  AlertTriangle,
  X,
  ChevronRight,
  ExternalLink,
  DollarSign,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import { useAuth } from "@/context/AuthContext";
import {
  fetchWorkspaceMilestones,
  postponeWorkspaceMilestone,
} from "@/lib/api-client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GanttMilestone {
  id: string;
  number: number;
  title: string;
  amountCents: number;
  amount: string;
  currency: string;
  dueDate: string | null;
  startDate: string | null;
  status: string;
  rawStatus: string;
  workStatus: string | null;
  orderIndex: number;
  percentDone: number;
  pendingPostponement: {
    id: string;
    proposedDueDate: string | null;
    reasonCategory: string;
    reasonDetails: string;
    requestedByRole: string;
    createdAt: string;
  } | null;
  lastPostponement: {
    id: string;
    proposedDueDate: string | null;
    status: string;
  } | null;
}

interface ProjectGanttData {
  projectId: string;
  projectName: string;
  startDate: string | null;
  deadline: string | null;
  budgetCents: number;
  agreementVersion: string;
  clientName: string;
  freelancerName: string;
  milestones: GanttMilestone[];
}

interface ComputedTask extends GanttMilestone {
  computedStart: Date;
  computedEnd: Date;
  durationDays: number;
  isCritical: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeTasks(data: ProjectGanttData): ComputedTask[] {
  const baseStart = data.startDate ? new Date(data.startDate) : new Date(Date.now() - 7 * 86400000);
  let rolling = new Date(baseStart);
  let firstIncompleteFound = false;

  return data.milestones.map((m, idx) => {
    const start = new Date(rolling);
    let end: Date;

    if (m.dueDate && !isNaN(Date.parse(m.dueDate))) {
      end = new Date(m.dueDate);
      if (end <= start) end = new Date(start.getTime() + 14 * 86400000);
    } else {
      end = new Date(start.getTime() + 14 * 86400000);
    }

    rolling = new Date(end);

    const durationMs = end.getTime() - start.getTime();
    const durationDays = Math.max(1, Math.round(durationMs / 86400000));

    let isCritical = false;
    if (!firstIncompleteFound && m.percentDone < 100) {
      isCritical = true;
      firstIncompleteFound = true;
    }

    return { ...m, computedStart: start, computedEnd: end, durationDays, isCritical };
  });
}

function statusBadge(status: string, percent: number) {
  const s = status.toUpperCase();
  if (percent === 100 || s.includes("ACCEPT") || s.includes("RELEASED")) {
    return { label: "Accepted", classes: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <Check className="w-3 h-3 stroke-[2.5]" /> };
  }
  if (s.includes("REVIEW") || s.includes("INSPECTION")) {
    return { label: "Under Review", classes: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock className="w-3 h-3" /> };
  }
  if (s.includes("PROGRESS") || s.includes("READY")) {
    return { label: "In Progress", classes: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" /> };
  }
  if (s.includes("FUNDED") || s.includes("CAPTURED") || s.includes("ESCROW")) {
    return { label: "Escrow Funded", classes: "bg-blue-50 text-blue-700 border-blue-200", icon: <Lock className="w-3 h-3" /> };
  }
  if (s.includes("PENDING")) {
    return { label: "Pending Funding", classes: "bg-orange-50 text-orange-700 border-orange-200", icon: <AlertTriangle className="w-3 h-3" /> };
  }
  return { label: "Scheduled", classes: "bg-slate-100 text-slate-600 border-slate-200", icon: null };
}

// ─── Postpone Modal ───────────────────────────────────────────────────────────

interface PostponeModalProps {
  milestone: ComputedTask;
  projectId: string;
  userRole: "CLIENT" | "FREELANCER";
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function PostponeModal({ milestone, projectId, userRole, userId, onClose, onSuccess }: PostponeModalProps) {
  const [proposedDate, setProposedDate] = useState(
    milestone.computedEnd.toISOString().slice(0, 10)
  );
  const [reasonCategory, setReasonCategory] = useState("SCOPE_CHANGE");
  const [reasonDetails, setReasonDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonDetails.trim()) { setError("Please provide reason details."); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await postponeWorkspaceMilestone(projectId, milestone.id, {
        requestedById: userId,
        requestedByRole: userRole,
        proposedDueDate: proposedDate,
        reasonCategory,
        reasonDetails: reasonDetails.trim(),
      });
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to submit postponement request.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Request Postponement</h2>
            <p className="text-xs text-slate-500 mt-0.5">M{milestone.number}: {milestone.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Proposed New Due Date</label>
            <input
              type="date"
              value={proposedDate}
              onChange={(e) => setProposedDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              required
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reason Category</label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="SCOPE_CHANGE">Scope Change</option>
              <option value="TECHNICAL_BLOCKER">Technical Blocker</option>
              <option value="RESOURCE_CONSTRAINT">Resource Constraint</option>
              <option value="CLIENT_FEEDBACK_DELAY">Client Feedback Delay</option>
              <option value="FORCE_MAJEURE">Force Majeure</option>
              <option value="MUTUAL_AGREEMENT">Mutual Agreement</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Details <span className="text-red-500">*</span></label>
            <textarea
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              rows={3}
              placeholder="Explain the reason for requesting this postponement..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting…" : "Submit Request"}
            </button>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            The other party will receive a bilateral consensus request and must approve for the date to change.
          </p>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

function GanttPageContent() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const projectId = params.projectId;
  const returnTab = searchParams.get("from") || "milestones";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProjectGanttData | null>(null);
  // Default to day-wise view as requested
  const [zoomLevel, setZoomLevel] = useState<"days" | "weeks" | "months">("days");
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [activeViewMode, setActiveViewMode] = useState<"gantt" | "table">("gantt");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [postponeTarget, setPostponeTarget] = useState<ComputedTask | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const userRole: "CLIENT" | "FREELANCER" = (user?.role === "FREELANCER" ? "FREELANCER" : "CLIENT");
  const userId = user?.id || "";

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch milestones
  const loadMilestones = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWorkspaceMilestones(projectId);
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "Could not load project milestones.");
      }
    } catch {
      setError("Network error loading milestones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) loadMilestones();
  }, [projectId, authLoading, user]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Compute enriched tasks
  const tasks = useMemo<ComputedTask[]>(() => {
    if (!data) return [];
    return computeTasks(data);
  }, [data]);

  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedId) ?? null, [tasks, selectedId]);

  // Timeline boundaries aligned cleanly
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      return { minDate: now, maxDate: new Date(now.getTime() + 30 * 86400000), totalDays: 30 };
    }
    const starts = tasks.map((t) => t.computedStart.getTime());
    const ends = tasks.map((t) => t.computedEnd.getTime());
    
    // Anchor 3 days before earliest start, align to midnight
    const min = new Date(Math.min(...starts) - 3 * 86400000);
    min.setHours(0, 0, 0, 0);
    
    // Anchor 10 days after latest end
    const max = new Date(Math.max(...ends) + 10 * 86400000);
    max.setHours(23, 59, 59, 999);

    const days = Math.max(14, Math.ceil((max.getTime() - min.getTime()) / 86400000));
    return { minDate: min, maxDate: max, totalDays: days };
  }, [tasks]);

  // Geometry configuration based on zoom level:
  // Days: 54px per day (exact day-by-day columns with blue weekend highlights)
  // Weeks: 140px per 7-day interval
  // Months: 200px per 14-day interval
  const colWidth = zoomLevel === "days" ? 54 : zoomLevel === "weeks" ? 140 : 200;
  const stepDays = zoomLevel === "days" ? 1 : zoomLevel === "weeks" ? 7 : 14;

  const timelineTicks = useMemo(() => {
    const ticks: {
      index: number;
      label: string;
      subLabel: string;
      date: Date;
      isWeekend: boolean;
      leftPx: number;
    }[] = [];

    const totalSteps = Math.ceil(totalDays / stepDays);
    for (let i = 0; i <= totalSteps; i++) {
      const cur = new Date(minDate.getTime() + i * stepDays * 86400000);
      const dayOfWeek = cur.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
      ticks.push({
        index: i,
        label: cur.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        subLabel: cur.toLocaleDateString("en-US", { weekday: "short" }),
        date: cur,
        isWeekend,
        leftPx: i * colWidth,
      });
    }
    return ticks;
  }, [minDate, totalDays, stepDays, colWidth]);

  const totalChartWidth = useMemo(() => {
    return Math.max(900, timelineTicks.length * colWidth);
  }, [timelineTicks, colWidth]);

  // Today marker exact pixel position
  const todayPx = useMemo(() => {
    const now = Date.now();
    const min = minDate.getTime();
    const max = maxDate.getTime();
    if (now < min || now > max) return null;
    const diffDays = (now - min) / 86400000;
    return (diffDays / stepDays) * colWidth;
  }, [minDate, maxDate, stepDays, colWidth]);

  // Task card pixel position and proportional width
  const getTaskPixelCoords = (task: ComputedTask) => {
    const startDays = Math.max(0, (task.computedStart.getTime() - minDate.getTime()) / 86400000);
    const durationDays = Math.max(1, (task.computedEnd.getTime() - task.computedStart.getTime()) / 86400000);

    const left = (startDays / stepDays) * colWidth;
    const naturalWidth = (durationDays / stepDays) * colWidth;
    // Set a comfortable minimum width so title and progress bar always look great
    const width = Math.max(280, naturalWidth);

    return { left, width };
  };

  const completedCount = tasks.filter((t) => t.percentDone === 100).length;
  const overallProgress = tasks.length > 0
    ? Math.round(tasks.reduce((acc, t) => acc + t.percentDone, 0) / tasks.length)
    : 0;

  const totalAmount = useMemo(() => {
    if (!data) return "$0";
    const sum = data.milestones.reduce((acc, m) => acc + (m.amountCents || 0), 0);
    return "$" + (sum / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });
  }, [data]);

  const handleBack = () => {
    if (userRole === "CLIENT") {
      router.push(`/client/workspace?tab=${returnTab}&projectId=${projectId}`);
    } else {
      router.push(`/freelancer/workspace?tab=${returnTab}&projectId=${projectId}`);
    }
  };

  if (authLoading || (!data && loading)) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto">
            <CalendarDays className="w-5 h-5 text-indigo-600 animate-pulse" />
          </div>
          <p className="text-sm text-slate-500">Loading milestone schedule…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 max-w-md w-full text-center space-y-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Could not load milestones</h2>
          <p className="text-xs text-slate-500">{error}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={handleBack} className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer">
              Go back
            </button>
            <button onClick={loadMilestones} className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans selection:bg-indigo-500 selection:text-white">
      {/* Sidebar */}
      <DashboardSidebar
        currentRole={userRole}
        activeTab="workspace"
        onTabChange={(tab) => {
          router.push(`/${userRole.toLowerCase()}/dashboard?tab=${tab}`);
        }}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardTopHeader />

        <main className="flex-1 flex flex-col p-4 sm:p-6 gap-4 overflow-y-auto">
          {/* Top Control Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Workspace
              </button>
              <div className="h-5 w-px bg-slate-200" />
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-indigo-600" />
                  Milestone Schedule & Roadmap
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {data?.projectName} · {data?.agreementVersion} · {data?.clientName} &amp; {data?.freelancerName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* View Toggle */}
              <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveViewMode("gantt")}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${activeViewMode === "gantt" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <Layers className="w-3.5 h-3.5" /> Gantt
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewMode("table")}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${activeViewMode === "table" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
                >
                  <ListFilter className="w-3.5 h-3.5" /> Table
                </button>
              </div>

              {/* Granularity Switcher (Days | Weeks | Months) */}
              {activeViewMode === "gantt" && (
                <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60 text-xs font-semibold">
                  {(["days", "weeks", "months"] as const).map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setZoomLevel(z)}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer capitalize ${zoomLevel === z ? "bg-white text-indigo-700 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
                    >
                      {z === "days" ? "Day-wise" : z === "weeks" ? "Week-wise" : "Month-wise"}
                    </button>
                  ))}
                </div>
              )}

              {/* Refresh */}
              <button
                type="button"
                onClick={loadMilestones}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Overall Progress</span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-black text-slate-900 font-mono">{overallProgress}%</span>
                <span className="text-xs text-slate-500">({completedCount}/{tasks.length})</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Escrow Allocation</span>
              <span className="text-2xl font-black text-slate-900 font-mono mt-1.5 block">{totalAmount}</span>
              <span className="text-[11px] text-emerald-600 flex items-center gap-1 mt-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Bilateral Smart Escrow
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Scope Window</span>
              <span className="text-2xl font-bold text-slate-900 mt-1.5 block">{totalDays} Days</span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Due {maxDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Inspection Buffer</span>
              <span className="text-2xl font-black text-indigo-700 font-mono mt-1.5 block">72 Hours SLA</span>
              <span className="text-[11px] text-slate-500 mt-1 block">Post-delivery auto-protection</span>
            </div>
          </div>

          {/* Main Visual Schedule (Day-wise / Week-wise) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex-1">
            {tasks.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-sm">
                No milestones found for this project. They appear once an agreement is ratified.
              </div>
            ) : activeViewMode === "gantt" ? (
              /* GANTT VIEW: Matches Reference UI Pixel-by-Pixel */
              <div className="overflow-x-auto relative pt-4">
                <div style={{ width: `${totalChartWidth}px`, minWidth: "100%" }} className="relative bg-white select-none">
                  
                  {/* Timeline Header Row (Dates + Weekdays + Floating Today Pin) */}
                  <div className="h-16 border-b border-slate-200 relative bg-white sticky top-0 z-20 flex">
                    {timelineTicks.map((tick) => (
                      <div
                        key={tick.index}
                        style={{ width: `${colWidth}px` }}
                        className={`shrink-0 border-r border-slate-100 flex flex-col justify-center items-center py-2 text-center ${
                          tick.isWeekend && zoomLevel === "days" ? "bg-blue-50/40" : "bg-white"
                        }`}
                      >
                        <span className="font-bold text-slate-900 text-[11px] leading-tight">
                          {tick.label}
                        </span>
                        <span className={`text-[10px] mt-0.5 ${
                          tick.isWeekend && zoomLevel === "days"
                            ? "text-[#2563eb] font-semibold"
                            : "text-slate-500 font-medium"
                        }`}>
                          {tick.subLabel}
                        </span>
                      </div>
                    ))}

                    {/* Floating Today Pin Marker */}
                    {todayPx !== null && (
                      <div
                        style={{ left: `${todayPx}px` }}
                        className="absolute -top-3 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none"
                      >
                        <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#dbeafe] text-[#2563eb] shadow-xs">
                          Today
                        </span>
                        <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#2563eb]" />
                        <div className="w-2.5 h-2.5 rounded-full border-2 border-[#2563eb] bg-white mt-0.5" />
                      </div>
                    )}
                  </div>

                  {/* Chart Grid & Waterfall Task Rows */}
                  <div className="relative">
                    {/* Background Vertical Grid Columns (Weekend Tint + Today Line) */}
                    <div className="absolute inset-0 flex pointer-events-none z-0">
                      {timelineTicks.map((tick) => (
                        <div
                          key={tick.index}
                          style={{ width: `${colWidth}px` }}
                          className={`shrink-0 border-r border-slate-100/90 h-full ${
                            tick.isWeekend && zoomLevel === "days" ? "bg-blue-50/30" : "bg-white"
                          }`}
                        />
                      ))}

                      {/* Vertical Blue Dashed Today Line extending straight down */}
                      {todayPx !== null && (
                        <div
                          style={{ left: `${todayPx}px` }}
                          className="absolute top-0 bottom-0 border-l-2 border-dashed border-blue-400 z-10"
                        />
                      )}
                    </div>

                    {/* Waterfall Milestone Task Rows */}
                    {tasks.map((task) => {
                      const { left, width } = getTaskPixelCoords(task);
                      const isSelected = selectedId === task.id;

                      return (
                        <div
                          key={task.id}
                          className="h-20 relative flex items-center px-4 border-b border-slate-100 z-10"
                        >
                          {task.percentDone === 100 ? (
                            /* Completed Task Card (#1): Light mint green with check circle and 100% badge */
                            <div
                              style={{ left: `${left}px`, width: `${width}px` }}
                              onClick={() => setSelectedId(isSelected ? null : task.id)}
                              className={`absolute h-12 bg-[#e8f8ed] border border-[#b8ecc6] rounded-2xl px-4 py-2 flex items-center justify-between shadow-2xs z-20 transition-all hover:shadow-md cursor-pointer ${
                                isSelected ? "ring-2 ring-emerald-500 ring-offset-2" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                                <div className="w-5 h-5 rounded-full bg-[#16a34a] flex items-center justify-center shrink-0 text-white shadow-2xs">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                                <span className="font-bold text-slate-900 text-[12.5px] truncate">
                                  #{task.number} {task.title}
                                </span>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#c6eed2] text-[#15803d] shrink-0">
                                100%
                              </span>
                            </div>
                          ) : (
                            /* In-Progress or Unstarted Task Card (#2, #3, #4): White card with title + blue progress bar */
                            <div
                              style={{ left: `${left}px`, width: `${width}px` }}
                              onClick={() => setSelectedId(isSelected ? null : task.id)}
                              className={`absolute min-h-[56px] bg-white border border-slate-200/90 rounded-2xl shadow-sm px-4 py-2.5 flex flex-col justify-center gap-1.5 z-20 transition-all hover:shadow-md cursor-pointer ${
                                isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""
                              }`}
                            >
                              <div className="font-bold text-slate-900 text-[12.5px] truncate">
                                #{task.number} {task.title}
                              </div>
                              <div className="flex items-center gap-2.5 w-full">
                                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                  {task.percentDone > 0 ? (
                                    <div
                                      className="bg-[#2563eb] h-2 rounded-full transition-all"
                                      style={{ width: `${task.percentDone}%` }}
                                    />
                                  ) : null}
                                </div>
                                <span className="text-[11px] font-mono font-bold text-slate-600 shrink-0">
                                  {task.percentDone}%
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Postpone Button (Rendered directly next to card) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPostponeTarget(task);
                            }}
                            style={{ left: `${left + width + 14}px` }}
                            className="absolute flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer z-20 hover:border-slate-300"
                            title="Request Postponement"
                          >
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>Postpone</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* ALTERNATE TABLE VIEW: Structured Breakdown */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="h-12 bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-3 w-14 text-center">#</th>
                      <th className="px-6 py-3">Milestone Tranche & Scope</th>
                      <th className="px-6 py-3">Start Date</th>
                      <th className="px-6 py-3">Due Date</th>
                      <th className="px-6 py-3">Duration</th>
                      <th className="px-6 py-3 text-right">Amount</th>
                      <th className="px-6 py-3 text-center">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tasks.map((task) => {
                      const badge = statusBadge(task.status, task.percentDone);
                      return (
                        <tr
                          key={task.id}
                          onClick={() => setSelectedId(selectedId === task.id ? null : task.id)}
                          className="hover:bg-slate-50 transition cursor-pointer"
                        >
                          <td className="px-6 py-4 text-center font-mono font-bold text-slate-400">
                            M{task.number}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-900">{task.title}</div>
                            {task.pendingPostponement && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                Postponement Pending
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-mono">
                            {task.computedStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-mono">
                            {task.computedEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                          <td className="px-6 py-4 text-slate-600 font-mono">
                            {task.durationDays} days
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                            {task.amount}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.classes}`}>
                              {badge.icon}
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPostponeTarget(task);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer"
                            >
                              Postpone
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Selected Task Inspector Drawer */}
            {selectedTask && (
              <div className="p-4 bg-indigo-50/40 border-t border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                    M{selectedTask.number}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                      <span>{selectedTask.title}</span>
                      <span className="font-mono text-indigo-700 font-bold">{selectedTask.amount}</span>
                      {selectedTask.isCritical && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Critical Bottleneck</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {selectedTask.computedStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} —{" "}
                      {selectedTask.computedEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ({selectedTask.durationDays} days)
                      {selectedTask.pendingPostponement && (
                        <span className="ml-2 text-orange-600 font-semibold">· Postponement awaiting consensus</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPostponeTarget(selectedTask)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition cursor-pointer shadow-2xs"
                  >
                    Request Postponement
                  </button>
                </div>
              </div>
            )}

            {/* Footer Legend */}
            <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#16a34a] text-white flex items-center justify-center text-[9px]">✓</span>
                  <span>Accepted (100%)</span>
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb] inline-block shadow-2xs" />
                  <span>In Progress</span>
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block border border-slate-400" />
                  <span>Scheduled (0%)</span>
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
                  <span className="w-3 h-3 rounded bg-blue-50 border border-blue-200 inline-block" />
                  <span>Weekend (Sat / Sun)</span>
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Nexum Bilateral Protocol · Cryptographically Verified Timeline
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Postpone Modal */}
      {postponeTarget && (
        <PostponeModal
          milestone={postponeTarget}
          projectId={projectId}
          userRole={userRole}
          userId={userId}
          onClose={() => setPostponeTarget(null)}
          onSuccess={() => {
            setPostponeTarget(null);
            showToast("Postponement request submitted. Awaiting bilateral consensus.");
            loadMilestones();
          }}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 max-w-sm">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          {toastMsg}
        </div>
      )}
    </div>
  );
}

export default function GanttPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto">
              <CalendarDays className="w-5 h-5 text-indigo-600 animate-pulse" />
            </div>
            <p className="text-sm text-slate-500">Loading milestone schedule…</p>
          </div>
        </div>
      }
    >
      <GanttPageContent />
    </Suspense>
  );
}

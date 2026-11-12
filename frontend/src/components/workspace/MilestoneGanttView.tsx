"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Layers,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  Zap,
  Info,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  DollarSign,
  Lock,
  Sparkles,
  CalendarDays,
  ListFilter,
  Check,
  Eye,
} from "lucide-react";
import { WorkspaceProject, ProjectMilestone } from "@/lib/workspace-types";

interface MilestoneGanttViewProps {
  project: WorkspaceProject;
  onPostponeMilestone?: (milestoneId: string, currentDueDate: string) => void;
  onSelectMilestone?: (milestone: ProjectMilestone) => void;
  userRole?: "CLIENT" | "FREELANCER";
}

interface GanttTaskItem {
  id: string;
  number: number;
  name: string;
  amount: string;
  startDate: Date;
  endDate: Date;
  percentDone: number;
  status: string;
  statusColor?: string;
  isAddon: boolean;
  isCritical: boolean;
  durationDays: number;
}

export default function MilestoneGanttView({
  project,
  onPostponeMilestone,
  onSelectMilestone,
  userRole = "CLIENT",
}: MilestoneGanttViewProps) {
  const [zoomLevel, setZoomLevel] = useState<"days" | "weeks" | "months">("weeks");
  const [showCriticalPath, setShowCriticalPath] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<"gantt" | "list">("gantt");

  // Parse milestones into rich Gantt task objects with sequential, logical date ranges
  const tasks = useMemo<GanttTaskItem[]>(() => {
    if (!project?.milestones || project.milestones.length === 0) return [];

    const baseStart = project.startDate && !isNaN(Date.parse(project.startDate))
      ? new Date(project.startDate)
      : new Date(Date.now() - 7 * 86400000);

    let rollingDate = new Date(baseStart);

    return project.milestones.map((m, idx) => {
      let start = new Date(rollingDate);
      let end: Date;

      if (m.dueDate && !isNaN(Date.parse(m.dueDate))) {
        end = new Date(m.dueDate);
        if (end <= start) {
          end = new Date(start.getTime() + 14 * 86400000);
        }
      } else {
        end = new Date(start.getTime() + 14 * 86400000);
      }

      // Next milestone will start when this one completes
      rollingDate = new Date(end);

      const rawStatus = (m.status || "").trim();
      const st = rawStatus.toUpperCase();
      let percent = 0;
      if (
        st.includes("ACCEPTED") ||
        st.includes("COMPLETED") ||
        st.includes("PAID") ||
        st.includes("RELEASED") ||
        st === "CAPTURED"
      ) {
        percent = 100;
      } else if (st.includes("PROGRESS") || st.includes("READY")) {
        percent = 50;
      } else if (st.includes("REVIEW") || st.includes("INSPECTION")) {
        percent = 85;
      } else {
        percent = 0;
      }

      const isAddon =
        idx >= 3 ||
        Boolean(m.title?.toLowerCase().includes("add-on")) ||
        Boolean(m.title?.toLowerCase().includes("v1.1"));

      const durationMs = end.getTime() - start.getTime();
      const durationDays = Math.max(1, Math.round(durationMs / 86400000));

      return {
        id: m.id || `ms-${idx + 1}`,
        number: m.number || idx + 1,
        name: m.title || `Milestone ${idx + 1}`,
        amount: m.amount || "$0.00",
        startDate: start,
        endDate: end,
        percentDone: percent,
        status: rawStatus || (percent === 100 ? "Accepted" : "Scheduled"),
        statusColor: m.statusColor,
        isAddon,
        isCritical: false, // will calculate bottleneck below
        durationDays,
      };
    });
  }, [project]);

  // Identify true critical path (the first incomplete tranche driving delivery date)
  const tasksWithCritical = useMemo(() => {
    let firstIncompleteFound = false;
    return tasks.map((t) => {
      let isCritical = false;
      if (!firstIncompleteFound && t.percentDone < 100) {
        isCritical = true;
        firstIncompleteFound = true;
      }
      return { ...t, isCritical };
    });
  }, [tasks]);

  // Overall timeline boundary calculations with graceful padding
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (tasksWithCritical.length === 0) {
      const now = new Date();
      return { minDate: now, maxDate: new Date(now.getTime() + 30 * 86400000), totalDays: 30 };
    }
    const starts = tasksWithCritical.map((t) => t.startDate.getTime());
    const ends = tasksWithCritical.map((t) => t.endDate.getTime());
    
    // Buffer: 3 days before start, 7 days after end
    const min = new Date(Math.min(...starts) - 3 * 86400000);
    const max = new Date(Math.max(...ends) + 7 * 86400000);
    const diffDays = Math.max(14, Math.ceil((max.getTime() - min.getTime()) / (1000 * 60 * 60 * 24)));
    return { minDate: min, maxDate: max, totalDays: diffDays };
  }, [tasksWithCritical]);

  // Generate timeline tick columns
  const timelineTicks = useMemo(() => {
    const ticks: { label: string; subLabel: string; date: Date; leftPercent: number }[] = [];
    const step = zoomLevel === "days" ? 3 : zoomLevel === "weeks" ? 7 : 14;
    for (let d = 0; d <= totalDays; d += step) {
      const cur = new Date(minDate.getTime() + d * 86400000);
      const leftPercent = (d / totalDays) * 100;
      ticks.push({
        label: cur.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        subLabel: cur.toLocaleDateString("en-US", { weekday: "short" }),
        date: cur,
        leftPercent,
      });
    }
    return ticks;
  }, [minDate, totalDays, zoomLevel]);

  // Today marker indicator percentage
  const todayPercent = useMemo(() => {
    const now = Date.now();
    const min = minDate.getTime();
    const max = maxDate.getTime();
    if (now < min || now > max) return null;
    return ((now - min) / (max - min)) * 100;
  }, [minDate, maxDate]);

  // Calculate task bar positioning percentage
  const getTaskCoords = (task: GanttTaskItem) => {
    const startOffset = Math.max(0, task.startDate.getTime() - minDate.getTime());
    const duration = Math.max(86400000, task.endDate.getTime() - task.startDate.getTime());
    const totalMs = totalDays * 86400000;
    const left = (startOffset / totalMs) * 100;
    const width = Math.max(5, (duration / totalMs) * 100);
    return { left, width };
  };

  const completedCount = tasksWithCritical.filter((t) => t.percentDone === 100).length;
  const overallProgress =
    tasksWithCritical.length > 0
      ? Math.round(tasksWithCritical.reduce((acc, t) => acc + t.percentDone, 0) / tasksWithCritical.length)
      : 0;

  const totalAmountStr = useMemo(() => {
    let sum = 0;
    tasksWithCritical.forEach((t) => {
      const clean = t.amount.replace(/[^0-9.]/g, "");
      const val = parseFloat(clean);
      if (!isNaN(val)) sum += val;
    });
    return sum > 0 ? `$${sum.toLocaleString("en-US")}` : project.budget || "$0";
  }, [tasksWithCritical, project.budget]);

  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null;
    return tasksWithCritical.find((t) => t.id === selectedTaskId) || null;
  }, [selectedTaskId, tasksWithCritical]);

  const handleRowClick = (task: GanttTaskItem) => {
    setSelectedTaskId(task.id === selectedTaskId ? null : task.id);
    if (onSelectMilestone) {
      const raw = project.milestones.find((m) => m.id === task.id);
      if (raw) onSelectMilestone(raw);
    }
  };

  // Helper for status badge styling
  const renderStatusBadge = (status: string, percent: number) => {
    const s = status.toUpperCase();
    if (percent === 100 || s.includes("ACCEPTED") || s.includes("RELEASED") || s === "CAPTURED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap">
          <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
          <span>Accepted</span>
        </span>
      );
    }
    if (s.includes("REVIEW") || s.includes("INSPECTION")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Under Review</span>
        </span>
      );
    }
    if (s.includes("PROGRESS") || s.includes("READY")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
          <span>In Progress</span>
        </span>
      );
    }
    if (s.includes("FUNDED") || s.includes("ESCROW")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 whitespace-nowrap">
          <Lock className="w-3 h-3 text-blue-600" />
          <span>Escrow Funded</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
        <span>Scheduled</span>
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. SaaS Top Bar Ribbon & Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <CalendarDays className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Milestone Schedule & Roadmap
              </h3>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50/80 text-indigo-700 border border-indigo-200/60">
                {project.agreementVersion || "v1.1"} Baseline
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                {tasksWithCritical.length} Tranches
              </span>
            </div>
            <p className="text-xs text-slate-500 pl-10">
              Interactive timeline with bilateral dependency protection, automated 72h escrow buffers, and consensus scheduling.
            </p>
          </div>

          {/* Right Toolbar Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap pl-10 lg:pl-0">
            {/* View Mode Toggle: Gantt vs List */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveViewMode("gantt")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeViewMode === "gantt"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Gantt</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode("list")}
                className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeViewMode === "list"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>

            {/* Zoom Granularity (Only active in Gantt mode) */}
            {activeViewMode === "gantt" && (
              <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setZoomLevel("days")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    zoomLevel === "days" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Days
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel("weeks")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    zoomLevel === "weeks" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Weeks
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel("months")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    zoomLevel === "months" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Months
                </button>
              </div>
            )}

            {/* Critical Path Filter */}
            <button
              type="button"
              onClick={() => setShowCriticalPath(!showCriticalPath)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                showCriticalPath
                  ? "bg-amber-50 text-amber-800 border-amber-300 shadow-2xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
              title="Highlight active critical path milestone"
            >
              <Zap className={`w-3.5 h-3.5 ${showCriticalPath ? "text-amber-600 fill-amber-500" : "text-slate-400"}`} />
              <span>Critical Path</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics SaaS Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Overall Progress
          </span>
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {overallProgress}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({completedCount} of {tasksWithCritical.length} tranches)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Escrow Allocation
          </span>
          <span className="text-xl font-black text-slate-900 font-mono mt-1.5 block">
            {totalAmountStr}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Bilateral Smart Escrow
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Scope Window
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1.5 block">
            {totalDays} Days
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block truncate">
            Due {maxDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Inspection Buffer
          </span>
          <span className="text-xl font-black text-indigo-700 font-mono mt-1.5 block">
            72 Hours SLA
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Post-delivery auto-protection
          </span>
        </div>
      </div>

      {/* 3. Main Schedule Canvas: Table + Gantt */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {tasksWithCritical.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No milestones or deliverables defined in this agreement baseline.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[960px] flex">
              {/* LEFT PANE: Stable, Non-Crushable Milestone Table (460px) */}
              <div className="w-[440px] sm:w-[480px] shrink-0 border-r border-slate-200 flex flex-col bg-white">
                {/* Table Header */}
                <div className="h-11 px-4 bg-slate-50/90 border-b border-slate-200 flex items-center text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                  <span className="w-9 shrink-0 text-center">#</span>
                  <span className="flex-1 min-w-0 px-3">Milestone Tranche & Scope</span>
                  <span className="w-24 shrink-0 text-right pr-2">Amount</span>
                  <span className="w-28 shrink-0 text-right">Status</span>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-slate-100">
                  {tasksWithCritical.map((task) => {
                    const isSelected = selectedTaskId === task.id;
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleRowClick(task)}
                        className={`h-16 px-4 flex items-center text-xs transition cursor-pointer select-none group ${
                          isSelected
                            ? "bg-indigo-50/80 ring-1 ring-inset ring-indigo-200"
                            : "hover:bg-slate-50/90"
                        }`}
                      >
                        {/* Number Badge */}
                        <div className="w-9 shrink-0 flex justify-center">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-[11px] transition ${
                              task.percentDone === 100
                                ? "bg-emerald-100 text-emerald-800"
                                : task.isCritical && showCriticalPath
                                ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                                : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                            }`}
                          >
                            {task.percentDone === 100 ? (
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            ) : (
                              `M${task.number}`
                            )}
                          </span>
                        </div>

                        {/* Title & Dates */}
                        <div className="flex-1 min-w-0 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs truncate">
                              {task.name}
                            </span>
                            {task.isAddon && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                                Add-on
                              </span>
                            )}
                            {task.isCritical && showCriticalPath && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-300 shrink-0 flex items-center gap-0.5">
                                <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 whitespace-nowrap font-medium">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              {task.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              {" → "}
                              {task.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500 font-mono">{task.durationDays}d</span>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="w-24 shrink-0 text-right pr-2">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {task.amount}
                          </span>
                        </div>

                        {/* Status */}
                        <div className="w-28 shrink-0 flex justify-end">
                          {renderStatusBadge(task.status, task.percentDone)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT PANE: Interactive Gantt Visual Timeline */}
              {activeViewMode === "gantt" ? (
                <div className="flex-1 min-w-[500px] flex flex-col relative bg-slate-50/20">
                  {/* Timeline Header Row (Dates) */}
                  <div className="h-11 bg-slate-50/90 border-b border-slate-200 relative select-none">
                    {timelineTicks.map((tick, i) => (
                      <div
                        key={i}
                        style={{ left: `${tick.leftPercent}%` }}
                        className="absolute top-0 bottom-0 border-l border-slate-200/80 pl-2 pt-1.5 text-[10px] font-mono select-none"
                      >
                        <div className="font-bold text-slate-700">{tick.label}</div>
                        <div className="text-[9px] text-slate-400 -mt-0.5">{tick.subLabel}</div>
                      </div>
                    ))}

                    {/* Clean Today indicator pin in header */}
                    {todayPercent !== null && (
                      <div
                        style={{ left: `${todayPercent}%` }}
                        className="absolute top-0 bottom-0 -translate-x-1/2 flex flex-col items-center justify-between z-10 pointer-events-none py-0.5"
                      >
                        <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-bold bg-rose-500 text-white shadow-2xs uppercase tracking-wider">
                          Today
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      </div>
                    )}
                  </div>

                  {/* Gantt Timeline Rows */}
                  <div className="divide-y divide-slate-100 relative">
                    {/* Background Vertical Grid Lines & Today Line */}
                    <div className="absolute inset-0 pointer-events-none z-0">
                      {timelineTicks.map((tick, i) => (
                        <div
                          key={i}
                          style={{ left: `${tick.leftPercent}%` }}
                          className="absolute top-0 bottom-0 border-l border-slate-100"
                        />
                      ))}

                      {/* Refined Today vertical marker BEHIND bars */}
                      {todayPercent !== null && (
                        <>
                          <div
                            style={{ left: `calc(${todayPercent}% - 12px)` }}
                            className="absolute top-0 bottom-0 w-6 bg-rose-500/[0.04]"
                          />
                          <div
                            style={{ left: `${todayPercent}%` }}
                            className="absolute top-0 bottom-0 w-[1.5px] bg-rose-400/80"
                          />
                        </>
                      )}
                    </div>

                    {/* Gantt Milestone Bars */}
                    {tasksWithCritical.map((task) => {
                      const { left, width } = getTaskCoords(task);
                      const isSelected = selectedTaskId === task.id;

                      // Refined Tier-1 SaaS bar styling (clean, modern, calm colors)
                      let barStyle = "bg-slate-50 hover:bg-slate-100/90 text-slate-700 border border-slate-300/80 shadow-2xs";
                      if (task.percentDone === 100) {
                        barStyle = "bg-[#059669] hover:bg-[#047857] text-white border border-[#047857]/60 shadow-xs";
                      } else if (task.percentDone >= 85) {
                        barStyle = "bg-[#d97706] hover:bg-[#b45309] text-white border border-[#b45309]/60 shadow-xs";
                      } else if (task.percentDone > 0) {
                        barStyle = "bg-[#4f46e5] hover:bg-[#4338ca] text-white border border-[#4338ca]/60 shadow-xs";
                      }

                      return (
                        <div
                          key={task.id}
                          className="h-16 relative flex items-center px-2 group"
                          onClick={() => handleRowClick(task)}
                        >
                          {/* Gantt Bar Pill */}
                          <div
                            style={{
                              left: `${left}%`,
                              width: `${Math.max(width, 7)}%`,
                            }}
                            className={`absolute h-8 rounded-lg transition-all duration-150 cursor-pointer flex items-center px-2.5 overflow-hidden select-none z-10 ${barStyle} ${
                              isSelected
                                ? "ring-2 ring-indigo-600 ring-offset-2 shadow-md"
                                : "hover:brightness-105"
                            } ${
                              task.isCritical && showCriticalPath
                                ? "ring-2 ring-amber-400 ring-offset-1"
                                : ""
                            }`}
                          >
                            {/* Inner progress track */}
                            {task.percentDone > 0 && task.percentDone < 100 && (
                              <div
                                style={{ width: `${task.percentDone}%` }}
                                className="absolute bottom-0 left-0 h-1 bg-white/40 rounded-bl-lg transition-all"
                              />
                            )}

                            {/* Bar Content */}
                            <div className="relative z-10 flex items-center justify-between w-full min-w-0 text-xs font-semibold gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0 truncate">
                                {task.percentDone === 100 ? (
                                  <span className="w-3.5 h-3.5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                    <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                                  </span>
                                ) : task.percentDone > 0 ? (
                                  <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
                                ) : null}
                                <span className="truncate font-medium text-[11.5px] tracking-tight">
                                  #{task.number} {task.name}
                                </span>
                              </div>
                              <span className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                task.percentDone === 100
                                  ? "bg-black/15 text-emerald-100"
                                  : task.percentDone > 0
                                  ? "bg-black/15 text-indigo-100"
                                  : "bg-slate-200/80 text-slate-600"
                              }`}>
                                {task.percentDone}%
                              </span>
                            </div>
                          </div>

                          {/* Quick Adjust button on hover */}
                          {onPostponeMilestone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onPostponeMilestone(task.id, task.endDate.toISOString().slice(0, 10));
                              }}
                              style={{ left: `calc(${left + Math.max(width, 7)}% + 8px)` }}
                              className="absolute text-[11px] font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg px-2 py-0.5 opacity-0 group-hover:opacity-100 transition shadow-2xs cursor-pointer z-20"
                              title="Propose Postponement"
                            >
                              Postpone
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Alternate List/Table View Details */
                <div className="flex-1 p-6 bg-slate-50/40 flex flex-col justify-center">
                  <div className="max-w-md mx-auto text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                      <Info className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">Milestone Tranches View</h4>
                    <p className="text-xs text-slate-500">
                      Select any milestone tranche on the left to review its escrow status, deliverables inspection SLA, and bilateral postponement history.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Active Milestone Quick Inspector Drawer (When Row is Selected) */}
        {selectedTask && (
          <div className="p-4 bg-indigo-50/40 border-t border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-mono font-bold flex items-center justify-center">
                M{selectedTask.number}
              </div>
              <div>
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <span>{selectedTask.name}</span>
                  <span className="font-mono text-indigo-700 font-bold">{selectedTask.amount}</span>
                  {selectedTask.isCritical && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      Critical Bottleneck
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Scheduled: {selectedTask.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} —{" "}
                  {selectedTask.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ({selectedTask.durationDays} days window)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onPostponeMilestone && (
                <button
                  type="button"
                  onClick={() => onPostponeMilestone(selectedTask.id, selectedTask.endDate.toISOString().slice(0, 10))}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition cursor-pointer shadow-2xs"
                >
                  Request Postponement
                </button>
              )}
              {onSelectMilestone && (
                <button
                  type="button"
                  onClick={() => {
                    const raw = project.milestones.find((m) => m.id === selectedTask.id);
                    if (raw) onSelectMilestone(raw);
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer shadow-2xs"
                >
                  View Details & Deliverables
                </button>
              )}
            </div>
          </div>
        )}

        {/* 5. Sleek SaaS Legend Footer */}
        <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 text-xs text-slate-600 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-2xs" />
              <span>Accepted (100%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block shadow-2xs" />
              <span>In Progress (50%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block shadow-2xs" />
              <span>Under Review (85%)</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block border border-slate-400" />
              <span>Scheduled</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>Critical Path</span>
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Nexum Bilateral Protocol • Cryptographically Verified Timeline</span>
          </div>
        </div>
      </div>
    </div>
  );
}

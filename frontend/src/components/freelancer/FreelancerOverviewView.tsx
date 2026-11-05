"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Wallet,
  FolderKanban,
  FileText,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Circle,
  ArrowRight,
  ShoppingCart,
  Smartphone,
  Code2,
  ChevronDown,
  Bookmark,
  BookmarkCheck,
  Rocket,
  MoreHorizontal,
  Bot,
  Search,
  Check,
  Layers,
  Plus,
  ChevronRight,
} from "lucide-react";
import { DemoUser } from "@/lib/auth-types";
import { fetchFreelancerDashboard, DashboardSummaryData } from "@/lib/api-client";

interface FreelancerOverviewViewProps {
  freelancer: DemoUser;
  client: DemoUser;
  onNavigateTab: (tab: string) => void;
  onSubmitDeliverableClick: () => void;
  onReviewLeadClick: () => void;
}

export default function FreelancerOverviewView({
  freelancer,
  onNavigateTab,
}: FreelancerOverviewViewProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState("Last 6 months");
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [bookmarkedProjects, setBookmarkedProjects] = useState<string[]>([]);
  const [workStatus, setWorkStatus] = useState<"Available for work" | "In active project" | "Busy / Away">("Available for work");
  const [dashboardData, setDashboardData] = useState<DashboardSummaryData | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadDashboard() {
      try {
        const res = await fetchFreelancerDashboard();
        if (mounted && res.success && res.dashboard) {
          setDashboardData(res.dashboard);
        }
      } catch (err) {
        console.warn("Using fallback dashboard data", err);
      } finally {
        if (mounted) setIsLoadingDashboard(false);
      }
    }
    loadDashboard();
    return () => { mounted = false; };
  }, []);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Close status dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    }
    if (isStatusDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isStatusDropdownOpen]);

  // Earnings chart data (Trailing 6 months derived dynamically from backend)
  const monthlyEarnings = dashboardData?.monthlyEarnings && dashboardData.monthlyEarnings.length > 0
    ? dashboardData.monthlyEarnings
    : [
        { month: "May", completed: 0, pending: 0, label: "$0" },
        { month: "Jun", completed: 0, pending: 0, label: "$0" },
        { month: "Jul", completed: 0, pending: 0, label: "$0" },
        { month: "Aug", completed: 0, pending: 0, label: "$0" },
        { month: "Sep", completed: 0, pending: 0, label: "$0" },
        { month: "Oct", completed: 0, pending: 0, label: "$0" },
      ];

  const toggleBookmark = (id: string) => {
    setBookmarkedProjects((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const displayName = freelancer.name ? freelancer.name.split(" ")[0] : "Freelancer";

  return (
    <div className="space-y-6">
      {/* ==============================================================
          1. HERO WELCOME BANNER (MATCHING CLIENT SIDE DESIGN THEME)
         ============================================================== */}
      <section className="relative w-full rounded-[24px] sm:rounded-[28px] bg-gradient-to-r from-[#4338ca] via-[#4f46e5] to-[#6366f1] text-white p-5 sm:p-7 shadow-[0_12px_32px_rgba(79,70,229,0.22)] border border-white/15 select-none">
        {/* Background ambient lighting and subtle decorative grid - clipped cleanly inside without cutting off dropdowns */}
        <div className="absolute inset-0 rounded-[24px] sm:rounded-[28px] overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-black/10" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_60%,transparent_100%)]" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Avatar & Greeting */}
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden shrink-0 border-2 border-white/80 shadow-md ring-4 ring-white/20">
              <Image
                src={freelancer.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80"}
                alt={freelancer.name || "Freelancer"}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-heading leading-tight flex items-center gap-2">
                <span>Welcome back, {displayName}!</span>
              </h1>
              <p className="text-xs sm:text-[13px] text-white/85 font-normal leading-relaxed">
                Let&apos;s build and deliver verified milestones today.
              </p>

              {/* Status Pill with interactive Dropdown */}
              <div className="relative inline-block pt-0.5" ref={statusDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-[11px] font-semibold text-white transition-all cursor-pointer shadow-xs active:scale-98"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{workStatus}</span>
                  <ChevronDown className={`w-3 h-3 text-white/80 transition-transform ${isStatusDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isStatusDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-44 rounded-xl border border-white/20 bg-slate-900/95 backdrop-blur-xl p-1 shadow-2xl z-50 text-white animate-in fade-in zoom-in-95 duration-150">
                    {(["Available for work", "In active project", "Busy / Away"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setWorkStatus(st);
                          setIsStatusDropdownOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold hover:bg-white/15 transition flex items-center justify-between cursor-pointer"
                      >
                        <span>{st}</span>
                        {workStatus === st && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center: Profile Completeness Card (Matches Client Workspace Readiness) */}
          <div className="w-full lg:w-auto min-w-[240px] max-w-[290px] rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-3.5 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span className="text-white/80 font-medium">Profile Completeness</span>
              <span className="font-mono text-white text-[13px]">{dashboardData ? `${dashboardData.profileCompleteness.score}%` : "—"}</span>
            </div>

            {/* Progress Bar with vibrant emerald fill */}
            <div className="w-full h-2 rounded-full bg-black/25 overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all duration-500 shadow-sm"
                style={{ width: `${dashboardData ? dashboardData.profileCompleteness.score : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-0.5">
              <button
                type="button"
                onClick={() => onNavigateTab("profile")}
                className="inline-flex items-center gap-1 font-semibold text-white/95 hover:text-white hover:underline cursor-pointer group"
              >
                <span>{dashboardData?.profileCompleteness.nextAction || "Add portfolio project"}</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <span className="text-[10px] font-mono text-emerald-300 font-semibold bg-emerald-950/40 px-1.5 py-0.5 rounded">
                Ready
              </span>
            </div>
          </div>

          {/* Right: Horizontal Action Pill Buttons (Matching Client Side Header) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            {/* Action 1: Find Projects */}
            <button
              type="button"
              onClick={() => onNavigateTab("find_projects")}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-98 backdrop-blur-md border border-white/25 text-white font-semibold text-xs transition shadow-xs cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Search className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              </div>
              <span>Find Projects</span>
            </button>

            {/* Action 2: Milestones */}
            <button
              type="button"
              onClick={() => onNavigateTab("projects")}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:scale-98 backdrop-blur-md border border-white/25 text-white font-semibold text-xs transition shadow-xs cursor-pointer group"
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Layers className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              </div>
              <span>Milestones</span>
            </button>

            {/* Action 3: Post/Browse CTA (Solid White Button) */}
            <button
              type="button"
              onClick={() => onNavigateTab("find_projects")}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#4f46e5] font-bold text-xs shadow-md hover:shadow-lg transition cursor-pointer active:scale-98"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Browse Projects</span>
            </button>
          </div>
        </div>
      </section>

      {/* ==============================================================
          2. FOUR TOP SUMMARY KPI CARDS (MATCHING REFERENCE IMAGE & CLIENT THEME)
         ============================================================== */}
      <section aria-labelledby="section-summary-cards">
        <div className="flex items-center justify-between mb-3 px-0.5">
          <h2 id="section-summary-cards" className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Workspace Overview</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]" />
          </h2>
          <span className="text-[11px] font-mono text-slate-400">Live Telemetry</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Earnings */}
          <div
            onClick={() => onNavigateTab("earnings")}
            className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#4f46e5]/40 hover:shadow-xs transition-all duration-200 cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 transition-colors">
                Total Earnings
              </span>
              <div className="w-9 h-9 rounded-xl bg-[#eef2ff] text-[#4f46e5] border border-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                  {dashboardData
                    ? `$${(((dashboardData.earningsSnapshot.availableMinor || 0) + (dashboardData.earningsSnapshot.withdrawnMinor || 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${dashboardData.earningsSnapshot.currency}`
                    : "$0.00 USD"}
                </span>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <TrendingUp className="w-2.5 h-2.5" />
                  <span>Verified</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                {dashboardData
                  ? `$${((dashboardData.earningsSnapshot.availableMinor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Available for Payout`
                  : "$0.00 Available"}
              </p>
            </div>
          </div>

          {/* Card 2: Active Projects */}
          <div
            onClick={() => onNavigateTab("projects")}
            className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#4f46e5]/40 hover:shadow-xs transition-all duration-200 cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 transition-colors">
                Active Projects
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                {dashboardData ? dashboardData.activeProjects.count : 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                {dashboardData ? `${dashboardData.activeProjects.count} active · ${dashboardData.awaitingClientReview.count} in review` : "0 active · 0 in review"}
              </p>
            </div>
          </div>

          {/* Card 3: Pending Proposals */}
          <div
            onClick={() => onNavigateTab("proposals")}
            className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#4f46e5]/40 hover:shadow-xs transition-all duration-200 cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 transition-colors">
                Pending Proposals
              </span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                {dashboardData ? dashboardData.allProposals.count : 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                {dashboardData ? `${dashboardData.allProposals.count} proposals total` : "0 proposals total"}
              </p>
            </div>
          </div>

          {/* Card 4: Action Required */}
          <div
            onClick={() => onNavigateTab("workspace")}
            className="p-5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#4f46e5]/40 hover:shadow-xs transition-all duration-200 cursor-pointer group flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 transition-colors">
                Action Required
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                {dashboardData ? (dashboardData.needsYourReply.count + dashboardData.milestonesDueSoon.count) : 0}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-medium">
                {dashboardData ? `${dashboardData.needsYourReply.count} replies · ${dashboardData.milestonesDueSoon.count} due soon` : "0 due soon"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================================
          3. MAIN TWO-COLUMN DASHBOARD GRID
         ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ============================================================
            LEFT COLUMN (Approx 8 of 12 columns)
           ============================================================ */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card A: Earnings Overview (Stacked Bar Chart) */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Earnings Overview
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bilateral milestone payout releases over time
                </p>
              </div>

              {/* Time Range Dropdown */}
              <div className="relative inline-block self-start sm:self-auto">
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="px-3.5 py-1.5 pr-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Last 30 days">Last 30 days</option>
                  <option value="Last 3 months">Last 3 months</option>
                  <option value="Last 6 months">Last 6 months</option>
                  <option value="Year to date">Year to date</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* KPI Summary Block inside chart */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100">
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900">
                  {dashboardData ? `$${(((dashboardData.earningsSnapshot.availableMinor || 0) + (dashboardData.earningsSnapshot.withdrawnMinor || 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${dashboardData.earningsSnapshot.currency}` : "$0.00 USD"}
                </div>
                <div className="text-xs text-slate-500 font-medium">Total Earnings</div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-[#4f46e5] shrink-0" />
                  <span className="text-slate-600">Available / Released</span>
                  <strong className="font-mono text-slate-900">
                    {dashboardData ? `$${((dashboardData.earningsSnapshot.availableMinor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
                  </strong>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-md bg-[#c7d2fe] shrink-0" />
                  <span className="text-slate-600">Funded in Escrow</span>
                  <strong className="font-mono text-slate-900">
                    {dashboardData ? `$${(((dashboardData.earningsSnapshot.fundedMinor || 0) + (dashboardData.earningsSnapshot.inReviewMinor || 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab("earnings")}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition cursor-pointer flex items-center gap-1 group shrink-0"
              >
                <span>View Earnings & Payments</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Stacked Bar Chart with Axis Labels */}
            <div className="pt-2">
              <div className="relative h-56 flex items-end justify-between gap-3 sm:gap-6 pl-10 pr-2 pb-6 border-b border-slate-100">
                {/* Dynamic Horizontal Guide Lines */}
                {(() => {
                  const maxDataVal = Math.max(0, ...monthlyEarnings.map((m) => m.completed + m.pending));
                  const chartMaxVal = Math.max(1000, Math.ceil(maxDataVal / 500) * 500);
                  const formatTick = (val: number) => {
                    if (val >= 1000) return `$${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`;
                    return `$${val}`;
                  };
                  return (
                    <>
                      <div className="absolute left-0 right-0 top-0 border-b border-dashed border-slate-100 text-[10px] font-mono text-slate-400">
                        <span className="absolute -top-2 left-0">{formatTick(chartMaxVal)}</span>
                      </div>
                      <div className="absolute left-0 right-0 top-1/3 border-b border-dashed border-slate-100 text-[10px] font-mono text-slate-400">
                        <span className="absolute -top-2 left-0">{formatTick(Math.round(chartMaxVal * (2 / 3)))}</span>
                      </div>
                      <div className="absolute left-0 right-0 top-2/3 border-b border-dashed border-slate-100 text-[10px] font-mono text-slate-400">
                        <span className="absolute -top-2 left-0">{formatTick(Math.round(chartMaxVal * (1 / 3)))}</span>
                      </div>
                      <div className="absolute left-0 bottom-6 text-[10px] font-mono text-slate-400">
                        <span>$0</span>
                      </div>
                    </>
                  );
                })()}

                {/* 6 Monthly Stacked Bars */}
                {(() => {
                  const maxDataVal = Math.max(0, ...monthlyEarnings.map((m) => m.completed + m.pending));
                  const chartMaxVal = Math.max(1000, Math.ceil(maxDataVal / 500) * 500);

                  return monthlyEarnings.map((item, idx) => {
                    const completedHeight = Math.min(100, (item.completed / chartMaxVal) * 100);
                    const pendingHeight = Math.min(100 - completedHeight, (item.pending / chartMaxVal) * 100);
                    const isHovered = hoveredBarIndex === idx;

                    return (
                      <div
                        key={item.month}
                        onMouseEnter={() => setHoveredBarIndex(idx)}
                        onMouseLeave={() => setHoveredBarIndex(null)}
                        className="flex-1 flex flex-col items-center h-full justify-end relative group cursor-pointer z-10"
                      >
                        {/* Tooltip on hover */}
                        {isHovered && (
                          <div className="absolute -top-12 z-20 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-mono font-bold shadow-xl whitespace-nowrap animate-in fade-in slide-in-from-bottom-1">
                            {item.month}: {item.label}
                          </div>
                        )}

                        {/* Stacked Bar Container */}
                        <div className="w-8 sm:w-12 flex flex-col justify-end transition-transform group-hover:scale-y-[1.02] origin-bottom">
                          {/* Pending (Top portion, lavender) */}
                          <div
                            style={{ height: `${pendingHeight * 1.6}px` }}
                            className="w-full bg-[#c7d2fe] rounded-t-lg transition-colors group-hover:bg-[#a5b4fc]"
                          />
                          {/* Completed (Bottom portion, deep indigo) */}
                          <div
                            style={{ height: `${completedHeight * 1.6}px` }}
                            className="w-full bg-[#4f46e5] rounded-b-none transition-colors group-hover:bg-[#4338ca]"
                          />
                        </div>

                        {/* Month Label */}
                        <span className="absolute -bottom-5 text-xs font-semibold text-slate-500 group-hover:text-slate-900">
                          {item.month}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </section>

          {/* Card B: Active Projects (Outer Container Card with Distinct Inner Cards) */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            {/* Outer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Active Projects</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]" />
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eef2ff] text-[#4f46e5] border border-indigo-100">
                  {dashboardData ? `${dashboardData.activeProjects.count} in progress` : "0 in progress"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab("projects")}
                className="text-xs font-semibold text-[#4f46e5] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View all projects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Inner Cards Container */}
            <div className="space-y-3">
              {dashboardData && dashboardData.activeProjects.items.length > 0 ? (
                dashboardData.activeProjects.items.map((proj: any, idx: number) => {
                  const completionPct = proj.milestonesTotal > 0 ? Math.round((proj.milestonesAccepted / proj.milestonesTotal) * 100) : 0;
                  return (
                    <div
                      key={`${proj.id}_${idx}`}
                      onClick={() => onNavigateTab("projects")}
                      className="p-4 sm:p-4.5 rounded-xl border border-slate-200/80 bg-slate-50/90 hover:bg-white hover:border-[#4f46e5]/40 hover:shadow-xs transition-all duration-200 cursor-pointer group space-y-3"
                    >
                      <div className="flex items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/90 text-[#4f46e5] shadow-2xs flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-indigo-200 transition-all">
                            {idx === 0 ? <ShoppingCart className="w-5 h-5" /> : idx === 1 ? <Smartphone className="w-5 h-5 text-purple-600" /> : <Code2 className="w-5 h-5 text-sky-600" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#4f46e5] transition-colors truncate">
                                {proj.title}
                              </h3>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                proj.status === "COMPLETED"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                              }`}>
                                {proj.status === "COMPLETED" ? "Completed" : proj.status === "ACTIVE" ? "In Progress" : proj.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                              Client: <strong className="text-slate-700 font-semibold">{proj.client?.name || "Client"}</strong> · Verified Escrow Contract
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="hidden sm:inline-flex px-3 py-1.5 rounded-xl border border-slate-200 bg-white group-hover:bg-[#4f46e5] group-hover:border-[#4f46e5] group-hover:text-white text-xs font-bold text-slate-700 shadow-2xs transition">
                            Open Workspace →
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#4f46e5] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>

                      {/* Progress & Milestone Meta Bar */}
                      <div className="pt-2.5 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2 min-w-0 text-slate-600">
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                            Milestones:
                          </span>
                          <span className="font-bold text-slate-800 truncate">
                            {proj.milestonesAccepted || 0} of {proj.milestonesTotal || 0} Accepted
                          </span>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-52 shrink-0">
                          <span className="text-[11px] text-slate-500 font-medium">Completion</span>
                          <div className="flex-1 h-2 rounded-full bg-slate-200/80 overflow-hidden">
                            <div className="h-full rounded-full bg-[#4f46e5] transition-all duration-300" style={{ width: `${completionPct}%` }} />
                          </div>
                          <span className="font-mono font-bold text-slate-900 text-xs shrink-0 w-8 text-right">
                            {completionPct}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center rounded-2xl bg-white border border-slate-200/90 text-slate-500">
                  <p className="text-sm font-semibold">No active projects currently.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Check Find Projects to discover client proposals and begin delivering milestones.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Section C: Split Row (Recent Proposals & Recent Activity) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card C1: Recent Proposals */}
            <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Recent Proposals
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigateTab("proposals")}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {dashboardData?.recentProposals && dashboardData.recentProposals.length > 0 ? (
                  dashboardData.recentProposals.map((prop: any) => (
                    <div key={prop.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">
                          {prop.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {prop.clientName} · {prop.timeAgo}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          prop.status === "ACCEPTED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
                            : prop.status === "COUNTEROFFER_RECEIVED"
                            ? "bg-amber-50 text-amber-700 border-amber-200/80"
                            : "bg-blue-50 text-blue-700 border-blue-200/80"
                        }`}>
                          {prop.status.replace(/_/g, " ")}
                        </span>
                        <span className="font-mono font-bold text-slate-800 text-xs">
                          {prop.amountDisplay}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-slate-400">
                    No proposals submitted yet.
                  </div>
                )}
              </div>
            </section>

            {/* Card C2: Recent Activity */}
            <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Recent Activity
                </h3>
                <button
                  type="button"
                  onClick={() => onNavigateTab("earnings")}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
                  dashboardData.recentActivity.slice(0, 4).map((act: any) => (
                    <div key={act.id} className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-900 truncate">
                          {act.action.replace(/_/g, " ")}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {act.entityType} · {new Date(act.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-slate-400">
                    No recent activity logged yet.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* ============================================================
            RIGHT COLUMN (Approx 4 of 12 columns)
           ============================================================ */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card D1: Profile Strength */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Profile Strength
              </h3>
              <span className="text-sm font-bold text-[#4f46e5]">
                {dashboardData ? `${dashboardData.profileCompleteness.score}%` : "—"}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${dashboardData ? dashboardData.profileCompleteness.score : 0}%` }}
              />
            </div>

            {/* Checklist */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                {freelancer.verified ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                <span>Verified Freelancer Account</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>PayPal Escrow Wallet Connected</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                {dashboardData?.profileCompleteness.missingItems?.includes("skills") ? (
                  <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>Technical Skills & Stacks</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                {dashboardData?.profileCompleteness.missingItems?.includes("portfolio") ? (
                  <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>Portfolio Projects</span>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => onNavigateTab("profile")}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 ml-auto cursor-pointer hover:underline"
              >
                <span>Improve Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>

          {/* Card D2: Recommended Projects */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Recommended Projects
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab("find_projects")}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer hover:underline"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {dashboardData?.recommendedProjects && dashboardData.recommendedProjects.length > 0 ? (
                dashboardData.recommendedProjects.map((rec: any, idx: number) => (
                  <div key={rec.id || idx} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2 hover:border-indigo-300 transition text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-[#4f46e5] flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-900">{rec.title}</span>
                          <p className="text-[10px] text-slate-400">{rec.clientName} · {rec.category}</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{rec.reason}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 font-mono text-[11px]">
                      <span className="font-bold text-slate-900">{rec.budget}</span>
                      <button
                        type="button"
                        onClick={() => onNavigateTab("find_projects")}
                        className="text-[10px] font-bold text-[#4f46e5] hover:underline"
                      >
                        Apply Now →
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-slate-400 text-xs">
                  No project recommendations available right now.
                </div>
              )}
            </div>
          </section>

          {/* Card D3: Ready for more opportunities? (Bottom CTA Banner) */}
          <section className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-indigo-50/40 p-5 shadow-xs space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Rocket className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-slate-900">
                  Ready for more opportunities?
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Keep your profile updated to get better project recommendations.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab("find_projects")}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer text-center"
            >
              Browse New Projects
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

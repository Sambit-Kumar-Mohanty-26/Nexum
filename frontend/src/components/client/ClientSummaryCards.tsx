"use client";

import React from "react";
import {
  FolderKanban,
  AlertCircle,
  Layers,
  Users,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

interface ClientSummaryCardsProps {
  activeProjectsCount?: number;
  pendingActionsCount?: number;
  upcomingMilestonesCount?: number;
  activeFreelancersCount?: number;
  totalSpentDisplay?: string;
  paymentStatusSummary?: string;
  paymentStatusDetail?: string;
}

export default function ClientSummaryCards({
  activeProjectsCount = 1,
  pendingActionsCount = 1,
  upcomingMilestonesCount = 3,
  activeFreelancersCount = 1,
  totalSpentDisplay = "$1,200.00 USD",
  paymentStatusSummary = "$1,500.00 USD",
  paymentStatusDetail = "Pre-funded in PayPal Sandbox",
}: ClientSummaryCardsProps) {
  const metrics = [
    {
      id: "active_projects",
      label: "Active Projects",
      value: activeProjectsCount.toString(),
      subtext: "Bilateral Payment Rails",
      icon: FolderKanban,
      badge: "In Progress",
      badgeColor: "bg-blue-50 text-[#245BFF] border-blue-200/80",
      iconBg: "bg-blue-50/80 text-[#245BFF] ring-1 ring-blue-500/15",
    },
    {
      id: "pending_actions",
      label: "Pending Actions",
      value: pendingActionsCount.toString(),
      subtext: "Milestone 2 deliverable review",
      icon: AlertCircle,
      badge: pendingActionsCount > 0 ? "Review Needed" : "All Clear",
      badgeColor:
        pendingActionsCount > 0
          ? "bg-amber-50 text-amber-800 border-amber-300 font-semibold"
          : "bg-slate-50 text-slate-600 border-slate-200",
      iconBg:
        pendingActionsCount > 0
          ? "bg-amber-50 text-amber-700 ring-1 ring-amber-500/25"
          : "bg-slate-50 text-slate-500 ring-1 ring-slate-200",
      hasPulse: pendingActionsCount > 0,
    },
    {
      id: "upcoming_milestones",
      label: "Upcoming Milestones",
      value: upcomingMilestonesCount.toString(),
      subtext: "M2 in review, M3 & M4 queued",
      icon: Layers,
      badge: "4 total",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      iconBg: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/15",
    },
    {
      id: "active_freelancers",
      label: "Active Freelancers",
      value: activeFreelancersCount.toString(),
      subtext: "Rohan Verma · Rails Lead",
      icon: Users,
      badge: "Assigned",
      badgeColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
      iconBg: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20",
    },
    {
      id: "total_spent",
      label: "Total Spent",
      value: totalSpentDisplay,
      subtext: "Captured via PayPal REST v2",
      icon: CreditCard,
      badge: "Settled",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
      iconBg: "bg-slate-100 text-slate-700 ring-1 ring-slate-300/40",
    },
    {
      id: "payment_status",
      label: "Payment Status",
      value: paymentStatusSummary,
      subtext: paymentStatusDetail,
      icon: ShieldCheck,
      badge: "Pre-Funded",
      badgeColor: "bg-blue-50 text-[#245BFF] border-blue-200/80",
      iconBg: "bg-blue-50 text-[#245BFF] ring-1 ring-blue-500/15",
    },
  ];

  return (
    <div className="space-y-3">
      {/* Responsive 3-column grid with 2 rows on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-[#E3EAF3] p-6 shadow-precision hover:border-[#245BFF]/40 hover:shadow-precision-hover transition-all duration-200 flex flex-col justify-between min-h-[142px] group relative overflow-hidden"
            >
              {/* Subtle top edge luminous line */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-slate-100 group-hover:via-[#245BFF]/40 to-transparent transition-all duration-300" />

              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#64748B]">
                  {m.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shrink-0 ${m.badgeColor}`}
                >
                  {m.hasPulse && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  )}
                  <span>{m.badge}</span>
                </span>
              </div>

              <div className="my-2 flex items-center justify-between gap-3">
                <div className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight tnum">
                  {m.value}
                </div>
                <div
                  className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-2xs ${m.iconBg}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <p className="text-xs text-[#64748B] font-medium" title={m.subtext}>
                {m.subtext}
              </p>
            </div>
          );
        })}
      </div>

      {/* Muted PayPal Sandbox disclaimer aligned to the right on desktop */}
      <div className="text-xs text-slate-400 text-left sm:text-right pr-1">
        * PayPal Sandbox v2 captures reflect provider transaction evidence, not commercial bank custody or banking escrow.
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { ArrowRight, FileCheck, Send, ShieldCheck } from "lucide-react";

interface ActivityItem {
  id: string;
  description: string;
  projectOrMilestone: string;
  actor: string;
  timestamp: string;
  reference: string;
  icon: React.ComponentType<{ className?: string }>;
}

const RECENT_EVENTS: (ActivityItem & { color: string })[] = [
  {
    id: "evt_1",
    description: "Milestone 2 deliverable artifacts submitted for client review",
    projectOrMilestone: "Milestone 2 · Webhook Ingestion Engine",
    actor: "Rohan Verma",
    timestamp: "2 hours ago",
    reference: "PR #42",
    icon: Send,
    color: "bg-amber-50 text-amber-700 ring-1 ring-amber-500/20",
  },
  {
    id: "evt_2",
    description: "PayPal Sandbox Order created & pre-funded before kickoff",
    projectOrMilestone: "Milestone 2 pre-funding",
    actor: "Alex Rivera",
    timestamp: "Yesterday",
    reference: "#6DE714998",
    icon: FileCheck,
    color: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20",
  },
  {
    id: "evt_3",
    description: "Dual approval confirmed and agreement state locked",
    projectOrMilestone: "Contract v1.2",
    actor: "Alex Rivera & Rohan Verma",
    timestamp: "Oct 25, 2026",
    reference: "hash #9f8c2b",
    icon: ShieldCheck,
    color: "bg-blue-50 text-[#245BFF] ring-1 ring-blue-500/20",
  },
];

interface RecentActivityListProps {
  onViewAuditTrail?: () => void;
}

export default function RecentActivityList({ onViewAuditTrail }: RecentActivityListProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-[#111827] tracking-tight">
            Recent activity
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Key state transitions and authorizations across your projects.
          </p>
        </div>

        {onViewAuditTrail && (
          <button
            type="button"
            onClick={onViewAuditTrail}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#245BFF] hover:text-[#1748E8] transition cursor-pointer self-start sm:self-auto"
          >
            <span>View audit trail</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Full-Width Calm Activity List */}
      <div className="bg-white rounded-2xl border border-[#E3EAF3] divide-y divide-[#E3EAF3] shadow-precision overflow-hidden">
        {RECENT_EVENTS.map((evt) => {
          const Icon = evt.icon;
          return (
            <div
              key={evt.id}
              className="p-5 sm:px-6 sm:py-4 flex items-center justify-between gap-4 hover:bg-[#F8FAFD] transition-colors duration-150"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 shadow-2xs ${evt.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-semibold text-[#111827] truncate">
                    {evt.description}
                  </div>
                  <div className="text-xs sm:text-sm text-[#64748B] truncate mt-1">
                    <span className="text-slate-800 font-medium">{evt.projectOrMilestone}</span>
                    <span className="mx-2 text-slate-300">·</span>
                    <span>{evt.actor}</span>
                    <span className="mx-2 text-slate-300">·</span>
                    <span className="text-slate-400">{evt.timestamp}</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 font-mono text-xs text-slate-600 bg-[#F8FAFD] px-2.5 py-1 rounded-md border border-[#E3EAF3]">
                {evt.reference}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface ActionItem {
  id: string;
  statusType: "urgent" | "info" | "pending";
  title: string;
  projectName: string;
  milestoneName: string;
  updatedAt: string;
  actionLabel: string;
  onAction: () => void;
}

interface NeedsAttentionSectionProps {
  milestone2Status: "IN_REVIEW" | "APPROVED_AND_RELEASED";
  onReviewMilestone: () => void;
  onViewAllActions?: () => void;
}

export default function NeedsAttentionSection({
  milestone2Status,
  onReviewMilestone,
  onViewAllActions,
}: NeedsAttentionSectionProps) {
  const actions: ActionItem[] = [];

  if (milestone2Status === "IN_REVIEW") {
    actions.push({
      id: "act_m2_review",
      statusType: "urgent",
      title: "Milestone submission awaiting review",
      projectName: "Bilateral E-Commerce Payment Rails",
      milestoneName: "Milestone 2 · PayPal REST v2 Webhook Ingestion Engine",
      updatedAt: "Submitted 2 hours ago by Rohan Verma · Due Oct 31",
      actionLabel: "Review submission",
      onAction: onReviewMilestone,
    });
    actions.push({
      id: "act_m3_prep",
      statusType: "info",
      title: "Prepare scope & funding for next stage",
      projectName: "Bilateral E-Commerce Payment Rails",
      milestoneName: "Milestone 3 · Dual SHA-256 State Machine & Ledger Replay",
      updatedAt: "Queued behind M2 release under Fund-Before-Work rule",
      actionLabel: "View details",
      onAction: onReviewMilestone,
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E3EAF3] p-5 sm:p-6 shadow-precision space-y-5">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E3EAF3]">
        <div className="flex items-center gap-2.5">
          <h2 className="text-base sm:text-lg font-bold text-[#111827] tracking-tight">
            Needs your attention
          </h2>
          {actions.length > 0 ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {actions.length} action{actions.length > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              All caught up
            </span>
          )}
        </div>

        {onViewAllActions && actions.length > 0 && (
          <button
            type="button"
            onClick={onViewAllActions}
            className="text-xs sm:text-sm font-semibold text-[#245BFF] hover:text-[#1748E8] transition cursor-pointer"
          >
            View all actions &rarr;
          </button>
        )}
      </div>

      {/* Spacious Action Rows */}
      {actions.length === 0 ? (
        <div className="p-6 rounded-xl bg-[#F8FAFD] border border-[#E3EAF3] text-sm text-slate-600 flex items-center gap-3.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>You&apos;re all caught up. No pending deliverables or contracts require immediate review.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map((act) => {
            const isUrgent = act.statusType === "urgent";
            return (
              <div
                key={act.id}
                className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-5 group ${
                  isUrgent
                    ? "bg-gradient-to-br from-amber-50/70 via-white to-blue-50/30 border-amber-200 shadow-precision hover:border-amber-300 hover:shadow-precision-hover"
                    : "bg-[#F8FAFD] border-[#E3EAF3] hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                {/* Left Content */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold border ${
                        isUrgent
                          ? "bg-amber-100/80 text-amber-900 border-amber-300"
                          : "bg-blue-50 text-[#245BFF] border-blue-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isUrgent ? "bg-amber-600 animate-pulse" : "bg-[#245BFF]"
                        }`}
                      />
                      <span>{isUrgent ? "Action Required" : "Upcoming Next"}</span>
                    </span>

                    <span className="text-[#64748B] font-medium">
                      {act.projectName}
                    </span>

                    {isUrgent && (
                      <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Release $1,500.00 USD
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-[#111827] group-hover:text-[#245BFF] transition-colors leading-snug">
                    {act.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                    {act.milestoneName} · {act.updatedAt}
                  </p>

                  {isUrgent && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] font-medium text-slate-700 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                        PR #42 (14 tests passing)
                      </span>
                      <span className="text-[11px] font-medium text-slate-700 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                        Loom Walkthrough Included
                      </span>
                      <span className="text-[11px] font-medium text-slate-700 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                        Dual SHA-256 Ready
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Action Button */}
                <div className="shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={act.onAction}
                    className={`h-10 px-5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-all duration-150 cursor-pointer shadow-precision hover:shadow-precision-hover active:scale-98 ${
                      isUrgent
                        ? "bg-[#245BFF] hover:bg-[#1748E8] text-white"
                        : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200"
                    }`}
                  >
                    <span>{act.actionLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

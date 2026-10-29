"use client";

import React from "react";
import { ArrowRight, Calendar } from "lucide-react";

interface MilestonePreviewItem {
  id: string;
  title: string;
  projectName: string;
  dueDate: string;
  workStatus: "Awaiting Review" | "Queued" | "Approved";
  workStatusColor: string;
  agreedAmount: string;
  paymentStatus: string;
  actionLabel: string;
  onAction: () => void;
}

interface UpcomingMilestonesPreviewProps {
  milestone2Status: "IN_REVIEW" | "APPROVED_AND_RELEASED";
  onViewAllMilestones?: () => void;
  onReviewMilestone?: () => void;
}

export default function UpcomingMilestonesPreview({
  milestone2Status,
  onViewAllMilestones,
  onReviewMilestone,
}: UpcomingMilestonesPreviewProps) {
  const milestones: MilestonePreviewItem[] = [
    {
      id: "m2",
      title: "Milestone 2: PayPal REST v2 Webhook Ingestion Engine",
      projectName: "Bilateral E-Commerce Payment Rails",
      dueDate: "Oct 31, 2026",
      workStatus:
        milestone2Status === "IN_REVIEW" ? "Awaiting Review" : "Approved",
      workStatusColor:
        milestone2Status === "IN_REVIEW"
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-emerald-50 text-emerald-800 border-emerald-200",
      agreedAmount: "$1,500.00 USD",
      paymentStatus:
        milestone2Status === "IN_REVIEW"
          ? "Pre-funded (Sandbox)"
          : "Captured & Released",
      actionLabel: milestone2Status === "IN_REVIEW" ? "Review" : "View",
      onAction: onReviewMilestone || (() => {}),
    },
    {
      id: "m3",
      title: "Milestone 3: Dual SHA-256 State Machine & Ledger Replay",
      projectName: "Bilateral E-Commerce Payment Rails",
      dueDate: "Nov 12, 2026",
      workStatus: "Queued",
      workStatusColor: "bg-slate-50 text-slate-700 border-slate-200",
      agreedAmount: "$1,000.00 USD",
      paymentStatus: "Unallocated reserve",
      actionLabel: "Details",
      onAction: onViewAllMilestones || (() => {}),
    },
    {
      id: "m4",
      title: "Milestone 4: Failover Simulator & Deduplication Verification",
      projectName: "Bilateral E-Commerce Payment Rails",
      dueDate: "Nov 24, 2026",
      workStatus: "Queued",
      workStatusColor: "bg-slate-50 text-slate-700 border-slate-200",
      agreedAmount: "$800.00 USD",
      paymentStatus: "Unallocated reserve",
      actionLabel: "Details",
      onAction: onViewAllMilestones || (() => {}),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-[#111827] tracking-tight">
            Upcoming milestones
          </h2>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Deliverable deadlines and verified state machine funding stages.
          </p>
        </div>

        {onViewAllMilestones && (
          <button
            type="button"
            onClick={onViewAllMilestones}
            className="text-xs sm:text-sm font-semibold text-[#245BFF] hover:text-[#1748E8] transition cursor-pointer self-start sm:self-auto"
          >
            View all milestones &rarr;
          </button>
        )}
      </div>

      {/* Full-Width Table Layout with Generous Row Height */}
      <div className="bg-white rounded-2xl border border-[#E3EAF3] shadow-precision overflow-hidden">
        {/* Table Header (Desktop) */}
        <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-6 py-3.5 bg-[#F8FAFD] border-b border-[#E3EAF3] text-xs font-semibold text-[#64748B] uppercase tracking-wider">
          <div className="sm:col-span-5">Milestone & Project</div>
          <div className="sm:col-span-2">Due Date</div>
          <div className="sm:col-span-2">Work Status</div>
          <div className="sm:col-span-2 text-right">Agreed Amount</div>
          <div className="sm:col-span-1 text-right">Action</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-[#E3EAF3]">
          {milestones.map((m) => {
            const isReview = m.workStatus === "Awaiting Review";
            return (
              <div
                key={m.id}
                className={`p-5 sm:px-6 sm:py-4.5 sm:grid sm:grid-cols-12 sm:items-center gap-4 transition-colors duration-150 ${
                  isReview
                    ? "bg-amber-50/20 hover:bg-amber-50/40"
                    : "hover:bg-[#F8FAFD]"
                }`}
              >
                {/* Milestone & Project */}
                <div className="sm:col-span-5 min-w-0 mb-2 sm:mb-0">
                  <div className="text-sm font-bold text-[#111827] truncate">
                    {m.title}
                  </div>
                  <div className="text-xs text-[#64748B] truncate mt-0.5">
                    {m.projectName}
                  </div>
                </div>

                {/* Due Date */}
                <div className="sm:col-span-2 text-xs sm:text-sm text-slate-700 flex items-center gap-2 mb-2 sm:mb-0">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{m.dueDate}</span>
                </div>

                {/* Work Status */}
                <div className="sm:col-span-2 mb-2 sm:mb-0">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${m.workStatusColor}`}
                  >
                    {isReview && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    )}
                    <span>{m.workStatus}</span>
                  </span>
                </div>

                {/* Agreed Amount & Payment Status */}
                <div className="sm:col-span-2 sm:text-right mb-2 sm:mb-0">
                  <div className="text-sm sm:text-base font-bold text-[#111827] tnum">
                    {m.agreedAmount}
                  </div>
                  <div className="text-xs text-[#64748B] mt-0.5">
                    {m.paymentStatus}
                  </div>
                </div>

                {/* Contextual Action */}
                <div className="sm:col-span-1 sm:text-right">
                  <button
                    type="button"
                    onClick={m.onAction}
                    className={`h-8 px-3.5 rounded-xl inline-flex items-center gap-1 text-xs font-bold transition-all duration-150 cursor-pointer active:scale-98 ${
                      isReview
                        ? "bg-[#245BFF] hover:bg-[#1748E8] text-white shadow-2xs"
                        : "border border-[#E3EAF3] hover:bg-white hover:border-[#245BFF]/30 text-slate-700 hover:text-[#245BFF]"
                    }`}
                  >
                    <span>{m.actionLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

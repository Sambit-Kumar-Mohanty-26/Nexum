"use client";

import React from "react";
import { CheckCircle2, Clock, Layers, Zap, ArrowRight } from "lucide-react";

interface MilestoneSummaryListProps {
  milestone2Status: "IN_REVIEW" | "APPROVED_AND_RELEASED";
  onViewAllMilestones: () => void;
}

export default function MilestoneSummaryList({
  milestone2Status,
  onViewAllMilestones,
}: MilestoneSummaryListProps) {
  const milestones = [
    {
      id: "m1",
      number: "1",
      title: "Project Intake & Architecture PRD",
      workStatus: "Approved & Released",
      workStatusColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
      paymentStatus: "Captured & Released ($1,200.00)",
      paymentStatusColor: "text-emerald-700",
      amount: "$1,200.00 USD",
      icon: CheckCircle2,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-200",
      context: "Approved Oct 26 · PayPal Order #4AB912048C881923K",
    },
    {
      id: "m2",
      number: "2",
      title: "PayPal REST v2 Webhook Ingestion Engine",
      workStatus: milestone2Status === "IN_REVIEW" ? "Deliverables In Review" : "Approved & Released",
      workStatusColor: milestone2Status === "IN_REVIEW" ? "text-amber-800 bg-amber-50 border-amber-200" : "text-emerald-700 bg-emerald-50 border-emerald-200",
      paymentStatus: milestone2Status === "IN_REVIEW" ? "Pre-Funded in Sandbox ($1,500.00)" : "Captured & Released ($1,500.00)",
      paymentStatusColor: milestone2Status === "IN_REVIEW" ? "text-amber-700" : "text-emerald-700",
      amount: "$1,500.00 USD",
      icon: Clock,
      iconColor: "text-blue-600 bg-blue-50 border-blue-200",
      context: "PayPal Sandbox Order #6DE714998H998261C · Testable verification pass",
    },
    {
      id: "m3",
      number: "3",
      title: "Dual SHA-256 State Machine & Ledger Replay",
      workStatus: "Queued (Fund Before Work)",
      workStatusColor: "text-slate-600 bg-slate-100 border-slate-200",
      paymentStatus: "Unallocated Reserve ($1,000.00)",
      paymentStatusColor: "text-slate-500",
      amount: "$1,000.00 USD",
      icon: Layers,
      iconColor: "text-slate-500 bg-slate-100 border-slate-200",
      context: "Unlocks upon acceptance of M2 · Due Nov 12",
    },
    {
      id: "m4",
      number: "4",
      title: "Failover Simulator & Deduplication Verification",
      workStatus: "Final Stage",
      workStatusColor: "text-slate-600 bg-slate-100 border-slate-200",
      paymentStatus: "Unallocated Reserve ($800.00)",
      paymentStatusColor: "text-slate-500",
      amount: "$800.00 USD",
      icon: Zap,
      iconColor: "text-slate-500 bg-slate-100 border-slate-200",
      context: "Contract conclusion and bilateral verification audit · Due Nov 24",
    },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            Milestone contract schedule
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            4-phase bilateral agreement under canonical hash #9f8c2b7e
          </p>
        </div>
        <button
          type="button"
          onClick={onViewAllMilestones}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          <span>View Full Schedule</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Rows */}
      <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-xs overflow-hidden">
        {milestones.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition"
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full border grid place-items-center shrink-0 mt-0.5 ${m.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">
                      M{m.number}: {m.title}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${m.workStatusColor}`}>
                      {m.workStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {m.context}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0 font-mono text-xs pl-11 sm:pl-0">
                <div className="font-extrabold text-slate-900 text-sm">
                  {m.amount}
                </div>
                <div className={`text-[11px] font-semibold ${m.paymentStatusColor}`}>
                  {m.paymentStatus}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

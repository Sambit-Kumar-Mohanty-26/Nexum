"use client";

import React from "react";
import { ShieldCheck, CreditCard, Send, CheckCircle2, ArrowRight } from "lucide-react";

interface ActivityItem {
  id: string;
  type: "DELIVERABLE_SUBMITTED" | "PAYPAL_ORDER_CREATED" | "AGREEMENT_LOCKED" | "PAYMENT_CAPTURED";
  title: string;
  actor: string;
  timestamp: string;
  hash: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

const ACTIVITIES: ActivityItem[] = [
  {
    id: "act_1",
    type: "DELIVERABLE_SUBMITTED",
    title: "Milestone 2 deliverable artifacts submitted for review",
    actor: "Rohan Verma",
    timestamp: "Nov 28, 2026 · 14:32 UTC",
    hash: "0x9f8c2b7e19a4",
    icon: Send,
    iconColor: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    id: "act_2",
    type: "PAYPAL_ORDER_CREATED",
    title: "PayPal Sandbox Order #6DE714998H998261C created ($1,500.00 USD)",
    actor: "Alex Rivera",
    timestamp: "Nov 27, 2026 · 09:15 UTC",
    hash: "0x812d4a19cf7b",
    icon: CreditCard,
    iconColor: "text-amber-600 bg-amber-50 border-amber-200",
  },
  {
    id: "act_3",
    type: "PAYMENT_CAPTURED",
    title: "Milestone 1 captured and funds released to contractor ($1,200.00 USD)",
    actor: "Alex Rivera",
    timestamp: "Oct 26, 2026 · 18:40 UTC",
    hash: "0x4ab912048c88",
    icon: CheckCircle2,
    iconColor: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    id: "act_4",
    type: "AGREEMENT_LOCKED",
    title: "Bilateral agreement dual-approved & locked on canonical hash",
    actor: "Alex Rivera & Rohan Verma",
    timestamp: "Oct 24, 2026 · 11:05 UTC",
    hash: "0x24ff9001ee32",
    icon: ShieldCheck,
    iconColor: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
];

interface RecentActivityListProps {
  onViewAuditTrail: () => void;
}

export default function RecentActivityList({ onViewAuditTrail }: RecentActivityListProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            Recent consensus activity & payment events
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographic audit log of dual approvals, order authorizations, and deliverable handoffs.
          </p>
        </div>
        <button
          type="button"
          onClick={onViewAuditTrail}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          <span>View Audit Trail</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Activity Timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-xs overflow-hidden">
        {ACTIVITIES.map((act) => {
          const Icon = act.icon;
          return (
            <div
              key={act.id}
              className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full border grid place-items-center shrink-0 ${act.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-[13px] font-semibold text-slate-900 truncate">
                    {act.title}
                  </div>
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                    <span>Actor: <strong className="text-slate-700">{act.actor}</strong></span>
                    <span className="text-slate-300">·</span>
                    <span>{act.timestamp}</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right font-mono text-[11px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                hash: {act.hash}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

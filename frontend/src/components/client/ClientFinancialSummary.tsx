"use client";

import React from "react";
import { DollarSign, CheckCircle2, Lock, Layers } from "lucide-react";

interface ClientFinancialSummaryProps {
  ceilingAmount: string;
  capturedAmount: string;
  pendingFundingAmount: string;
  reserveAmount: string;
  milestone2Status: "IN_REVIEW" | "APPROVED_AND_RELEASED";
}

export default function ClientFinancialSummary({
  ceilingAmount,
  capturedAmount,
  pendingFundingAmount,
  reserveAmount,
  milestone2Status,
}: ClientFinancialSummaryProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      
      {/* 1. Authorized Budget Ceiling */}
      <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2.5">
            <span className="font-semibold text-slate-600">Authorized Agreement Ceiling</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {ceilingAmount}
          </div>
        </div>
        <div className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 font-medium">
          Agreed across 4 total milestones
        </div>
      </div>

      {/* 2. Payment Captured / Confirmed */}
      <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2.5">
            <span className="font-semibold text-slate-600">Payment Captured & Confirmed</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {capturedAmount}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 mt-3 pt-2.5 border-t border-slate-100 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>
            {milestone2Status === "IN_REVIEW"
              ? "Milestone 1 captured via PayPal REST v2"
              : "Milestones 1 & 2 captured on provider"}
          </span>
        </div>
      </div>

      {/* 3. Pending Payment or Awaiting Funding */}
      <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2.5">
            <span className="font-semibold text-slate-600">Pre-Funded Milestone Balance</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Lock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {pendingFundingAmount}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-amber-700 mt-3 pt-2.5 border-t border-slate-100 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span>
            {milestone2Status === "IN_REVIEW"
              ? "Milestone 2 locked in PayPal Sandbox"
              : "Released upon client acceptance"}
          </span>
        </div>
      </div>

      {/* 4. Remaining Unallocated Budget */}
      <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 text-xs mb-2.5">
            <span className="font-semibold text-slate-600">Unallocated Budget Reserve</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
            {reserveAmount}
          </div>
        </div>
        <div className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 font-medium">
          Milestones 3 & 4 (fund-before-work)
        </div>
      </div>

    </section>
  );
}

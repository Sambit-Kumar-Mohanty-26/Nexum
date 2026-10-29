"use client";

import React from "react";
import { ShieldCheck, CreditCard } from "lucide-react";

interface DashboardTopHeaderProps {
  title: string;
  subtitle?: string;
  roleLabel: string;
}

export default function DashboardTopHeader({
  title,
  subtitle,
  roleLabel,
}: DashboardTopHeaderProps) {
  return (
    <header className="h-16 sm:h-[68px] border-b border-[#E3EAF3] bg-white/95 backdrop-blur-xs px-6 sm:px-8 lg:px-9 flex items-center justify-between sticky top-0 z-20 shrink-0">
      {/* Left: Breadcrumbs & Section Title */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400 font-medium">{roleLabel}</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-bold tracking-tight">{title}</span>
        {subtitle && (
          <>
            <span className="text-slate-300 hidden sm:inline">·</span>
            <span className="text-slate-500 hidden sm:inline text-xs">{subtitle}</span>
          </>
        )}
      </div>

      {/* Right: Consistent Status Badges */}
      <div className="flex items-center gap-2.5">
        {/* Consensus State Indicator */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/80 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Consensus: <strong className="font-semibold">Synchronized</strong></span>
        </div>

        {/* PayPal Sandbox Environment Indicator */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200/80 shadow-2xs">
          <CreditCard className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>PayPal: <strong className="font-semibold font-mono">Sandbox v2</strong></span>
        </div>
      </div>
    </header>
  );
}

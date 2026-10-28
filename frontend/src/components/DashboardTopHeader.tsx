"use client";

import React from "react";

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
    <header className="h-16 border-b border-slate-200 bg-white px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      
      {/* Left: Breadcrumbs & Section Title */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-400 font-medium">{roleLabel}</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-bold">{title}</span>
        {subtitle && (
          <>
            <span className="text-slate-300 hidden sm:inline">·</span>
            <span className="text-slate-500 hidden sm:inline text-[11px]">{subtitle}</span>
          </>
        )}
      </div>

      {/* Right: Status Indicators */}
      <div className="flex items-center gap-2.5">
        {/* Consensus Node Live Indicator */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Consensus Node: <b className="text-emerald-950 font-bold">Live</b></span>
        </div>

        {/* PayPal Sandbox v1.2 Indicator */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>PayPal Sandbox v1.2</span>
        </div>
      </div>

    </header>
  );
}

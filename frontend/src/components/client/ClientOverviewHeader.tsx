"use client";

import React from "react";
import { ShieldCheck, Plus, Search } from "lucide-react";

interface ClientOverviewHeaderProps {
  clientName: string;
  companyName: string;
  projectName: string;
  agreementHash: string;
  onFindFreelancer?: () => void;
  onCreateProject?: () => void;
}

export default function ClientOverviewHeader({
  clientName,
  companyName,
  projectName,
  agreementHash,
  onFindFreelancer,
  onCreateProject,
}: ClientOverviewHeaderProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        
        {/* Left: Greeting & Active Project Context */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {clientName.split(" ")[0]}
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Verified Merchant
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600">
            Active workspace for <strong className="text-slate-900 font-semibold">{companyName}</strong> · Project:{" "}
            <span className="text-blue-700 font-semibold">{projectName}</span>
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Agreement: <strong>{agreementHash}</strong></span>
            </span>
            <span className="text-slate-300 hidden sm:inline">·</span>
            <span className="text-slate-500 text-[11px]">Bilateral Dual-Approval Locked</span>
          </div>
        </div>

        {/* Right: Primary & Secondary Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onFindFreelancer}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm transition shadow-xs cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Find a Freelancer</span>
          </button>

          <button
            type="button"
            onClick={onCreateProject}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition border border-slate-300 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>New Scope</span>
          </button>
        </div>

      </div>
    </div>
  );
}

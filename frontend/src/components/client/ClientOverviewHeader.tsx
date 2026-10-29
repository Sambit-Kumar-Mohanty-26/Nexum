"use client";

import React from "react";
import { Sparkles, Users } from "lucide-react";

interface ClientOverviewHeaderProps {
  onFindFreelancers?: () => void;
  onCreateProjectWithAI?: () => void;
  projectName?: string;
  agreementHash?: string;
}

export default function ClientOverviewHeader({
  onFindFreelancers,
  onCreateProjectWithAI,
  projectName = "Bilateral E-Commerce Payment Rails",
  agreementHash = "#9f8c2b7e",
}: ClientOverviewHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-[#E3EAF3]">
      {/* Left: Spacious Title & Subtitle + Muted Context Line */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">
          Overview
        </h1>
        <p className="text-sm text-[#64748B]">
          Here&apos;s what&apos;s happening across your projects.
        </p>
        <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
          <span>Active: <strong className="text-slate-800 font-semibold">{projectName}</strong></span>
          <span>·</span>
          <span>Agreement: <code className="text-slate-700 font-mono text-[11px] bg-[#F8FAFD] px-2 py-0.5 rounded-md border border-[#E3EAF3]">{agreementHash}</code></span>
        </div>
      </div>

      {/* Right: Primary and Secondary Action Buttons */}
      <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
        <button
          type="button"
          onClick={onFindFreelancers}
          className="h-10 inline-flex items-center gap-2 px-4 rounded-xl bg-white hover:bg-[#F8FAFD] text-slate-700 font-semibold text-xs sm:text-sm border border-[#E3EAF3] shadow-precision hover:border-slate-300 transition-all duration-150 cursor-pointer active:scale-98"
        >
          <Users className="w-4 h-4 text-slate-500" />
          <span>Find freelancers</span>
        </button>

        <button
          type="button"
          onClick={onCreateProjectWithAI}
          className="h-10 inline-flex items-center gap-2 px-4.5 rounded-xl bg-[#245BFF] hover:bg-[#1748E8] text-white font-bold text-xs sm:text-sm shadow-precision hover:shadow-precision-hover transition-all duration-150 cursor-pointer active:scale-98"
        >
          <Sparkles className="w-4 h-4" />
          <span>Create project with AI</span>
        </button>
      </div>
    </div>
  );
}

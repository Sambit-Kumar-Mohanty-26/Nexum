"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight, UserCheck, Clock } from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  status: "In Progress" | "Draft" | "Completed";
  statusColor: string;
  contractor: {
    name: string;
    role: string;
  } | null;
  milestoneInfo: string;
  progressPercent: number;
  budget: string;
  updatedAt: string;
}

const PROJECTS_DATA: ProjectItem[] = [
  {
    id: "proj_bilateral",
    name: "Bilateral E-Commerce Payment Rails",
    description: "Multi-party payment settlement engine with PayPal REST API v2, state machines, and dual SHA-256 cryptographic sign-offs.",
    status: "In Progress",
    statusColor: "bg-blue-50 text-[#245BFF] border-blue-200/80",
    contractor: {
      name: "Rohan Verma",
      role: "Lead Rails Engineer",
    },
    milestoneInfo: "Milestone 2 of 4 (In Review)",
    progressPercent: 50,
    budget: "$4,500.00 USD",
    updatedAt: "2 hours ago",
  },
  {
    id: "proj_intake",
    name: "AI Customer Support & Intake Agent",
    description: "Conversational intake pipeline powered by Gemini 2.0 to draft structured requirements and match verified engineers.",
    status: "Draft",
    statusColor: "bg-amber-50 text-amber-800 border-amber-200",
    contractor: null,
    milestoneInfo: "Draft Brief · Milestone 0 of 3",
    progressPercent: 15,
    budget: "$3,200.00 USD",
    updatedAt: "Yesterday",
  },
  {
    id: "proj_arch",
    name: "Architecture & PRD Verification Suite",
    description: "Initial intake scope, architecture diagrams, and system requirements definition.",
    status: "Completed",
    statusColor: "bg-emerald-50 text-emerald-800 border-emerald-200",
    contractor: {
      name: "Rohan Verma",
      role: "Lead Rails Engineer",
    },
    milestoneInfo: "Milestone 1 of 1 (Released)",
    progressPercent: 100,
    budget: "$1,200.00 USD",
    updatedAt: "Oct 26, 2026",
  },
];

interface MyProjectsViewProps {
  onCreateWithAI?: () => void;
  onOpenWorkspace?: (id: string) => void;
}

export default function MyProjectsView({
  onCreateWithAI,
  onOpenWorkspace,
}: MyProjectsViewProps) {
  const [filter, setFilter] = useState<"ALL" | "In Progress" | "Draft" | "Completed">("ALL");

  const filteredProjects = PROJECTS_DATA.filter((p) => {
    if (filter === "ALL") return true;
    return p.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
            My Projects
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Manage your project scopes, assigned contractors, and milestone progression.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateWithAI}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#245BFF] hover:bg-[#1748E8] text-white font-semibold text-xs shadow-precision hover:shadow-precision-hover transition-all duration-150 cursor-pointer self-start sm:self-auto active:scale-98"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Create project with AI</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E3EAF3] pb-3 text-xs">
        {(["ALL", "In Progress", "Draft", "Completed"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all duration-150 cursor-pointer ${
              filter === tab
                ? "bg-[#111827] text-white shadow-precision"
                : "text-slate-600 hover:text-[#111827] hover:bg-[#F8FAFD]"
            }`}
          >
            {tab === "ALL" ? "All Projects" : tab}
          </button>
        ))}
      </div>

      {/* Responsive Project Cards Grid: 3 on large desktop, 2 on tablet, 1 on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredProjects.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl border border-[#E3EAF3] p-5 shadow-precision hover:border-[#245BFF]/30 hover:shadow-precision-hover transition-all duration-200 flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${p.statusColor}`}>
                  {p.status}
                </span>
                <span className="text-xs font-bold text-[#111827] tnum">
                  {p.budget}
                </span>
              </div>

              <div>
                <h2 className="text-sm font-bold text-[#111827] leading-snug">
                  {p.name}
                </h2>
                <p className="text-xs text-[#64748B] mt-1 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#E3EAF3] text-xs">
                {p.contractor ? (
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      Contractor: <strong className="font-semibold">{p.contractor.name}</strong>
                    </span>
                  </div>
                ) : (
                  <div className="text-slate-400 italic flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Unassigned · Matching candidates</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span className="truncate">{p.milestoneInfo}</span>
                  <span className="font-semibold text-[#111827] tnum">{p.progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#E3EAF3] overflow-hidden">
                  <div
                    className="h-full bg-[#245BFF] rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${p.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E3EAF3] flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">
                {p.updatedAt}
              </span>

              <button
                type="button"
                onClick={() => onOpenWorkspace && onOpenWorkspace(p.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#245BFF] hover:text-[#1748E8] transition cursor-pointer"
              >
                <span>Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

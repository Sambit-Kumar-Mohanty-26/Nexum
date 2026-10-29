"use client";

import React from "react";
import { ArrowRight, FolderKanban } from "lucide-react";

interface ProjectPreviewItem {
  id: string;
  name: string;
  workflowStatus: "In Progress" | "Draft" | "Completed";
  statusColor: string;
  assignedFreelancer: {
    name: string;
    role: string;
  } | null;
  currentMilestone: string;
  progressPercent: number;
  nextAction: string;
  updatedAt: string;
}

interface ProjectOverviewPreviewProps {
  onViewAllProjects?: () => void;
  onOpenProject?: (projectId: string) => void;
}

const PROJECTS: ProjectPreviewItem[] = [
  {
    id: "proj_bilateral_rails",
    name: "Bilateral E-Commerce Payment Rails",
    workflowStatus: "In Progress",
    statusColor: "bg-blue-50 text-[#245BFF] border-blue-200/80",
    assignedFreelancer: {
      name: "Rohan Verma",
      role: "Lead Rails Engineer",
    },
    currentMilestone: "Milestone 2 of 4 · Webhook Ingestion Engine",
    progressPercent: 50,
    nextAction: "Review M2 deliverable submission",
    updatedAt: "Updated 2 hours ago",
  },
  {
    id: "proj_ai_intake",
    name: "AI Customer Support & Intake Agent",
    workflowStatus: "Draft",
    statusColor: "bg-amber-50 text-amber-800 border-amber-200",
    assignedFreelancer: null,
    currentMilestone: "Scope Definition & Intake Brief",
    progressPercent: 15,
    nextAction: "Publish structured brief to talent pool",
    updatedAt: "Updated yesterday",
  },
];

export default function ProjectOverviewPreview({
  onViewAllProjects,
  onOpenProject,
}: ProjectOverviewPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold text-[#111827] tracking-tight">
            Project overview
          </h2>
          <span className="text-xs font-semibold text-[#64748B] bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            {PROJECTS.length} active
          </span>
        </div>

        {onViewAllProjects && (
          <button
            type="button"
            onClick={onViewAllProjects}
            className="text-xs sm:text-sm font-semibold text-[#245BFF] hover:text-[#1748E8] transition cursor-pointer"
          >
            View all projects &rarr;
          </button>
        )}
      </div>

      {/* Spacious 2-Column Responsive Grid on Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {PROJECTS.map((proj) => (
          <div
            key={proj.id}
            className="bg-white rounded-2xl border border-[#E3EAF3] p-5 sm:p-6 shadow-precision hover:border-[#245BFF]/35 hover:shadow-precision-hover transition-all duration-200 flex flex-col justify-between space-y-4 group"
          >
            {/* Top: Name & Status */}
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#245BFF] grid place-items-center shrink-0 border border-blue-100">
                      <FolderKanban className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-bold text-[#111827] truncate group-hover:text-[#245BFF] transition-colors">
                      {proj.name}
                    </h3>
                  </div>
                  <div className="text-xs sm:text-sm text-[#64748B] mt-2 leading-relaxed">
                    {proj.assignedFreelancer ? (
                      <span>
                        Contractor: <strong className="text-slate-900 font-semibold">{proj.assignedFreelancer.name}</strong> ({proj.assignedFreelancer.role})
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned · Matching candidates</span>
                    )}
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${proj.statusColor}`}>
                  {proj.workflowStatus}
                </span>
              </div>

              {/* Middle: Milestone & Progress Bar */}
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span className="font-semibold text-slate-800 truncate">{proj.currentMilestone}</span>
                  <span className="font-extrabold text-[#245BFF] tnum ml-2">{proj.progressPercent}% Completed</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#E3EAF3] overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-[#245BFF] to-[#60A5FA] rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${proj.progressPercent}%` }}
                  />
                </div>

                {/* Milestone stage chips */}
                <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold whitespace-nowrap">
                    ✓ M1 Auth
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 font-semibold whitespace-nowrap flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                    M2 In Review
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#F8FAFD] text-slate-500 border border-[#E3EAF3] whitespace-nowrap">
                    M3 Ledger
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#F8FAFD] text-slate-500 border border-[#E3EAF3] whitespace-nowrap">
                    M4 Failover
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom: Next Action & Timestamp + Open Workspace Action */}
            <div className="pt-3.5 border-t border-[#E3EAF3] flex items-center justify-between text-xs">
              <div className="min-w-0 pr-3">
                <div className="text-xs text-slate-700 font-medium truncate">
                  Next: {proj.nextAction}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {proj.updatedAt}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenProject && onOpenProject(proj.id)}
                className="h-9 px-3.5 rounded-xl border border-[#E3EAF3] hover:bg-[#F8FAFD] hover:border-[#245BFF]/30 text-xs font-semibold text-slate-700 hover:text-[#245BFF] inline-flex items-center gap-1.5 transition-all duration-150 cursor-pointer shrink-0 active:scale-98"
              >
                <span>Open workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import {
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  Cpu,
} from "lucide-react";
import { FreelancerProjectItem } from "@/lib/freelancer-projects-types";
import ProjectUploadedDocumentCard from "@/components/ProjectUploadedDocumentCard";

interface ProjectOverviewTabProps {
  project: FreelancerProjectItem;
  onNavigateToTab: (tab: "milestones" | "tasks" | "files" | "messages" | "payments") => void;
  onOpenWorkspace: () => void;
}

export default function ProjectOverviewTab({
  project,
  onNavigateToTab,
  onOpenWorkspace,
}: ProjectOverviewTabProps) {
  const uploadedDoc = (project as any).uploadedDocument || undefined;

  return (
    <div className="space-y-6">
      {/* Original Client Specification Document (PDF - Only if uploaded by client) */}
      {uploadedDoc && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-slate-500">
            Client Intake Document
          </h3>
          <ProjectUploadedDocumentCard
            document={uploadedDoc}
            projectTitle={project.title}
            category={project.techTags?.join(", ") || "Engineering"}
            budget={project.totalBudgetDisplay}
            timeline={project.dueDate}
            overview={project.description}
            objectives={project.milestones.map((m) => m.title)}
            technicalArchitecture={project.techTags.join(", ")}
            functionalRequirements={project.milestones.map((m) => `${m.title}: ${m.deliverablesSummary || "Milestone deliverables"}`)}
            acceptanceCriteria={project.milestones.flatMap((m) => m.acceptanceCriteria || [])}
            clientName={project.client.name}
          />
        </div>
      )}

      {/* 1. Project Brief & Scope Summary */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#4f46e5]" />
            <span>Scope Summary & Consensus Objectives</span>
          </h3>
          <span className="text-[11px] font-semibold text-slate-400">
            Agreement {project.agreementVersion}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {project.description} The bilateral agreement mandates pre-funded escrow before work commencement,
          milestone acceptance based on documented criteria, and AI-mediated change request resolution.
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          {project.techTags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* 2. Key Metrics & Escrow Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Contract
          </p>
          <p className="text-xl font-black text-slate-900">
            {project.totalBudgetDisplay}
          </p>
          <p className="text-[10px] text-slate-500">100% Fixed Escrow Contract</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Milestones Breakdown
          </p>
          <p className="text-xl font-black text-slate-900">
            {project.milestones.filter((m) => m.workStatus === "ACCEPTED").length} / {project.milestones.length}
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold">Accepted by client</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Completion Rate
          </p>
          <p className="text-xl font-black text-[#4f46e5]">
            {project.progressPercent}%
          </p>
          <p className="text-[10px] text-slate-500">Target: {project.dueDate}</p>
        </div>
      </div>

      {/* 3. Milestones Quick Jump */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#4f46e5]" />
            <span>Active Deliverable Roadmap</span>
          </h3>
          <button
            type="button"
            onClick={() => onNavigateToTab("milestones")}
            className="text-xs font-bold text-[#4f46e5] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Open Milestones</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {project.milestones.map((ms) => (
            <div
              key={ms.id}
              className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {ms.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Due {ms.dueDate}
                  </span>
                  <span>· Amount: {ms.amountDisplay}</span>
                </div>
              </div>

              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                  ms.workStatus === "ACCEPTED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : ms.workStatus === "AWAITING_CLIENT_REVIEW"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {ms.workStatus === "ACCEPTED"
                  ? "Completed"
                  : ms.workStatus === "AWAITING_CLIENT_REVIEW"
                  ? "In Review"
                  : "Pending"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Mediation & AI Collaboration CTA */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/70 to-purple-50/50 border border-indigo-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4f46e5] text-white flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Nexum AI-Mediated Workspace
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Client messages and scope change counteroffers are mediated with bilateral consensus.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenWorkspace}
          className="py-2 px-3.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-xs font-bold text-white transition shadow-xs whitespace-nowrap cursor-pointer shrink-0"
        >
          Open Chat
        </button>
      </div>
    </div>
  );
}

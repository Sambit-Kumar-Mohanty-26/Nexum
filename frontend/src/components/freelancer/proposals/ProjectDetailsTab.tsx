"use client";

import React from "react";
import {
  Briefcase,
  CheckCircle2,
  ShieldCheck,
  Code,
  Layers,
  Check,
} from "lucide-react";
import { FreelancerProposalItem } from "@/lib/freelancer-proposals-types";
import ProjectUploadedDocumentCard from "@/components/ProjectUploadedDocumentCard";

interface ProjectDetailsTabProps {
  proposal: FreelancerProposalItem;
}

export default function ProjectDetailsTab({ proposal }: ProjectDetailsTabProps) {
  const { clientBrief } = proposal;
  const uploadedDoc = (clientBrief as any)?.uploadedDocument;

  // Extract or derive objectives
  const objectives: string[] =
    (clientBrief as any)?.objectives && (clientBrief as any).objectives.length > 0
      ? (clientBrief as any).objectives
      : (clientBrief as any)?.goals
      ? String((clientBrief as any).goals).split(/[,\n•]+/).map((s: string) => s.trim()).filter(Boolean)
      : [];

  // Extract or derive technical architecture
  const technicalArchitecture: string =
    (clientBrief as any)?.technicalArchitecture ||
    (clientBrief.requiredSkills && clientBrief.requiredSkills.length > 0
      ? clientBrief.requiredSkills.join(", ")
      : "");

  // Extract functional requirements
  const functionalRequirements: string[] =
    clientBrief.technicalRequirements && clientBrief.technicalRequirements.length > 0
      ? clientBrief.technicalRequirements
      : (clientBrief as any)?.scopeOfWork && Array.isArray((clientBrief as any).scopeOfWork)
      ? (clientBrief as any).scopeOfWork
      : (clientBrief as any)?.detailedRequirements
      ? String((clientBrief as any).detailedRequirements).split("\n").map((s: string) => s.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean)
      : [];

  // Extract acceptance criteria
  const acceptanceCriteria: string[] =
    clientBrief.acceptanceCriteria && clientBrief.acceptanceCriteria.length > 0
      ? clientBrief.acceptanceCriteria
      : (clientBrief as any)?.milestones && Array.isArray((clientBrief as any).milestones)
      ? (clientBrief as any).milestones.map((m: any) => m.title || m.name || String(m))
      : [];

  return (
    <div className="space-y-6">
      {/* 1. Original Client Specification Document (Only shown if uploaded by client) */}
      {uploadedDoc && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-slate-500">
            Client Intake Document
          </h3>
          <ProjectUploadedDocumentCard
            document={uploadedDoc}
            projectTitle={proposal.projectTitle || `${clientBrief.category || "Project"} Specification`}
            category={clientBrief.category}
            budget={clientBrief.budgetRange}
            timeline={clientBrief.duration}
            overview={clientBrief.description}
            objectives={objectives}
            technicalArchitecture={technicalArchitecture}
            functionalRequirements={functionalRequirements}
            acceptanceCriteria={acceptanceCriteria}
            clientName={proposal.client?.name || "Client"}
          />
        </div>
      )}

      {/* 2. Project Overview & Client Requirements */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#4f46e5]" />
            <span>Original Client Brief</span>
          </h3>
          <span className="text-[11px] font-semibold text-slate-400">
            {clientBrief.category}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
          {clientBrief.description}
        </p>

        {/* Client Budget & Deadline Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Client Budget Range
            </p>
            <p className="text-xs font-black text-slate-900 mt-0.5">
              {clientBrief.budgetRange || "Negotiated"}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Expected Duration
            </p>
            <p className="text-xs font-bold text-slate-900 mt-0.5">
              {clientBrief.duration || "Flexible"}
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Project Deadline
            </p>
            <p className="text-xs font-bold text-slate-900 mt-0.5">
              {clientBrief.deadline || "Flexible"}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Core Objectives */}
      {objectives.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Core Objectives</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {objectives.map((obj: string, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-xs text-slate-700"
              >
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{obj}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Technical Architecture & Stack */}
      {technicalArchitecture && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Code className="w-4 h-4 text-[#4f46e5]" />
            <span>Technical Architecture & Stack</span>
          </h3>
          <div className="p-4 rounded-xl bg-[#eef2ff]/40 border border-[#e0e7ff] text-xs sm:text-sm text-slate-800 font-mono leading-relaxed">
            {technicalArchitecture}
          </div>
        </div>
      )}

      {/* 5. Functional Requirements */}
      {functionalRequirements.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#4f46e5]" />
            <span>Functional Requirements</span>
          </h3>
          <div className="space-y-2">
            {functionalRequirements.map((req: string, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-xs text-slate-700"
              >
                <span className="font-mono font-bold text-[#4f46e5] shrink-0">FR-{idx + 1}:</span>
                <span>{req}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Acceptance Criteria */}
      {acceptanceCriteria.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Client Acceptance Criteria</span>
          </h3>
          <div className="space-y-2">
            {acceptanceCriteria.map((crit: string, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-2.5 text-xs text-emerald-900"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{crit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Required Skills */}
      {clientBrief.requiredSkills && clientBrief.requiredSkills.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Code className="w-4 h-4 text-slate-600" />
            <span>Required Skills</span>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {clientBrief.requiredSkills.map((skill: string) => (
              <span
                key={skill}
                className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

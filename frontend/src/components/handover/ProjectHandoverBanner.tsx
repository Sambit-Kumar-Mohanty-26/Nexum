"use client";

import React from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileCheck2,
  Sparkles,
  Layers,
} from "lucide-react";
import { ProjectHandoverData } from "@/lib/api-client";
import { NexumIcon } from "@/components/Logo";

interface ProjectHandoverBannerProps {
  role: "CLIENT" | "FREELANCER";
  projectName?: string;
  handoverData?: ProjectHandoverData | null;
  onInitiateClick: () => void;
  onViewChecklistClick: () => void;
}

export default function ProjectHandoverBanner({
  role,
  projectName = "Active Contract",
  handoverData,
  onInitiateClick,
  onViewChecklistClick,
}: ProjectHandoverBannerProps) {
  const isInitiated = !!handoverData;
  const isCompleted = handoverData?.status === "COMPLETED";
  const stats = handoverData?.stats;

  const percent = stats?.percentComplete || 0;
  const acceptedCount = stats?.acceptedItems || 0;
  const totalCount = stats?.totalItems || 0;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left Section: Icon & Content */}
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
              isCompleted
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : isInitiated
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-purple-50 border-purple-200 text-purple-700"
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : isInitiated ? (
              <FileCheck2 className="w-6 h-6" />
            ) : (
              <NexumIcon className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading text-sm font-bold text-slate-900">
                {isCompleted
                  ? "Project Handover Finalized & Verified"
                  : isInitiated
                  ? "Project Handover & Documentation In Progress"
                  : "All Milestones Completed — Handover Ready"}
              </span>

              {isCompleted ? (
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10.5px] font-mono font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  COMPLETED
                </span>
              ) : isInitiated ? (
                <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10.5px] font-mono font-bold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  IN REVIEW ({acceptedCount}/{totalCount})
                </span>
              ) : (
                <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-[10.5px] font-mono font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  100% MILESTONES ACCEPTED
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              {isCompleted
                ? `All required repositories, runbooks, and administrative credentials for ${projectName} have been verified and cryptographically archived.`
                : isInitiated
                ? role === "CLIENT"
                  ? `Review and verify the documentation items submitted by your developer before final contract sign-off.`
                  : `Upload the required source code, deployment runbooks, and credentials to complete the project handover.`
                : role === "CLIENT"
                ? `All milestone deliverables are approved. Initiate the final handover checklist to collect repositories, credentials, test logs, and IP release.`
                : `All milestones are approved! Awaiting client to initiate final handover checklist requirements.`}
            </p>

            {/* Progress Bar (when initiated and not completed) */}
            {isInitiated && !isCompleted && totalCount > 0 && (
              <div className="pt-2 max-w-md">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mb-1">
                  <span>Documentation Verification Progress</span>
                  <span className="font-bold text-slate-800">{percent}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center">
          {isCompleted ? (
            <button
              onClick={onViewChecklistClick}
              className="py-2 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>View Handover Archive</span>
            </button>
          ) : isInitiated ? (
            <button
              onClick={onViewChecklistClick}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {role === "CLIENT" ? "Review Handover Checklist" : "Submit Handover Documents"}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : role === "CLIENT" ? (
            <button
              onClick={onInitiateClick}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <NexumIcon className="w-3.5 h-3.5" />
              <span>Initiate Handover Checklist</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="text-xs font-mono text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              Waiting for Client to Request Handover
            </div>
          )}
        </div>

      </div>
    </div>
  );
}


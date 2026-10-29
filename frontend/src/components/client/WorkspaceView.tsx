"use client";

import React from "react";
import Image from "next/image";
import {
  ShieldCheck,
  FileCode,
  Video,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface WorkspaceViewProps {
  milestone2Status: "IN_REVIEW" | "APPROVED_AND_RELEASED";
  onReviewMilestone: () => void;
  onOpenAIIntake?: () => void;
}

export default function WorkspaceView({
  milestone2Status,
  onReviewMilestone,
}: WorkspaceViewProps) {
  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-white rounded-xl border border-[#E3EAF3] p-5 sm:p-6 shadow-precision space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#245BFF] border border-blue-200/80">
                Active Project
              </span>
              <span className="text-xs font-mono text-slate-500">#9f8c2b7e</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
              Bilateral E-Commerce Payment Rails
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Client: <strong className="text-slate-800">Horizon Commerce LLC</strong> · Contractor: <strong className="text-slate-800">Rohan Verma</strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onReviewMilestone}
              className="px-4 py-2 rounded-xl bg-[#245BFF] hover:bg-[#1748E8] text-white font-semibold text-xs transition-all duration-150 cursor-pointer shadow-precision hover:shadow-precision-hover active:scale-98"
            >
              Review Current Stage
            </button>
          </div>
        </div>

        {/* Agreement Status Banner */}
        <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E3EAF3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Dual SHA-256 Canonical Agreement locked at commit <code className="font-mono text-[#245BFF]">0x9f8c2b7e19a4</code></span>
          </div>

          <div className="text-[11px] text-slate-500">
            Enforces Fund-Before-Work protocol
          </div>
        </div>
      </div>

      {/* Clear 65/35 Primary vs Secondary Column Ratio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (Primary Focus - 65% / 8 cols): Current Stage & Deliverables */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#E3EAF3] p-5 sm:p-6 shadow-precision space-y-5">
          <div className="flex items-center justify-between border-b border-[#E3EAF3] pb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                Current Stage Focus
              </div>
              <h2 className="text-base font-bold text-[#111827] mt-0.5">
                Milestone 2: PayPal REST v2 Webhook Ingestion Engine
              </h2>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${
                milestone2Status === "IN_REVIEW"
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
              }`}
            >
              {milestone2Status === "IN_REVIEW" ? "Awaiting Review" : "Approved & Released"}
            </span>
          </div>

          {/* Deliverables Grid */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-700">Submitted Artifacts</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="https://github.com/proofloop/core/pull/42"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl border border-[#E3EAF3] hover:border-[#245BFF]/50 hover:bg-[#F8FAFD] transition-all flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileCode className="w-4 h-4 text-[#245BFF] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#111827] group-hover:text-[#245BFF] transition-colors truncate">
                      Pull Request #42
                    </div>
                    <div className="text-[10px] text-[#64748B] truncate">github.com/proofloop/core</div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#245BFF] transition-colors shrink-0 ml-2" />
              </a>

              <a
                href="https://loom.com/share/demo-m2-webhook-rails"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl border border-[#E3EAF3] hover:border-[#245BFF]/50 hover:bg-[#F8FAFD] transition-all flex items-center justify-between group shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Video className="w-4 h-4 text-[#245BFF] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#111827] group-hover:text-[#245BFF] transition-colors truncate">
                      Loom Walkthrough
                    </div>
                    <div className="text-[10px] text-[#64748B] truncate">6m 40s · End-to-end replay</div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#245BFF] transition-colors shrink-0 ml-2" />
              </a>
            </div>
          </div>

          {/* Acceptance Verification Status */}
          <div className="p-4 rounded-xl bg-[#F8FAFD] border border-[#E3EAF3] space-y-2 text-xs">
            <div className="font-semibold text-slate-800">Verification Criteria (Automated Suite):</div>
            <div className="space-y-1.5 text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>PayPal Orders v2 signature validation algorithm verified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zero-duplicate idempotency test suite passing under 30s concurrent replay</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t border-[#E3EAF3]">
            <span className="text-[#64748B]">
              Pre-funded balance: <strong className="text-[#111827] tnum font-bold">$1,500.00 USD</strong>
            </span>
            <button
              type="button"
              onClick={onReviewMilestone}
              className="inline-flex items-center gap-1.5 font-semibold text-[#245BFF] hover:text-[#1748E8] transition cursor-pointer self-start sm:self-auto"
            >
              <span>Open Deliverable Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column (Secondary Context - 35% / 4 cols): Contractor Summary & Evidence */}
        <div className="lg:col-span-4 space-y-5">
          {/* Contractor Summary Card */}
          <div className="bg-white rounded-xl border border-[#E3EAF3] p-5 shadow-precision space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Assigned Contractor
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#E3EAF3] shrink-0 shadow-2xs">
                <Image
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80"
                  alt="Rohan Verma"
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#111827] truncate">Rohan Verma</h3>
                <p className="text-xs text-[#64748B] truncate">Senior Full-Stack & Payment Rails Engineer</p>
                <div className="text-xs font-bold text-[#111827] tnum mt-0.5">$65.00/hr · Bengaluru</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Verified Sandbox Integration</span>
              </div>
              <p className="text-emerald-800 leading-normal">
                14 milestones cleared on ProofLoop. PayPal REST API v2 verified.
              </p>
            </div>
          </div>

          {/* Technical Evidence Quick Reference */}
          <div className="bg-white rounded-xl border border-[#E3EAF3] p-5 shadow-precision space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Consensus Evidence
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#F8FAFD] border border-[#E3EAF3]">
                <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Active Order</div>
                <div className="text-slate-800 font-bold truncate">#6DE714998H998261C</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#F8FAFD] border border-[#E3EAF3]">
                <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold">Agreement Hash</div>
                <div className="text-slate-800 font-bold truncate">0x9f8c2b7e...</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

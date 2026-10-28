"use client";

import { Check, CheckCircle2, ExternalLink, FileCode, FileText } from "lucide-react";

interface ActionRequiredCardProps {
  milestoneStatus: "IN_REVIEW" | "APPROVED_AND_RELEASED";
  isCapturing: boolean;
  onApproveAndRelease: () => void;
  onRequestRevision: () => void;
}

export default function ActionRequiredCard({
  milestoneStatus,
  isCapturing,
  onApproveAndRelease,
  onRequestRevision,
}: ActionRequiredCardProps) {
  return (
    <div className="space-y-3">
      {/* Header Line */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            Action required: Deliverable awaiting review
          </h2>
        </div>
        <span className="text-[11px] font-mono font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
          Fund-Before-Work Rule Active
        </span>
      </div>

      {milestoneStatus === "IN_REVIEW" ? (
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20 p-5 sm:p-6 shadow-xs space-y-5">
          
          {/* Top row: Stage Title & Decision CTA */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
            <div>
              <div className="text-[11px] font-mono font-bold text-amber-700 uppercase tracking-wider mb-1">
                Delivered by Rohan Verma · Nov 28, 2026
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Milestone 2: PayPal REST v2 Webhook Ingestion Engine
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Pre-funded balance: <strong className="text-slate-900 font-mono font-bold">$1,500.00 USD</strong> (PayPal Sandbox Order <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded text-[11px]">#6DE714998H998261C</code>)
              </p>
            </div>

            {/* Decision Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                disabled={isCapturing}
                onClick={onApproveAndRelease}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isCapturing ? "Capturing via PayPal..." : "Approve & Release Funds ($1,500)"}</span>
              </button>

              <button
                type="button"
                disabled={isCapturing}
                onClick={onRequestRevision}
                className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition border border-slate-300 shadow-2xs cursor-pointer"
              >
                Request Revision
              </button>
            </div>
          </div>

          {/* Artifacts & Test Criteria Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left: Artifact Links */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                Submitted Verification Artifacts
              </div>
              <div className="space-y-2">
                <a
                  href="https://github.com/proofloop/gateway/pull/42"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 transition group shadow-2xs"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <FileCode className="w-3.5 h-3.5 text-blue-600" />
                    <span>GitHub Pull Request #42</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
                </a>

                <a
                  href="https://www.loom.com/share/proofloop-milestone2-demo"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 hover:border-purple-500 transition group shadow-2xs"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                    <span>Loom Architecture Walkthrough (4m 20s)</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition" />
                </a>
              </div>
            </div>

            {/* Right: Objective Criteria Checks */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider font-mono">
                Objective Acceptance Criteria
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">SHA-256 webhook header matches PayPal Sandbox cert</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">30s duplicate idempotency cache deduplication test passed</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">Orders v2 GET reconciliation resumes state machine gracefully</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
              <Check className="w-5 h-5 stroke-[3]" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-emerald-800 uppercase">
                Milestone 2 Accepted & Released
              </div>
              <p className="text-xs text-slate-700 mt-0.5">
                $1,500.00 USD captured via PayPal Sandbox REST v2. Consensus ledger updated to <code className="font-mono text-emerald-800 font-bold">RELEASE_RECORDED_SIMULATED</code>.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-800 bg-white border border-emerald-300 px-3 py-1 rounded-full font-bold">
            All Deliverables Cleared ✓
          </span>
        </div>
      )}
    </div>
  );
}

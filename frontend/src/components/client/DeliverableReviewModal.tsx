"use client";

import React, { useState } from "react";
import {
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  FileCode,
  Video,
} from "lucide-react";

interface DeliverableReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestoneStatus: "IN_REVIEW" | "APPROVED_AND_RELEASED";
  isCapturing: boolean;
  onApproveAndRelease: () => void;
  onRequestRevision: (notes: string) => void;
}

export default function DeliverableReviewModal({
  isOpen,
  onClose,
  milestoneStatus,
  isCapturing,
  onApproveAndRelease,
  onRequestRevision,
}: DeliverableReviewModalProps) {
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");

  if (!isOpen) return null;

  const handleRevisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionNotes.trim()) return;
    onRequestRevision(revisionNotes);
    setShowRevisionForm(false);
    setRevisionNotes("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-[#E3EAF3] bg-white p-6 text-[#111827] shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E3EAF3] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Awaiting Client Review
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Order #6DE714998H998261C
              </span>
            </div>
            <h2 className="text-lg font-bold text-[#111827] mt-1 tracking-tight">
              Milestone 2: PayPal REST v2 Webhook Ingestion Engine
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Contractor: <strong className="text-slate-800">Rohan Verma</strong> · Pre-funded Amount: <strong className="text-[#111827] tnum font-bold">$1,500.00 USD</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-[#F8FAFD] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deliverable Artifacts */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
            Submitted Deliverables
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="https://github.com/proofloop/core/pull/42"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl border border-[#E3EAF3] hover:border-[#245BFF]/50 hover:bg-[#F8FAFD] transition-all flex items-start gap-3 group shadow-2xs"
            >
              <FileCode className="w-5 h-5 text-[#245BFF] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827] group-hover:text-[#245BFF] transition-colors">
                  <span>GitHub Pull Request #42</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#245BFF]" />
                </div>
                <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-1">
                  Commit 300b4f3 · Webhook idempotency test suite
                </p>
              </div>
            </a>

            <a
              href="https://loom.com/share/demo-m2-webhook-rails"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl border border-[#E3EAF3] hover:border-[#245BFF]/50 hover:bg-[#F8FAFD] transition-all flex items-start gap-3 group shadow-2xs"
            >
              <Video className="w-5 h-5 text-[#245BFF] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827] group-hover:text-[#245BFF] transition-colors">
                  <span>Loom Verification Walkthrough</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#245BFF]" />
                </div>
                <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-1">
                  6m 40s · End-to-end sandbox webhook replay
                </p>
              </div>
            </a>
          </div>
        </div>

        {/* Acceptance Criteria Checklist */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
            Acceptance Criteria Verification
          </h3>

          <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-[#E3EAF3] space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>PayPal REST v2 Orders webhook signature validation verified.</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Zero-duplicate idempotency test suite passes under 30s concurrent replay.</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>SHA-256 agreement audit hashes synchronized across consensus logs.</span>
            </div>
          </div>
        </div>

        {/* Funding Notice */}
        <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#245BFF] shrink-0 mt-0.5" />
          <div className="leading-relaxed text-[11px]">
            Funds of <strong className="tnum">$1,500.00 USD</strong> are held in PayPal Sandbox Order #6DE714998H998261C.
            Clicking <strong>Approve & Release Funds</strong> will execute the dual-signature cryptographic release and trigger the PayPal capture endpoint.
          </div>
        </div>

        {/* Revision Form (if toggled) */}
        {showRevisionForm ? (
          <form onSubmit={handleRevisionSubmit} className="space-y-3 pt-2 border-t border-[#E3EAF3]">
            <label className="block text-xs font-bold text-slate-700">
              Revision Feedback for Rohan Verma
            </label>
            <textarea
              rows={3}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="State the objective criteria requirement that needs refinement..."
              required
              className="w-full p-3 rounded-xl border border-[#E3EAF3] bg-[#F8FAFD] text-xs text-[#111827] focus:outline-none focus:border-[#245BFF] focus:bg-white"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRevisionForm(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow-xs active:scale-98"
              >
                Submit Revision Request
              </button>
            </div>
          </form>
        ) : (
          /* Main Modal Actions */
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#E3EAF3]">
            <button
              type="button"
              onClick={() => setShowRevisionForm(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-[#E3EAF3] hover:bg-[#F8FAFD] text-xs font-semibold text-slate-700 transition cursor-pointer active:scale-98"
            >
              Request Revision
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFD] cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                disabled={isCapturing || milestoneStatus === "APPROVED_AND_RELEASED"}
                onClick={onApproveAndRelease}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-precision hover:shadow-precision-hover cursor-pointer flex items-center gap-1.5 active:scale-98"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{isCapturing ? "Capturing via PayPal..." : "Approve & Release Funds ($1,500)"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

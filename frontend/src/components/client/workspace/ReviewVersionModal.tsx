"use client";

import React, { useState } from "react";
import { X, Check, FileText, ShieldCheck, AlertCircle } from "lucide-react";

interface ReviewVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  versionName?: string;
  onApproveVersion?: (ver: string) => void;
  onOpenCounteroffer?: () => void;
}

export default function ReviewVersionModal({
  isOpen,
  onClose,
  versionName = "Version 4",
  onApproveVersion,
  onOpenCounteroffer,
}: ReviewVersionModalProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [approvedSuccess, setApprovedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleApprove = () => {
    setIsApproving(true);
    setTimeout(() => {
      setIsApproving(false);
      setApprovedSuccess(true);
      if (onApproveVersion) onApproveVersion(versionName);
      setTimeout(() => {
        setApprovedSuccess(false);
        onClose();
      }, 1500);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto">
        
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-slate-50/70 to-white">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-[#4f46e5] bg-[#eef2ff] border border-indigo-100">
              <FileText className="w-3.5 h-3.5" />
              <span>Change Request CR-2 · Agreement {versionName}</span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Compare Agreement v3 vs {versionName}
            </h3>
            <p className="text-xs text-slate-500">
              TechKart – E-commerce Website · Freelancer: Sambit Kumar
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 text-xs text-slate-700">
          
          {/* Comparison Cards */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Version 3 (Current Active) */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Version 3 (Active)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Signed
                </span>
              </div>
              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Base Price:</span>
                  <span className="font-semibold text-slate-900">₹80,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Scope:</span>
                  <span className="text-slate-800 font-medium">Core Shop & Checkout</span>
                </div>
                <div className="flex justify-between">
                  <span>Timeline:</span>
                  <span className="text-slate-800 font-medium">Nov 15, 2026</span>
                </div>
              </div>
            </div>

            {/* Version 4 (Proposed Quote) */}
            <div className="p-4 rounded-2xl border border-indigo-200 bg-[#fbfbfe] space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#4f46e5] text-xs uppercase tracking-wider">
                  {versionName} (Proposed)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  Waiting Client OK
                </span>
              </div>
              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>New Price:</span>
                  <span className="font-bold text-slate-900">₹86,000 (+₹6,000)</span>
                </div>
                <div className="flex justify-between">
                  <span>Scope delta:</span>
                  <span className="text-[#4f46e5] font-semibold">+ Best-selling section & filters</span>
                </div>
                <div className="flex justify-between">
                  <span>Timeline delta:</span>
                  <span className="text-slate-800 font-medium">+4 calendar days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance & Safety Guarantee Notice */}
          <div className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/50 flex items-start gap-2.5 text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Nexum Safety Rule:</strong> Approving {versionName} seals a mutual SHA-256 agreement hash. No escrow funds move until milestone deliverables are explicitly reviewed and released.
            </div>
          </div>

          {/* Approved state feedback */}
          {approvedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Version 4 approved! Agreement state updated to active.</span>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenCounteroffer) onOpenCounteroffer();
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Draft counteroffer instead
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving || approvedSuccess}
              className="px-5 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {isApproving ? (
                <span>Sealing consensus...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve {versionName}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}


"use client";

import React from "react";
import { X, MessageSquare, ShieldCheck, CheckCheck } from "lucide-react";

interface ReadOriginalMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderName?: string;
  timestamp?: string;
  rawMessage?: string;
}

export default function ReadOriginalMessageModal({
  isOpen,
  onClose,
  senderName = "Sambit Kumar",
  timestamp = "10:24 AM",
  rawMessage = "Hey Alex, I checked the request for the best-selling products carousel with dynamic category pills. It requires an additional database query index and 2 custom components. I can do it for an additional ₹6,000 and 4 days on the timeline. Let me know if that works for you.",
}: ReadOriginalMessageModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto">
        
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-slate-50/70 to-white">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Unmodified Original Record</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Original Message from {senderName}
            </h3>
            <p className="text-xs text-slate-400">
              Preserved transparently behind Nexum AI summary
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
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Metadata pill bar */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-100">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span>Delivered to project chat</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCheck className="w-3.5 h-3.5" />
              <span>{timestamp}</span>
            </span>
          </div>

          {/* Raw Text Box */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap font-sans">
            {rawMessage}
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * Core Nexum Rule: Both sides can always inspect the original wording behind any mediated summary or change request.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}


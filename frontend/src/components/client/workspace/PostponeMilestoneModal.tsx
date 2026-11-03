"use client";

import React, { useState } from "react";
import { X, Calendar, AlertCircle, Send, ShieldCheck } from "lucide-react";
import { postponeWorkspaceMilestone } from "@/lib/api-client";

interface PostponeMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestone: {
    id: string;
    number?: number;
    title: string;
    dueDate?: string;
    amount?: string;
  } | null;
  projectId: string;
  userId: string;
  userRole?: "CLIENT" | "FREELANCER";
  onSuccess?: () => void;
  showToast?: (msg: string) => void;
}

const MILESTONE_REASONS = [
  { value: "SUDDEN_EMERGENCY", label: "🚨 Sudden Personal / Health Emergency", desc: "Unforeseen urgent life or health interruption" },
  { value: "TECHNICAL_BLOCKER", label: "🛠️ Technical Complexity / 3rd-Party API", desc: "Sandbox gateway delay or complex architecture refactor" },
  { value: "CLIENT_DEPENDENCY", label: "⏳ Awaiting Client Assets / Reviews", desc: "Pending branding assets, feedback, or credentials" },
  { value: "SCOPE_EXPANSION", label: "📐 Scope Clarification & Polish", desc: "Added quality buffer to fulfill acceptance criteria" },
];

export default function PostponeMilestoneModal({
  isOpen,
  onClose,
  milestone,
  projectId,
  userId,
  userRole = "FREELANCER",
  onSuccess,
  showToast,
}: PostponeMilestoneModalProps) {
  const [category, setCategory] = useState("TECHNICAL_BLOCKER");
  const [reasonDetails, setReasonDetails] = useState("");
  const [proposedDueDate, setProposedDueDate] = useState(() => {
    const d = new Date(Date.now() + 7 * 86400 * 1000);
    return d.toISOString().split("T")[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !milestone) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonDetails.trim()) {
      showToast?.("Please provide a thorough justification for the deadline postponement.");
      return;
    }

    setIsSubmitting(true);
    try {
      const dueIso = new Date(`${proposedDueDate}T18:00:00Z`).toISOString();
      const res = await postponeWorkspaceMilestone(projectId, milestone.id, {
        requestedById: userId,
        requestedByRole: userRole,
        proposedDueDate: dueIso,
        reasonCategory: category,
        reasonDetails,
      });

      if (res.success) {
        showToast?.("Milestone postponement request submitted! Interactive card dropped into chat.");
        onSuccess?.();
        onClose();
      } else {
        showToast?.(res.error || "Failed to submit milestone postponement");
      }
    } catch {
      showToast?.("Failed to submit milestone postponement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-amber-50/60 to-white">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/70 border border-amber-200">
              <Calendar className="w-3.5 h-3.5" />
              <span>Milestone Extension Request</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Postpone Due Date: {milestone.title}
            </h3>
            <p className="text-xs text-slate-500">
              Current Due Date: <span className="font-semibold text-slate-700">{milestone.dueDate || "Scheduled"}</span>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Reason Category Selection */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800">
              Select Reason Category <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MILESTONE_REASONS.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                    category === cat.value
                      ? "border-amber-500 bg-amber-50/70 text-amber-950 font-bold"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  <span className="text-[11px] font-bold">{cat.label}</span>
                  <span className="text-[10px] text-slate-500 font-normal">{cat.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* New Proposed Due Date */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Proposed New Due Date <span className="text-rose-500">*</span></span>
            </label>
            <input
              type="date"
              value={proposedDueDate}
              onChange={(e) => setProposedDueDate(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Detailed Reason */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800">
              Detailed Reason & Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              placeholder="Explain the specific blocker or reason requiring extra time, and steps being taken to complete delivery."
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>

          {/* Footer Notice & Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Sealed with SHA-256 consensus
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? "Submitting..." : "Submit Extension Request"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


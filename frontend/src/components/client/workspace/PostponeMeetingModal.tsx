"use client";

import React, { useState } from "react";
import { X, Clock, Calendar, AlertTriangle, Send } from "lucide-react";
import { postponeWorkspaceMeeting } from "@/lib/api-client";

interface PostponeMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: {
    id: string;
    title: string;
    currentSlot?: string;
  } | null;
  projectId: string;
  userId: string;
  userRole?: "CLIENT" | "FREELANCER" | "OPERATOR";
  onSuccess?: () => void;
  showToast?: (msg: string) => void;
}

const REASON_CATEGORIES = [
  { value: "SUDDEN_EMERGENCY", label: "🚨 Sudden Emergency (Health / Urgent)", desc: "Unplanned personal or medical emergency" },
  { value: "CLIENT_CONFLICT", label: "📅 Scheduling Conflict / Overlap", desc: "Conflict with critical client/team commitment" },
  { value: "PREPARATION_DELAY", label: "⏳ Deliverable / Prep Delay", desc: "Need more time to finalize review materials" },
  { value: "SCHEDULE_ADJUSTMENT", label: "🔄 General Reschedule", desc: "Mutually convenient time adjustment" },
];

export default function PostponeMeetingModal({
  isOpen,
  onClose,
  meeting,
  projectId,
  userId,
  userRole = "CLIENT",
  onSuccess,
  showToast,
}: PostponeMeetingModalProps) {
  const [category, setCategory] = useState("SUDDEN_EMERGENCY");
  const [reasonDetails, setReasonDetails] = useState("");
  const [newDate, setNewDate] = useState(() => {
    const d = new Date(Date.now() + 2 * 86400 * 1000);
    return d.toISOString().split("T")[0];
  });
  const [newTime, setNewTime] = useState("16:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !meeting) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonDetails.trim()) {
      showToast?.("Please provide a detailed reason for the postponement.");
      return;
    }

    setIsSubmitting(true);
    try {
      const slotIso = new Date(`${newDate}T${newTime}:00Z`).toISOString();
      const res = await postponeWorkspaceMeeting(projectId, meeting.id, {
        userId,
        userRole,
        reasonCategory: category,
        reasonDetails,
        newSlots: [slotIso],
      });

      if (res.success) {
        showToast?.("Meeting postponement proposed with reasons. Counterparty notified in timeline.");
        onSuccess?.();
        onClose();
      } else {
        showToast?.(res.error || "Failed to postpone meeting");
      }
    } catch {
      showToast?.("Failed to postpone meeting");
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
              <Clock className="w-3.5 h-3.5" />
              <span>Bilateral Reschedule</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Postpone: {meeting.title}
            </h3>
            <p className="text-xs text-slate-500">
              Provide a valid reason and propose a replacement time slot.
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
              {REASON_CATEGORIES.map((cat) => (
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

          {/* Reason Details */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800">
              Detailed Reason & Explanation <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              placeholder="e.g. Urgent family emergency arose requiring travel. Requesting to push sync to Thursday morning."
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>

          {/* Proposed Replacement Slot */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Proposed Replacement Date & Time</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                required
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Footer Notice & Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Bilateral consent required
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
                <span>{isSubmitting ? "Submitting..." : "Send Postponement Request"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}


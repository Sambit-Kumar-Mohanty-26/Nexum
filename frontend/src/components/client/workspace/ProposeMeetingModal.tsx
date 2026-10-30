"use client";

import React, { useState } from "react";
import { X, Calendar, Clock, Video, Check } from "lucide-react";

interface ProposeMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  freelancerName?: string;
  onScheduleMeeting?: (details: { date: string; time: string; topic: string }) => void;
}

export default function ProposeMeetingModal({
  isOpen,
  onClose,
  freelancerName = "Sambit Kumar",
  onScheduleMeeting,
}: ProposeMeetingModalProps) {
  const [topic, setTopic] = useState("Milestone & Scope Alignment Review");
  const [date, setDate] = useState("2026-10-31");
  const [time, setTime] = useState("17:00");
  const [duration, setDuration] = useState("30 min");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      if (onScheduleMeeting) {
        onScheduleMeeting({ date, time, topic: `${topic} (${duration})` });
      }
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-b from-slate-50/70 to-white">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider text-[#4f46e5] bg-[#eef2ff] border border-indigo-100">
              <Video className="w-3.5 h-3.5" />
              <span>Direct Collaboration</span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Propose Meeting with {freelancerName}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Agenda / Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-[#4f46e5]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <div className="relative flex items-center">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-[#4f46e5]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Time
              </label>
              <div className="relative flex items-center">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-900 focus:outline-none focus:border-[#4f46e5]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {["15 min", "30 min", "45 min"].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setDuration(dur)}
                  className={`py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                    duration === dur
                      ? "bg-[#eef2ff] border-[#4f46e5] text-[#4f46e5]"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {dur}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pt-1">
            Nexum posts a calendar invitation card directly to the project chat for {freelancerName} to accept.
          </p>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Proposing..." : "Propose Meeting"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}


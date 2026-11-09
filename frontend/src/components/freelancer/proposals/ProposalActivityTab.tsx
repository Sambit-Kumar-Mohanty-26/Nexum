"use client";

import React from "react";
import {
  FileText,
  FileEdit,
  Eye,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  User,
} from "lucide-react";
import { FreelancerProposalItem } from "@/lib/freelancer-proposals-types";

interface ProposalActivityTabProps {
  proposal: FreelancerProposalItem;
}

export default function ProposalActivityTab({
  proposal,
}: ProposalActivityTabProps) {
  const getEventIcon = (type: string) => {
    switch (type) {
      case "CREATED":
      case "DRAFT":
        return <FileEdit className="w-4 h-4 text-slate-600" />;
      case "SUBMITTED":
        return <FileText className="w-4 h-4 text-blue-600" />;
      case "VIEWED":
      case "UNDER_REVIEW":
        return <Eye className="w-4 h-4 text-amber-600" />;
      case "SHORTLISTED":
        return <UserCheck className="w-4 h-4 text-emerald-600" />;
      case "COUNTEROFFER":
        return <ArrowRightLeft className="w-4 h-4 text-orange-600" />;
      case "ACCEPTED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "REJECTED":
        return <XCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <Clock className="w-4 h-4 text-indigo-600" />;
    }
  };

  const getEventBg = (type: string) => {
    switch (type) {
      case "CREATED":
      case "DRAFT":
        return "bg-slate-100 border-slate-200 text-slate-600";
      case "SUBMITTED":
        return "bg-blue-50 border-blue-200 text-blue-700";
      case "VIEWED":
      case "UNDER_REVIEW":
        return "bg-amber-50 border-amber-200 text-amber-700";
      case "SHORTLISTED":
        return "bg-emerald-50 border-emerald-200 text-emerald-700";
      case "COUNTEROFFER":
        return "bg-orange-50 border-orange-200 text-orange-700";
      case "ACCEPTED":
        return "bg-emerald-50 border-emerald-200 text-emerald-700";
      case "REJECTED":
        return "bg-rose-50 border-rose-200 text-rose-700";
      default:
        return "bg-indigo-50 border-indigo-200 text-indigo-700";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
          Proposal Progression & Audit Timeline
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Verifiable lifecycle records backed by the Nexum consensus audit ledger.
        </p>
      </div>

      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
        {proposal.activityTrail.length === 0 ? (
          <div className="py-8 text-center text-slate-500 space-y-2">
            <Clock className="w-7 h-7 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-800">No Activity Logged</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Audit checkpoints will appear automatically as your proposal is submitted, reviewed, and evaluated.
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {proposal.activityTrail.map((ev, idx) => {
              const isLast = idx === proposal.activityTrail.length - 1;

              return (
                <div key={ev.id} className="relative flex items-start gap-4 group">
                  {/* Left rail: Centered node icon + continuous connecting vertical line */}
                  <div className="flex flex-col items-center shrink-0 self-stretch">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-2xs shrink-0 z-10 transition group-hover:scale-105 ${getEventBg(
                        ev.type
                      )}`}
                    >
                      {getEventIcon(ev.type)}
                    </div>
                    {!isLast && (
                      <div className="w-0.5 grow bg-slate-200 my-1 rounded-full group-hover:bg-slate-300 transition" />
                    )}
                  </div>

                  {/* Right content */}
                  <div className={`flex-1 min-w-0 pt-0.5 ${!isLast ? "pb-6" : "pb-1"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                          {ev.title}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getEventBg(
                            ev.type
                          )}`}
                        >
                          {ev.type}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                        {ev.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {ev.description}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-2">
                      <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{ev.actor}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

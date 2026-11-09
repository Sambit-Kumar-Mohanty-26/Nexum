"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Edit3,
  Calendar,
  Code2,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { FreelancerProposalItem } from "@/lib/freelancer-proposals-types";

interface ProposalOfferTabProps {
  proposal: FreelancerProposalItem;
  onEditProposal: () => void;
  onReviewCounteroffer: () => void;
  showToast: (msg: string) => void;
}

export default function ProposalOfferTab({
  proposal,
  onEditProposal,
  onReviewCounteroffer,
  showToast,
}: ProposalOfferTabProps) {
  const router = useRouter();
  const [showFullCoverLetter, setShowFullCoverLetter] = useState(false);

  const handleDownloadAll = () => {
    showToast("Downloading all proposal attachments...");
  };

  return (
    <div className="space-y-6">
      {/* 1. Counteroffer Banner if counteroffer exists */}
      {proposal.counteroffer && (
        <div className="p-5 rounded-2xl bg-orange-50/80 border border-orange-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              <h3 className="text-xs font-bold text-orange-950 uppercase tracking-wider">
                Counteroffer Received from Client
              </h3>
            </div>
            <span className="text-[10px] font-bold text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded-full">
              Expires {proposal.counteroffer.expiresAt}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-2.5 rounded-xl bg-white border border-orange-100">
              <p className="text-[10px] text-slate-400 font-medium">Your Offer</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                {proposal.counteroffer.originalPrice}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-orange-200">
              <p className="text-[10px] text-orange-700 font-bold">Client Counter</p>
              <p className="text-xs font-extrabold text-orange-600 mt-0.5">
                {proposal.counteroffer.proposedPrice}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-orange-100">
              <p className="text-[10px] text-slate-400 font-medium">Timeline</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                {proposal.counteroffer.originalDuration}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-orange-200">
              <p className="text-[10px] text-orange-700 font-bold">Proposed Timeline</p>
              <p className="text-xs font-extrabold text-orange-600 mt-0.5">
                {proposal.counteroffer.proposedDuration}
              </p>
            </div>
          </div>

          <p className="text-xs text-orange-900 italic">
            &quot;{proposal.counteroffer.scopeNotes}&quot;
          </p>

          <div className="pt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onReviewCounteroffer}
              className="py-1.5 px-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-xs font-bold text-white transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Review Counteroffer</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 1b. Client Feedback & Reapply Banner if rejected */}
      {proposal.status === "REJECTED" && (
        <div className="p-5 rounded-2xl bg-rose-50/90 border border-rose-200/90 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wider">
                Client Decision: Proposal Declined
              </h3>
            </div>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200">
              Revision & Reapplication Available
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-white/80 border border-rose-100 space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Feedback from {proposal.client?.name || "Client"}:
            </p>
            <p className="text-xs text-slate-800 leading-relaxed font-medium italic">
              &quot;{proposal.rejectionFeedback || "The client has declined this proposal. You may adjust your quote, delivery timeline, or milestone deliverables and submit an updated revision."}&quot;
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <p className="text-[11px] text-rose-800 font-medium">
              You can address the client&apos;s feedback and submit a revised proposal.
            </p>
            <button
              type="button"
              onClick={() => {
                router.push(`/freelancer/projects/${proposal.projectId}/apply?revisionOf=${proposal.id}`);
              }}
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revise & Reapply</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Your Proposal Header & Summary */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Your Proposal
          </h3>
          <button
            type="button"
            onClick={onEditProposal}
            className="flex items-center gap-1.5 text-xs font-bold text-[#4f46e5] hover:text-[#4338ca] transition cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Proposal</span>
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          {proposal.offer.summary}
        </p>

        {/* 3 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {/* Approach */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4f46e5] shrink-0">
              <Code2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Development Approach
              </p>
              <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                {proposal.offer.approach}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Timeline
              </p>
              <p className="text-xs font-bold text-slate-900 truncate mt-0.5">
                {proposal.offer.duration}
              </p>
            </div>
          </div>

          {/* Price */}
          <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4f46e5] font-extrabold text-xs shrink-0">
              $
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Price
              </p>
              <p className="text-xs font-extrabold text-slate-900 truncate mt-0.5">
                {proposal.offer.priceDisplay}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Attachments */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Attachments
          </h3>
          {proposal.offer.attachments.length > 0 && (
            <button
              type="button"
              onClick={handleDownloadAll}
              className="flex items-center gap-1.5 text-xs font-bold text-[#4f46e5] hover:text-[#4338ca] transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download All</span>
            </button>
          )}
        </div>

        {proposal.offer.attachments.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No attachments uploaded with this proposal.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {proposal.offer.attachments.map((att) => (
              <div
                key={att.id}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition flex items-center justify-between gap-2 shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0 font-bold text-[9px]">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {att.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      PDF · {att.fileSize}
                    </p>
                  </div>
                </div>

                {att.downloadUrl ? (
                  <a
                    href={att.downloadUrl}
                    download={att.name}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                    title="Download File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => showToast(`Downloading ${att.name}...`)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                    title="Download File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Cover Letter */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
        <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
          Cover Letter
        </h3>

        <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
          {showFullCoverLetter
            ? proposal.offer.coverLetter
            : proposal.offer.coverLetter.slice(0, 240) + (proposal.offer.coverLetter.length > 240 ? "..." : "")}
        </div>

        {proposal.offer.coverLetter.length > 240 && (
          <button
            type="button"
            onClick={() => setShowFullCoverLetter(!showFullCoverLetter)}
            className="text-xs font-bold text-[#4f46e5] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>{showFullCoverLetter ? "Show Less" : "Show More"}</span>
            {showFullCoverLetter ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>

      {/* 5. Proposed Milestones & Payment Checkpoints */}
      {proposal.offer.milestones && proposal.offer.milestones.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#4f46e5]" />
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Proposed Milestones & Payment Checkpoints
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {proposal.offer.milestones.length} {proposal.offer.milestones.length === 1 ? "checkpoint" : "checkpoints"}
            </span>
          </div>

          <div className="space-y-3">
            {proposal.offer.milestones.map((m, idx) => (
              <div
                key={m.id || idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900">
                      #{m.orderIndex || idx + 1} {m.title}
                    </span>
                  </div>
                  {m.duration && (
                    <p className="text-[11px] text-slate-400 font-medium">
                      {m.duration}
                    </p>
                  )}
                  {m.acceptanceCriteria && m.acceptanceCriteria.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1">
                      {m.acceptanceCriteria.map((c, cIdx) => (
                        <span
                          key={cIdx}
                          className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{c}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-slate-900 font-mono">
                    {m.amount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

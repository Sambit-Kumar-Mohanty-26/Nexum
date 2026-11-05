"use client";

import React, { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  CheckSquare,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import {
  ProjectMilestone,
  MilestoneSubmission,
} from "@/lib/freelancer-projects-types";

interface MilestoneSubmissionModalProps {
  milestone: ProjectMilestone;
  onClose: () => void;
  onSubmit: (submission: MilestoneSubmission) => void;
}

export default function MilestoneSubmissionModal({
  milestone,
  onClose,
  onSubmit,
}: MilestoneSubmissionModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [completionNote, setCompletionNote] = useState(
    "All acceptance criteria have been implemented, tested and deployed to staging for client review."
  );
  const [deliverableDescription, setDeliverableDescription] = useState(
    `Deliverable submission for ${milestone.title}`
  );
  const [githubPrUrl, setGithubPrUrl] = useState(
    "https://github.com/shopkart/storefront/pull/15"
  );
  const [demoUrl, setDemoUrl] = useState("https://staging.shopkart.nexum.dev");
  const [attachmentName, setAttachmentName] = useState("deliverables-package.zip");
  const [attachmentSize, setAttachmentSize] = useState("4.8 MB");
  const [checkedCriteria, setCheckedCriteria] = useState<string[]>(
    milestone.acceptanceCriteria
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAttachmentName(file.name);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setAttachmentSize(`${sizeMb} MB`);
    }
  };

  const displayAmount =
    milestone.amountDisplay && milestone.amountDisplay !== "$0 USD"
      ? milestone.amountDisplay
      : milestone.amountCents
      ? `$${(milestone.amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })} USD`
      : "";

  const toggleCriterion = (criterion: string) => {
    setCheckedCriteria((prev) =>
      prev.includes(criterion)
        ? prev.filter((c) => c !== criterion)
        : [...prev, criterion]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionNote.trim()) {
      setErrorMsg("Please provide a completion note explaining the delivery.");
      return;
    }
    if (checkedCriteria.length === 0 && milestone.acceptanceCriteria.length > 0) {
      setErrorMsg("Please verify at least one acceptance criterion.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const newSubmission: MilestoneSubmission = {
      id: `sub-${Date.now()}`,
      submissionDate: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      versionNumber: milestone.submissions.length + 1,
      completionNote,
      deliverableDescription,
      githubPrUrl: githubPrUrl.trim() || undefined,
      demoUrl: demoUrl.trim() || undefined,
      attachmentName: attachmentName.trim() || undefined,
      attachmentSize: attachmentSize || "3.2 MB",
      criteriaChecked: checkedCriteria,
    };

    setTimeout(() => {
      setIsSubmitting(false);
      onSubmit(newSubmission);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Submit Milestone Deliverable
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">
              {milestone.title} {displayAmount ? `(${displayAmount})` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Completion Note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Completion Note
            </label>
            <textarea
              rows={3}
              value={completionNote}
              onChange={(e) => setCompletionNote(e.target.value)}
              placeholder="Describe what was accomplished and highlight test results..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-hidden focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]"
            />
          </div>

          {/* Deliverable Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deliverable Summary
            </label>
            <input
              type="text"
              value={deliverableDescription}
              onChange={(e) => setDeliverableDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-hidden focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]"
            />
          </div>

          {/* URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                GitHub PR / Repository URL
              </label>
              <input
                type="url"
                value={githubPrUrl}
                onChange={(e) => setGithubPrUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-hidden focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Live Demo / Loom Walkthrough
              </label>
              <input
                type="url"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-hidden focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]"
              />
            </div>
          </div>

          {/* File Attachment Upload */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deliverable Artifacts / Archive
            </label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-3.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#4f46e5]/60 hover:bg-slate-50/80 bg-slate-50 flex items-center justify-between cursor-pointer transition"
            >
              <div className="flex items-center gap-2.5">
                <UploadCloud className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-xs font-bold text-slate-800">{attachmentName}</p>
                  <p className="text-[10px] text-slate-400">
                    {attachmentSize} · {selectedFile ? "Selected from local machine" : "SHA-256 verified"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="py-1 px-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
              >
                Choose File / Replace
              </button>
            </div>
          </div>

          {/* Acceptance Criteria Checklist */}
          {milestone.acceptanceCriteria.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-[#4f46e5]" />
                  Acceptance Criteria Self-Check
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {checkedCriteria.length} of {milestone.acceptanceCriteria.length} verified
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                {milestone.acceptanceCriteria.map((criterion, idx) => {
                  const isChecked = checkedCriteria.includes(criterion);
                  return (
                    <label
                      key={idx}
                      className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCriterion(criterion)}
                        className="mt-0.5 rounded text-[#4f46e5] focus:ring-[#4f46e5]"
                      />
                      <span className={isChecked ? "text-slate-900 font-medium" : "text-slate-500"}>
                        {criterion}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notice */}
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-2">
            <FileCheck className="w-4 h-4 text-[#4f46e5] shrink-0 mt-0.5" />
            <span>
              Submitting updates work status to <strong>Awaiting Client Review</strong>. Payment
              remains in escrow until client explicitly accepts the deliverable.
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2 px-3.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2 px-4 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-xs font-bold text-white transition shadow-xs cursor-pointer"
            >
              {isSubmitting ? "Submitting..." : "Confirm & Submit Work"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


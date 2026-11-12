"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  UploadCloud,
  FileText,
  DollarSign,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Check,
  ShoppingBag,
} from "lucide-react";
import { suggestAddendumPrice, proposeScopeAmendment } from "@/lib/api-client";
import Channel3ProductExplorerModal, { Channel3ProductItem } from "@/components/common/Channel3ProductExplorerModal";
import { NexumIcon } from "@/components/Logo";

interface MilestoneAddendumModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  initialTitle?: string;
  initialDescription?: string;
  userRole?: "CLIENT" | "FREELANCER";
  userId?: string;
  currency?: string;
  onSuccess?: () => void;
  showToast?: (msg: string) => void;
}

export default function MilestoneAddendumModal({
  isOpen,
  onClose,
  projectId,
  initialTitle = "",
  initialDescription = "",
  userRole = "CLIENT",
  userId = "",
  currency = "USD",
  onSuccess,
  showToast,
}: MilestoneAddendumModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [deliverables, setDeliverables] = useState(initialDescription);
  const [criteria, setCriteria] = useState<string[]>([
    "End-to-end implementation verified against technical specifications",
    "Comprehensive test coverage with dual-signature consensus approval",
  ]);
  const [newCriterion, setNewCriterion] = useState("");
  const [budgetDollars, setBudgetDollars] = useState<number>(1500);
  const [timelineDays, setTimelineDays] = useState<number>(14);

  // Document upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState<string>("");
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [extractedDocBudget, setExtractedDocBudget] = useState<number | null>(null);

  // Nexum AI Estimation State
  const [isEstimating, setIsEstimating] = useState(false);
  const [aiEstimate, setAiEstimate] = useState<{
    suggestedAmountMinor: number;
    suggestedTimelineDays: number;
    complexity: "LOW" | "MEDIUM" | "HIGH" | "COMPLEX";
    reasoning: string;
  } | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isChannel3ModalOpen, setIsChannel3ModalOpen] = useState(false);

  useEffect(() => {
    if (initialTitle) setTitle(initialTitle);
    if (initialDescription) setDeliverables(initialDescription);
  }, [initialTitle, initialDescription]);

  if (!isOpen) return null;

  // Handle BRD / Spec file upload and extract budget
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsUploadingDoc(true);
    setErrorMessage(null);

    try {
      // Read text locally if text/markdown or json
      const text = await file.text();
      setDocumentText(text);

      // Simple regex extraction for budget mention in document, e.g. "$2,500" or "$2500"
      const budgetMatch = text.match(/\$\s?([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+)/);
      if (budgetMatch && budgetMatch[1]) {
        const parsed = parseFloat(budgetMatch[1].replace(/,/g, ""));
        if (!isNaN(parsed) && parsed > 0) {
          setExtractedDocBudget(parsed);
          setBudgetDollars(parsed);
          showToast?.(`Extracted budget of $${parsed.toLocaleString()} from BRD document.`);
        }
      }
    } catch (err) {
      console.warn("Could not parse file text locally:", err);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Trigger Nexum AI Price & Complexity Estimation
  const handleAskNexumAi = async () => {
    if (!title.trim()) {
      setErrorMessage("Please enter a milestone title before asking Nexum AI for pricing.");
      return;
    }

    setIsEstimating(true);
    setErrorMessage(null);

    try {
      const res = await suggestAddendumPrice(projectId, {
        title: title.trim(),
        deliverables: deliverables.trim(),
        documentText: documentText.slice(0, 3000),
      });

      if (res.success && res.data) {
        setAiEstimate(res.data);
        showToast?.(`Nexum AI estimated: $${(res.data.suggestedAmountMinor / 100).toLocaleString()} USD (${res.data.complexity} complexity)`);
      } else {
        setErrorMessage(res.error || "Failed to receive AI price estimation");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Estimation failed");
    } finally {
      setIsEstimating(false);
    }
  };

  const handleApplyAiSuggestion = () => {
    if (!aiEstimate) return;
    setBudgetDollars(Math.round(aiEstimate.suggestedAmountMinor / 100));
    setTimelineDays(aiEstimate.suggestedTimelineDays);
    showToast?.("Applied Nexum AI estimated budget & timeline to proposal.");
  };

  const handleAddCriterion = () => {
    if (!newCriterion.trim()) return;
    setCriteria((prev) => [...prev, newCriterion.trim()]);
    setNewCriterion("");
  };

  const handleRemoveCriterion = (idx: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitProposal = async () => {
    if (!title.trim()) {
      setErrorMessage("Milestone title is required.");
      return;
    }
    if (budgetDollars <= 0) {
      setErrorMessage("Escrow budget must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // If a document was attached, we can upload it to the project files
      let brdUrl: string | undefined = undefined;
      let brdName: string | undefined = undefined;

      if (uploadedFile) {
        try {
          const formData = new FormData();
          formData.append("file", uploadedFile);
          formData.append("note", `BRD Specification for Milestone Addendum: ${title}`);
          const uploadRes = await fetch(`/api/workspace/projects/${projectId}/files`, {
            method: "POST",
            body: formData,
          });
          const uploadData = await uploadRes.json();
          if (uploadData.success && uploadData.data?.file) {
            brdUrl = uploadData.data.file.downloadUrl;
            brdName = uploadData.data.file.name;
          }
        } catch (uploadErr) {
          console.warn("BRD file attachment warning:", uploadErr);
        }
      }

      // Convert dollars to integer minor units (US Cents)
      const amountMinor = Math.round(budgetDollars * 100);

      const res = await proposeScopeAmendment(projectId, {
        proposerId: userId || "usr_client_alex",
        proposerRole: userRole,
        amendmentType: "ADD_NEW_MILESTONE",
        newMilestoneTitle: title.trim(),
        priceDeltaCents: amountMinor,
        timelineDaysDelta: timelineDays,
        newAcceptanceCriteria: criteria,
        deliverables: [deliverables.trim() || `Deliverable for ${title}`],
        justification: deliverables.trim() || `Scope addition formalized via AI Meeting Synthesis: ${title}`,
        brdDocumentUrl: brdUrl,
        brdDocumentName: brdName || uploadedFile?.name,
      });

      if (res.success) {
        showToast?.("Milestone addendum proposed! Sent to counterpart for bilateral review.");
        onSuccess?.();
        onClose();
      } else {
        setErrorMessage(res.error || "Failed to submit milestone addendum");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200/90 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <NexumIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">Formalize Milestone Addendum</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Convert agreed meeting scope into a cumulative milestone (Agreement v1.1 revision)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4.5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Milestone Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Milestone Title <span className="text-indigo-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Integrate UA Arc 96 or Add AI Disaster Detection"
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 placeholder:text-slate-400 transition"
            />
          </div>

          {/* Specifications & Deliverables */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Deliverables &amp; Technical Specifications
              </label>
              <button
                type="button"
                onClick={() => setIsChannel3ModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                title="Browse real-world product catalog via Channel 3"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
                <span>Channel 3 Catalog</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
              placeholder="Detail the technical requirements, architecture specs, and expected outputs agreed in the sync meeting..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 placeholder:text-slate-400 transition leading-relaxed"
            />
          </div>

          {/* BRD Document Upload with Auto Budget Extraction */}
          <div className="p-3.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Upload BRD / Technical Specification Document</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">PDF, DOCX, TXT, MD</span>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs">
                <UploadCloud className="w-4 h-4 text-slate-500" />
                <span>{uploadedFile ? uploadedFile.name : "Choose Specification File..."}</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {uploadedFile && (
                <button
                  type="button"
                  onClick={() => {
                    setUploadedFile(null);
                    setDocumentText("");
                    setExtractedDocBudget(null);
                  }}
                  className="text-xs text-rose-600 hover:underline cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>

            {extractedDocBudget && (
              <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  Extracted budget from document: <strong>${extractedDocBudget.toLocaleString()} {currency}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Nexum AI Price & Complexity Estimation Card */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                <NexumIcon className="w-4 h-4" />
                <span>Nexum AI Scope &amp; Price Forensics</span>
              </span>
              <button
                type="button"
                onClick={handleAskNexumAi}
                disabled={isEstimating}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isEstimating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Complexity...</span>
                  </>
                ) : (
                  <>
                    <NexumIcon className="w-3.5 h-3.5" />
                    <span>Ask Nexum AI for Price</span>
                  </>
                )}
              </button>
            </div>

            {aiEstimate ? (
              <div className="space-y-2.5 pt-1">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Suggested Escrow</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">
                      ${(aiEstimate.suggestedAmountMinor / 100).toLocaleString()} {currency}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Est. Timeline</div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {aiEstimate.suggestedTimelineDays} Days
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Complexity</div>
                    <div className="text-sm font-bold text-indigo-700 mt-0.5">
                      {aiEstimate.complexity}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200/80">
                  &ldquo;{aiEstimate.reasoning}&rdquo;
                </p>

                <button
                  type="button"
                  onClick={handleApplyAiSuggestion}
                  className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply AI Suggested Budget (${(aiEstimate.suggestedAmountMinor / 100).toLocaleString()}) &amp; Timeline ({aiEstimate.suggestedTimelineDays}d)</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 leading-relaxed">
                Click &ldquo;Ask Nexum AI for Price&rdquo; to evaluate technical deliverables, architectural risk, and delivery timeline.
              </p>
            )}
          </div>

          {/* Budget & Timeline Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Escrow Budget ({currency}) <span className="text-indigo-600">*</span></span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  min="1"
                  step="50"
                  value={budgetDollars}
                  onChange={(e) => setBudgetDollars(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Stored as integer minor units ({budgetDollars * 100} cents)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Delivery Timeline (Days) <span className="text-indigo-600">*</span></span>
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={timelineDays}
                onChange={(e) => setTimelineDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 font-bold text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>
          </div>

          {/* Acceptance Criteria */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Acceptance &amp; Verification Criteria
            </label>
            <div className="space-y-2 mb-2">
              {criteria.map((crit, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{crit}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCriterion(idx)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newCriterion}
                onChange={(e) => setNewCriterion(e.target.value)}
                placeholder="Add verification test / requirement..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCriterion();
                  }
                }}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="button"
                onClick={handleAddCriterion}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer border border-slate-200"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Dual-consensus required before contract revision v1.1 seals.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitProposal}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Proposing Addendum...</span>
                </>
              ) : (
                <>
                  <span>Propose Milestone Addendum</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Channel 3 Product & SKU Explorer Modal */}
      <Channel3ProductExplorerModal
        isOpen={isChannel3ModalOpen}
        onClose={() => setIsChannel3ModalOpen(false)}
        initialQuery={title || "shoes"}
        onSelectProduct={(p: Channel3ProductItem) => {
          setIsChannel3ModalOpen(false);
          if (!title) {
            setTitle(`Implement ${p.title}`);
          }
          setDeliverables((prev) =>
            prev
              ? `${prev}\n\nReference SKU: ${p.sku} (${p.title} - ${p.priceDisplay})\nBrand: ${p.brand} | Retailer: ${p.retailer}`
              : `Reference SKU: ${p.sku} (${p.title} - ${p.priceDisplay})\nBrand: ${p.brand} | Retailer: ${p.retailer}`
          );
          if (!budgetDollars || budgetDollars === 1500) {
            setBudgetDollars(Math.round(p.priceCents / 100));
          }
          showToast?.(`Attached reference product "${p.title}" via Channel 3`);
        }}
      />
    </div>
  );
}


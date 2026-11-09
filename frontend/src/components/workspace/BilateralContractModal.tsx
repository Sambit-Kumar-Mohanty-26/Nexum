"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  CheckCircle2,
  Download,
  Copy,
  ShieldCheck,
  Sparkles,
  Clock,
  Lock,
  Check,
  Calendar,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { fetchAgreementDetails } from "@/lib/api-client";

interface BilateralContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  agreementId?: string;
  userRole?: "CLIENT" | "FREELANCER";
  onAgreementRatified?: () => void;
}

export default function BilateralContractModal({
  isOpen,
  onClose,
  projectId,
  agreementId,
  userRole = "CLIENT",
  onAgreementRatified,
}: BilateralContractModalProps) {
  const [loading, setLoading] = useState(true);
  const [agreementData, setAgreementData] = useState<any>(null);
  const [contractMarkdown, setContractMarkdown] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalSuccessMsg, setApprovalSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);
    setApprovalSuccessMsg(null);

    const targetId = agreementId || projectId;
    fetchAgreementDetails(targetId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          setAgreementData(res.data);
          const activeVer = res.data.activeVersion || res.data.versions?.[0];
          const md =
            activeVer?.terms?.contractMarkdown ||
            activeVer?.contractMarkdown ||
            "";
          setContractMarkdown(md);
        } else {
          setErrorMsg(res.error || "Failed to load agreement document");
        }
      })
      .catch((err) => {
        if (isMounted) setErrorMsg(err instanceof Error ? err.message : "Load failed");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, projectId, agreementId]);

  if (!isOpen) return null;

  const activeVer = agreementData?.activeVersion || agreementData?.versions?.[0];
  const terms = activeVer?.terms || {};
  const isRatified =
    agreementData?.status === "ACTIVE" ||
    activeVer?.status === "ACTIVE";

  const clientApproved =
    activeVer?.approvals?.some((a: any) => a.partyRole === "CLIENT") ||
    activeVer?.clientApprovedAt != null;

  const freelancerApproved =
    activeVer?.approvals?.some((a: any) => a.partyRole === "FREELANCER") ||
    activeVer?.freelancerApprovedAt != null;

  const handleCopy = () => {
    if (!contractMarkdown) return;
    navigator.clipboard.writeText(contractMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    if (!contractMarkdown) return;
    const blob = new Blob([contractMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Contract_Agreement_v${activeVer?.versionNumber || 1}.0.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRatify = async () => {
    try {
      setIsApproving(true);
      setErrorMsg(null);
      const targetId = agreementData?.id || agreementId || projectId;
      const res = await fetch(`/api/agreements/${targetId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionNumber: activeVer?.versionNumber || 1,
          role: userRole,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setApprovalSuccessMsg(data.message || "Contract ratified successfully!");
        if (onAgreementRatified) onAgreementRatified();
        // Refresh local data
        setTimeout(() => {
          fetchAgreementDetails(targetId).then((r) => {
            if (r.success && r.data) {
              setAgreementData(r.data);
              const v = r.data.activeVersion || r.data.versions?.[0];
              if (v?.terms?.contractMarkdown) setContractMarkdown(v.terms.contractMarkdown);
            }
          });
        }, 600);
      } else {
        setErrorMsg(data.error || "Failed to approve agreement");
      }
    } catch {
      setErrorMsg("Ratification request failed");
    } finally {
      setIsApproving(false);
    }
  };

  // Helper to render markdown text cleanly
  const renderFormattedMarkdown = (text: string) => {
    if (!text) {
      return (
        <div className="py-12 text-center text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No contract agreement content synthesized yet.</p>
        </div>
      );
    }

    const lines = text.split("\n");
    return (
      <div className="space-y-3 font-sans text-slate-800 leading-relaxed text-[13px]">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("# ")) {
            return (
              <h1
                key={idx}
                className="text-lg sm:text-xl font-extrabold text-slate-900 border-b border-indigo-100 pb-2.5 pt-2 tracking-tight flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
                <span>{trimmed.replace("# ", "")}</span>
              </h1>
            );
          }
          if (trimmed.startsWith("## ")) {
            return (
              <h2
                key={idx}
                className="text-sm sm:text-base font-bold text-slate-900 pt-3 pb-1 border-b border-slate-100 tracking-tight text-indigo-950"
              >
                {trimmed.replace("## ", "")}
              </h2>
            );
          }
          if (trimmed.startsWith("### ")) {
            return (
              <h3 key={idx} className="text-xs sm:text-[13px] font-bold text-slate-800 pt-1">
                {trimmed.replace("### ", "")}
              </h3>
            );
          }
          if (trimmed.startsWith("---")) {
            return <hr key={idx} className="border-slate-200/80 my-2" />;
          }
          if (trimmed.startsWith("- ")) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-indigo-600 mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-slate-700">{trimmed.replace("- ", "")}</span>
              </div>
            );
          }
          if (trimmed === "") {
            return <div key={idx} className="h-1.5" />;
          }
          return (
            <p key={idx} className="text-slate-700">
              {trimmed}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Top Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 shrink-0">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-indigo-700 bg-indigo-100/80 border border-indigo-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Nexum Autonomous Protocol · Legal Vault</span>
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  isRatified
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {isRatified
                  ? "v1.0 Ratified & Active"
                  : `v${activeVer?.versionNumber || 1}.0 Bilateral Draft (Pending Approval)`}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Bilateral Freelance Service & Escrow Agreement
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span>Document: <strong className="text-slate-700 font-mono">Contract_Agreement_v{activeVer?.versionNumber || 1}.0.md</strong></span>
              {activeVer?.contentHash && (
                <span className="hidden sm:inline font-mono text-[10px] text-slate-400">
                  · SHA-256: {activeVer.contentHash.slice(0, 16)}...
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer shrink-0 ml-4"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bilateral Signature Banner */}
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Client Ratification:</span>
            {clientApproved ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Approved & Locked
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                <Clock className="w-3.5 h-3.5" /> Awaiting Client Approval
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Freelancer Ratification:</span>
            {freelancerApproved ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ratified & Committed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                <Clock className="w-3.5 h-3.5" /> Awaiting Freelancer Ratification
              </span>
            )}
          </div>
        </div>

        {/* Status / Alert feedback */}
        {approvalSuccessMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{approvalSuccessMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Loading synthesized legal contract from vault...</p>
            </div>
          ) : (
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/70 border border-slate-200/90 shadow-2xs">
              {renderFormattedMarkdown(contractMarkdown)}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!contractMarkdown}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Agreement</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!contractMarkdown}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Download (.md)</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* If pending ratification for the active user */}
            {!isRatified && (
              <button
                type="button"
                onClick={handleRatify}
                disabled={isApproving}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                {isApproving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Ratifying...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {userRole === "CLIENT"
                        ? "Ratify Agreement & Request Escrow"
                        : "Ratify Contract Agreement"}
                    </span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


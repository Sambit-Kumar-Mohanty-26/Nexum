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
  DollarSign,
  Layers,
  ArrowRight,
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
    activeVer?.clientApprovedAt != null ||
    terms?.clientApprovedAt != null;

  const freelancerApproved =
    activeVer?.approvals?.some((a: any) => a.partyRole === "FREELANCER") ||
    activeVer?.freelancerApprovedAt != null ||
    terms?.freelancerApprovedAt != null;

  const clientName =
    agreementData?.project?.client?.name ||
    terms?.clientName ||
    "Client Partner";
  const clientEmail =
    agreementData?.project?.client?.email ||
    terms?.clientEmail ||
    "";

  const freelancerName =
    agreementData?.freelancer?.name ||
    terms?.freelancerName ||
    "Freelancer Specialist";
  const freelancerEmail =
    agreementData?.freelancer?.email ||
    terms?.freelancerEmail ||
    "";

  const totalAmountMinor = terms?.totalAmountMinor || agreementData?.project?.budgetCents || 0;
  const currency = terms?.currency || agreementData?.project?.currency || "USD";
  const totalDisplay = `$${(totalAmountMinor / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;

  const milestonesList = terms?.milestones || agreementData?.milestones || [];
  const firstMilestone = milestonesList[0];
  const firstMilestoneAmount = firstMilestone
    ? `$${((firstMilestone.amountMinor || firstMilestone.amountCents || 0) / 100).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${currency}`
    : "$0.00";

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

  const handleSignContract = async () => {
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
        setApprovalSuccessMsg(
          userRole === "FREELANCER"
            ? "Contract signed and accepted! Client has been requested to deposit Milestone #1 escrow."
            : "Contract approved! You can now deposit Milestone #1 escrow."
        );
        if (onAgreementRatified) onAgreementRatified();
        setTimeout(() => {
          fetchAgreementDetails(targetId).then((r) => {
            if (r.success && r.data) {
              setAgreementData(r.data);
              const v = r.data.activeVersion || r.data.versions?.[0];
              if (v?.terms?.contractMarkdown) setContractMarkdown(v.terms.contractMarkdown);
            }
          });
        }, 500);
      } else {
        setErrorMsg(data.error || "Failed to sign contract");
      }
    } catch {
      setErrorMsg("Signature submission failed");
    } finally {
      setIsApproving(false);
    }
  };

  // Professional document text formatting helper
  const renderDocumentBody = (text: string) => {
    if (!text) {
      return (
        <div className="py-20 text-center text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30 text-indigo-600" />
          <p className="text-sm">Synthesizing formal bilateral agreement terms...</p>
        </div>
      );
    }

    // Split text into paragraphs / blocks
    const lines = text.split("\n");
    const blocks: React.ReactNode[] = [];
    let tableBuffer: string[] = [];

    const flushTable = (key: number) => {
      if (tableBuffer.length === 0) return null;
      const tLines = [...tableBuffer];
      tableBuffer = [];

      const rows = tLines
        .filter((l) => !l.includes("---"))
        .map((l) =>
          l
            .split("|")
            .map((c) => c.trim())
            .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1)
        );

      if (rows.length === 0) return null;
      const [headerRow, ...bodyRows] = rows;

      return (
        <div key={`table-${key}`} className="my-5 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                {headerRow.map((h, i) => (
                  <th key={i} className="py-2.5 px-3.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/60 transition">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2.5 px-3.5 text-slate-700 font-medium">
                      {cell.replace(/\*\*/g, "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Table row
      if (trimmed.startsWith("|")) {
        tableBuffer.push(trimmed);
        return;
      } else if (tableBuffer.length > 0) {
        blocks.push(flushTable(idx));
      }

      // Main Section Header (## 1. PARTIES ...)
      if (trimmed.startsWith("## ")) {
        const title = trimmed.replace("## ", "").replace(/\*\*/g, "");
        blocks.push(
          <div key={idx} className="pt-6 pb-2 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
              <span>{title}</span>
            </h2>
          </div>
        );
        return;
      }

      // Subsection (### 2.1 Scope ...)
      if (trimmed.startsWith("### ")) {
        const title = trimmed.replace("### ", "").replace(/\*\*/g, "");
        blocks.push(
          <h3 key={idx} className="text-xs sm:text-sm font-bold text-slate-800 pt-3 text-indigo-950">
            {title}
          </h3>
        );
        return;
      }

      // Minor header (#### Milestone 1 ...)
      if (trimmed.startsWith("#### ")) {
        const title = trimmed.replace("#### ", "").replace(/\*\*/g, "");
        blocks.push(
          <div key={idx} className="p-3.5 mt-2 rounded-xl bg-slate-50 border border-slate-200/90 text-xs font-semibold text-slate-900">
            {title}
          </div>
        );
        return;
      }

      // Horizontal rule
      if (trimmed.startsWith("---")) {
        blocks.push(<hr key={idx} className="border-slate-200/80 my-4" />);
        return;
      }

      // Checklist item - [ ]
      if (trimmed.startsWith("- [ ]") || trimmed.startsWith("- [x]")) {
        const checkText = trimmed.replace(/- \[[ x]\]\s*/, "").replace(/\*\*/g, "");
        blocks.push(
          <div key={idx} className="flex items-center gap-2 pl-3 py-1 text-xs text-slate-700">
            <div className="w-4 h-4 rounded border border-indigo-300 bg-indigo-50/50 flex items-center justify-center text-indigo-600 shrink-0">
              <Check className="w-3 h-3" />
            </div>
            <span>{checkText}</span>
          </div>
        );
        return;
      }

      // Bullet item
      if (trimmed.startsWith("- ")) {
        const raw = trimmed.replace("- ", "");
        // Format bold prefix if exists (e.g. - **Client:** Sambit)
        const parts = raw.split("**");
        blocks.push(
          <div key={idx} className="flex items-start gap-2 pl-2 py-0.5 text-xs text-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
            <span>
              {parts.map((p, pIdx) =>
                pIdx % 2 === 1 ? (
                  <strong key={pIdx} className="font-semibold text-slate-900">
                    {p}
                  </strong>
                ) : (
                  p
                )
              )}
            </span>
          </div>
        );
        return;
      }

      // Empty line
      if (trimmed === "") {
        return;
      }

      // Clean Paragraph with bold parsing
      const parts = trimmed.split("**");
      blocks.push(
        <p key={idx} className="text-xs sm:text-[13px] text-slate-700 leading-relaxed">
          {parts.map((p, pIdx) =>
            pIdx % 2 === 1 ? (
              <strong key={pIdx} className="font-semibold text-slate-900">
                {p}
              </strong>
            ) : (
              p
            )
          )}
        </p>
      );
    });

    if (tableBuffer.length > 0) {
      blocks.push(flushTable(lines.length));
    }

    return blocks;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-slate-100 rounded-2xl sm:rounded-3xl border border-slate-300/80 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]">
        {/* Top Navbar */}
        <div className="px-5 py-3.5 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                  Bilateral Collaboration & Escrow Agreement
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    isRatified
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {isRatified
                    ? "v1.0 Active & Ratified"
                    : `v${activeVer?.versionNumber || 1}.0 Bilateral Draft (Pending Approval)`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Document Ref: NEXUM-AGR-{agreementData?.id?.slice(0, 10).toUpperCase() || "CANONICAL"}-v{activeVer?.versionNumber || 1}.0
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Download (.md)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition cursor-pointer ml-1"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Container (Simulates authentic corporate paper sheet) */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-24 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Retrieving certified agreement document...</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200/90 shadow-xl p-6 sm:p-12 space-y-6">
              {/* Document Letterhead */}
              <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-bold uppercase tracking-wider mb-2">
                    <Sparkles className="w-3 h-3 text-indigo-600" />
                    <span>Nexum Autonomous Legal Protocol</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    FREELANCE SERVICE & ESCROW AGREEMENT
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Canonical Bilateral Contract · Milestone Escrow Architecture
                  </p>
                </div>
                <div className="text-left sm:text-right font-mono text-[11px] text-slate-500 space-y-0.5">
                  <div>Ref: <strong className="text-slate-900">NEXUM-AGR-v{activeVer?.versionNumber || 1}.0</strong></div>
                  <div>Status: <strong className={isRatified ? "text-emerald-700" : "text-amber-700"}>
                    {isRatified ? "RATIFIED & BINDING" : "PENDING MUTUAL SIGNATURE"}
                  </strong></div>
                </div>
              </div>

              {/* 4-Column Legal KPI Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fixed Price</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">{totalDisplay}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Milestones</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">{milestonesList.length} Tranches</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Escrow Rail</div>
                  <div className="text-sm font-extrabold text-indigo-700 mt-0.5">PayPal REST v2</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Inspection Buffer</div>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">72 Hours</div>
                </div>
              </div>

              {/* Bilateral Parties Verification Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Party A: Client */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client (Party A)</span>
                    {clientApproved ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Signed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" /> Awaiting Signature
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{clientName}</div>
                    {clientEmail && <div className="text-[11px] text-slate-500 font-mono">{clientEmail}</div>}
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    Role: Authorized Project Client & Escrow Funder
                  </div>
                </div>

                {/* Party B: Freelancer */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Freelancer (Party B)</span>
                    {freelancerApproved ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Signed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-600" /> Awaiting Signature
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{freelancerName}</div>
                    {freelancerEmail && <div className="text-[11px] text-slate-500 font-mono">{freelancerEmail}</div>}
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    Role: Primary Implementation Specialist & Service Provider
                  </div>
                </div>
              </div>

              {/* Alert Feedback Banner if any */}
              {approvalSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{approvalSuccessMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Rendered Document Body */}
              <div className="pt-2">
                {renderDocumentBody(contractMarkdown)}
              </div>

              {/* Digital Execution & Signature Certificate Seals */}
              <div className="mt-8 pt-6 border-t-2 border-slate-900 space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Digital Signature Certificates & Consensual Execution
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Client Certificate */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
                    <div className="font-bold text-slate-800">CLIENT DIGITAL EXECUTION</div>
                    <div className="font-mono text-slate-700 font-bold">{clientName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Status: {clientApproved ? "DIGITALLY SIGNED & VERIFIED ✓" : "PENDING SIGNATURE"}
                    </div>
                    {activeVer?.contentHash && (
                      <div className="text-[10px] text-slate-400 font-mono break-all pt-1 border-t border-slate-200">
                        SHA-256: {activeVer.contentHash.slice(0, 32)}...
                      </div>
                    )}
                  </div>

                  {/* Freelancer Certificate */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
                    <div className="font-bold text-slate-800">FREELANCER DIGITAL EXECUTION</div>
                    <div className="font-mono text-slate-700 font-bold">{freelancerName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Status: {freelancerApproved ? "DIGITALLY SIGNED & VERIFIED ✓" : "PENDING SIGNATURE"}
                    </div>
                    {activeVer?.contentHash && (
                      <div className="text-[10px] text-slate-400 font-mono break-all pt-1 border-t border-slate-200">
                        SHA-256: {activeVer.contentHash.slice(0, 32)}...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Sticky Bottom Action Bar */}
        <div className="px-5 py-3.5 bg-white border-t border-slate-200/90 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
          <div className="text-xs text-slate-500">
            {isRatified ? (
              <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Agreement is active and legally binding under Nexum Protocol.
              </span>
            ) : userRole === "FREELANCER" && !freelancerApproved ? (
              <span className="font-semibold text-indigo-700 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Client has signed. Please review and sign to activate the contract.
              </span>
            ) : userRole === "CLIENT" && !freelancerApproved ? (
              <span className="font-semibold text-amber-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                Signed by you. Awaiting freelancer signature to unlock Milestone #1 escrow deposit.
              </span>
            ) : (
              <span>Review full agreement terms and milestone schedule.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {/* If Freelancer and pending signature */}
            {userRole === "FREELANCER" && !freelancerApproved && (
              <button
                type="button"
                onClick={handleSignContract}
                disabled={isApproving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
              >
                {isApproving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing Contract...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sign & Accept Contract</span>
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

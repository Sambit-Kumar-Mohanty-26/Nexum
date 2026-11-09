"use client";

import React, { useState } from "react";
import {
  FileText,
  Download,
  Eye,
  X,
  Printer,
  CheckCircle2,
  Calendar,
  DollarSign,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
} from "lucide-react";

export interface UploadedDocumentData {
  name: string;
  size?: string;
  type?: string;
  uploadedAt?: string;
  dataUrl?: string;
  url?: string;
}

export interface ProjectUploadedDocumentCardProps {
  document: UploadedDocumentData;
  projectTitle?: string;
  category?: string;
  budget?: string;
  timeline?: string;
  overview?: string;
  objectives?: string[];
  technicalArchitecture?: string;
  functionalRequirements?: string[];
  acceptanceCriteria?: string[];
  clientName?: string;
}

export default function ProjectUploadedDocumentCard({
  document,
  projectTitle = "Project Requirements Document",
  category,
  budget,
  timeline,
  overview,
  objectives = [],
  technicalArchitecture,
  functionalRequirements = [],
  acceptanceCriteria = [],
  clientName = "Project Client",
}: ProjectUploadedDocumentCardProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"embedded" | "formatted">(
    document.dataUrl || document.url ? "embedded" : "formatted"
  );

  const handleDownload = () => {
    const fileSource = document.url || document.dataUrl;
    if (fileSource) {
      const a = window.document.createElement("a");
      a.href = fileSource;
      a.download = document.name;
      a.target = "_blank";
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      return;
    }

    // Generate formatted printable content
    const content = `
================================================================================
                    PROJECT REQUIREMENTS DOCUMENT (PRD)
================================================================================
Document: ${document.name}
Project: ${projectTitle}
Category: ${category || "Engineering & Software"}
Client: ${clientName}
Budget: ${budget || "Negotiated Escrow"}
Timeline: ${timeline || "Sprint-based"}
Status: Mutually Approved Intake Document
--------------------------------------------------------------------------------

1. OVERVIEW & BUSINESS CONTEXT
${overview || "Detailed project specifications and deliverables agreement."}

2. CORE OBJECTIVES
${objectives.map((o, i) => `  ${i + 1}. ${o}`).join("\n") || "  1. Complete milestone roadmap\n  2. Pass automated test verification"}

3. TECHNICAL ARCHITECTURE & STACK
${technicalArchitecture || "Full-stack implementation as detailed in milestone scopes."}

4. FUNCTIONAL REQUIREMENTS
${functionalRequirements.map((r, i) => `  FR-${i + 1}: ${r}`).join("\n") || "  FR-1: System development and testing"}

5. VERIFIABLE ACCEPTANCE CRITERIA
${acceptanceCriteria.map((c, i) => `  [x] ${c}`).join("\n") || "  [x] Deliverables meet documented criteria"}

================================================================================
End of Document — Uploaded and verified on Nexum
================================================================================
`.trim();

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = document.name.endsWith(".pdf")
      ? document.name.replace(/\.pdf$/i, ".txt")
      : `${document.name}.txt`;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!document || !document.name) {
    return null;
  }

  const isPdf = document.name.toLowerCase().endsWith(".pdf") || document.type?.includes("pdf");

  const formattedDate = (() => {
    if (!document.uploadedAt) return "Uploaded by Client";
    if (document.uploadedAt.includes("T")) {
      try {
        return new Date(document.uploadedAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      } catch {
        return "Uploaded by Client";
      }
    }
    return document.uploadedAt;
  })();

  return (
    <>
      {/* 1. Simple SaaS Attachment Card */}
      <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/70 transition-all shadow-2xs gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-slate-900 truncate max-w-sm sm:max-w-md">
                {document.name.replace(/[-_]+/g, " ")}
              </p>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase shrink-0">
                {isPdf ? "PDF" : "DOC"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span>{document.size || "Original Document"}</span>
              <span>·</span>
              <span>{formattedDate}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsViewerOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
          >
            View
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#4f46e5] hover:bg-[#4338ca] transition shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Document Viewer Modal */}
      {isViewerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:px-6 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900 truncate">{document.name}</h3>
                  <p className="text-[11px] text-slate-500">
                    Original specification document provided by client during intake
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {document.dataUrl && (
                  <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/70 border border-slate-200 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setViewMode("embedded")}
                      className={`px-2.5 py-1 rounded-md transition ${
                        viewMode === "embedded" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Original PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("formatted")}
                      className={`px-2.5 py-1 rounded-md transition ${
                        viewMode === "formatted" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Readable Text
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePrint}
                  className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
                  title="Print / Save as PDF"
                >
                  <Printer className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsViewerOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/50">
              {(document.dataUrl || document.url) && viewMode === "embedded" ? (
                <div className="w-full h-[680px] bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <iframe
                    src={document.dataUrl || document.url}
                    className="w-full h-full border-0"
                    title={document.name}
                  />
                </div>
              ) : (
                <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-6 text-slate-900">
                  {/* Document Header Badge */}
                  <div className="pb-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black tracking-widest text-[#4f46e5] uppercase">
                          Nexum Client Specification Intake
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Document
                        </span>
                      </div>
                      <h1 className="text-xl font-black text-slate-900 font-heading mt-1">
                        {projectTitle}
                      </h1>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">{document.name}</p>
                      <p>{document.uploadedAt || "Uploaded during project intake"}</p>
                    </div>
                  </div>

                  {/* Metadata Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Category
                      </span>
                      <span className="font-semibold text-slate-800">{category || "Software Development"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Budget Target
                      </span>
                      <span className="font-semibold text-slate-800">{budget || "Fixed Price Escrow"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Timeline
                      </span>
                      <span className="font-semibold text-slate-800">{timeline || "Sprint-based"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Client Partner
                      </span>
                      <span className="font-semibold text-slate-800">{clientName}</span>
                    </div>
                  </div>

                  {/* 1. Overview */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                      1. Overview & Business Problem
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50/70 p-4 rounded-xl border border-slate-100 whitespace-pre-line">
                      {overview || "Project requirements, engineering deliverables, and milestone specifications."}
                    </p>
                  </div>

                  {/* 2. Objectives */}
                  {objectives.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                        2. Key Objectives & Success Metrics
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {objectives.map((obj, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 flex items-start gap-2.5"
                          >
                            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{obj}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Technical Architecture */}
                  {technicalArchitecture && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                        3. Technical Architecture & Tech Stack
                      </h3>
                      <div className="p-4 rounded-xl bg-[#eef2ff]/40 border border-[#e0e7ff] text-xs sm:text-sm text-slate-800 font-mono">
                        {technicalArchitecture}
                      </div>
                    </div>
                  )}

                  {/* 4. Functional Requirements */}
                  {functionalRequirements.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                        4. Functional Requirements
                      </h3>
                      <ul className="space-y-2 text-xs text-slate-700">
                        {functionalRequirements.map((req, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50/70 border border-slate-100"
                          >
                            <span className="font-mono font-bold text-[#4f46e5]">FR-{i + 1}:</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 5. Verifiable Acceptance Criteria */}
                  {acceptanceCriteria.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                        5. Verifiable Acceptance Criteria
                      </h3>
                      <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/60 space-y-2">
                        {acceptanceCriteria.map((crit, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-slate-800">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{crit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer Seal */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Verified client intake specification · Mutually accessible</span>
                    </span>
                    <span>Document: {document.name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


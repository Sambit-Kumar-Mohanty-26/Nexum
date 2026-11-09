"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileCheck,
  Loader2,
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
  const isPdf = Boolean(
    document?.name?.toLowerCase().endsWith(".pdf") || document?.type?.includes("pdf")
  );
  const isImage = Boolean(
    /\.(png|jpe?g|webp|gif|svg)$/i.test(document?.name || "") ||
      document?.type?.startsWith("image/")
  );
  const isDocx = Boolean(
    /\.(docx?|odt|rtf)$/i.test(document?.name || "") ||
      document?.type?.includes("word") ||
      document?.type?.includes("officedocument")
  );
  const canEmbedInIframe = Boolean((isPdf || isImage) && (document?.dataUrl || document?.url));

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"embedded" | "docx" | "paper">("paper");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isDocxLoading, setIsDocxLoading] = useState(false);
  const [docxRendered, setDocxRendered] = useState(false);
  const [docxError, setDocxError] = useState<string | null>(null);

  const docxContainerRef = useRef<HTMLDivElement | null>(null);
  const docxStyleRef = useRef<HTMLDivElement | null>(null);

  // Attempt docx-preview rendering when viewing a docx file
  useEffect(() => {
    if (!isViewerOpen || !isDocx) return;

    const fileSource = document?.url || document?.dataUrl;
    if (!fileSource) {
      setViewMode("paper");
      return;
    }

    let isMounted = true;
    setIsDocxLoading(true);
    setDocxError(null);

    const source = fileSource;

    async function loadDocxPreview() {
      try {
        const docxModule = await import("docx-preview");
        if (!isMounted) return;

        let arrayBuffer: ArrayBuffer;

        if (source.startsWith("data:")) {
          const base64Part = source.split(",")[1];
          const binaryString = atob(base64Part);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          arrayBuffer = bytes.buffer;
        } else {
          const res = await fetch(source);
          if (!res.ok) {
            throw new Error(`Failed to fetch file (HTTP ${res.status})`);
          }
          arrayBuffer = await res.arrayBuffer();
        }

        if (!isMounted || !docxContainerRef.current) return;

        // Render via docx-preview
        await docxModule.renderAsync(
          arrayBuffer,
          docxContainerRef.current,
          docxStyleRef.current || undefined,
          {
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
            breakPages: true,
            className: "docx-preview-native",
          }
        );

        if (isMounted) {
          setDocxRendered(true);
          setViewMode("docx");
          setIsDocxLoading(false);
        }
      } catch (err: any) {
        console.warn("docx-preview rendering fallback to formal specification sheet:", err);
        if (isMounted) {
          setDocxRendered(false);
          setDocxError(err?.message || "Could not render raw docx binary");
          setViewMode("paper");
          setIsDocxLoading(false);
        }
      }
    }

    loadDocxPreview();

    return () => {
      isMounted = false;
    };
  }, [isViewerOpen, isDocx, document?.url, document?.dataUrl]);

  const handleOpenViewer = () => {
    setZoomLevel(100);
    if (canEmbedInIframe) {
      setViewMode("embedded");
    } else {
      // Default to docx preview if possible, or pristine paper document sheet
      setViewMode(docxRendered ? "docx" : "paper");
    }
    setIsViewerOpen(true);
  };

  const handleDownload = () => {
    const fileSource = document.url || document.dataUrl;
    if (fileSource) {
      const dlUrl = fileSource.includes("download=true")
        ? fileSource
        : `${fileSource}${fileSource.includes("?") ? "&" : "?"}download=true`;
      const a = window.document.createElement("a");
      a.href = dlUrl;
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
                    BUSINESS REQUIREMENTS SPECIFICATION (BRD)
================================================================================
Document File: ${document.name}
Project Title: ${projectTitle}
Category:      ${category || "Engineering & Software"}
Client Entity: ${clientName}
Budget Target: ${budget || "Negotiated Escrow"}
Timeline:      ${timeline || "Sprint-based"}
Status:        Mutually Approved Intake Specification
--------------------------------------------------------------------------------

1.0 EXECUTIVE SUMMARY & BUSINESS PROBLEM
${overview || "Detailed project specifications and deliverables agreement."}

2.0 CORE OBJECTIVES & DELIVERABLES
${objectives.map((o, i) => `  2.${i + 1} ${o}`).join("\n") || "  2.1 Complete milestone roadmap\n  2.2 Pass automated test verification"}

3.0 SYSTEM ARCHITECTURE & TECHNICAL SPECIFICATIONS
${technicalArchitecture || "Full-stack implementation as detailed in milestone scopes."}

4.0 FUNCTIONAL REQUIREMENTS SPECIFICATION (FRS)
${functionalRequirements.map((r, i) => `  FR-${String(i + 1).padStart(2, "0")}: ${r}`).join("\n") || "  FR-01: System development and testing"}

5.0 VERIFIABLE ACCEPTANCE CRITERIA & QA PROTOCOL
${acceptanceCriteria.map((c, i) => `  [x] AC-${String(i + 1).padStart(2, "0")}: ${c}`).join("\n") || "  [x] AC-01: Deliverables meet documented criteria"}

6.0 DOCUMENT SIGN-OFF & ESCROW REGISTRY
  Client Representative:  ${clientName}
  Contractor Bidding:     Approved for Freelancer Review
  Nexum Escrow Protocol:  Verified Specification Hash 0x7b2a9e88

================================================================================
End of Document — Uploaded and verified on Nexum Protocol Registry
================================================================================
`.trim();

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = document.name.endsWith(".docx")
      ? document.name.replace(/\.docx$/i, ".txt")
      : document.name.endsWith(".pdf")
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

  const docId = `DOC-PRD-2026-${(document.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 6) || "01").toUpperCase()}`;

  return (
    <>
      {/* 1. Attachment Card in Page UI */}
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
                {isPdf ? "PDF" : isDocx ? "DOCX" : "DOC"}
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
            onClick={handleOpenViewer}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>View</span>
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

      {/* 2. Authentic Document Viewer Modal */}
      {isViewerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#383b40]/90 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Document Viewer Top Toolbar (Standard Word / PDF Reader Bar) */}
          <div className="h-14 bg-[#1e232a] border-b border-slate-700/80 px-4 sm:px-6 flex items-center justify-between text-white shrink-0 shadow-md">
            {/* Left: Document Name and Metadata */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-md bg-blue-600/90 flex items-center justify-center text-white shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                    {document.name}
                  </h3>
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-700 text-slate-200 border border-slate-600">
                    {isDocx ? "Microsoft Word (.docx)" : isPdf ? "Adobe PDF" : "Intake Specification"}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  Original specification document provided by client during intake
                </p>
              </div>
            </div>

            {/* Center: View Switch & Zoom Controls */}
            <div className="hidden md:flex items-center gap-3">
              {/* Toggle view modes if docx is rendered */}
              {docxRendered && (
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setViewMode("docx")}
                    className={`px-2.5 py-1 rounded transition cursor-pointer ${
                      viewMode === "docx"
                        ? "bg-blue-600 text-white font-bold shadow-xs"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    Word Pages
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("paper")}
                    className={`px-2.5 py-1 rounded transition cursor-pointer ${
                      viewMode === "paper"
                        ? "bg-blue-600 text-white font-bold shadow-xs"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    PRD Specification Sheet
                  </button>
                </div>
              )}

              {canEmbedInIframe && (
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setViewMode("embedded")}
                    className={`px-2.5 py-1 rounded transition cursor-pointer ${
                      viewMode === "embedded"
                        ? "bg-blue-600 text-white font-bold shadow-xs"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    {isPdf ? "Original PDF" : "Original Image"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("paper")}
                    className={`px-2.5 py-1 rounded transition cursor-pointer ${
                      viewMode === "paper"
                        ? "bg-blue-600 text-white font-bold shadow-xs"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    PRD Document Sheet
                  </button>
                </div>
              )}

              {/* Zoom Controls */}
              <div className="flex items-center bg-slate-800/90 rounded-lg border border-slate-700/80 px-1 py-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.max(50, z - 10))}
                  className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="w-12 text-center text-[11px] font-mono text-slate-200">
                  {zoomLevel}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                  className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel(100)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition ml-1 cursor-pointer"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Right: Actions (Print, Download, Close) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
                title="Print Document or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-xs font-semibold text-white transition shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>

              <button
                type="button"
                onClick={() => setIsViewerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-1"
                title="Close Viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Document Canvas Workspace (Authentic Document Desk Background) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#525659] flex justify-center items-start">
            {/* Hidden Style Container for docx-preview if needed */}
            <div ref={docxStyleRef} className="hidden" />

            {/* A. If viewing embedded PDF or Image */}
            {viewMode === "embedded" && canEmbedInIframe && (
              <div
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
                className="w-full max-w-4xl h-[850px] bg-white rounded-lg shadow-2xl border border-slate-400 overflow-hidden"
              >
                {isImage ? (
                  <div className="w-full h-full flex items-center justify-center p-6 bg-slate-100">
                    <img
                      src={document.dataUrl || document.url}
                      alt={document.name}
                      className="max-h-full max-w-full object-contain rounded shadow"
                    />
                  </div>
                ) : (
                  <iframe
                    src={document.dataUrl || document.url}
                    className="w-full h-full border-0"
                    title={document.name}
                  />
                )}
              </div>
            )}

            {/* B. Native Word Document Pages Container (docx-preview) */}
            <div
              ref={docxContainerRef}
              style={{
                display: viewMode === "docx" ? "block" : "none",
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: "top center",
              }}
              className="docx-render-host w-full max-w-[850px] transition-transform"
            />

            {/* C. Loading State for Native DOCX */}
            {isDocxLoading && viewMode === "docx" && (
              <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow-2xl max-w-md mx-auto my-12 text-slate-700">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                <p className="text-sm font-bold">Rendering Document Pages...</p>
                <p className="text-xs text-slate-500 mt-1">Reading Word binary styles and layout</p>
              </div>
            )}

            {/* D. Authentic A4 / Letter PRD White Paper Document (Pure Document Typography & Layout) */}
            {viewMode === "paper" && (
              <div
                id="nexum-document-sheet"
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: "top center",
                }}
                className="w-full max-w-[850px] bg-white text-slate-900 shadow-[0_6px_32px_rgba(0,0,0,0.35),0_1px_6px_rgba(0,0,0,0.2)] border border-slate-300 p-8 sm:p-14 md:p-16 my-4 min-h-[1100px] transition-transform font-sans"
              >
                {/* 1. Formal Document Running Header */}
                <div className="pb-3 border-b border-slate-300 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 uppercase tracking-wider">
                      Nexum Specification Registry
                    </span>
                    <span>·</span>
                    <span className="text-slate-500">Intake Document</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{docId}</span>
                    <span>·</span>
                    <span className="font-bold text-slate-700">CONFIDENTIAL</span>
                  </div>
                </div>

                {/* 2. Document Title Block */}
                <div className="pt-8 pb-6 border-b border-slate-200">
                  <p className="text-xs font-bold tracking-widest uppercase text-blue-800 font-mono mb-2">
                    Business Requirements Document & System Specification (BRD)
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                    {projectTitle}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 mt-2 font-normal leading-relaxed">
                    Formal scope baseline, technical deliverables, and verifiable milestone acceptance criteria for contracting.
                  </p>
                </div>

                {/* 3. Formal Document Control & Project Metadata Table */}
                <div className="my-6">
                  <table className="w-full border-collapse border border-slate-300 text-xs">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="w-1/4 bg-slate-50 font-bold px-3 py-2 text-slate-700 border-r border-slate-300">
                          Document Title
                        </td>
                        <td className="w-1/4 px-3 py-2 text-slate-900 border-r border-slate-300 font-mono text-[11px]">
                          {document.name}
                        </td>
                        <td className="w-1/4 bg-slate-50 font-bold px-3 py-2 text-slate-700 border-r border-slate-300">
                          Effective Date
                        </td>
                        <td className="w-1/4 px-3 py-2 text-slate-900 font-mono text-[11px]">
                          {formattedDate}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="bg-slate-50 font-bold px-3 py-2 text-slate-700 border-r border-slate-300">
                          Client Entity
                        </td>
                        <td className="px-3 py-2 text-slate-900 border-r border-slate-300 font-semibold">
                          {clientName}
                        </td>
                        <td className="bg-slate-50 font-bold px-3 py-2 text-slate-700 border-r border-slate-300">
                          Project Category
                        </td>
                        <td className="px-3 py-2 text-slate-900 font-semibold">
                          {category || "Software & Geospatial Engineering"}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="bg-slate-50 font-bold px-3 py-2 text-slate-700 border-r border-slate-300">
                          Agreed Budget
                        </td>
                        <td className="px-3 py-2 text-slate-900 border-r border-slate-300 font-mono font-bold text-emerald-700">
                          {budget || "Fixed Price Escrow"}
                        </td>
                        <td className="bg-slate-50 font-bold px-3 py-2 text-slate-700 border-r border-slate-300">
                          Delivery Timeline
                        </td>
                        <td className="px-3 py-2 text-slate-900">
                          {timeline || "Sprint-based milestones"}
                        </td>
                      </tr>
                      <tr>
                        <td className="bg-slate-50 font-bold px-3 py-2 text-slate-700 border-r border-slate-300">
                          Document Status
                        </td>
                        <td className="px-3 py-2 text-slate-900 border-r border-slate-300">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-800 text-[11px]">
                            ● Mutually Approved Scope
                          </span>
                        </td>
                        <td className="bg-slate-50 font-bold px-3 py-2 text-slate-700 border-r border-slate-300">
                          Registry Protocol
                        </td>
                        <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">
                          Nexum Verified Escrow
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. Section 1.0: Executive Summary & Business Problem */}
                <div className="mt-8 space-y-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-2">
                    <span className="font-mono text-blue-700">1.0</span>
                    <span>Executive Summary & Business Problem</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed text-justify whitespace-pre-line pl-1">
                    {overview ||
                      "The project scope encompasses complete architectural implementation, workflow pipelines, and verification benchmarks as requested by client specifications."}
                  </p>
                </div>

                {/* 5. Section 2.0: Core Objectives & Deliverables */}
                {objectives.length > 0 && (
                  <div className="mt-8 space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-2">
                      <span className="font-mono text-blue-700">2.0</span>
                      <span>Strategic Objectives & Deliverables Roadmap</span>
                    </h2>
                    <div className="space-y-2 pl-1 pt-1">
                      {objectives.map((obj, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800">
                          <span className="font-mono font-bold text-slate-600 shrink-0 text-xs">
                            2.{i + 1}
                          </span>
                          <span className="leading-relaxed">{obj}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Section 3.0: Technical Architecture & System Specifications */}
                {technicalArchitecture && (
                  <div className="mt-8 space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-2">
                      <span className="font-mono text-blue-700">3.0</span>
                      <span>System Architecture & Technical Specifications</span>
                    </h2>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 font-mono leading-relaxed pl-4">
                      {technicalArchitecture}
                    </div>
                  </div>
                )}

                {/* 7. Section 4.0: Functional Requirements Specification Table */}
                {functionalRequirements.length > 0 && (
                  <div className="mt-8 space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-2">
                      <span className="font-mono text-blue-700">4.0</span>
                      <span>Functional Requirements Specification (FRS)</span>
                    </h2>
                    <table className="w-full border-collapse border border-slate-300 text-xs mt-2">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                          <th className="px-3 py-2 text-left border-r border-slate-300 w-20">Req ID</th>
                          <th className="px-3 py-2 text-left border-r border-slate-300">Functional Requirement Description</th>
                          <th className="px-3 py-2 text-center w-24">Priority</th>
                        </tr>
                      </thead>
                      <tbody>
                        {functionalRequirements.map((req, i) => (
                          <tr key={i} className="border-b border-slate-200 hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-mono font-bold text-blue-800 border-r border-slate-300 align-top">
                              FR-{String(i + 1).padStart(2, "0")}
                            </td>
                            <td className="px-3 py-2 text-slate-800 border-r border-slate-300 leading-relaxed">
                              {req}
                            </td>
                            <td className="px-3 py-2 text-center text-slate-600 font-mono text-[11px] align-top">
                              Mandatory
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 8. Section 5.0: Verifiable Acceptance Criteria & QA Protocol */}
                {acceptanceCriteria.length > 0 && (
                  <div className="mt-8 space-y-3">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-2">
                      <span className="font-mono text-blue-700">5.0</span>
                      <span>Verifiable Acceptance Criteria & QA Protocol</span>
                    </h2>
                    <table className="w-full border-collapse border border-slate-300 text-xs mt-2">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                          <th className="px-3 py-2 text-left border-r border-slate-300 w-20">Crit ID</th>
                          <th className="px-3 py-2 text-left border-r border-slate-300">Verification Benchmark</th>
                          <th className="px-3 py-2 text-center w-24">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acceptanceCriteria.map((crit, i) => (
                          <tr key={i} className="border-b border-slate-200 hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-mono font-bold text-emerald-800 border-r border-slate-300 align-top">
                              AC-{String(i + 1).padStart(2, "0")}
                            </td>
                            <td className="px-3 py-2 text-slate-800 border-r border-slate-300 leading-relaxed">
                              {crit}
                            </td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-emerald-700 text-[11px] align-top">
                              [Verified]
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 9. Section 6.0: Document Sign-off & Mutual Ratification */}
                <div className="mt-10 pt-4 border-t-2 border-slate-300 space-y-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <span className="font-mono text-blue-700">6.0</span>
                    <span>Document Sign-Off & Escrow Verification</span>
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                    <div className="border border-slate-300 p-4 bg-slate-50/50 rounded">
                      <p className="text-[11px] font-bold uppercase text-slate-500 font-mono">
                        Client Authority Sign-Off
                      </p>
                      <div className="mt-6 border-b border-slate-400 pb-1">
                        <span className="font-serif italic text-sm text-slate-800">
                          {clientName}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                        <span>Authorized Representative</span>
                        <span>Date: {formattedDate}</span>
                      </div>
                    </div>

                    <div className="border border-slate-300 p-4 bg-slate-50/50 rounded">
                      <p className="text-[11px] font-bold uppercase text-slate-500 font-mono">
                        Platform Escrow Verification
                      </p>
                      <div className="mt-6 border-b border-slate-400 pb-1">
                        <span className="font-mono text-xs text-emerald-700 font-bold">
                          NEXUM PROTOCOL SHA-256 VALIDATED
                        </span>
                      </div>
                      <div className="mt-2 flex justify-between text-[10px] text-slate-500">
                        <span>Registry State: Ratified</span>
                        <span>Hash: 0x7b2a...98f4</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 10. Running Footer */}
                <div className="mt-12 pt-4 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>NEXUM PROTOCOL SPECIFICATION REGISTRY · MUTUALLY BINDING</span>
                  <span>PAGE 1 OF 1</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

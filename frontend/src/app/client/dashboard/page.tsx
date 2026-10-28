"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Zap,
  Lock,
  TrendingUp,
  FileCode,
  FileText,
  Check,
  CreditCard,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import { useAuth } from "@/context/AuthContext";
import { DEMO_USERS } from "@/lib/auth-types";

export default function ClientDashboardPage() {
  const { user, isLoading, loginAs } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("overview");

  // State for milestone 2 acceptance / release simulation
  const [milestone2Status, setMilestone2Status] = useState<"IN_REVIEW" | "APPROVED_AND_RELEASED">("IN_REVIEW");
  const [isCapturing, setIsCapturing] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Ensure logged in as Client
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "CLIENT")) {
      loginAs("CLIENT");
    }
  }, [user, isLoading, loginAs]);

  const client = user || DEMO_USERS.CLIENT;
  const freelancer = DEMO_USERS.FREELANCER_A;
  const candidatePriya = DEMO_USERS.FREELANCER_B;

  // Handle milestone acceptance & funds release
  const handleApproveAndRelease = async () => {
    setIsCapturing(true);
    showToast("Authenticating Dual SHA-256 acceptance & executing PayPal Sandbox capture...");

    try {
      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: "6DE714998H998261C",
          milestoneId: "m2_webhook_engine",
        }),
      });

      const data = await res.json().catch(() => ({}));

      setMilestone2Status("APPROVED_AND_RELEASED");
      showToast(
        data.status === "COMPLETED"
          ? "Milestone 2 accepted! $1,500.00 USD captured and released to Rohan Verma."
          : "Milestone 2 accepted and marked released in consensus state machine."
      );
    } catch {
      setMilestone2Status("APPROVED_AND_RELEASED");
      showToast("Milestone 2 approved! Ledger state updated to RELEASED.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRequestRevision = (e: React.FormEvent) => {
    e.preventDefault();
    setShowRevisionModal(false);
    showToast("Revision request logged on immutable audit trail and sent to Rohan Verma.");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans selection:bg-blue-600 selection:text-white">
      
      {/* 1. Left Navbar Sidebar */}
      <DashboardSidebar
        currentRole="CLIENT"
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <DashboardTopHeader
          roleLabel="Buyer Workspace"
          title={
            activeTab === "overview"
              ? "Overview"
              : activeTab === "milestones"
              ? "Milestone Schedule"
              : activeTab === "escrow"
              ? "PayPal Escrow Rails"
              : "Consensus Audit Trail"
          }
          subtitle="Horizon Commerce LLC"
        />

        <main className="p-6 sm:p-8 max-w-6xl w-full mx-auto space-y-8 flex-1">
          
          {/* ==============================================================
              HERO PROJECT & AGREEMENT BANNER (CLEAN LIGHT THEME)
             ============================================================== */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              {/* Left: Client Profile Info */}
              <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-slate-200 shadow-xs shrink-0">
                  <Image
                    src={client.avatar}
                    alt={client.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      {client.name}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200">
                      {client.companyOrHandle}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                      Verified US Merchant
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-500 mb-2">
                    {client.title} · {client.location} · {client.timezone}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600">
                    <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>Dual SHA-256 Validated</span>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>PayPal Sandbox v1.2 Linked</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Active Agreement Badge & Hash */}
              <div className="flex flex-col items-start lg:items-end gap-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-right">
                <div className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                  Active Agreement Hash
                </div>
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-blue-700">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>canonical_v1.2_#9f8c2b7e</span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                  <span>Contractor: <strong className="text-slate-800">{freelancer.name}</strong></span>
                  <span className="text-slate-300">·</span>
                  <span className="text-emerald-700 font-bold">Locked ✓</span>
                </div>
              </div>

            </div>
          </section>

          {/* ==============================================================
              KEY FINANCIAL & ESCROW METRICS (CLEAN WHITE CARDS)
             ============================================================== */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1 */}
            <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-3">
                <span className="font-semibold">Authorized Budget Ceiling</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">$4,500.00</div>
              <div className="text-[11px] text-slate-500 mt-2 font-medium">
                Agreed across 4 total milestones
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-3">
                <span className="font-semibold">Funds in Escrow Custody</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Lock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                {milestone2Status === "IN_REVIEW" ? "$1,500.00" : "$0.00"}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 mt-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>
                  {milestone2Status === "IN_REVIEW"
                    ? "Milestone 2 locked in PayPal Sandbox"
                    : "Released upon client acceptance"}
                </span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-3">
                <span className="font-semibold">Released to Freelancer</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                {milestone2Status === "IN_REVIEW" ? "$1,200.00" : "$2,700.00"}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 mt-2 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>
                  {milestone2Status === "IN_REVIEW"
                    ? "Milestone 1 captured & paid"
                    : "Milestones 1 & 2 captured & paid"}
                </span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-3">
                <span className="font-semibold">Remaining Reserve</span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">$1,800.00</div>
              <div className="text-[11px] text-slate-500 mt-2 font-medium">
                Milestones 3 & 4 unallocated
              </div>
            </div>

          </section>

          {/* ==============================================================
              TAB CONTENT SWITCHER
             ============================================================== */}
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              
              {/* ⚡ ACTION REQUIRED: DELIVERABLE REVIEW SPOTLIGHT */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      Action Required: Deliverable Awaiting Review
                    </h2>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    Fund-Before-Work Rule Active
                  </span>
                </div>

                {milestone2Status === "IN_REVIEW" ? (
                  <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 p-6 sm:p-7 shadow-xs">
                    
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200/80">
                      <div>
                        <div className="text-xs font-mono font-bold text-amber-700 uppercase tracking-wider mb-1">
                          Delivered by Rohan Verma · Nov 28, 2026
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900">
                          Milestone 2: PayPal REST v2 Webhook Ingestion Engine
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 mt-1">
                          Escrow Amount: <strong className="text-slate-900 font-mono">$1,500.00 USD</strong> (Locked in PayPal Sandbox Order #6DE714998H998261C)
                        </p>
                      </div>

                      {/* Decision Buttons */}
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          disabled={isCapturing}
                          onClick={handleApproveAndRelease}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition shadow-sm flex items-center gap-2 cursor-pointer"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{isCapturing ? "Releasing Funds..." : "Approve & Release Funds ($1,500)"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowRevisionModal(true)}
                          className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition border border-slate-300 cursor-pointer shadow-2xs"
                        >
                          Request Revision
                        </button>
                      </div>
                    </div>

                    {/* Submitted Links & Test Criteria */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      <div className="space-y-3">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                          Submitted Artifacts
                        </div>
                        
                        <div className="space-y-2">
                          <a
                            href="https://github.com/proofloop/gateway/pull/42"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-500 transition group shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800">
                              <FileCode className="w-4 h-4 text-blue-600" />
                              <span>GitHub Pull Request #42</span>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition" />
                          </a>

                          <a
                            href="https://www.loom.com/share/proofloop-milestone2-demo"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-purple-500 transition group shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-800">
                              <FileText className="w-4 h-4 text-purple-600" />
                              <span>Loom Architecture Walkthrough</span>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition" />
                          </a>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                          Objective Criteria Check
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>SHA-256 webhook header matches PayPal Sandbox cert</span>
                          </div>
                          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>30s duplicate idempotency cache test passed</span>
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-emerald-200 bg-emerald-50 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      <div>
                        <h4 className="font-bold text-emerald-950 text-base">Milestone 2 Accepted & Released</h4>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          $1,500.00 USD captured and released to Rohan Verma. Milestone 3 is now unlocked for funding.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast("Initiating PayPal Sandbox order for Milestone 3 ($1,000)...")}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                    >
                      Fund Milestone 3 ($1,000) &rarr;
                    </button>
                  </div>
                )}
              </div>

              {/* MATCHED FREELANCERS DISCOVERY */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Matched Freelancers & Engineering Profiles
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">Explainable AI Match Rationale</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Rohan */}
                  <div className="p-5 rounded-2xl border border-blue-200 bg-white shadow-xs flex flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                          <Image src={freelancer.avatar} alt={freelancer.name} width={44} height={44} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{freelancer.name}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Active Contractor
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{freelancer.title}</p>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-blue-600">98% Match</div>
                        <div className="text-[11px] text-slate-500">$65/hr</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Specializes in PayPal Orders v2, Next.js architecture, and dual SHA-256 state machines. Verified Level 3.
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <span>Location: {freelancer.location}</span>
                      <span className="text-emerald-700 font-bold">Currently contracted</span>
                    </div>
                  </div>

                  {/* Priya */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                          <Image src={candidatePriya.avatar} alt={candidatePriya.name} width={44} height={44} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{candidatePriya.name}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Available
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{candidatePriya.title}</p>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-sm font-bold text-purple-600">94% Match</div>
                        <div className="text-[11px] text-slate-500">$55/hr</div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      UI/UX and design system architect with verifiable enterprise experience in high-fidelity prototypes.
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <span>Location: {candidatePriya.location}</span>
                      <button
                        type="button"
                        onClick={() => showToast("Consent-aware brief preview shared with Priya Sharma.")}
                        className="text-purple-600 hover:text-purple-700 font-bold cursor-pointer"
                      >
                        Share Brief &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MILESTONES */}
          {(activeTab === "milestones" || activeTab === "overview") && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Milestone Contract Schedule (Horizon Commerce LLC)
              </h2>

              <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-xs overflow-hidden">
                
                {/* M1 */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 grid place-items-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Milestone 1: Project Intake & Architecture PRD</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Approved & Released
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Completed Oct 26 · PayPal Order #4AB912048C881923K
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-sm font-bold text-slate-900">$1,200.00 USD</div>
                    <div className="text-[11px] text-emerald-600 font-semibold">Captured</div>
                  </div>
                </div>

                {/* M2 */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-blue-600 grid place-items-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Milestone 2: PayPal REST v2 Webhook Ingestion Engine</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          milestone2Status === "IN_REVIEW"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        }`}>
                          {milestone2Status === "IN_REVIEW" ? "Awaiting Review" : "Approved & Released"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        PayPal Order #6DE714998H998261C · Testable signature pass
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-sm font-bold text-slate-900">$1,500.00 USD</div>
                    <div className="text-[11px] text-blue-600 font-semibold">
                      {milestone2Status === "IN_REVIEW" ? "In Escrow Custody" : "Released"}
                    </div>
                  </div>
                </div>

                {/* M3 */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-75">
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-500 grid place-items-center shrink-0 mt-0.5">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Milestone 3: Dual SHA-256 State Machine & Ledger Replay</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Next to Fund
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Unlocks when M2 completes · Fund before work rule applies
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-sm font-bold text-slate-900">$1,000.00 USD</div>
                    <div className="text-[11px] text-slate-400">Unfunded</div>
                  </div>
                </div>

                {/* M4 */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-75">
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-500 grid place-items-center shrink-0 mt-0.5">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Milestone 4: Failover Simulator & Deduplication Verification</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Final Stage
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Contract conclusion and bilateral verification audit
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-sm font-bold text-slate-900">$800.00 USD</div>
                    <div className="text-[11px] text-slate-400">Unfunded</div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: PAYPAL ESCROW */}
          {activeTab === "escrow" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                PayPal Sandbox Escrow Transactions & Order Lifecycle
              </h2>

              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Order #6DE714998H998261C</h3>
                    <p className="text-xs text-slate-500">Milestone 2 · Pre-funded before work started</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {milestone2Status === "IN_REVIEW" ? "STATUS: CREATED (ESCROW)" : "STATUS: COMPLETED"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Gross Amount</div>
                    <div className="font-bold text-slate-900 text-sm">$1,500.00 USD</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Captured Net</div>
                    <div className="font-bold text-slate-900 text-sm">$1,500.00 USD</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Contractor Receiver</div>
                    <div className="font-semibold text-slate-700 text-[11px] truncate">sb-rohan-seller@proofloop.demo</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Webhook Verification</div>
                    <div className="font-semibold text-emerald-700 text-[11px]">SHA-256 Passed ✓</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Immutable Consensus Audit Trail (Dual SHA-256 Log)
              </h2>

              <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-xs font-mono text-xs overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-900">DELIVERABLE_SUBMITTED</span>
                    <span className="text-slate-500">Rohan Verma &rarr; Milestone 2</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">hash: 0x9f8c2b7e...</span>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="font-bold text-slate-900">PAYPAL_ORDER_CREATED</span>
                    <span className="text-slate-500">Order #6DE714998H998261C ($1,500.00 USD)</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">hash: 0x812d4a19...</span>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-900">AGREEMENT_LOCKED</span>
                    <span className="text-slate-500">Dual approval confirmed by Alex Rivera & Rohan Verma</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">hash: 0x24ff9001...</span>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Revision Request Modal */}
      {showRevisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Request Deliverable Revision</h3>
            <p className="text-xs text-slate-500">
              Provide specific objective reasons aligned with the agreed criteria.
            </p>
            <form onSubmit={handleRequestRevision} className="space-y-4">
              <textarea
                rows={4}
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="E.g. The automated test output for 30s duplicate replay needs additional assert logs..."
                required
                className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow-xs"
                >
                  Send Revision Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

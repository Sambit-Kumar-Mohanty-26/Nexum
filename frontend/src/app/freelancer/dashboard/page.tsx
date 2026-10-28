"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  DollarSign,
  ShieldCheck,
  Clock,
  CheckCircle2,
  ExternalLink,
  Send,
  FileCode,
  FileText,
  Lock,
  Layers,
  Zap,
  TrendingUp,
  Inbox,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import { useAuth } from "@/context/AuthContext";
import { DEMO_USERS } from "@/lib/auth-types";

export default function FreelancerDashboardPage() {
  const { user, isLoading, loginAs } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Deliverable submission state
  const [githubPrUrl, setGithubPrUrl] = useState("https://github.com/proofloop/gateway/pull/42");
  const [loomDemoUrl, setLoomDemoUrl] = useState("https://www.loom.com/share/proofloop-milestone2-demo");
  const [submissionNotes, setSubmissionNotes] = useState(
    "All test criteria met: PayPal REST v2 order capture verified, SHA-256 signature validation passing with mock payloads, idempotency cache deduplicates within 30s window."
  );
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Ensure logged in as Freelancer
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "FREELANCER")) {
      loginAs("FREELANCER_A");
    }
  }, [user, isLoading, loginAs]);

  const freelancer = user || DEMO_USERS.FREELANCER_A;
  const client = DEMO_USERS.CLIENT;

  const handleUpdateDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSubmitModal(false);
    showToast("Deliverable submission updated & recorded to consensus ledger.");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans selection:bg-blue-600 selection:text-white">
      
      {/* 1. Left Navbar Sidebar */}
      <DashboardSidebar
        currentRole="FREELANCER"
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <DashboardTopHeader
          roleLabel="Freelancer Delivery Rail"
          title={
            activeTab === "overview"
              ? "Overview"
              : activeTab === "milestones"
              ? "Milestones & Deliverables"
              : activeTab === "escrow"
              ? "PayPal Payouts"
              : "Audit Trail"
          }
          subtitle="Contract with Horizon Commerce LLC"
        />

        <main className="p-6 sm:p-8 max-w-6xl w-full mx-auto space-y-8 flex-1">
          
          {/* ==============================================================
              HERO PROFILE & IMMUTABLE AGREEMENT BANNER (CLEAN LIGHT THEME)
             ============================================================== */}
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              {/* Left: User Info */}
              <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-slate-200 shadow-xs shrink-0">
                  <Image
                    src={freelancer.avatar}
                    alt={freelancer.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      {freelancer.name}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200">
                      {freelancer.companyOrHandle}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200">
                      ✓ Verified Level 3
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-500 mb-2">
                    {freelancer.title} · {freelancer.location}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600">
                    <span className="flex items-center gap-1.5 text-blue-700 font-semibold">
                      <DollarSign className="w-3.5 h-3.5" />
                      <strong>$65.00 USD/hr</strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      <span>35 hrs/wk Available</span>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500">Timezone: UTC+5:30 (IST)</span>
                  </div>
                </div>
              </div>

              {/* Right: Immutable Dual-Approved Agreement Hash Badge */}
              <div className="flex flex-col items-start lg:items-end gap-1.5 p-4 rounded-xl bg-slate-50 border border-slate-200/90 text-right">
                <div className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
                  Active Agreement Hash
                </div>
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-blue-700">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>canonical_v1.2_#9f8c2b7e</span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                  <span>Client: <strong className="text-slate-800">{client.name}</strong></span>
                  <span className="text-slate-300">·</span>
                  <span className="text-emerald-700 font-bold">Dual Approved ✓</span>
                </div>
              </div>

            </div>
          </section>

          {/* ==============================================================
              KEY METRIC CARDS (CLEAN WHITE CARDS)
             ============================================================== */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1 */}
            <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-3">
                <span className="font-semibold">Total Earned (Paid Out)</span>
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">$2,700.00</div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 mt-2 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+$1,200.00 from Milestone 1</span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-3">
                <span className="font-semibold">Locked in Escrow</span>
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Lock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">$1,500.00</div>
              <div className="flex items-center gap-1.5 text-[11px] text-blue-700 mt-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Milestone 2 awaiting client review</span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-3">
                <span className="font-semibold">Milestone Pipeline</span>
                <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">2 / 4</div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-2 font-medium">
                <span className="text-purple-700 font-bold">50% Complete</span>
                <span>· 1 In Review, 2 Queued</span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-3">
                <span className="font-semibold">On-Time Acceptance</span>
                <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">100%</div>
              <div className="text-[11px] text-slate-500 mt-2 font-medium">
                5 of 5 accepted · 0 dispute holds
              </div>
            </div>

          </section>

          {/* ==============================================================
              TAB CONTENT SWITCHER
             ============================================================== */}
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              
              {/* CURRENT ACTIVE STAGE SPOTLIGHT CARD */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <span>Active Project: Bilateral E-Commerce Payment Rails</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Funded Escrow
                      </span>
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      Client: {client.name} ({client.companyOrHandle}) · Target: Nov 24, 2026
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm transition shadow-xs cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit / Update Deliverables</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/40 via-white to-blue-50/20 p-6 sm:p-7 shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200/80">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-700 uppercase tracking-wider mb-1">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                        <span>Current Deliverable Stage · Milestone 2</span>
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900">
                        PayPal REST v2 Orders Webhook Ingestion Engine
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Awaiting Client Approval
                      </span>
                      <span className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold bg-slate-100 text-slate-900 border border-slate-200">
                        $1,500.00 USD
                      </span>
                    </div>
                  </div>

                  {/* Testable Criteria Checklist */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span>SHA-256 Signature Verify</span>
                        <span className="text-emerald-700 text-xs">✓ Pass</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Verifies signature header against PayPal Sandbox public cert.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span>30s Idempotent Window</span>
                        <span className="text-emerald-700 text-xs">✓ Pass</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Duplicate webhook replay returns HTTP 200 without double-capture.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                        <span>Timeout Self-Recovery</span>
                        <span className="text-emerald-700 text-xs">✓ Pass</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Orders v2 GET reconciliation resumes state machine gracefully.
                      </p>
                    </div>
                  </div>

                  {/* Submitted Links */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200 text-xs font-mono shadow-2xs">
                    <div className="space-y-1">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Submitted Artifacts</div>
                      <div className="flex flex-wrap items-center gap-3 text-slate-700">
                        <a
                          href={githubPrUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-semibold underline underline-offset-2"
                        >
                          <FileCode className="w-3.5 h-3.5" />
                          <span>Pull Request #42</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="text-slate-300">·</span>
                        <a
                          href={loomDemoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-purple-600 hover:text-purple-700 font-semibold underline underline-offset-2"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Loom Walkthrough (4m 20s)</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Payment Release Trigger</div>
                      <div className="text-amber-800 font-bold text-[11px]">
                        Funds release on Alex Rivera acceptance
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* OPPORTUNITY INBOX (LEADS) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      Opportunity Inbox
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      1 New Lead
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">Only authorized client briefs appear here</span>
                </div>

                <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xs hover:border-purple-300 transition">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        96% AI Match
                      </span>
                      <span className="text-xs text-slate-500">· Stated Budget Fit: High</span>
                      <span className="text-xs text-slate-500">· Timeline: 3 Weeks</span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Enterprise Smart Escrow Integration for Solana Pay
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Client is building cross-border payment settlement rails requiring verifiable bilateral state machines and webhook ingest recovery.
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-600 pt-1">
                      <span>Client: <strong className="text-slate-900">FinTech Labs Inc.</strong></span>
                      <span>Budget: <strong className="text-slate-900">$3,200 – $4,800 USD</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-wrap lg:flex-col items-center gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => showToast("Opening AI-Assisted Proposal Editor for this lead...")}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm transition shadow-xs cursor-pointer"
                    >
                      Review Scope & Quote &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => showToast("Question thread opened with FinTech Labs.")}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition border border-slate-300 cursor-pointer shadow-2xs"
                    >
                      Ask Clarification
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MILESTONES */}
          {(activeTab === "milestones" || activeTab === "overview") && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Milestone Contract Schedule
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
                          Accepted & Paid
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Approved by Alex Rivera on Oct 26 · PayPal Order #4AB912048C881923K
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-sm font-bold text-slate-900">$1,200.00 USD</div>
                    <div className="text-[11px] text-emerald-600 font-semibold">Funds Released</div>
                  </div>
                </div>

                {/* M2 */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 text-blue-600 grid place-items-center shrink-0 mt-0.5">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Milestone 2: PayPal REST v2 Webhook Ingestion Engine</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          In Review
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Deliverables submitted · PayPal Order #6DE714998H998261C in escrow
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-sm font-bold text-slate-900">$1,500.00 USD</div>
                    <div className="text-[11px] text-blue-600 font-semibold">In Escrow Custody</div>
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
                          Queued
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Unlocks upon client acceptance of Milestone 2 · Due Nov 12
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-sm font-bold text-slate-900">$1,000.00 USD</div>
                    <div className="text-[11px] text-slate-400">To Be Funded</div>
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
                          Final Phase
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Contract completion & bilateral sign-off · Due Nov 24
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-sm font-bold text-slate-900">$800.00 USD</div>
                    <div className="text-[11px] text-slate-400">To Be Funded</div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: PAYPAL ESCROW */}
          {activeTab === "escrow" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                PayPal Sandbox Escrow Payouts & Transaction History
              </h2>

              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Payout Destination: sb-rohan-seller@proofloop.demo</h3>
                    <p className="text-xs text-slate-500">Verified PayPal Sandbox Merchant Account (India)</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    PAYOUT READY
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Lifetime Released</div>
                    <div className="font-bold text-slate-900 text-sm">$2,700.00 USD</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-bold">In Escrow (Pending)</div>
                    <div className="font-bold text-slate-900 text-sm">$1,500.00 USD</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Settlement Fee</div>
                    <div className="font-semibold text-slate-700 text-[11px]">0.00 USD (Sandbox)</div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase font-bold">State Machine Reconciled</div>
                    <div className="font-semibold text-emerald-700 text-[11px]">Sync Complete ✓</div>
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
                    <span className="text-slate-600">Rohan Verma &rarr; Milestone 2</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">hash: 0x9f8c2b7e...</span>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="font-bold text-slate-900">PAYPAL_ORDER_CREATED</span>
                    <span className="text-slate-600">Order #6DE714998H998261C ($1,500.00 USD)</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">hash: 0x812d4a19...</span>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-900">AGREEMENT_LOCKED</span>
                    <span className="text-slate-600">Dual approval confirmed by Alex Rivera & Rohan Verma</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">hash: 0x24ff9001...</span>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Submit Deliverables Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 text-slate-900 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Submit Milestone 2 Deliverable</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Provide verifiable artifact links for Alex Rivera&apos;s review
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateDeliverable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  GitHub Pull Request / Repository URL
                </label>
                <input
                  type="url"
                  value={githubPrUrl}
                  onChange={(e) => setGithubPrUrl(e.target.value)}
                  required
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Loom Demo Video / Walkthrough URL
                </label>
                <input
                  type="url"
                  value={loomDemoUrl}
                  onChange={(e) => setLoomDemoUrl(e.target.value)}
                  required
                  className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Test Pass Evidence & Implementation Notes
                </label>
                <textarea
                  rows={3}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-xs cursor-pointer"
                >
                  Confirm & Notify Client
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

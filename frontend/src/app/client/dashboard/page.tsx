"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Layers,
  Zap,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import ClientOverviewHeader from "@/components/client/ClientOverviewHeader";
import ClientFinancialSummary from "@/components/client/ClientFinancialSummary";
import ActionRequiredCard from "@/components/client/ActionRequiredCard";
import RecommendedFreelancers from "@/components/client/RecommendedFreelancers";
import MilestoneSummaryList from "@/components/client/MilestoneSummaryList";
import RecentActivityList from "@/components/client/RecentActivityList";
import ClientSettingsView from "@/components/client/ClientSettingsView";
import NexumAssistantPanel from "@/components/client/NexumAssistantPanel";
import { useAuth } from "@/context/AuthContext";
import { DEMO_USERS } from "@/lib/auth-types";

export default function ClientDashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["overview", "milestones", "escrow", "audit", "settings"].includes(tabParam)) {
        return tabParam;
      }
    }
    return "overview";
  });

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

  // Enforce authentication & role separation (no silent auto-login fallback)
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "CLIENT") {
        router.push("/dashboard");
      }
    }
  }, [user, isLoading, router]);

  const client = user || DEMO_USERS.CLIENT;

  // Handle milestone acceptance & funds release via PayPal Sandbox
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

  const handleFindFreelancer = () => {
    router.push("/client/freelancers");
  };

  const handleCreateProject = () => {
    showToast("AI Project Intake Studio: Drafting structured brief for new scope...");
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
              : activeTab === "settings"
              ? "Profile & Settings"
              : "Consensus Audit Trail"
          }
          subtitle="Horizon Commerce LLC"
        />

        <main className="p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 flex-1">
          
          {/* ==============================================================
              TAB 1: OVERVIEW (REDESIGNED SAAS HIERARCHY)
             ============================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-6 sm:space-y-8">
              
              {/* A. Compact Overview Header (Replaces Oversized Profile Card) */}
              <ClientOverviewHeader
                clientName={client.name}
                companyName={client.companyOrHandle}
                projectName="Bilateral E-Commerce Payment Rails"
                agreementHash="canonical_v1.2_#9f8c2b7e"
                onFindFreelancer={handleFindFreelancer}
                onCreateProject={handleCreateProject}
              />

              {/* B. Financial Summary (4 Accurate KPI Cards) */}
              <ClientFinancialSummary
                ceilingAmount="$4,500.00"
                capturedAmount={milestone2Status === "IN_REVIEW" ? "$1,200.00" : "$2,700.00"}
                pendingFundingAmount={milestone2Status === "IN_REVIEW" ? "$1,500.00" : "$0.00"}
                reserveAmount="$1,800.00"
                milestone2Status={milestone2Status}
              />

              {/* C. Action-Required Section (Immediate Focus) */}
              <ActionRequiredCard
                milestoneStatus={milestone2Status}
                isCapturing={isCapturing}
                onApproveAndRelease={handleApproveAndRelease}
                onRequestRevision={() => setShowRevisionModal(true)}
              />

              {/* D. Recommended Freelancers Grid */}
              <div id="recommended-freelancers">
                <RecommendedFreelancers
                  onShareBrief={(candidateName) =>
                    showToast(`Consent-aware structured project brief shared with ${candidateName}.`)
                  }
                  onViewAllFreelancers={() => router.push("/client/freelancers")}
                />
              </div>

              {/* E. Milestone Progress Summary */}
              <MilestoneSummaryList
                milestone2Status={milestone2Status}
                onViewAllMilestones={() => setActiveTab("milestones")}
              />

              {/* F. Recent Activity & Consensus Events */}
              <RecentActivityList
                onViewAuditTrail={() => setActiveTab("audit")}
              />

            </div>
          )}

          {/* ==============================================================
              TAB 2: MILESTONES (DEDICATED FULL VIEW)
             ============================================================== */}
          {activeTab === "milestones" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Milestone Contract Schedule
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Agreement locked under canonical hash <code className="font-mono text-blue-700">canonical_v1.2_#9f8c2b7e</code> with contractor Rohan Verma.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-xs overflow-hidden">
                
                {/* M1 */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 grid place-items-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Milestone 1: Project Intake & Architecture PRD</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Approved & Released
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Completed Oct 26 · PayPal Order #4AB912048C881923K · Scope signed off by Alex Rivera
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-base font-extrabold text-slate-900">$1,200.00 USD</div>
                    <div className="text-[11px] text-emerald-600 font-semibold">Captured & Released</div>
                  </div>
                </div>

                {/* M2 */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 text-amber-600 grid place-items-center shrink-0 mt-0.5">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Milestone 2: PayPal REST v2 Webhook Ingestion Engine</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          milestone2Status === "IN_REVIEW"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}>
                          {milestone2Status === "IN_REVIEW" ? "Awaiting Review" : "Approved & Released"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Pre-funded in PayPal Sandbox Order #6DE714998H998261C · Test criteria verified
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-base font-extrabold text-slate-900">$1,500.00 USD</div>
                    <div className={`text-[11px] font-semibold ${
                      milestone2Status === "IN_REVIEW" ? "text-amber-700" : "text-emerald-700"
                    }`}>
                      {milestone2Status === "IN_REVIEW" ? "In Sandbox Escrow" : "Captured & Released"}
                    </div>
                  </div>
                </div>

                {/* M3 */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-75">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-500 grid place-items-center shrink-0 mt-0.5">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Milestone 3: Dual SHA-256 State Machine & Ledger Replay</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Next to Fund
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Unlocks when Milestone 2 completes · Governed by Fund-Before-Work rule
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-base font-extrabold text-slate-900">$1,000.00 USD</div>
                    <div className="text-[11px] text-slate-400">Unallocated Reserve</div>
                  </div>
                </div>

                {/* M4 */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-75">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-500 grid place-items-center shrink-0 mt-0.5">
                      <Zap className="w-5 h-5" />
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
                    <div className="text-base font-extrabold text-slate-900">$800.00 USD</div>
                    <div className="text-[11px] text-slate-400">Unallocated Reserve</div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==============================================================
              TAB 3: PAYPAL ESCROW (DEDICATED FULL VIEW)
             ============================================================== */}
          {activeTab === "escrow" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  PayPal Sandbox Escrow Rails & Transaction Evidence
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Cryptographically verified order capture and webhook receipts via PayPal REST API v2.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Order #6DE714998H998261C</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Milestone 2 · Pre-funded before engineering commenced</p>
                  </div>
                  <span className="px-3 py-1 rounded-md text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {milestone2Status === "IN_REVIEW" ? "STATUS: CREATED (SANDBOX ESCROW)" : "STATUS: COMPLETED (RELEASED)"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Gross Order Value</div>
                    <div className="font-extrabold text-slate-900 text-sm mt-1">$1,500.00 USD</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Capture Net</div>
                    <div className="font-extrabold text-slate-900 text-sm mt-1">$1,500.00 USD</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Contractor Receiver</div>
                    <div className="font-semibold text-slate-700 text-xs mt-1 truncate">sb-rohan-seller@proofloop.demo</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Signature Validation</div>
                    <div className="font-bold text-emerald-700 text-xs mt-1">SHA-256 Passed ✓</div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
                  * ProofLoop Compliance: A PayPal Sandbox capture verifies payment provider intent execution. It does not represent proof of external commercial bank settlement.
                </p>
              </div>
            </div>
          )}

          {/* ==============================================================
              TAB 4: AUDIT TRAIL (DEDICATED FULL VIEW)
             ============================================================== */}
          {activeTab === "audit" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Immutable Consensus Audit Trail (Dual SHA-256 Ledger)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Chronological tamper-evident audit log of project state machine transitions and mutual authorizations.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 shadow-xs font-mono text-xs overflow-hidden">
                <div className="p-4.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-900">DELIVERABLE_SUBMITTED</span>
                    <span className="text-slate-600">Rohan Verma &rarr; Milestone 2</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">hash: 0x9f8c2b7e...</span>
                </div>

                <div className="p-4.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="font-bold text-slate-900">PAYPAL_ORDER_CREATED</span>
                    <span className="text-slate-600">Order #6DE714998H998261C ($1,500.00 USD)</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">hash: 0x812d4a19...</span>
                </div>

                <div className="p-4.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-900">AGREEMENT_LOCKED</span>
                    <span className="text-slate-600">Dual approval confirmed by Alex Rivera & Rohan Verma</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">hash: 0x24ff9001...</span>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              TAB 5: PROFILE & SETTINGS (DEDICATED FULL VIEW)
             ============================================================== */}
          {activeTab === "settings" && (
            <ClientSettingsView client={client} />
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

      {/* Floating Copilot Assistant */}
      <NexumAssistantPanel />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

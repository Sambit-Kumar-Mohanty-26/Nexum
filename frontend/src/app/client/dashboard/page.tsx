"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Layers,
  Zap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import ClientOverviewHeader from "@/components/client/ClientOverviewHeader";
import ClientSummaryCards from "@/components/client/ClientSummaryCards";
import NeedsAttentionSection from "@/components/client/NeedsAttentionSection";
import ProjectOverviewPreview from "@/components/client/ProjectOverviewPreview";
import UpcomingMilestonesPreview from "@/components/client/UpcomingMilestonesPreview";
import RecommendedFreelancers from "@/components/client/RecommendedFreelancers";
import RecentActivityList from "@/components/client/RecentActivityList";
import DeliverableReviewModal from "@/components/client/DeliverableReviewModal";
import MyProjectsView from "@/components/client/MyProjectsView";
import WorkspaceView from "@/components/client/WorkspaceView";
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
      if (
        tabParam &&
        ["overview", "projects", "milestones", "workspace", "payments", "escrow", "audit", "settings"].includes(tabParam)
      ) {
        return tabParam === "escrow" ? "payments" : tabParam;
      }
    }
    return "overview";
  });

  // State for milestone 2 acceptance / release simulation
  const [milestone2Status, setMilestone2Status] = useState<"IN_REVIEW" | "APPROVED_AND_RELEASED">("IN_REVIEW");
  const [isCapturing, setIsCapturing] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Enforce authentication & role separation
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
      setIsReviewModalOpen(false);
      showToast(
        data.status === "COMPLETED"
          ? "Milestone 2 accepted! $1,500.00 USD captured and released to Rohan Verma."
          : "Milestone 2 accepted and marked released in consensus state machine."
      );
    } catch {
      setMilestone2Status("APPROVED_AND_RELEASED");
      setIsReviewModalOpen(false);
      showToast("Milestone 2 approved! Ledger state updated to RELEASED.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRequestRevision = (notes: string) => {
    setIsReviewModalOpen(false);
    showToast(`Revision request sent to Rohan Verma: "${notes.slice(0, 40)}..."`);
  };

  const handleFindFreelancer = () => {
    router.push("/client/freelancers");
  };

  const handleCreateProjectWithAI = () => {
    router.push("/client/assistant");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(36,91,255,0.06),rgba(255,255,255,0))] text-[#111827] flex font-sans selection:bg-[#245BFF] selection:text-white">
      {/* 1. Global Left Navigation Sidebar */}
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
              : activeTab === "projects"
              ? "My Projects"
              : activeTab === "milestones"
              ? "Milestones"
              : activeTab === "workspace"
              ? "Workspace"
              : activeTab === "payments" || activeTab === "escrow"
              ? "Payments"
              : activeTab === "settings"
              ? "Settings"
              : "Consensus Audit Trail"
          }
          subtitle="Horizon Commerce LLC"
        />

        <main className="px-6 sm:px-8 lg:px-9 py-7 sm:py-8 max-w-[1536px] w-full mx-auto space-y-8 sm:space-y-9 flex-1 pb-32">
          {/* ==============================================================
              DESTINATION 1: OVERVIEW (EXACT SPACIOUS 7-SECTION SPECIFICATION)
             ============================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-8 sm:space-y-9">
              {/* A. Page Heading and Actions */}
              <ClientOverviewHeader
                projectName="Bilateral E-Commerce Payment Rails"
                agreementHash="#9f8c2b7e"
                onFindFreelancers={handleFindFreelancer}
                onCreateProjectWithAI={handleCreateProjectWithAI}
              />

              {/* B. KPI Summary (3-column, 2-row responsive grid on desktop with unclipped labels) */}
              <ClientSummaryCards
                activeProjectsCount={1}
                pendingActionsCount={milestone2Status === "IN_REVIEW" ? 1 : 0}
                upcomingMilestonesCount={4}
                activeFreelancersCount={1}
                totalSpentDisplay={milestone2Status === "IN_REVIEW" ? "$1,200.00 USD" : "$2,700.00 USD"}
                paymentStatusSummary={milestone2Status === "IN_REVIEW" ? "$1,500.00 USD" : "$0.00 USD"}
                paymentStatusDetail={
                  milestone2Status === "IN_REVIEW"
                    ? "Pre-funded in PayPal Sandbox"
                    : "Captured and released"
                }
              />

              {/* C. Needs Your Attention (Spacious 2-column desktop row: 67% Actions, 33% Consensus) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 items-stretch">
                {/* Left Panel (~67% width): Pending Action Rows with 20-24px padding */}
                <div className="lg:col-span-8 flex flex-col">
                  <NeedsAttentionSection
                    milestone2Status={milestone2Status}
                    onReviewMilestone={() => setIsReviewModalOpen(true)}
                    onViewAllActions={() => setActiveTab("milestones")}
                  />
                </div>

                {/* Right Panel (~33% width): Active Consensus Node Panel */}
                <div className="lg:col-span-4 flex flex-col">
                  <div className="bg-white rounded-2xl border border-[#E3EAF3] p-5 sm:p-6 shadow-precision hover:border-emerald-500/30 hover:shadow-precision-hover transition-all duration-200 flex flex-col justify-between h-full space-y-5 relative overflow-hidden group">
                    {/* Top Edge Luminous Line */}
                    <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

                    <div>
                      <div className="flex items-center justify-between pb-3.5 border-b border-[#E3EAF3]">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 grid place-items-center text-emerald-700 shadow-2xs">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <h2 className="text-base font-bold text-[#111827]">
                              Consensus Node
                            </h2>
                            <p className="text-[11px] text-slate-400">Ledger State Synced</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Live</span>
                        </span>
                      </div>

                      <div className="mt-4 p-4 rounded-xl bg-[#F8FAFD] border border-[#E3EAF3] space-y-2 text-xs">
                        <div className="flex items-center justify-between text-xs font-semibold text-[#64748B]">
                          <span>Bilateral State Lock</span>
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Verified</span>
                        </div>
                        <div className="font-mono font-bold text-slate-900 text-xs truncate bg-white px-2.5 py-1.5 rounded-lg border border-[#E3EAF3] shadow-2xs">
                          canonical_v1.2_#9f8c2b7e
                        </div>
                        <div className="text-[11px] text-slate-500 pt-2 border-t border-[#E3EAF3]">
                          Dual-signed by Horizon Commerce LLC & Rohan Verma
                        </div>
                      </div>

                      <div className="pt-4 flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-[#64748B] font-medium">Protocol Status</span>
                        <span className="font-bold text-emerald-700">Fund-Before-Work Active</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push("/client/assistant")}
                      className="w-full h-11 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-[#245BFF] text-xs sm:text-sm font-bold border border-blue-200/80 transition-all duration-150 cursor-pointer shadow-2xs active:scale-98 group-hover:border-[#245BFF]/40"
                    >
                      <Sparkles className="w-4 h-4 text-[#245BFF]" />
                      <span>Ask Nexum Copilot</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-auto text-[#245BFF]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* D. Full-Width Section: Project Overview (2-Column Grid on Desktop) */}
              <div>
                <ProjectOverviewPreview
                  onViewAllProjects={() => setActiveTab("projects")}
                  onOpenProject={() => setActiveTab("workspace")}
                />
              </div>

              {/* E. Full-Width Section: Upcoming Milestones (Generous Table Layout) */}
              <div>
                <UpcomingMilestonesPreview
                  milestone2Status={milestone2Status}
                  onViewAllMilestones={() => setActiveTab("milestones")}
                  onReviewMilestone={() => setIsReviewModalOpen(true)}
                />
              </div>

              {/* F. Full-Width Section: Recommended Freelancers (3-Column Desktop Grid) */}
              <div>
                <RecommendedFreelancers
                  onViewProfile={() => router.push("/client/freelancers")}
                  onInviteToProject={(c) =>
                    showToast(`Invitation to project sent to ${c.name}!`)
                  }
                  onViewAllFreelancers={() => router.push("/client/freelancers")}
                />
              </div>

              {/* G. Full-Width Section: Recent Activity List */}
              <div>
                <RecentActivityList
                  onViewAuditTrail={() => setActiveTab("audit")}
                />
              </div>
            </div>
          )}

          {/* ==============================================================
              DESTINATION 2: MY PROJECTS
             ============================================================== */}
          {activeTab === "projects" && (
            <MyProjectsView
              onCreateWithAI={handleCreateProjectWithAI}
              onOpenWorkspace={() => setActiveTab("workspace")}
            />
          )}

          {/* ==============================================================
              DESTINATION 3: MILESTONES (FULL SCHEDULE)
             ============================================================== */}
          {activeTab === "milestones" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
                    Milestones
                  </h1>
                  <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                    Contract schedule locked under canonical hash <code className="font-mono text-[#245BFF]">#9f8c2b7e</code> with contractor Rohan Verma.
                  </p>
                </div>

                {milestone2Status === "IN_REVIEW" && (
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#245BFF] hover:bg-[#1748E8] text-white font-semibold text-xs shadow-precision hover:shadow-precision-hover transition cursor-pointer self-start sm:self-auto active:scale-98"
                  >
                    Review Milestone 2 Submission
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-[#E3EAF3] bg-white divide-y divide-[#E3EAF3] shadow-precision overflow-hidden">
                {/* M1 */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8FAFD] transition-colors">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 grid place-items-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#111827] text-sm">Milestone 1: Project Intake & Architecture PRD</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Approved & Released
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-1">
                        Completed Oct 26 · PayPal Order #4AB912048C881923K · Scope signed off by Alex Rivera
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-base font-bold text-[#111827] tnum">$1,200.00 USD</div>
                    <div className="text-[11px] text-emerald-700 font-semibold">Captured & Released</div>
                  </div>
                </div>

                {/* M2 */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F8FAFD] hover:bg-slate-100/50 transition-colors">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 text-amber-600 grid place-items-center shrink-0 mt-0.5">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#111827] text-sm">Milestone 2: PayPal REST v2 Webhook Ingestion Engine</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          milestone2Status === "IN_REVIEW"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}>
                          {milestone2Status === "IN_REVIEW" ? "Awaiting Review" : "Approved & Released"}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-1">
                        Pre-funded in PayPal Sandbox Order #6DE714998H998261C · Test criteria verified
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-base font-bold text-[#111827] tnum">$1,500.00 USD</div>
                    <div className={`text-[11px] font-semibold ${
                      milestone2Status === "IN_REVIEW" ? "text-amber-700" : "text-emerald-700"
                    }`}>
                      {milestone2Status === "IN_REVIEW" ? "Pre-funded (Sandbox)" : "Captured & Released"}
                    </div>
                  </div>
                </div>

                {/* M3 */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-75 hover:opacity-90 transition-opacity">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-500 grid place-items-center shrink-0 mt-0.5">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#111827] text-sm">Milestone 3: Dual SHA-256 State Machine & Ledger Replay</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Next to Fund
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-1">
                        Unlocks when Milestone 2 completes · Governed by Fund-Before-Work rule
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-base font-bold text-[#111827] tnum">$1,000.00 USD</div>
                    <div className="text-[11px] text-slate-400">Unallocated Reserve</div>
                  </div>
                </div>

                {/* M4 */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-75 hover:opacity-90 transition-opacity">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-500 grid place-items-center shrink-0 mt-0.5">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#111827] text-sm">Milestone 4: Failover Simulator & Deduplication Verification</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Final Stage
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-1">
                        Contract conclusion and bilateral verification audit
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right font-mono shrink-0">
                    <div className="text-base font-bold text-[#111827] tnum">$800.00 USD</div>
                    <div className="text-[11px] text-slate-400">Unallocated Reserve</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              DESTINATION 4: WORKSPACE
             ============================================================== */}
          {activeTab === "workspace" && (
            <WorkspaceView
              milestone2Status={milestone2Status}
              onReviewMilestone={() => setIsReviewModalOpen(true)}
              onOpenAIIntake={handleCreateProjectWithAI}
            />
          )}

          {/* ==============================================================
              DESTINATION 5: PAYMENTS (PAYPAL PROVIDER EVIDENCE)
             ============================================================== */}
          {(activeTab === "payments" || activeTab === "escrow") && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
                  Payments & Provider Evidence
                </h1>
                <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                  Cryptographically verified order capture and webhook receipts via PayPal REST API v2.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[#E3EAF3] bg-white shadow-precision space-y-5">
                <div className="flex items-center justify-between border-b border-[#E3EAF3] pb-4">
                  <div>
                    <h2 className="font-bold text-[#111827] text-base">Order #6DE714998H998261C</h2>
                    <p className="text-xs text-[#64748B] mt-0.5">Milestone 2 · Pre-funded before engineering commenced</p>
                  </div>
                  <span className="px-3 py-1 rounded text-xs font-mono font-bold bg-blue-50 text-[#245BFF] border border-blue-200/80">
                    {milestone2Status === "IN_REVIEW" ? "STATUS: CREATED (SANDBOX PRE-FUNDED)" : "STATUS: COMPLETED (RELEASED)"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="p-3.5 rounded-lg bg-[#F8FAFD] border border-[#E3EAF3]">
                    <div className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Gross Order Value</div>
                    <div className="font-bold text-[#111827] text-sm mt-1 tnum">$1,500.00 USD</div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#F8FAFD] border border-[#E3EAF3]">
                    <div className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Capture Net</div>
                    <div className="font-bold text-[#111827] text-sm mt-1 tnum">$1,500.00 USD</div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#F8FAFD] border border-[#E3EAF3]">
                    <div className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Contractor Receiver</div>
                    <div className="font-semibold text-slate-800 text-xs mt-1 truncate">sb-rohan-seller@proofloop.demo</div>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#F8FAFD] border border-[#E3EAF3]">
                    <div className="text-slate-400 text-[10px] uppercase font-sans font-semibold">Signature Validation</div>
                    <div className="font-bold text-emerald-700 text-xs mt-1">SHA-256 Passed ✓</div>
                  </div>
                </div>

                <p className="text-[11px] text-[#64748B] leading-relaxed pt-2 border-t border-[#E3EAF3]">
                  * ProofLoop Compliance: A PayPal Sandbox capture verifies payment provider intent execution. It does not represent proof of external commercial bank settlement.
                </p>
              </div>
            </div>
          )}

          {/* ==============================================================
              DESTINATION 6: AUDIT TRAIL
             ============================================================== */}
          {activeTab === "audit" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
                  Consensus Audit Trail (Dual SHA-256 Ledger)
                </h1>
                <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                  Chronological tamper-evident audit log of project state machine transitions and mutual authorizations.
                </p>
              </div>

              <div className="rounded-xl border border-[#E3EAF3] bg-white divide-y divide-[#E3EAF3] shadow-precision font-mono text-xs overflow-hidden">
                <div className="p-4 flex items-center justify-between hover:bg-[#F8FAFD] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-[#111827]">DELIVERABLE_SUBMITTED</span>
                    <span className="text-slate-600">Rohan Verma &rarr; Milestone 2</span>
                  </div>
                  <span className="text-slate-400 text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">hash: 0x9f8c2b7e...</span>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-[#F8FAFD] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#245BFF]" />
                    <span className="font-bold text-[#111827]">PAYPAL_ORDER_CREATED</span>
                    <span className="text-slate-600">Order #6DE714998H998261C ($1,500.00 USD)</span>
                  </div>
                  <span className="text-slate-400 text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">hash: 0x812d4a19...</span>
                </div>

                <div className="p-4 flex items-center justify-between hover:bg-[#F8FAFD] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-bold text-[#111827]">AGREEMENT_LOCKED</span>
                    <span className="text-slate-600">Dual approval confirmed by Alex Rivera & Rohan Verma</span>
                  </div>
                  <span className="text-slate-400 text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">hash: 0x24ff9001...</span>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              DESTINATION 7: SETTINGS
             ============================================================== */}
          {activeTab === "settings" && (
            <ClientSettingsView client={client} />
          )}
        </main>
      </div>

      {/* Deliverable Review Modal */}
      <DeliverableReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        milestoneStatus={milestone2Status}
        isCapturing={isCapturing}
        onApproveAndRelease={handleApproveAndRelease}
        onRequestRevision={handleRequestRevision}
      />

      {/* Floating Copilot Assistant (Compact launcher positioned without covering content) */}
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

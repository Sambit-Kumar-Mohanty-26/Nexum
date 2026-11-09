"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import FreelancerOverviewView from "@/components/freelancer/FreelancerOverviewView";
import FreelancerFindProjectsView from "@/components/freelancer/FreelancerFindProjectsView";
import FreelancerProfileView from "@/components/freelancer/FreelancerProfileView";
import FreelancerWorkspaceView from "@/components/freelancer/FreelancerWorkspaceView";
import FreelancerProposalsView from "@/components/freelancer/FreelancerProposalsView";
import FreelancerProjectsMilestonesView from "@/components/freelancer/FreelancerProjectsMilestonesView";
import FreelancerEarningsPaymentsView from "@/components/freelancer/FreelancerEarningsPaymentsView";
import FreelancerSettingsView from "@/components/freelancer/FreelancerSettingsView";
import { useAuth } from "@/context/AuthContext";
import { DEMO_USERS } from "@/lib/auth-types";
import { Send, FileCode, FileText, X } from "lucide-react";

const VALID_TABS = [
  "dashboard",
  "overview",
  "find_projects",
  "profile",
  "workspace",
  "proposals",
  "projects",
  "milestones",
  "earnings",
  "payments",
  "settings",
] as const;

function FreelancerDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  const tabParam = searchParams.get("tab");
  const activeTab = tabParam && (VALID_TABS as readonly string[]).includes(tabParam)
    ? tabParam
    : "overview";

  const handleTabChange = (tab: string) => {
    if (tab === "workspace") {
      router.push("/freelancer/workspace");
      return;
    }
    router.replace(`/freelancer/dashboard?tab=${tab}`, { scroll: false });
  };

  // Deliverable submission state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [modalPrUrl, setModalPrUrl] = useState("https://github.com/proofloop/gateway/pull/42");
  const [modalLoomUrl, setModalLoomUrl] = useState("https://www.loom.com/share/proofloop-milestone2-demo");
  const [modalNotes, setModalNotes] = useState(
    "All test criteria met: PayPal REST v2 order capture verified, SHA-256 signature validation passing with mock payloads, idempotency cache deduplicates within 30s window."
  );

  const [appliedProjectIds, setAppliedProjectIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Enforce authentication & role separation
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "FREELANCER")) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  const freelancer = user || DEMO_USERS.FREELANCER_A;
  const client = DEMO_USERS.CLIENT;

  const handleModalSubmitDeliverable = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSubmitModal(false);
    showToast("Deliverable submission updated & recorded to consensus ledger.");
  };

  const handleApplyProjectFromFind = (project: { id?: string; title: string; budget: string; budgetAmount?: number; clientCompany: string }) => {
    if (project.id) {
      router.push(`/freelancer/projects/${project.id}/apply`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans selection:bg-indigo-600 selection:text-white">
      {/* 1. Left Navbar Sidebar */}
      <DashboardSidebar
        currentRole="FREELANCER"
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <DashboardTopHeader
          roleLabel="Freelancer Workspace"
          title={
            activeTab === "overview" || activeTab === "dashboard"
              ? "Overview"
              : activeTab === "find_projects"
              ? "Find Projects"
              : activeTab === "profile"
              ? "My Profile & Portfolio"
              : activeTab === "workspace"
              ? "Freelancer Workspace"
              : activeTab === "proposals"
              ? "My Proposals"
              : activeTab === "projects" || activeTab === "milestones"
              ? "My Projects"
              : activeTab === "earnings" || activeTab === "payments"
              ? "Earnings & Payments"
              : "Settings"
          }
          subtitle={
            activeTab === "dashboard" || activeTab === "overview"
              ? "Earnings, active contracts, and priority opportunities"
              : activeTab === "find_projects"
              ? "Browse verified client briefs with pre-funded escrow"
              : activeTab === "profile"
              ? "Professional bio, skills, rates, and parsed resume"
              : activeTab === "workspace"
              ? "Active collaboration, code delivery, and bilateral mediation"
              : activeTab === "proposals"
              ? "Track your proposals, manage discussions and increase your chances of getting hired."
              : activeTab === "projects" || activeTab === "milestones"
              ? "Manage your active projects, track milestones, communicate with clients and deliver successfully."
              : activeTab === "earnings" || activeTab === "payments"
              ? "Track your earnings, manage payouts, and view transaction history."
              : "Manage your account, preferences and platform settings."
          }
          placeholder="Search projects, proposals, contracts, client messages..."
          onHelpClick={() => showToast("Opening Freelancer Escrow & Mediation Guide...")}
        />

        <main className="p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8 flex-1">
          {/* TAB 1: DASHBOARD / OVERVIEW */}
          {(activeTab === "dashboard" || activeTab === "overview") && (
            <FreelancerOverviewView
              freelancer={freelancer}
              client={client}
              onNavigateTab={handleTabChange}
              onSubmitDeliverableClick={() => setShowSubmitModal(true)}
              onReviewLeadClick={() => {
                handleTabChange("find_projects");
              }}
            />
          )}

          {/* TAB 2: FIND PROJECTS */}
          {activeTab === "find_projects" && (
            <FreelancerFindProjectsView
              onApplyProject={handleApplyProjectFromFind}
              showToast={showToast}
              appliedProjectIds={appliedProjectIds}
            />
          )}

          {/* TAB 3: MY PROFILE & PORTFOLIO */}
          {activeTab === "profile" && (
            <FreelancerProfileView
              freelancer={freelancer}
              showToast={showToast}
            />
          )}

          {/* TAB 4: WORKSPACE */}
          {activeTab === "workspace" && (
            <FreelancerWorkspaceView
              freelancer={freelancer}
              client={client}
              showToast={showToast}
            />
          )}

          {/* TAB 5: PROPOSALS */}
          {activeTab === "proposals" && (
            <FreelancerProposalsView
              showToast={showToast}
              onNavigateTab={handleTabChange}
            />
          )}

          {/* TAB 6: MY PROJECTS & MILESTONES */}
          {(activeTab === "projects" || activeTab === "milestones") && (
            <FreelancerProjectsMilestonesView
              onSubmitDeliverableClick={() => setShowSubmitModal(true)}
              onNavigateTab={handleTabChange}
              showToast={showToast}
            />
          )}

          {/* TAB 7: EARNINGS & PAYMENTS */}
          {(activeTab === "earnings" || activeTab === "payments") && (
            <FreelancerEarningsPaymentsView
              showToast={showToast}
            />
          )}

          {/* TAB 8: SETTINGS */}
          {activeTab === "settings" && (
            <FreelancerSettingsView
              freelancer={freelancer}
              showToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Submit / Update Deliverables Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Update Deliverables: Milestone 2
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Contract with Alex Rivera (Horizon Commerce LLC)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmitDeliverable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  GitHub Pull Request URL
                </label>
                <div className="relative">
                  <FileCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={modalPrUrl}
                    onChange={(e) => setModalPrUrl(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Loom Demo Video Walkthrough
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={modalLoomUrl}
                    onChange={(e) => setModalLoomUrl(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Verification Notes
                </label>
                <textarea
                  rows={3}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Deliverable</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function FreelancerDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-400">Loading Freelancer Dashboard...</div>}>
      <FreelancerDashboardContent />
    </Suspense>
  );
}

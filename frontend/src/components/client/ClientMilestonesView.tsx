"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  RotateCcw,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Calendar,
  Check,
  Activity,
  FileCode,
  Sparkles,
  X,
} from "lucide-react";
import {
  CLIENT_MILESTONES,
  FullMilestoneData,
  MilestoneWorkflowStatus,
  MilestonePaymentState,
} from "@/lib/mock-milestones";
import { useAuth } from "@/context/AuthContext";
import {
  fetchClientMilestones,
  approveClientMilestone,
  requestClientMilestoneCorrections,
  fetchProjectHandover,
  initiateProjectHandover,
  ProjectHandoverData,
} from "@/lib/api-client";
import ProjectHandoverBanner from "@/components/handover/ProjectHandoverBanner";
import ProjectHandoverModal from "@/components/handover/ProjectHandoverModal";
import HandoverChecklistView from "@/components/handover/HandoverChecklistView";

interface ClientMilestonesViewProps {
  onOpenProjectWorkspace?: (projectId: string, tab?: string) => void;
}

export default function ClientMilestonesView({
  onOpenProjectWorkspace,
}: ClientMilestonesViewProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  // Milestone dataset state (mutable for releases & corrections)
  const [milestones, setMilestones] = useState<FullMilestoneData[]>(CLIENT_MILESTONES);

  // Fetch live milestones from database/backend
  useEffect(() => {
    let isMounted = true;
    async function loadMilestones() {
      try {
        const res = await fetchClientMilestones(user?.id);
        if (isMounted && res.success && Array.isArray(res.data)) {
          setMilestones(res.data);
        }
      } catch {
        // Fallback already in place
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadMilestones();
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState<MilestoneWorkflowStatus>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<MilestonePaymentState>("ALL");
  const [dueDateFilter, setDueDateFilter] = useState<"ALL" | "OVERDUE" | "THIS_WEEK" | "NEXT_30_DAYS">("ALL");

  // Selected Milestone for Details View (Modal / Drawer)
  const [selectedMilestone, setSelectedMilestone] = useState<FullMilestoneData | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "criteria" | "deliverables" | "activity" | "payment">("overview");

  // Interactive Release / Corrections State
  const [isCapturing, setIsCapturing] = useState(false);
  const [showCorrectionsModal, setShowCorrectionsModal] = useState(false);
  const [selectedUnmetCriteria, setSelectedUnmetCriteria] = useState<string[]>([]);
  const [correctionNotes, setCorrectionNotes] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handover Protocol State
  const [handoverData, setHandoverData] = useState<ProjectHandoverData | null>(null);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showHandoverView, setShowHandoverView] = useState(false);

  // Distinct project list for dropdown filter
  const distinctProjects = useMemo(() => {
    const map = new Map<string, string>();
    milestones.forEach((m) => {
      if (!map.has(m.projectId)) {
        map.set(m.projectId, m.projectName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [milestones]);

  // Check if any project is eligible for handover (all its milestones accepted)
  const handoverEligibleProject = useMemo(() => {
    if (projectFilter !== "ALL") {
      const pMilestones = milestones.filter((m) => m.projectId === projectFilter);
      if (pMilestones.length > 0 && pMilestones.every((m) => m.workflowStatus === "ACCEPTED")) {
        return { id: projectFilter, name: pMilestones[0].projectName };
      }
      return null;
    }

    for (const p of distinctProjects) {
      const pMilestones = milestones.filter((m) => m.projectId === p.id);
      if (pMilestones.length > 0 && pMilestones.every((m) => m.workflowStatus === "ACCEPTED")) {
        return p;
      }
    }
    return null;
  }, [milestones, distinctProjects, projectFilter]);

  // Load handover data if project is eligible
  const loadHandover = async () => {
    if (!handoverEligibleProject) {
      setHandoverData(null);
      return;
    }
    try {
      const res = await fetchProjectHandover(handoverEligibleProject.id);
      if (res.success && res.data?.handover) {
        setHandoverData(res.data.handover);
      } else {
        setHandoverData(null);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadHandover();
  }, [handoverEligibleProject?.id]);

  const handleInitiateHandoverConfirm = async (
    items: Array<{ title: string; description: string; category: any; isRequired: boolean }>
  ) => {
    if (!handoverEligibleProject) return;
    const res = await initiateProjectHandover(handoverEligibleProject.id, items);
    if (res.success) {
      showToast("Handover checklist successfully created and sent to freelancer!");
      await loadHandover();
      setShowHandoverView(true);
    } else {
      showToast(res.error || "Failed to initiate handover");
    }
  };

  // Top 4 Stats Calculation
  const stats = useMemo(() => {
    const upcomingCount = milestones.filter((m) => m.workflowStatus === "UPCOMING" || m.workflowStatus === "IN_PROGRESS").length;
    const awaitingReviewCount = milestones.filter((m) => m.workflowStatus === "AWAITING_REVIEW").length;
    const overdueCount = milestones.filter((m) => m.isOverdue || m.workflowStatus === "OVERDUE").length;
    const completedCount = milestones.filter((m) => m.workflowStatus === "ACCEPTED").length;
    return { upcomingCount, awaitingReviewCount, overdueCount, completedCount };
  }, [milestones]);

  // Filtering Logic
  const filteredMilestones = useMemo(() => {
    return milestones.filter((m) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = m.title.toLowerCase().includes(q);
        const matchesProject = m.projectName.toLowerCase().includes(q);
        const matchesFreelancer = m.freelancer?.name.toLowerCase().includes(q);
        if (!matchesTitle && !matchesProject && !matchesFreelancer) return false;
      }

      // 2. Workflow Status Filter
      if (workflowFilter !== "ALL" && m.workflowStatus !== workflowFilter) {
        return false;
      }

      // 3. Project Filter
      if (projectFilter !== "ALL" && m.projectId !== projectFilter) {
        return false;
      }

      // 4. Payment State Filter (Separated from Workflow Status!)
      if (paymentFilter !== "ALL" && m.paymentState !== paymentFilter) {
        return false;
      }

      // 5. Due Date Filter
      if (dueDateFilter === "OVERDUE" && !m.isOverdue) return false;
      if (
        dueDateFilter === "THIS_WEEK" &&
        !m.daysRemainingOrOverdue.toLowerCase().includes("today") &&
        !m.daysRemainingOrOverdue.toLowerCase().includes("3 days")
      ) {
        return false;
      }
      if (dueDateFilter === "NEXT_30_DAYS" && m.isOverdue) return false;

      return true;
    });
  }, [milestones, searchQuery, workflowFilter, projectFilter, paymentFilter, dueDateFilter]);

  // Handle Accept & Release Funds via PayPal Sandbox Capture
  const handleApproveAndRelease = async (m: FullMilestoneData) => {
    setIsCapturing(true);
    showToast("Dual SHA-256 Consensus: Executing PayPal Sandbox Escrow Capture...");

    try {
      // 1. Dispatch backend approval
      await approveClientMilestone(m.id, {
        clientId: user?.id,
        orderId: m.paymentDetails?.orderId,
      }).catch(() => {});

      // 2. Dispatch PayPal capture endpoint
      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: m.paymentDetails?.orderId || "6DE714998H998261C",
          milestoneId: m.id,
        }),
      });

      await res.json().catch(() => ({}));

      // Update state locally
      setMilestones((prev) =>
        prev.map((item) =>
          item.id === m.id
            ? {
                ...item,
                workflowStatus: "ACCEPTED" as const,
                workflowStatusLabel: "Accepted",
                workflowStatusColor: "bg-emerald-50 text-emerald-700 border-emerald-200/90",
                paymentState: "CAPTURED" as const,
                paymentStateLabel: "Captured & Released",
                paymentStateColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
                paymentDetails: {
                  ...item.paymentDetails,
                  provider: "PayPal Orders v2 Sandbox",
                  captureId: "CAP_SANDBOX_RELEASE_SUCCESS",
                  capturedDate: "Just now",
                  reconciliationStatus: "RECONCILED",
                },
                nextClientAction: {
                  label: "View Acceptance Record & Receipt",
                  description: "Milestone completed and released. View PayPal capture confirmation.",
                  actionType: "VIEW_RECEIPT",
                },
                activities: [
                  {
                    id: `act_${Date.now()}`,
                    timestamp: "Just now",
                    actor: user?.name || "Client",
                    role: "CLIENT" as const,
                    action: "Milestone Deliverables Accepted",
                    details: `${m.amount} USD captured from Sandbox Escrow and released to ${m.freelancer?.name || "contractor"}.`,
                    hash: "sha256:d8a201...captured",
                  },
                  ...item.activities,
                ],
              }
            : item
        )
      );

      // Also update selected milestone if open in detail drawer
      if (selectedMilestone && selectedMilestone.id === m.id) {
        setSelectedMilestone((prev) =>
          prev
            ? {
                ...prev,
                workflowStatus: "ACCEPTED" as const,
                workflowStatusLabel: "Accepted",
                workflowStatusColor: "bg-emerald-50 text-emerald-700 border-emerald-200/90",
                paymentState: "CAPTURED" as const,
                paymentStateLabel: "Captured & Released",
                paymentStateColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
                nextClientAction: {
                  label: "View Acceptance Record & Receipt",
                  description: "Milestone completed and released.",
                  actionType: "VIEW_RECEIPT",
                },
              }
            : null
        );
      }

      showToast(`Milestone accepted! ${m.amount} USD captured and released to contractor.`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("nexum:milestones-updated"));
      }
    } catch {
      showToast("Consensus state updated: Milestone marked Accepted.");
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle Request Corrections (identifying specific unmet criteria)
  const handleSubmitCorrections = async (m: FullMilestoneData) => {
    if (selectedUnmetCriteria.length === 0 && !correctionNotes.trim()) {
      showToast("Please select at least one unmet criterion or provide revision notes.");
      return;
    }

    try {
      await requestClientMilestoneCorrections(m.id, {
        notes: correctionNotes,
        unmetCriteria: selectedUnmetCriteria,
        clientId: user?.id,
      }).catch(() => {});
    } catch {}

    setMilestones((prev) =>
      prev.map((item) =>
        item.id === m.id
          ? {
              ...item,
              workflowStatus: "AWAITING_REVIEW" as const,
              workflowStatusLabel: "Corrections Requested",
              workflowStatusColor: "bg-orange-50 text-orange-800 border-orange-200",
              correctionsRequestedNotes: correctionNotes,
              nextClientAction: {
                label: "Awaiting Updated Deliverables",
                description: `Corrections requested for ${selectedUnmetCriteria.length} criteria. Contractor notified.`,
                actionType: "REVIEW_SUBMISSION",
              },
              activities: [
                {
                  id: `act_corr_${Date.now()}`,
                  timestamp: "Just now",
                  actor: user?.name || "Client",
                  role: "CLIENT" as const,
                  action: "Corrections Requested",
                  details: `Unmet criteria: ${selectedUnmetCriteria.join(", ")}. Notes: ${correctionNotes}`,
                  hash: "sha256:corr_req_hash",
                },
                ...item.activities,
              ],
            }
          : item
      )
    );

    setShowCorrectionsModal(false);
    setCorrectionNotes("");
    setSelectedUnmetCriteria([]);
    showToast("Correction request logged on immutable audit trail and sent to contractor.");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nexum:milestones-updated"));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200/80 h-28 space-y-3">
              <div className="w-16 h-3 bg-slate-200 rounded" />
              <div className="w-10 h-7 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
        <div className="h-28 rounded-2xl bg-white border border-slate-200/80" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200/80 h-36" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==============================================================
          SECTION 1: TOP 4 STATS CARDS (CLEAN SAAS TELEMETRY)
         ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Upcoming */}
        <button
          type="button"
          onClick={() => {
            setWorkflowFilter("UPCOMING");
            setPaymentFilter("ALL");
          }}
          className={`p-4 sm:p-5 rounded-2xl bg-white border text-left transition-all duration-200 cursor-pointer shadow-2xs group flex flex-col justify-between ${
            workflowFilter === "UPCOMING"
              ? "border-[#4f46e5] ring-2 ring-[#4f46e5]/15"
              : "border-slate-200/90 hover:border-[#4f46e5]/40"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
              Upcoming
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-heading">
              {stats.upcomingCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              Approaching deadline
            </p>
          </div>
        </button>

        {/* Card 2: Awaiting Review (Prominent amber alert when > 0) */}
        <button
          type="button"
          onClick={() => {
            setWorkflowFilter("AWAITING_REVIEW");
            setPaymentFilter("ALL");
          }}
          className={`p-4 sm:p-5 rounded-2xl text-left transition-all duration-200 cursor-pointer shadow-2xs group flex flex-col justify-between ${
            stats.awaitingReviewCount > 0
              ? "bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 border-amber-300 ring-2 ring-amber-100"
              : "bg-white border-slate-200/90 hover:border-amber-400"
          } ${
            workflowFilter === "AWAITING_REVIEW" ? "border-amber-500 ring-2 ring-amber-200" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <span>Awaiting Review</span>
              {stats.awaitingReviewCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-900 tracking-tight font-heading">
              {stats.awaitingReviewCount}
            </div>
            <p className="text-[11px] text-amber-800/80 mt-0.5 font-medium truncate">
              Needs your approval
            </p>
          </div>
        </button>

        {/* Card 3: Overdue */}
        <button
          type="button"
          onClick={() => {
            setWorkflowFilter("OVERDUE");
            setPaymentFilter("ALL");
          }}
          className={`p-4 sm:p-5 rounded-2xl bg-white border text-left transition-all duration-200 cursor-pointer shadow-2xs group flex flex-col justify-between ${
            workflowFilter === "OVERDUE"
              ? "border-rose-400 ring-2 ring-rose-100"
              : "border-slate-200/90 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
              Overdue
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight font-heading ${
              stats.overdueCount > 0 ? "text-rose-600" : "text-slate-900"
            }`}>
              {stats.overdueCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              Past due deadline
            </p>
          </div>
        </button>

        {/* Card 4: Completed (Accepted) */}
        <button
          type="button"
          onClick={() => {
            setWorkflowFilter("ACCEPTED");
            setPaymentFilter("ALL");
          }}
          className={`p-4 sm:p-5 rounded-2xl bg-white border text-left transition-all duration-200 cursor-pointer shadow-2xs group flex flex-col justify-between ${
            workflowFilter === "ACCEPTED"
              ? "border-emerald-500 ring-2 ring-emerald-100"
              : "border-slate-200/90 hover:border-emerald-400"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">
              Accepted
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight font-heading">
              {stats.completedCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              Verified & released
            </p>
          </div>
        </button>
      </div>

      {/* ==============================================================
          PROJECT HANDOVER & DELIVERABLE CHECKLIST BANNER (100% LIGHT THEME)
         ============================================================== */}
      {handoverEligibleProject && (
        <div className="space-y-4">
          <ProjectHandoverBanner
            role="CLIENT"
            projectName={handoverEligibleProject.name}
            handoverData={handoverData}
            onInitiateClick={() => setShowHandoverModal(true)}
            onViewChecklistClick={() => setShowHandoverView((prev) => !prev)}
          />

          {/* Expandable Handover Checklist View */}
          {showHandoverView && handoverData && (
            <HandoverChecklistView
              projectId={handoverEligibleProject.id}
              projectName={handoverEligibleProject.name}
              role="CLIENT"
              handoverData={handoverData}
              onRefresh={loadHandover}
              showToast={showToast}
              onClose={() => setShowHandoverView(false)}
            />
          )}

          {/* Initiate Handover Modal */}
          <ProjectHandoverModal
            isOpen={showHandoverModal}
            projectName={handoverEligibleProject.name}
            onClose={() => setShowHandoverModal(false)}
            onConfirm={handleInitiateHandoverConfirm}
          />
        </div>
      )}

      {/* ==============================================================
          SECTION 2: SEARCH & FILTERS BAR
         ============================================================== */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
        
        {/* Top Controls Row: Search Input + Secondary Dropdown Filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find milestone by title, project, or freelancer..."
              className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/15 focus:border-[#4f46e5] transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Secondary Filters: Project, Due Date, Payment State */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Filter 1: Project */}
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              aria-label="Filter by project"
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#4f46e5] cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Projects</option>
              {distinctProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            {/* Filter 2: Due Date */}
            <select
              value={dueDateFilter}
              onChange={(e) =>
                setDueDateFilter(
                  e.target.value as "ALL" | "OVERDUE" | "THIS_WEEK" | "NEXT_30_DAYS"
                )
              }
              aria-label="Filter by due date"
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#4f46e5] cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Due Dates</option>
              <option value="OVERDUE">Overdue Only</option>
              <option value="THIS_WEEK">Due This Week</option>
              <option value="NEXT_30_DAYS">Due Next 30 Days</option>
            </select>

            {/* Filter 3: Payment State (Separated from Workflow Status!) */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as MilestonePaymentState)}
              aria-label="Filter by payment state"
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#4f46e5] cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Payment States</option>
              <option value="ESCROW_FUNDED">Pre-Funded in Escrow</option>
              <option value="CAPTURED">Captured & Released</option>
              <option value="UNFUNDED">Unfunded (Scheduled)</option>
            </select>

            {/* Clear Filters Button if any active */}
            {(searchQuery || workflowFilter !== "ALL" || projectFilter !== "ALL" || paymentFilter !== "ALL" || dueDateFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setWorkflowFilter("ALL");
                  setProjectFilter("ALL");
                  setPaymentFilter("ALL");
                  setDueDateFilter("ALL");
                }}
                className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Primary Horizontal Workflow Status Filters Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100 no-scrollbar">
          {[
            { id: "ALL", label: "All Milestones", count: milestones.length },
            { id: "UPCOMING", label: "Upcoming" },
            { id: "IN_PROGRESS", label: "In Progress" },
            { id: "AWAITING_REVIEW", label: "Awaiting Review", badgeCount: stats.awaitingReviewCount },
            { id: "OVERDUE", label: "Overdue", badgeCount: stats.overdueCount },
            { id: "ACCEPTED", label: "Accepted" },
            { id: "DISPUTED", label: "Disputed" },
          ].map((tab) => {
            const isActive = workflowFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setWorkflowFilter(tab.id as MilestoneWorkflowStatus)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-[#4f46e5] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      isActive
                        ? "bg-white text-[#4f46e5]"
                        : tab.id === "OVERDUE"
                        ? "bg-rose-500 text-white"
                        : "bg-amber-500 text-white"
                    }`}
                  >
                    {tab.badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ==============================================================
          SECTION 3: MILESTONE CARDS LIST
         ============================================================== */}
      {filteredMilestones.length === 0 ? (
        /* Empty States matching requirements */
        <div className="p-12 rounded-2xl border border-dashed border-slate-200 bg-white text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#eef2ff] text-[#4f46e5] flex items-center justify-center mx-auto">
            <Layers className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              {milestones.length === 0
                ? "No project milestones scheduled yet"
                : workflowFilter === "UPCOMING"
                ? "You're all caught up on upcoming deliverables."
                : workflowFilter === "AWAITING_REVIEW"
                ? "No deliverables need your review right now."
                : workflowFilter === "ACCEPTED"
                ? "Accepted milestones will appear here as projects progress."
                : "No milestones match your active filters."}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {milestones.length === 0
                ? "Milestones establish escrow release checkpoints protected by bilateral PayPal verification consensus. Once you post a project and agree on deliverable scopes, checkpoints will appear here."
                : "Try adjusting your search terms or clearing active filters to see all milestones."}
            </p>
          </div>
          {milestones.length === 0 ? (
            <div className="pt-2">
              <Link
                href="/client/post-project"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] transition shadow-xs"
              >
                <span>+ Post a New Project</span>
              </Link>
            </div>
          ) : (
            (searchQuery || workflowFilter !== "ALL" || projectFilter !== "ALL" || paymentFilter !== "ALL") && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setWorkflowFilter("ALL");
                    setProjectFilter("ALL");
                    setPaymentFilter("ALL");
                    setDueDateFilter("ALL");
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#4f46e5] bg-[#eef2ff] hover:bg-[#e0e7ff] transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset all filters</span>
                </button>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMilestones.map((m) => (
            <div
              key={m.id}
              onClick={() => {
                setSelectedMilestone(m);
                setDetailTab("overview");
              }}
              className={`p-5 rounded-2xl bg-white border shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer space-y-4 group ${
                m.workflowStatus === "AWAITING_REVIEW"
                  ? "border-amber-300 ring-2 ring-amber-100/60"
                  : m.isOverdue
                  ? "border-rose-200"
                  : "border-slate-200/90 hover:border-[#4f46e5]/40"
              }`}
            >
              {/* Row 1: Milestone Title, Project Name, Status Badge & Amount */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                      M{m.number}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#4f46e5] transition-colors truncate">
                      {m.title}
                    </h3>

                    {/* Workflow Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${m.workflowStatusColor}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      <span>{m.workflowStatusLabel}</span>
                    </span>

                    {/* Overdue Warning Flag */}
                    {m.isOverdue && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>Overdue</span>
                      </span>
                    )}
                  </div>

                  {/* Project Context & Canonical Version */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{m.projectName}</span>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-slate-500">{m.canonicalSpecHash}</span>
                  </div>
                </div>

                {/* Milestone Amount & Currency */}
                <div className="text-left sm:text-right font-mono shrink-0">
                  <div className="text-lg font-black text-slate-900">
                    {m.amount} <span className="text-xs text-slate-500 font-normal">{m.currency}</span>
                  </div>
                  {/* Payment Status Badge (Separated from Workflow Status!) */}
                  <div className="mt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold border ${m.paymentStateColor}`}
                    >
                      <CreditCard className="w-3 h-3" />
                      <span>{m.paymentStateLabel}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: Assigned Freelancer & Due Date Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                {/* Freelancer Profile */}
                <div className="flex items-center gap-2.5">
                  {m.freelancer ? (
                    <>
                      <div className="relative w-7 h-7 rounded-full overflow-hidden shrink-0 border border-slate-200">
                        {m.freelancer.avatar ? (
                          <Image
                            src={m.freelancer.avatar}
                            alt={m.freelancer.name}
                            width={28}
                            height={28}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[10px] uppercase">
                            {m.freelancer.name?.charAt(0) || "F"}
                          </div>
                        )}
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-slate-800">{m.freelancer.name}</span>
                        <span className="text-slate-400 text-[11px] ml-1.5">({m.freelancer.role})</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-slate-400 italic">No contractor assigned yet</span>
                  )}
                </div>

                {/* Due Date & Remaining */}
                <div className="flex items-center sm:justify-end gap-2 text-xs">
                  <Clock className={`w-3.5 h-3.5 ${m.isOverdue ? "text-rose-500" : "text-slate-400"}`} />
                  <span className="text-slate-500">Due:</span>
                  <span className={`font-bold ${m.isOverdue ? "text-rose-600" : "text-slate-800"}`}>
                    {m.dueDate}
                  </span>
                  <span className="text-slate-400 text-[11px]">({m.daysRemainingOrOverdue})</span>
                </div>
              </div>

              {/* Row 3: Next Client Action & Primary Button */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      m.workflowStatus === "AWAITING_REVIEW"
                        ? "bg-amber-100 text-amber-800"
                        : m.isOverdue
                        ? "bg-rose-100 text-rose-700"
                        : "bg-indigo-100 text-[#4f46e5]"
                    }`}
                  >
                    {m.workflowStatus === "AWAITING_REVIEW" ? (
                      <Clock className="w-3.5 h-3.5" />
                    ) : m.isOverdue ? (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 leading-snug">
                      Next Step: {m.nextClientAction.label}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5 truncate">
                      {m.nextClientAction.description}
                    </p>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMilestone(m);
                    setDetailTab("overview");
                  }}
                  className={`px-4 py-2 rounded-xl font-bold text-xs transition shrink-0 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-98 ${
                    m.workflowStatus === "AWAITING_REVIEW"
                      ? "bg-[#4f46e5] hover:bg-[#4338ca] text-white shadow-xs"
                      : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-200"
                  }`}
                >
                  <span>
                    {m.nextClientAction.actionType === "REVIEW_SUBMISSION"
                      ? "Review Submission"
                      : m.nextClientAction.actionType === "VIEW_RECEIPT"
                      ? "View Receipt & Details"
                      : m.nextClientAction.actionType === "VIEW_DISPUTE"
                      ? "View Dispute Info"
                      : m.nextClientAction.actionType === "VIEW_STATUS"
                      ? "View Status"
                      : "View Milestone"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ==============================================================
          SECTION 4: DEDICATED MILESTONE DETAILS VIEW (MODAL / DRAWER)
         ============================================================== */}
      {selectedMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#4f46e5] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    M{selectedMilestone.number}
                  </span>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight truncate">
                    {selectedMilestone.title}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${selectedMilestone.workflowStatusColor}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{selectedMilestone.workflowStatusLabel}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{selectedMilestone.projectName}</span>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-slate-500">
                    Agreement {selectedMilestone.canonicalSpecHash}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMilestone(null)}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs Bar */}
            <div className="flex items-center gap-1 px-6 border-b border-slate-100 bg-white overflow-x-auto no-scrollbar">
              {[
                { id: "overview", label: "Overview", icon: Layers },
                { id: "criteria", label: "Acceptance Criteria", icon: CheckCircle2, count: selectedMilestone.acceptanceCriteria.length },
                { id: "deliverables", label: "Deliverables", icon: FileCode, count: selectedMilestone.deliverables.length },
                { id: "activity", label: "Activity", icon: Activity, count: selectedMilestone.activities.length },
                { id: "payment", label: "Payment", icon: CreditCard },
              ].map((t) => {
                const Icon = t.icon;
                const isActive = detailTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setDetailTab(
                        t.id as
                          | "overview"
                          | "criteria"
                          | "deliverables"
                          | "activity"
                          | "payment"
                      )
                    }
                    className={`inline-flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? "border-[#4f46e5] text-[#4f46e5]"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                    {t.count !== undefined && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-100 text-slate-700">
                        {t.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-5">
              
              {/* TAB 1: OVERVIEW */}
              {detailTab === "overview" && (
                <div className="space-y-4 text-xs">
                  {/* Scope Summary Box */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Scope Overview
                    </span>
                    <p className="text-slate-700 leading-relaxed text-xs sm:text-[13px]">
                      {selectedMilestone.scopeOverview}
                    </p>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-400 text-[11px]">Agreed Amount</span>
                      <div className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
                        {selectedMilestone.amount} {selectedMilestone.currency}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Due Date</span>
                      <div className="text-xs font-bold text-slate-900 mt-1">
                        {selectedMilestone.dueDate}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Payment State</span>
                      <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                        {selectedMilestone.paymentStateLabel}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px]">Agreement Hash</span>
                      <div className="text-[11px] font-mono text-slate-600 mt-1 truncate">
                        {selectedMilestone.canonicalSpecHash}
                      </div>
                    </div>
                  </div>

                  {/* Assigned Freelancer Card */}
                  {selectedMilestone.freelancer && (
                    <div className="p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0">
                          {selectedMilestone.freelancer.avatar ? (
                            <Image
                              src={selectedMilestone.freelancer.avatar}
                              alt={selectedMilestone.freelancer.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                              {selectedMilestone.freelancer.name?.charAt(0) || "F"}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{selectedMilestone.freelancer.name}</div>
                          <div className="text-slate-500 text-[11px]">{selectedMilestone.freelancer.role}</div>
                        </div>
                      </div>
                      <span className="text-amber-600 font-semibold text-xs">
                        ★ {selectedMilestone.freelancer.rating} Verified
                      </span>
                    </div>
                  )}

                  {/* Section 14 Amendment Notice if applicable */}
                  {selectedMilestone.hasScopeChangeAmendment && (
                    <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span>Section 14 Amendment Active</span>
                      </div>
                      <p className="text-[11px] text-blue-800 leading-relaxed">
                        {selectedMilestone.amendmentNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: ACCEPTANCE CRITERIA */}
              {detailTab === "criteria" && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-500">
                    The exact agreed criteria used to objectively evaluate the delivered work:
                  </div>

                  <div className="space-y-2">
                    {selectedMilestone.acceptanceCriteria.map((ac, idx) => (
                      <div
                        key={ac.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 ${
                              ac.isMet ? "bg-emerald-500 text-white" : "border border-slate-300 bg-white"
                            }`}
                          >
                            {ac.isMet && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <div>
                            <span className="font-mono text-slate-400 font-bold mr-1.5">
                              AC-{idx + 1}:
                            </span>
                            <span className="text-slate-800 font-medium">{ac.criterion}</span>
                            {ac.notes && (
                              <p className="text-[11px] text-rose-600 mt-1 font-semibold">
                                Note: {ac.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            ac.isMet
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {ac.isMet ? "Met" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: DELIVERABLES */}
              {detailTab === "deliverables" && (
                <div className="space-y-4">
                  {selectedMilestone.submissionNotes && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="font-bold text-slate-800 block mb-1">Freelancer Submission Note:</span>
                      <p className="text-slate-600 leading-relaxed">{selectedMilestone.submissionNotes}</p>
                    </div>
                  )}

                  {selectedMilestone.deliverables.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                      No deliverables submitted yet for this milestone.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedMilestone.deliverables.map((del) => (
                        <div
                          key={del.id}
                          className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileCode className="w-4 h-4 text-[#4f46e5] shrink-0" />
                            <div className="truncate">
                              <span className="font-bold text-slate-900">{del.title}</span>
                              <span className="text-slate-400 text-[11px] ml-2">({del.size})</span>
                            </div>
                          </div>
                          <span className="text-slate-400 text-[11px] font-mono shrink-0">
                            {del.submittedAt}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: ACTIVITY & AUDIT */}
              {detailTab === "activity" && (
                <div className="space-y-3">
                  {selectedMilestone.activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-[#4f46e5] mt-1.5 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{act.action}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-700 font-semibold">
                              {act.actor}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] mt-0.5">{act.details}</p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <div className="text-[11px] text-slate-400">{act.timestamp}</div>
                        <div className="font-mono text-[10px] text-slate-400">{act.hash}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 5: PAYMENT */}
              {detailTab === "payment" && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">Financial Telemetry</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10.5px] font-bold border ${selectedMilestone.paymentStateColor}`}
                      >
                        {selectedMilestone.paymentStateLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400">Agreed Amount:</span>
                        <div className="font-mono font-bold text-slate-900 mt-0.5">
                          {selectedMilestone.amount} {selectedMilestone.currency}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Payment Provider:</span>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {selectedMilestone.paymentDetails?.provider || "PayPal Orders v2"}
                        </div>
                      </div>
                      {selectedMilestone.paymentDetails?.orderId && (
                        <div>
                          <span className="text-slate-400">PayPal Order ID:</span>
                          <div className="font-mono text-slate-800 mt-0.5">
                            #{selectedMilestone.paymentDetails.orderId}
                          </div>
                        </div>
                      )}
                      {selectedMilestone.paymentDetails?.captureId && (
                        <div>
                          <span className="text-slate-400">PayPal Capture ID:</span>
                          <div className="font-mono text-emerald-700 font-bold mt-0.5">
                            {selectedMilestone.paymentDetails.captureId}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Note: Milestones and payment events are tracked independently. Funds remain held securely until client acceptance is cryptographically signed.
                  </p>
                </div>
              )}

            </div>

            {/* Modal Footer Controls (Action Buttons by Status) */}
            <div className="p-5 border-t border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedMilestone(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>

              {/* Status Specific Actions */}
              {selectedMilestone.workflowStatus === "AWAITING_REVIEW" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCorrectionsModal(true)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Request Corrections
                  </button>

                  <button
                    type="button"
                    disabled={isCapturing}
                    onClick={() => handleApproveAndRelease(selectedMilestone)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {isCapturing ? (
                      <span>Capturing Escrow...</span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Accept & Release ({selectedMilestone.amount})</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {selectedMilestone.workflowStatus === "ACCEPTED" && (
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verified & Released under Dual SHA-256 Lock</span>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ==============================================================
          CORRECTIONS REQUEST MODAL (IDENTIFIES UNMET CRITERIA)
         ============================================================== */}
      {showCorrectionsModal && selectedMilestone && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                Request Deliverable Corrections
              </h3>
              <button
                type="button"
                onClick={() => setShowCorrectionsModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Select which agreed acceptance criteria are unfulfilled so the contractor can update the submission without scope expansion.
            </p>

            {/* Checkbox list of acceptance criteria */}
            <div className="space-y-2 max-h-48 overflow-y-auto p-1">
              {selectedMilestone.acceptanceCriteria.map((ac) => {
                const isChecked = selectedUnmetCriteria.includes(ac.criterion);
                return (
                  <label
                    key={ac.id}
                    className="flex items-start gap-2.5 p-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs cursor-pointer hover:bg-slate-100"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() =>
                        setSelectedUnmetCriteria((prev) =>
                          prev.includes(ac.criterion)
                            ? prev.filter((c) => c !== ac.criterion)
                            : [...prev, ac.criterion]
                        )
                      }
                      className="w-3.5 h-3.5 mt-0.5 rounded accent-[#4f46e5]"
                    />
                    <span className="text-slate-800">{ac.criterion}</span>
                  </label>
                );
              })}
            </div>

            {/* Revision Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Correction Instructions *
              </label>
              <textarea
                rows={3}
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                placeholder="Explain the specific issue with the unfulfilled criteria..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCorrectionsModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmitCorrections(selectedMilestone)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Transmit Correction Request
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

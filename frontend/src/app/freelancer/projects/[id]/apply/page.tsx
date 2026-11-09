"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  DollarSign,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  FileText,
  Upload,
  Trash2,
  Plus,
  Sparkles,
  Building,
  Briefcase,
  Download,
  ShieldCheck,
  ChevronRight,
  Send,
  HelpCircle,
  Check,
  TrendingUp,
  TrendingDown,
  Equal,
} from "lucide-react";
import {
  fetchProjectById,
  createDraftProposal,
  updateDraftProposal,
  submitProposal,
  uploadProposalAttachment,
} from "@/lib/api-client";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import ProjectUploadedDocumentCard from "@/components/ProjectUploadedDocumentCard";

interface MilestoneState {
  title: string;
  days: number;
  amount: string;
}

function FreelancerApplyContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = (params?.id as string) || "";
  const searchParams = useSearchParams();
  const revisionOf = searchParams.get("revisionOf");
  const [revisionFeedback, setRevisionFeedback] = useState<string | null>(null);
  const [existingActiveProposal, setExistingActiveProposal] = useState<any | null>(null);

  // Project state
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Proposal state
  const [proposalQuote, setProposalQuote] = useState<string>("$6,000.00");
  const [proposalDurationWeeks, setProposalDurationWeeks] = useState<number>(4);
  const [proposalScope, setProposalScope] = useState<string>(
    "I have thoroughly reviewed your project requirements and technical specifications. I am ready to implement the complete scope adhering strictly to the documented milestones, automated verification, and code quality benchmarks."
  );
  const [milestones, setMilestones] = useState<MilestoneState[]>([
    { title: "Milestone 1: Architecture & Data Ingestion Setup", days: 14, amount: "2100" },
    { title: "Milestone 2: Core Processing, Workflows & APIs", days: 21, amount: "2400" },
    { title: "Milestone 3: UI Dashboard, Verification & Final Delivery", days: 14, amount: "1500" },
  ]);
  const [proposalFile, setProposalFile] = useState<File | null>(null);

  // Show Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // If re-applying, fetch previous proposal data and client rejection feedback
  useEffect(() => {
    if (!revisionOf) return;
    async function loadPastProposal() {
      try {
        const res = await fetch(`/api/freelancer/proposals/${revisionOf}`, {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          if (json.proposal?.rejectionFeedback) {
            setRevisionFeedback(json.proposal.rejectionFeedback);
          }
          if (json.currentVersion) {
            const cv = json.currentVersion;
            const amt = cv.totalAmountMinor ? cv.totalAmountMinor / 100 : cv.amountCents ? cv.amountCents / 100 : null;
            if (amt) {
              setProposalQuote(`$${amt.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);
            }
            if (cv.estimatedDurationWeeks) {
              setProposalDurationWeeks(cv.estimatedDurationWeeks);
            }
            if (cv.coverLetter || cv.scopeText) {
              setProposalScope(cv.coverLetter || cv.scopeText);
            }
            if (Array.isArray(cv.milestonesJson) && cv.milestonesJson.length > 0) {
              setMilestones(
                cv.milestonesJson.map((m: any, idx: number) => ({
                  title: m.title || `Milestone ${idx + 1}`,
                  days: m.durationWeeks ? m.durationWeeks * 7 : 14,
                  amount: String(m.amountMinor ? m.amountMinor / 100 : 1500),
                }))
              );
            }
          }
        }
      } catch (err) {
        console.error("Failed to load revision proposal:", err);
      }
    }
    loadPastProposal();
  }, [revisionOf]);

  // Check if freelancer already has an active submitted proposal for this project
  useEffect(() => {
    if (!projectId || revisionOf) return;
    async function checkExisting() {
      try {
        const res = await fetch("/api/freelancer/proposals", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.proposals)) {
            const active = json.proposals.find(
              (p: any) =>
                p.projectId === projectId &&
                p.status !== "WITHDRAWN" &&
                p.status !== "REJECTED"
            );
            if (active) {
              setExistingActiveProposal(active);
            }
          }
        }
      } catch (err) {
        console.warn("Could not check existing proposal for project:", err);
      }
    }
    checkExisting();
  }, [projectId, revisionOf]);

  // Fetch project details
  useEffect(() => {
    if (!projectId) return;
    let isCurrent = true;
    setIsLoading(true);

    async function load() {
      try {
        const res = await fetch(`/api/freelancer/projects/${projectId}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (res.ok) {
          const json = await res.json();
          if (json.project && isCurrent) {
            initProjectData(json.project);
            setIsLoading(false);
            return;
          }
        }

        const fallback = await fetchProjectById(projectId);
        if (fallback && isCurrent) {
          initProjectData(fallback);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error("Failed to load project details for apply:", err);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    load();
    return () => {
      isCurrent = false;
    };
  }, [projectId]);

  // Initialize form with client's baseline data
  const initProjectData = (p: any) => {
    setProject(p);
    const rawBudget =
      p.budgetAmount ||
      (p.budgetCents ? p.budgetCents / 100 : 0) ||
      parseFloat(String(p.budget || p.totalBudget || "6000").replace(/[^0-9.]/g, "")) ||
      6000;

    setProposalQuote(`$${rawBudget.toLocaleString("en-US", { minimumFractionDigits: 2 })}`);

    // Parse duration if present
    const durStr = p.timelineDuration || p.duration || "4 weeks";
    const weeksMatch = durStr.match(/(\d+)\s*week/i);
    const monthsMatch = durStr.match(/(\d+)\s*month/i);
    if (weeksMatch) {
      setProposalDurationWeeks(parseInt(weeksMatch[1], 10));
    } else if (monthsMatch) {
      setProposalDurationWeeks(parseInt(monthsMatch[1], 10) * 4);
    } else {
      setProposalDurationWeeks(4);
    }

    // Initialize milestones from client's milestones or smart breakdown
    if (Array.isArray(p.milestones) && p.milestones.length > 0) {
      setMilestones(
        p.milestones.map((m: any, i: number) => ({
          title: m.title || `Milestone ${i + 1}`,
          days: m.days || 14,
          amount: String(m.amountCents ? m.amountCents / 100 : m.amount || Math.round(rawBudget / p.milestones.length)),
        }))
      );
    } else {
      const m1 = Math.round(rawBudget * 0.35);
      const m2 = Math.round(rawBudget * 0.40);
      const m3 = Math.max(0, rawBudget - m1 - m2);
      setMilestones([
        { title: "Milestone 1: Architecture & Data Ingestion Setup", days: 14, amount: String(m1) },
        { title: "Milestone 2: Core Processing, Workflows & APIs", days: 21, amount: String(m2) },
        { title: "Milestone 3: UI Dashboard, Verification & Final Delivery", days: 14, amount: String(m3) },
      ]);
    }
  };

  // Milestone management
  const handleAddMilestone = () => {
    setMilestones((prev) => [
      ...prev,
      {
        title: `Milestone ${prev.length + 1}: Additional Scope & QA Verification`,
        days: 14,
        amount: "500",
      },
    ]);
  };

  const handleRemoveMilestone = (idx: number) => {
    if (milestones.length <= 1) return;
    setMilestones((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateMilestone = (idx: number, field: keyof MilestoneState, val: any) => {
    setMilestones((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: val } : m))
    );
  };

  // Calculations & Counteroffer Analysis
  const cleanQuote = useMemo(() => {
    return parseFloat(proposalQuote.replace(/[^0-9.]/g, "")) || 0;
  }, [proposalQuote]);

  const clientBudget = useMemo(() => {
    if (!project) return 6000;
    return (
      project.budgetAmount ||
      (project.budgetCents ? project.budgetCents / 100 : 0) ||
      parseFloat(String(project.budget || project.totalBudget || "6000").replace(/[^0-9.]/g, "")) ||
      6000
    );
  }, [project]);

  const milestoneSum = useMemo(() => {
    return milestones.reduce((acc, m) => acc + (parseFloat(m.amount) || 0), 0);
  }, [milestones]);

  const isSumMatching = Math.abs(milestoneSum - cleanQuote) < 1;

  const budgetDelta = cleanQuote - clientBudget;
  const budgetDeltaPercent = clientBudget > 0 ? ((budgetDelta / clientBudget) * 100).toFixed(1) : "0";

  // Form Submit Handler
  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project?.id) {
      showToast("Error: Missing project context.");
      return;
    }

    if (cleanQuote <= 0) {
      showToast("Please enter a valid fixed price quote.");
      return;
    }

    if (!isSumMatching) {
      showToast(
        `Milestone sum ($${milestoneSum.toLocaleString()}) does not match total quote ($${cleanQuote.toLocaleString()}). Please adjust before submitting.`
      );
      return;
    }

    if (!proposalScope.trim()) {
      showToast("Please provide your technical approach or cover letter.");
      return;
    }

    if (existingActiveProposal && !revisionOf) {
      showToast("You already have an active proposal submitted for this project.");
      return;
    }

    try {
      setIsSubmitting(true);
      const priceMinor = Math.round(cleanQuote * 100);

      // 1. Create draft proposal in database
      const draftRes = await createDraftProposal(project.id);
      if (!draftRes.success || !draftRes.proposal) {
        showToast(draftRes.error || "Failed to create draft proposal.");
        return;
      }

      const proposalId = draftRes.proposal.id;

      // 2. Upload proposal attachment to Object Storage if provided
      if (proposalFile) {
        const uploadRes = await uploadProposalAttachment(proposalId, proposalFile);
        if (!uploadRes.success) {
          console.warn("[Proposal] File upload warning:", uploadRes.error);
        }
      }

      // 3. Format milestones and deliverables
      const formattedMilestones = milestones.map((m, idx) => ({
        title: m.title || `Milestone ${idx + 1}`,
        amountMinor: Math.round((parseFloat(m.amount) || 0) * 100),
        durationWeeks: Math.max(1, Math.round(m.days / 7)),
        criteria: [
          "Agreed milestone deliverable scope",
          "Automated verification test assert suite pass",
        ],
      }));

      const formattedDeliverables = milestones.map((m, idx) => ({
        title: m.title || `Deliverable ${idx + 1}`,
        description: `Deliverable milestone checkpoint #${idx + 1} with automated verification`,
        criteria: [
          "Full delivery of agreed scope",
          "Automated verification pass",
        ],
      }));

      // 4. Update draft proposal with counteroffer terms
      const updateRes = await updateDraftProposal(proposalId, {
        totalAmountMinor: priceMinor,
        paymentModel: "FIXED_PRICE",
        coverLetter: proposalScope.trim(),
        approach: proposalScope.trim(),
        scopeText: proposalScope.trim(),
        scope: proposalScope.trim(),
        estimatedDurationWeeks: proposalDurationWeeks,
        milestones: formattedMilestones,
        deliverables: formattedDeliverables,
      });

      if (!updateRes.success) {
        showToast(updateRes.error || "Failed to save proposal terms.");
        return;
      }

      // 5. Submit proposal formally to client
      const submitRes = await submitProposal(proposalId);
      if (!submitRes.success) {
        showToast(submitRes.error || "Failed to submit proposal to client.");
        return;
      }

      // 6. Navigate back to project details with success toast
      router.push(`/freelancer/projects/${project.id}?submitted=true`);
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "Failed to submit proposal.";
      showToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading proposal workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans selection:bg-indigo-600 selection:text-white">
      {/* 1. Left Sidebar Navigation */}
      <DashboardSidebar
        currentRole="FREELANCER"
        activeTab="find_projects"
        onTabChange={(tab) => router.push(`/freelancer/dashboard?tab=${tab}`)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-12">
        <DashboardTopHeader
          roleLabel="Freelancer Workspace"
          title="Submit Proposal & Counteroffer"
          subtitle="Formulate your technical approach, milestone checkpoints, and proposed terms."
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Breadcrumbs & Navigation */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Link
                href="/freelancer/dashboard?tab=find_projects"
                className="hover:text-indigo-600 transition font-medium"
              >
                Find Projects
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <Link
                href={`/freelancer/projects/${projectId}`}
                className="hover:text-indigo-600 transition font-medium truncate max-w-[200px]"
              >
                {project?.title || "Project"}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-900">Proposal & Counteroffer</span>
            </div>

            <Link
              href={`/freelancer/projects/${projectId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl transition shadow-2xs hover:bg-slate-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Project Overview</span>
            </Link>
          </div>

          {/* Active Proposal Notice Banner if already applied without rejection */}
          {existingActiveProposal && !revisionOf && (
            <div className="p-5 rounded-2xl bg-amber-50/90 border border-amber-300 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Proposal Already Submitted & Under Client Review
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                  Status: {existingActiveProposal.statusLabel || existingActiveProposal.status}
                </span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                You have already submitted an active proposal for this project ({existingActiveProposal.offer?.priceDisplay || existingActiveProposal.amountDisplay || "Fixed quote"}). 
                The client is currently reviewing your offer. Clients accept one active proposal per freelancer at a time.
              </p>
              <div className="pt-1 flex items-center justify-end">
                <Link
                  href="/freelancer/dashboard?tab=proposals"
                  className="py-1.5 px-3.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs transition shadow-xs flex items-center gap-1.5"
                >
                  <span>View in My Proposals</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Reapplication Notice Banner */}
          {revisionOf && (
            <div className="p-5 rounded-2xl bg-amber-50/90 border border-amber-200 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Reapplication: Revising Previous Proposal
                </h3>
              </div>
              {revisionFeedback && (
                <div className="p-3.5 rounded-xl bg-white/95 border border-amber-200/90 text-xs text-amber-950 space-y-1">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                    Client Rejection Feedback:
                  </p>
                  <p className="italic font-medium text-slate-800">
                    &quot;{revisionFeedback}&quot;
                  </p>
                </div>
              )}
              <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                Your previous proposal quote, timeline, and deliverables have been loaded into the form below. Adjust your quote, duration, or milestone breakdown to address the client&apos;s notes before submitting.
              </p>
            </div>
          )}

          {/* Project Summary Banner */}
          <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {project?.category || "Engineering"}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Verified Client Scope</span>
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>{project?.client?.company || project?.clientCompany || "Client Team"}</span>
                </span>
              </div>

              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                {project?.title}
              </h1>
            </div>

            {/* Baseline comparison pill */}
            <div className="flex items-center gap-3 shrink-0 bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Client Baseline</p>
                <p className="text-sm font-extrabold text-slate-900 font-mono">
                  ${clientBudget.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Timeline</p>
                <p className="text-sm font-bold text-slate-800">
                  {project?.timelineDuration || `${proposalDurationWeeks} weeks`}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitProposal}>
            {/* Split Comparison Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* =========================================================
                  LEFT COLUMN: CLIENT BASELINE TERMS & REQUIREMENTS (5 cols)
                 ========================================================= */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-slate-600" />
                      <span>Client Baseline Terms</span>
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                      Original Spec
                    </span>
                  </div>

                  {/* Client Budget & Timeline */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Client Budget</p>
                      <p className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
                        ${clientBudget.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Fixed Price Escrow</p>
                    </div>

                    <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Timeline</p>
                      <p className="text-base font-extrabold text-slate-900 mt-0.5">
                        {project?.timelineDuration || `${proposalDurationWeeks} Weeks`}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Expected Delivery</p>
                    </div>
                  </div>

                  {/* Client Milestones */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Client Expected Milestones</label>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {Array.isArray(project?.milestones) && project.milestones.length > 0
                          ? `${project.milestones.length} defined`
                          : "3 recommended"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(Array.isArray(project?.milestones) && project.milestones.length > 0
                        ? project.milestones
                        : [
                            {
                              title: "Architecture & Data Ingestion Setup",
                              amount: Math.round(clientBudget * 0.35),
                              days: 14,
                            },
                            {
                              title: "Core Processing, Workflows & APIs",
                              amount: Math.round(clientBudget * 0.40),
                              days: 21,
                            },
                            {
                              title: "UI Dashboard, Verification & Final Delivery",
                              amount: Math.max(0, clientBudget - Math.round(clientBudget * 0.75)),
                              days: 14,
                            },
                          ]
                      ).map((m: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-slate-800 line-clamp-1">
                              #{idx + 1} {m.title}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              {m.days ? `${m.days} days duration` : "Target timeline"}
                            </p>
                          </div>
                          <span className="font-mono font-bold text-slate-700 shrink-0">
                            ${(m.amountCents ? m.amountCents / 100 : m.amount || 0).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Client Intake Document if uploaded */}
                  {project?.uploadedDocument && (
                    <div className="pt-2">
                      <label className="text-xs font-bold text-slate-700 block mb-2">
                        Client Technical Intake Document
                      </label>
                      <ProjectUploadedDocumentCard
                        document={project.uploadedDocument}
                        projectTitle={project.title || "Project Specification"}
                        category={project.category || "Development"}
                        budget={proposalQuote || project.budgetDisplay || "$6,000.00"}
                        timeline={project.timelineDuration || `${proposalDurationWeeks} weeks`}
                        overview={project.description || "Project specification and requirements."}
                        objectives={
                          Array.isArray(project.objectives) && project.objectives.length > 0
                            ? project.objectives
                            : Array.isArray(project.milestones)
                            ? project.milestones.map((m: any) => m.title)
                            : []
                        }
                        technicalArchitecture={Array.isArray(project.skills) ? project.skills.join(", ") : ""}
                        functionalRequirements={
                          Array.isArray(project.functionalRequirements) && project.functionalRequirements.length > 0
                            ? project.functionalRequirements
                            : Array.isArray(project.milestones)
                            ? project.milestones.map((m: any) => `${m.title}: ${m.deliverablesSummary || "Deliverable specification"}`)
                            : []
                        }
                        acceptanceCriteria={
                          Array.isArray(project.acceptanceCriteria) && project.acceptanceCriteria.length > 0
                            ? project.acceptanceCriteria
                            : [
                                "All features and workflows pass documented test verification",
                                "Full source code and deployment runbook delivered",
                                "Milestone deliverable review accepted by client",
                              ]
                        }
                        clientName={project.client?.name || project.clientName || "Client"}
                      />
                    </div>
                  )}

                  {/* Required Skills */}
                  {Array.isArray(project?.skills) && project.skills.length > 0 && (
                    <div className="pt-2">
                      <label className="text-xs font-bold text-slate-700 block mb-2">
                        Target Skill Requirements
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {project.skills.map((skill: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* =========================================================
                  RIGHT COLUMN: FREELANCER PROPOSAL & COUNTEROFFER (7 cols)
                 ========================================================= */}
              <div className="lg:col-span-7 space-y-5">
                {/* 1. Counteroffer Real-Time Comparison Card */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Your Proposed Terms & Counteroffer</span>
                    </h3>

                    {/* Counteroffer badge */}
                    {budgetDelta === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Equal className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Matches Client Budget</span>
                      </span>
                    ) : budgetDelta > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Counteroffer: +${budgetDelta.toLocaleString()} (+{budgetDeltaPercent}%)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                        <span>Discounted Quote: -${Math.abs(budgetDelta).toLocaleString()} ({budgetDeltaPercent}%)</span>
                      </span>
                    )}
                  </div>

                  {/* Proposed Quote & Timeline Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Your Fixed Price Quote ($ USD)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={proposalQuote}
                          onChange={(e) => setProposalQuote(e.target.value)}
                          placeholder="$6,000.00"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Client baseline was ${clientBudget.toLocaleString()}. You may counteroffer or quote exactly.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Proposed Duration & Delivery</span>
                      </label>
                      <select
                        value={proposalDurationWeeks}
                        onChange={(e) => setProposalDurationWeeks(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition bg-white"
                      >
                        <option value={2}>2 weeks (High-velocity Sprint)</option>
                        <option value={4}>4 weeks (Standard 1 Month)</option>
                        <option value={6}>6 weeks (1.5 Months Delivery)</option>
                        <option value={8}>8 weeks (2 Months Delivery)</option>
                        <option value={12}>12 weeks (3 Months Quarter)</option>
                        <option value={16}>16 weeks (4 Months Delivery)</option>
                        <option value={24}>24 weeks (6 Months Mid-Term)</option>
                        <option value={36}>36 weeks (9 Months Extended Scope)</option>
                        <option value={52}>52 weeks (1 Year / Long-Term Engagement)</option>
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Select the delivery timeframe you commit to for all milestones.
                      </p>
                    </div>
                  </div>

                  {/* Milestone Breakdown & Payment Checkpoints Editor */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Custom Milestone Checkpoints</span>
                        </label>
                        <p className="text-[11px] text-slate-400">
                          Break down your scope into verifiable stages with respective payment checkpoints.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddMilestone}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Checkpoint</span>
                      </button>
                    </div>

                    {/* Milestones list */}
                    <div className="space-y-2.5">
                      {milestones.map((m, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs transition hover:border-slate-300"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-bold text-slate-400 w-6 shrink-0 text-center font-mono">
                              #{idx + 1}
                            </span>
                            <input
                              type="text"
                              value={m.title}
                              onChange={(e) => handleUpdateMilestone(idx, "title", e.target.value)}
                              placeholder="Milestone title and deliverable summary..."
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
                              required
                            />
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <div className="w-24">
                              <div className="relative">
                                <input
                                  type="number"
                                  min={1}
                                  value={m.days}
                                  onChange={(e) => handleUpdateMilestone(idx, "days", Number(e.target.value))}
                                  placeholder="Days"
                                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center focus:outline-none focus:border-indigo-500"
                                  title="Days to complete"
                                />
                                <span className="text-[9px] text-slate-400 block text-center mt-0.5">days</span>
                              </div>
                            </div>

                            <div className="w-28 relative">
                              <span className="absolute left-2.5 top-2 text-slate-400 font-mono text-xs">$</span>
                              <input
                                type="number"
                                min={0}
                                value={m.amount}
                                onChange={(e) => handleUpdateMilestone(idx, "amount", e.target.value)}
                                placeholder="Amount"
                                className="w-full pl-6 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                                required
                              />
                              <span className="text-[9px] text-slate-400 block text-center mt-0.5">checkpoint</span>
                            </div>

                            {milestones.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMilestone(idx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Remove milestone"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Milestone Sum vs Total Quote Validator */}
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                        isSumMatching
                          ? "bg-emerald-50/70 border-emerald-200/80 text-emerald-800"
                          : "bg-amber-50/70 border-amber-200/80 text-amber-800"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isSumMatching ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                        <div>
                          <p className="font-bold">
                            {isSumMatching
                              ? "Checkpoints Balanced"
                              : "Milestone Sum Mismatch"}
                          </p>
                          <p className="text-[11px] opacity-90">
                            Sum of milestones:{" "}
                            <span className="font-mono font-bold">${milestoneSum.toLocaleString()}</span> | Total Quote:{" "}
                            <span className="font-mono font-bold">${cleanQuote.toLocaleString()}</span>
                          </p>
                        </div>
                      </div>

                      {!isSumMatching && (
                        <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                          Delta: ${Math.abs(milestoneSum - cleanQuote).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cover Letter & Technical Methodology */}
                  <div className="pt-3 border-t border-slate-100 space-y-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Cover Letter, Methodology & Technical Approach
                    </label>
                    <textarea
                      rows={5}
                      value={proposalScope}
                      onChange={(e) => setProposalScope(e.target.value)}
                      placeholder="Explain your technical strategy, stack choices, architecture roadmap, and past delivered systems..."
                      className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-sans text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none leading-relaxed"
                      required
                    />
                    <p className="text-[11px] text-slate-400">
                      Highlight how your milestones fulfill the client's acceptance criteria.
                    </p>
                  </div>

                  {/* Proposal Document Upload (Stored to S3 / Object Storage) */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Attach Technical Proposal Document (PDF, DOCX, Deck)</span>
                    </label>

                    {proposalFile ? (
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {proposalFile.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {proposalFile.size > 1024 * 1024
                                ? `${(proposalFile.size / (1024 * 1024)).toFixed(1)} MB`
                                : `${Math.round(proposalFile.size / 1024)} KB`}{" "}
                              · Stored to Object Storage for Client Review
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setProposalFile(null)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Remove document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition text-center group">
                        <div className="w-9 h-9 rounded-full bg-white shadow-2xs border border-slate-200 flex items-center justify-center group-hover:scale-105 transition">
                          <Upload className="w-4 h-4 text-indigo-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-800">
                          Click to upload proposal document or presentation deck
                        </span>
                        <span className="text-[11px] text-slate-400">
                          PDF, DOCX, PNG up to 10MB · Automatically uploaded to Object Storage
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.docx,.png,.jpg,.jpeg"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setProposalFile(f);
                          }}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions Footer */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs mt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-xs w-full sm:w-auto justify-between sm:justify-start">
                  <Link
                    href={`/freelancer/projects/${projectId}`}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition"
                  >
                    Discard & Cancel
                  </Link>

                  <div className="hidden sm:flex items-center gap-3 text-slate-500 font-medium pl-3 border-l border-slate-200">
                    <span>
                      Total Quote:{" "}
                      <strong className="text-slate-900 font-mono">${cleanQuote.toLocaleString()}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Milestones: <strong className="text-slate-900">{milestones.length}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Duration: <strong className="text-slate-900">{proposalDurationWeeks} Weeks</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={isSubmitting || !isSumMatching || Boolean(existingActiveProposal && !revisionOf)}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting Proposal to Client...</span>
                      </>
                    ) : existingActiveProposal && !revisionOf ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Proposal Already Submitted (Under Review)</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {revisionOf
                            ? "Submit Revised Proposal to Client"
                            : "Submit Formal Proposal & Escrow Checkpoints"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function FreelancerApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <FreelancerApplyContent />
    </Suspense>
  );
}

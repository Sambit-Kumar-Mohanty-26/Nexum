"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  Clock,
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Calendar,
  ChevronRight,
  Paperclip,
  Building,
  X,
  Eye,
  Star,
  Check,
  User,
  MessageSquare,
  Send,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import { acceptClientProposal, rejectClientProposal } from "@/lib/api-client";
import UserAvatar from "@/components/UserAvatar";

interface ProposalAttachment {
  id: string;
  name: string;
  size?: string;
  sizeBytes?: number;
  type?: string;
  url: string;
}

interface MilestoneItem {
  id?: string;
  title: string;
  amount?: number | string;
  amountMinor?: number;
  days?: number;
  durationWeeks?: number;
  criteria?: string[];
}

interface ProposalDetails {
  id: string;
  projectId: string;
  projectTitle: string;
  freelancerId: string;
  freelancerName: string;
  freelancerRole: string;
  avatar: string;
  rating: string;
  status: "ACCEPTED" | "UNDER_REVIEW" | "SUBMITTED" | "DECLINED" | "REJECTED";
  rejectionFeedback?: string;
  amountCents: number;
  proposedBudget: string;
  estimatedTimeline: string;
  estimatedDurationWeeks?: number;
  coverLetter: string;
  approach?: string;
  proposedMilestones: MilestoneItem[];
  attachments?: ProposalAttachment[];
  submittedDate: string;
}

function ProposalReviewContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = (params?.id as string) || "";
  const proposalId = (params?.proposalId as string) || "";

  const [proposal, setProposal] = useState<ProposalDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [isAccepting, setIsAccepting] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReasonPreset, setDeclineReasonPreset] = useState("Budget exceeds project allocation");
  const [declineCustomFeedback, setDeclineCustomFeedback] = useState("");
  const [isDeclining, setIsDeclining] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [clientMessageText, setClientMessageText] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ProposalAttachment | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Fetch proposal details
  useEffect(() => {
    if (!proposalId) return;
    let isCurrent = true;
    setIsLoading(true);

    async function loadProposal() {
      try {
        // 1. Try dedicated proposal endpoint
        const res = await fetch(`/api/client/proposals/${proposalId}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (res.ok) {
          const json = await res.json();
          if (json.proposal && isCurrent) {
            setProposal(json.proposal);
            setIsLoading(false);
            return;
          }
        }

        // 2. Fallback to project details
        const projRes = await fetch(`/api/client/projects/${projectId}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (projRes.ok) {
          const projJson = await projRes.json();
          const targetProj = projJson.project || projJson;
          const found = (targetProj.proposals || []).find((p: any) => p.id === proposalId);
          if (found && isCurrent) {
            setProposal({
              id: found.id,
              projectId: targetProj.id || projectId,
              projectTitle: targetProj.title || "Project Opportunity",
              freelancerId: found.freelancerId || found.freelancer?.id || "",
              freelancerName: found.freelancerName || found.freelancer?.name || "Candidate",
              freelancerRole: found.freelancerRole || found.freelancer?.freelancerProfile?.title || "Verified Talent",
              avatar:
                (found.avatar && !found.avatar.includes("photo-1507003211169"))
                  ? found.avatar
                  : (found.freelancer?.avatar && !found.freelancer.avatar.includes("photo-1507003211169"))
                  ? found.freelancer.avatar
                  : (found.freelancer?.preferences?.avatar && !found.freelancer.preferences.avatar.includes("photo-1507003211169"))
                  ? found.freelancer.preferences.avatar
                  : null,
              rating: found.rating || "5.0",
              status: found.status === "ACCEPTED" ? "ACCEPTED" : (found.status === "REJECTED" || found.status === "DECLINED") ? "DECLINED" : "UNDER_REVIEW",
              rejectionFeedback: found.rejectionFeedback,
              amountCents: found.amountCents || 0,
              proposedBudget: found.proposedBudget || `$${((found.amountCents || 600000) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD`,
              estimatedTimeline: found.estimatedTimeline || "4 weeks",
              estimatedDurationWeeks: found.estimatedDurationWeeks || 4,
              coverLetter: found.coverLetter || "Experienced developer ready to execute deliverables with automated test assert logs.",
              approach: found.approach || "",
              proposedMilestones: found.proposedMilestones || found.milestones || [],
              attachments: found.attachments || [],
              submittedDate: found.submittedDate || "Recent",
            });
            setIsLoading(false);
            return;
          }
        }

        if (isCurrent) {
          setError("Proposal not found.");
        }
      } catch (err: unknown) {
        console.error("Failed to load proposal details:", err);
        if (isCurrent) setError("Failed to load proposal.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadProposal();
    return () => {
      isCurrent = false;
    };
  }, [proposalId, projectId]);

  // Handle Preset Selection for Decline Feedback
  const handleSelectDeclinePreset = (preset: string) => {
    setDeclineReasonPreset(preset);
    if (preset === "Budget exceeds project allocation") {
      setDeclineCustomFeedback(
        "Thank you for your proposal. We are unable to proceed at this time as the quoted price exceeds our budget for this scope. You are welcome to revise your pricing or milestone scope and reapply."
      );
    } else if (preset === "Estimated delivery timeline is too long") {
      setDeclineCustomFeedback(
        "Thank you for your proposal. Our project roadmap requires delivery within a tighter timeframe than proposed. If you are able to adjust the delivery pace or sprint scope, please feel free to submit a revised proposal."
      );
    } else if (preset === "Milestone checkpoints need more granular deliverables") {
      setDeclineCustomFeedback(
        "Thank you for your proposal. We would like to see a more granular breakdown of milestones with concrete deliverables and test criteria before making a commitment. Please feel free to revise your milestones and reapply."
      );
    } else if (preset === "Technical scope / approach does not align with requirements") {
      setDeclineCustomFeedback(
        "Thank you for your proposal. The proposed technical approach or scope does not fully align with our architectural requirements. Please review our specifications and consider submitting a revised proposal."
      );
    } else {
      setDeclineCustomFeedback("");
    }
  };

  // Open Decline Modal with pre-filled default
  const handleOpenDeclineModal = () => {
    const preset = "Budget exceeds project allocation";
    setDeclineReasonPreset(preset);
    setDeclineCustomFeedback(
      "Thank you for your proposal. At this time, we are unable to accept this proposal as the quote exceeds our allocated budget. You are welcome to adjust your scope, timeline, or pricing and submit a revised proposal."
    );
    setShowDeclineModal(true);
  };

  // Accept Proposal
  const handleAccept = async () => {
    if (!proposal || isAccepting) return;
    setIsAccepting(true);
    showToast("Processing proposal acceptance, synchronizing milestones & synthesizing contract v1.0...");

    try {
      const res = await acceptClientProposal(proposal.id);
      if (res.success) {
        setProposal((prev) => (prev ? { ...prev, status: "ACCEPTED" } : null));
        showToast("Proposal approved! Milestones synchronized and Bilateral Contract v1.0 synthesized!");
        setTimeout(() => {
          router.push(`/client/workspace`);
        }, 1200);
      } else {
        showToast(res.error || "Failed to accept proposal.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept proposal";
      showToast(msg);
    } finally {
      setIsAccepting(false);
    }
  };

  // Confirm Decline
  const handleConfirmDecline = async () => {
    if (!proposal || isDeclining) return;
    setIsDeclining(true);
    showToast("Declining proposal and delivering feedback to candidate...");

    try {
      const feedback = declineCustomFeedback.trim() || declineReasonPreset || "Declined by client";
      const res = await rejectClientProposal(proposal.id, feedback);
      if (res.success) {
        setProposal((prev) =>
          prev ? { ...prev, status: "DECLINED", rejectionFeedback: feedback } : null
        );
        setShowDeclineModal(false);
        showToast("Proposal declined and feedback delivered to candidate.");
      } else {
        showToast(res.error || "Failed to decline proposal.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to decline proposal";
      showToast(msg);
    } finally {
      setIsDeclining(false);
    }
  };

  // Send Message to Candidate to Start Discussion
  const handleSendMessage = async () => {
    if (!clientMessageText.trim() || isSendingMessage || !proposal) return;
    try {
      setIsSendingMessage(true);
      showToast("Sending message to candidate & activating workspace discussions...");
      await fetch(`/api/workspace/projects/${projectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: "client",
          senderRole: "CLIENT",
          content: clientMessageText.trim(),
        }),
      });

      showToast("Message sent! Workspace discussions are now open for both parties.");
      setShowMessageModal(false);
      setClientMessageText("");
    } catch {
      showToast("Failed to send message. Please try again.");
    } finally {
      setIsSendingMessage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Loading candidate proposal details...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f8fafc] p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">{error || "Proposal Not Found"}</h2>
          <p className="text-xs text-slate-500">
            The proposal you are looking for may have been withdrawn or does not exist for this project.
          </p>
          <Link
            href={`/client/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Project Workspace</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans selection:bg-indigo-600 selection:text-white">
      {/* 1. Left Sidebar Navigation */}
      <DashboardSidebar
        currentRole="CLIENT"
        activeTab="projects"
        onTabChange={(tab) => router.push(`/client/dashboard?tab=${tab}`)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-28">
        <DashboardTopHeader
          roleLabel="Client Workspace"
          title="Review Candidate Proposal"
          subtitle="Evaluate candidate's proposed fixed quote, delivery schedule, technical approach, and milestone checkpoints."
        />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Breadcrumbs & Navigation */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Link href="/client/dashboard?tab=projects" className="hover:text-indigo-600 transition font-medium">
                Projects
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <Link
                href={`/client/projects/${projectId}`}
                className="hover:text-indigo-600 transition font-medium truncate max-w-[200px]"
              >
                {proposal.projectTitle}
              </Link>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-900 truncate max-w-[180px]">
                {proposal.freelancerName}&apos;s Proposal
              </span>
            </div>

            <Link
              href={`/client/projects/${projectId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl transition shadow-2xs hover:bg-slate-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Workspace</span>
            </Link>
          </div>

          {/* Status Banners */}
          {proposal.status === "ACCEPTED" && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-900">Proposal Approved & Accepted</p>
                <p className="text-[11px] text-emerald-700">
                  A bilateral agreement has been initialized and is currently ACTIVE in your project workspace.
                </p>
              </div>
            </div>
          )}

          {(proposal.status === "DECLINED" || proposal.status === "REJECTED") && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <p className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                  Proposal Declined by Client
                </p>
              </div>
              <p className="text-xs text-rose-800 italic pl-4.5">
                &quot;{proposal.rejectionFeedback || "Declined by client."}&quot;
              </p>
            </div>
          )}

          {/* Main Review Showcase Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Header: Candidate Identity */}
            <div className="p-6 sm:p-7 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => router.push(`/client/freelancers/${proposal.freelancerId}?fromProposal=${proposal.id}&fromProject=${projectId}`)}
                  className="shrink-0 group cursor-pointer text-left"
                  title="View Freelancer Profile"
                >
                  <UserAvatar
                    name={proposal.freelancerName}
                    avatarUrl={proposal.avatar}
                    size="xl"
                    className="rounded-2xl group-hover:ring-2 group-hover:ring-indigo-500/30 transition shadow-2xs"
                  />
                </button>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/client/freelancers/${proposal.freelancerId}?fromProposal=${proposal.id}&fromProject=${projectId}`)}
                      className="text-lg sm:text-xl font-bold text-slate-900 hover:text-indigo-600 transition text-left cursor-pointer"
                    >
                      {proposal.freelancerName}
                    </button>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                      <span>{proposal.rating} Verified Talent</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {proposal.freelancerRole} · Submitted on {proposal.submittedDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => router.push(`/client/freelancers/${proposal.freelancerId}?fromProposal=${proposal.id}&fromProject=${projectId}`)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>View Freelancer Profile</span>
                </button>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    proposal.status === "ACCEPTED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : proposal.status === "DECLINED" || proposal.status === "REJECTED"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}
                >
                  {proposal.status === "ACCEPTED"
                    ? "ACCEPTED"
                    : proposal.status === "DECLINED" || proposal.status === "REJECTED"
                    ? "DECLINED"
                    : "UNDER REVIEW"}
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-7">
              {/* Commercial Terms Snapshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Proposed Fixed Quote</span>
                  </span>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {proposal.proposedBudget}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Fixed-Price Milestone Escrow
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Delivery Timeframe</span>
                  </span>
                  <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {proposal.estimatedTimeline}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Committed sprint delivery schedule
                  </p>
                </div>
              </div>

              {/* Cover Letter & Technical Approach */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Cover Letter & Technical Approach</span>
                </h3>
                <div className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 text-xs sm:text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-line">
                  {proposal.coverLetter}
                  {proposal.approach && proposal.approach !== proposal.coverLetter && (
                    <div className="mt-4 pt-4 border-t border-slate-200/60">
                      <p className="text-xs font-bold text-slate-900 mb-1">Architecture & Implementation Scope:</p>
                      <p className="text-xs text-slate-700">{proposal.approach}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Attached Proposal Document (Object Storage / S3) - RENDERED ONLY IF UPLOADED */}
              {proposal.attachments && proposal.attachments.length > 0 && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Attached Technical Proposal Document</span>
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Object Storage Verified
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {proposal.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {att.name}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {att.size || "Document"} · Uploaded by candidate
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(att)}
                            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-600" />
                            <span>View</span>
                          </button>
                          <a
                            href={`${att.url}${att.url.includes("?") ? "&" : "?"}download=true`}
                            download={att.name}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposed Milestones & Payment Checkpoints */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Proposed Milestones & Payment Checkpoints</span>
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">
                    {proposal.proposedMilestones.length} checkpoints
                  </span>
                </div>

                <div className="space-y-3">
                  {proposal.proposedMilestones.map((m, idx) => {
                    const rawAmt = m.amountMinor ? m.amountMinor / 100 : m.amount;
                    const formattedAmt =
                      typeof rawAmt === "number"
                        ? `$${rawAmt.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        : rawAmt || "Custom";

                    return (
                      <div
                        key={idx}
                        className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 pr-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-indigo-600 font-mono">
                              #{idx + 1}
                            </span>
                            <p className="text-xs sm:text-sm font-bold text-slate-900">
                              {m.title}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {m.days
                              ? `${m.days} days duration`
                              : m.durationWeeks
                              ? `${m.durationWeeks} weeks sprint`
                              : "Sprint delivery stage"}
                          </p>
                          {Array.isArray(m.criteria) && m.criteria.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {m.criteria.map((c, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm sm:text-base font-extrabold text-slate-900 font-mono">
                            {formattedAmt}
                          </span>
                          <p className="text-[10px] text-slate-400">Escrow Checkpoint</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="p-6 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <Link
                href={`/client/projects/${projectId}`}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-600 transition text-center"
              >
                Close / Back to Workspace
              </Link>

              {proposal.status === "ACCEPTED" ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/client/workspace"
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Open Workspace & Escrow</span>
                  </Link>
                </div>
              ) : proposal.status !== "DECLINED" && proposal.status !== "REJECTED" ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setClientMessageText(`Hi ${proposal.freelancerName}, `);
                      setShowMessageModal(true);
                    }}
                    disabled={isAccepting || isDeclining}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                    <span>Message Candidate</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenDeclineModal}
                    disabled={isAccepting || isDeclining}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition cursor-pointer disabled:opacity-50"
                  >
                    Decline
                  </button>

                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={isAccepting || isDeclining}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAccepting ? "Synthesizing Contract v1.0..." : "Approve & Accept Proposal"}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </main>
      </div>

      {/* Message Candidate & Start Discussion Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Message Candidate: {proposal.freelancerName}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sending a message opens workspace discussions for both parties immediately.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMessageModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="text-xs font-bold text-slate-800">
                Inquiry / Discussion Topic
              </label>
              <textarea
                rows={4}
                value={clientMessageText}
                onChange={(e) => setClientMessageText(e.target.value)}
                placeholder={`Ask a question or request technical clarification from ${proposal.freelancerName}...`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
              <p className="text-[11px] text-slate-400">
                All communications are mediated through Nexum AI and logged to the project audit ledger.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowMessageModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!clientMessageText.trim() || isSendingMessage}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingMessage ? "Sending..." : "Send & Open Workspace"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Proposal with Rejection Feedback Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h2 className="text-sm font-bold text-slate-900">
                  Decline Proposal & Provide Reason
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-900">{proposal.freelancerName}</p>
                  <p className="text-[11px] text-slate-500">{proposal.freelancerRole}</p>
                </div>
                <span className="text-xs font-extrabold text-slate-900">{proposal.proposedBudget}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Select Primary Reason
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Budget exceeds project allocation",
                    "Estimated delivery timeline is too long",
                    "Milestone checkpoints need more granular deliverables",
                    "Technical scope / approach does not align with requirements",
                    "Other / Custom feedback",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSelectDeclinePreset(preset)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                        declineReasonPreset === preset
                          ? "bg-rose-100 text-rose-800 border border-rose-300 font-semibold"
                          : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Feedback for Candidate <span className="text-slate-400 font-normal">(Shared with freelancer so they can revise & reapply)</span>
                </label>
                <textarea
                  rows={4}
                  value={declineCustomFeedback}
                  onChange={(e) => setDeclineCustomFeedback(e.target.value)}
                  placeholder="Explain what needs adjustment (quote, timeline, or milestone scope) so the freelancer can address it..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                disabled={isDeclining}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecline}
                disabled={isDeclining || !declineCustomFeedback.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <span>{isDeclining ? "Sending..." : "Decline & Send Feedback"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document In-App Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-white shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-[#4f46e5] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-slate-900 truncate">
                    {previewDoc.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {previewDoc.size || "Document"} · Technical Proposal Attachment
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  title="Open in new window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New Tab</span>
                </a>
                <a
                  href={`${previewDoc.url}${previewDoc.url.includes("?") ? "&" : "?"}download=true`}
                  download={previewDoc.name}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Close viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Viewer Body */}
            <div className="flex-1 overflow-hidden bg-slate-100 p-2 sm:p-4">
              {previewDoc.name.toLowerCase().match(/\.(png|jpe?g|webp|gif|svg)$/) ? (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-4 bg-white rounded-xl border border-slate-200">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.name}
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-full h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <iframe
                    src={`${previewDoc.url}#toolbar=1&navpanes=0`}
                    className="w-full h-full border-0"
                    title={previewDoc.name}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

export default function ClientProposalReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ProposalReviewContent />
    </Suspense>
  );
}


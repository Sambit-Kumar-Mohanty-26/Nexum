"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  Users,
  MessageSquare,
  ShieldCheck,
  CreditCard,
  Activity,
  GitPullRequest,
  Plus,
  AlertTriangle,
  ExternalLink,
  DollarSign,
  Calendar,
  Sparkles,
  Download,
  Share2,
  Check,
  Send,
  HelpCircle,
  FileCode,
  Lock,
  ChevronRight,
  TrendingUp,
  FolderKanban,
  X,
  Eye,
  User,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import { useAuth } from "@/context/AuthContext";
import { getProjectById, ProjectDetailData, MOCK_PROJECTS, ProjectLifecycleStatus, MilestoneItem, ProposalItem } from "@/lib/mock-projects";
import { fetchProjectById, acceptClientProposal, rejectClientProposal, approveClientMilestone } from "@/lib/api-client";
import MilestoneAutomatedChecksCard from "@/components/MilestoneAutomatedChecksCard";
import ProjectUploadedDocumentCard from "@/components/ProjectUploadedDocumentCard";
import UserAvatar from "@/components/UserAvatar";

type ProjectTab =
  | "overview"
  | "brief"
  | "proposals"
  | "milestones"
  | "workspace"
  | "changes"
  | "payments"
  | "activity";

function ProjectWorkspaceContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const projectId = (params?.id as string) || "proj_1";
  const initialTab = (searchParams.get("tab") as ProjectTab) || "overview";

  const isStaticMock = Boolean(MOCK_PROJECTS[projectId]);
  const [activeTab, setActiveTab] = useState<ProjectTab>(initialTab);
  const [projectData, setProjectData] = useState<ProjectDetailData | null>(() =>
    isStaticMock ? getProjectById(projectId) : null
  );
  const [isLoading, setIsLoading] = useState(!isStaticMock);
  const [isLiveLoaded, setIsLiveLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Fetch live project data from database/backend API
  React.useEffect(() => {
    let isMounted = true;
    async function loadLiveProject() {
      try {
        const live = await fetchProjectById(projectId);
        if (live && isMounted) {
          setIsLiveLoaded(true);
          const acceptedProposal = live.proposals?.find((p: any) => p.status === "ACCEPTED");
          const freelancer = live.contractor || acceptedProposal?.freelancer;
          const rawMilestones = (live.milestones && live.milestones.length > 0)
            ? live.milestones
            : (acceptedProposal?.milestones || []);

          // Status & lifecycle derivation
          let status: ProjectLifecycleStatus = "IN_PROGRESS";
          let statusLabel = "In Progress";
          let statusColor = "bg-blue-50 text-blue-700 border-blue-200/80";
          let stageSummary = "Milestone in active engineering progress under consensus agreement.";
          let nextAction: ProjectDetailData["nextAction"] = {
            label: "Track Milestone Progress",
            description: "Sprint review scheduled on calendar.",
            type: "VIEW",
            urgent: false,
            tabTarget: "milestones",
          };

          if (live.state === "DRAFT") {
            status = "DRAFT";
            statusLabel = "Draft";
            statusColor = "bg-amber-50 text-amber-800 border-amber-200/90";
            stageSummary = "Draft spec saved. Ready to complete remaining details and publish.";
            nextAction = {
              label: "Resume Project Setup",
              description: "Complete remaining technical details and publish scope to match talent.",
              type: "RESUME",
              urgent: false,
              tabTarget: "brief",
            };
          } else if (
            live.state === "MATCHING" ||
            live.state === "INTAKE" ||
            live.state === "FINDING_FREELANCERS" ||
            (!freelancer && (live.state === "ACTIVE" || !live.state))
          ) {
            status = "FINDING_FREELANCERS";
            statusLabel = "Finding Freelancers";
            statusColor = "bg-indigo-50 text-indigo-700 border-indigo-200/80";
            stageSummary = "Approved brief published. Broadcast to verified talent network for proposals.";
            nextAction = {
              label: "Evaluate Candidate Proposals",
              description: "Review candidate profiles and proposal quotes.",
              type: "VIEW",
              urgent: false,
              tabTarget: "proposals",
            };
          } else if (live.state === "IN_REVIEW") {
            status = "IN_REVIEW";
            statusLabel = "In Review";
            statusColor = "bg-amber-50 text-amber-800 border-amber-200/80";
            stageSummary = "Milestone deliverable package submitted with full test assert logs.";
            nextAction = {
              label: "Review Deliverable & Release Funds",
              description: "Review automated tests & approve release of funds from Sandbox escrow.",
              type: "ACTION_REQUIRED",
              urgent: true,
              tabTarget: "milestones",
            };
          } else if (live.state === "COMPLETED") {
            status = "COMPLETED";
            statusLabel = "Completed";
            statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
            stageSummary = "All milestones accepted, verified & released via PayPal captures.";
            nextAction = {
              label: "View Contract Archive",
              description: "All milestone funds disbursed and cryptographic receipts archived.",
              type: "VIEW",
              urgent: false,
              tabTarget: "payments",
            };
          } else if (live.state === "DISPUTED") {
            status = "DISPUTED";
            statusLabel = "Disputed";
            statusColor = "bg-rose-50 text-rose-700 border-rose-200/80";
            stageSummary = "Milestone hold active. Bilateral AI mediation underway.";
            nextAction = {
              label: "Review Mediation Terms",
              description: "Compare delivered criteria vs approved PRD to resolve dispute.",
              type: "ACTION_REQUIRED",
              urgent: true,
              tabTarget: "workspace",
            };
          }

          // Format Milestones
          const mappedMilestones: MilestoneItem[] = rawMilestones.map((m: any, idx: number) => {
            const amountVal = m.amountCents ? m.amountCents / 100 : (parseFloat(m.amount) || 0);
            const isReleased = m.state === "CAPTURED" || m.status === "RELEASED";
            const isInReview = Boolean(
              freelancer && (
                m.workStatus === "AWAITING_CLIENT_REVIEW" ||
                m.workStatus === "SUBMITTED" ||
                m.status === "IN_REVIEW"
              )
            );
            return {
              id: m.id || `ms_${idx + 1}`,
              number: idx + 1,
              title: m.title || `Milestone ${idx + 1}`,
              deliverables: m.deliverables || ["Milestone deliverable package with automated tests"],
              dueDate: m.deadline ? new Date(m.deadline).toLocaleDateString() : (m.days ? `${m.days} days after kickoff` : "Scheduled"),
              amount: `$${amountVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
              status: isReleased ? ("RELEASED" as const) : isInReview ? ("IN_REVIEW" as const) : ("PENDING_FUNDING" as const),
              statusLabel: isReleased ? "Approved & Released" : isInReview ? "In Review" : "Upcoming",
              paypalOrderId: m.paypalOrderId || undefined,
              captureId: m.captureId || undefined,
            };
          });

          const totalBudgetString = live.budgetCents
            ? `$${((live.budgetCents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
            : "$0.00 USD";

          const releasedVal = mappedMilestones
            .filter((m) => m.status === "RELEASED")
            .reduce((sum, m) => sum + (parseFloat(m.amount.replace(/[^0-9.]/g, "")) || 0), 0);
          const escrowVal = mappedMilestones
            .filter((m) => (m.status === "IN_REVIEW" || m.status === "FUNDED") && freelancer)
            .reduce((sum, m) => sum + (parseFloat(m.amount.replace(/[^0-9.]/g, "")) || 0), 0);

          const nextDue = mappedMilestones.find((m) => m.status !== "RELEASED")?.title || "All milestones completed";

          const formattedProject: ProjectDetailData = {
            id: live.id,
            name: live.title || live.name || "Untitled Project",
            description: live.description || live.detailedRequirements || "",
            status,
            statusLabel,
            statusColor,
            stageSummary,
            category: live.category ? (live.subcategory ? `${live.category} · ${live.subcategory}` : live.category) : "Web Development",
            createdAt: live.createdAt ? new Date(live.createdAt).toLocaleDateString() : "Recent",
            canonicalHash: live.canonicalHash || `canonical_v1.0_#${(live.id || "consensus").replace(/[^a-zA-Z0-9]/g, "").slice(-8)}`,
            totalBudget: totalBudgetString,
            escrowFunded: `$${escrowVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
            releasedAmount: `$${releasedVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
            nextMilestoneDue: nextDue,
            nextAction,
            freelancer: freelancer
              ? {
                  name: freelancer.name,
                  role: freelancer.freelancerProfile?.title || "Contractor",
                  avatar: freelancer.preferences?.avatar && !freelancer.preferences.avatar.includes("photo-1507003211169") ? freelancer.preferences.avatar : null,
                  rating: "5.0",
                  completedJobs: 14,
                  hourlyRate: live.budgetType === "HOURLY" ? `$${Math.round(live.budgetCents / 100)}/hr` : "$75/hr",
                  status: "ACTIVE",
                }
              : undefined,
            briefAndPrd: {
              version: "v1.0",
              overview: live.description || live.detailedRequirements || "Project requirements and technical deliverables spec.",
              objectives: live.goals
                ? live.goals.split(",").map((g: string) => g.trim()).filter(Boolean)
                : (live.scopeOfWork && live.scopeOfWork.length > 0 ? live.scopeOfWork : ["Deliver milestone packages", "Pass automated verification tests"]),
              technicalArchitecture: (live.requiredSkills && live.requiredSkills.length > 0)
                ? live.requiredSkills.join(", ")
                : "Full-stack architecture",
              functionalRequirements: (live.scopeOfWork && live.scopeOfWork.length > 0)
                ? live.scopeOfWork
                : ["Core application development", "API contracts & data model", "Automated test assert suite"],
              acceptanceCriteria: mappedMilestones.length > 0
                ? mappedMilestones.map((m) => m.title)
                : ["Milestone deliverables accepted by client", "Zero fatal errors in test assert logs"],
              nonFunctionalRequirements: [
                `Budget Type: ${live.budgetType || "Fixed Price"}`,
                `Expected Timeline: ${live.timelineDuration || "Sprint-based"}`,
                `Experience Level: ${live.experienceLevel || "Senior / Verified"}`,
                `English Proficiency: ${live.englishLevel || "Fluent"}`,
                `Visibility: ${live.visibility || "Public"}`,
              ],
              assumptions: [
                "All milestone releases protected by bilateral PayPal Sandbox escrow verification",
                "Automated test coverage assert logs validated before funds release",
              ],
              exclusions: [
                "Unilateral scope deviations without cryptographically signed Section 14 amendment",
              ],
              uploadedDocument: live.uploadedDocument || undefined,
            },
            milestones: mappedMilestones,
            proposals: (live.proposals || []).map((p: any) => ({
              id: p.id,
              freelancerId: p.freelancerId || p.freelancer?.id || "",
              freelancerName: p.freelancer?.name || "Candidate",
              freelancerRole: p.freelancer?.freelancerProfile?.title || p.freelancer?.freelancerProfile?.professionalTitle || "Verified Talent",
              avatar: (p.freelancer?.avatar && !p.freelancer.avatar.includes("photo-1507003211169"))
                ? p.freelancer.avatar
                : (p.freelancer?.preferences?.avatar && !p.freelancer.preferences.avatar.includes("photo-1507003211169"))
                ? p.freelancer.preferences.avatar
                : null,
              rating: "5.0",
              proposedBudget: `$${((p.amountCents || live.budgetCents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
              estimatedTimeline: p.estimatedTimeline || (p.estimatedDurationWeeks ? `${p.estimatedDurationWeeks} weeks` : (live.timelineDuration || "Sprint schedule")),
              coverLetter: p.coverLetter || "Experienced developer ready to execute deliverables with automated test assert logs.",
              approach: p.approach || p.scopeText || "",
              proposedMilestones: p.proposedMilestones || p.milestones || [],
              status: p.status === "ACCEPTED" ? "ACCEPTED" : (p.status === "REJECTED" || p.status === "DECLINED") ? "DECLINED" : "UNDER_REVIEW",
              submittedDate: "Recent",
              attachments: p.attachments || [],
            })),
            workspaceQuestions: live.workspaceQuestions || [],
            changes: live.changeRequests || [],
            payments: live.payments || [],
            activities: [
              {
                id: `act_${live.id}`,
                timestamp: live.createdAt ? new Date(live.createdAt).toLocaleDateString() : "Recent",
                actor: user?.name || "Client",
                role: "CLIENT" as const,
                action: live.state === "DRAFT" ? "Draft Saved" : "Project Published",
                detail: live.state === "DRAFT"
                  ? "Project draft saved to workspace."
                  : `Scope published with ${mappedMilestones.length} milestone(s). Dual SHA-256 seal initialized.`,
                hash: `sha256:${(live.id || "init").slice(0, 8)}...${(live.id || "init").slice(-4)}`,
              },
            ],
          };

          setProjectData(formattedProject);
          setIsLoading(false);
        } else if (!isStaticMock && isMounted) {
          setNotFound(true);
          setIsLoading(false);
        }
      } catch {
        if (!isStaticMock && isMounted) {
          setNotFound(true);
          setIsLoading(false);
        }
      }
    }
    loadLiveProject();
    return () => {
      isMounted = false;
    };
  }, [projectId, isStaticMock, user?.name, reloadTrigger]);

  // Milestone 2 approval / release simulation state
  const [isCapturing, setIsCapturing] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Bilateral question input state
  const [newQuestionText, setNewQuestionText] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const [actionLoadingProposalId, setActionLoadingProposalId] = useState<string | null>(null);
  const [decliningProposal, setDecliningProposal] = useState<ProposalItem | null>(null);
  const [declineReasonPreset, setDeclineReasonPreset] = useState("Budget exceeds project allocation");
  const [declineCustomFeedback, setDeclineCustomFeedback] = useState("");

  const handleOpenDeclineModal = (prop: ProposalItem) => {
    setDecliningProposal(prop);
    const preset = "Budget exceeds project allocation";
    setDeclineReasonPreset(preset);
    setDeclineCustomFeedback(
      "Thank you for your proposal. At this time, we are unable to accept this proposal as the quote exceeds our allocated budget. You are welcome to adjust your scope, timeline, or pricing and submit a revised proposal."
    );
  };

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

  const handleAcceptProposal = async (proposalId: string) => {
    setActionLoadingProposalId(proposalId);
    showToast("Processing proposal acceptance, synchronizing milestones & synthesizing contract v1.0...");

    try {
      const res = await acceptClientProposal(proposalId, { clientId: user?.id });
      if (res.success) {
        showToast("Proposal approved! Milestones synchronized and bilateral contract v1.0 synthesized!");
        setReloadTrigger((n) => n + 1);
      } else {
        showToast(res.error || "Failed to accept proposal.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept proposal";
      showToast(msg);
    } finally {
      setActionLoadingProposalId(null);
    }
  };

  const handleConfirmDecline = async () => {
    if (!decliningProposal) return;
    const proposalId = decliningProposal.id;
    setActionLoadingProposalId(proposalId);
    showToast("Declining proposal and delivering feedback to candidate...");

    try {
      const feedback = declineCustomFeedback.trim() || declineReasonPreset || "Declined by client";
      const res = await rejectClientProposal(proposalId, feedback);
      if (res.success) {
        setProjectData((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            proposals: prev.proposals.map((p) =>
              p.id === proposalId
                ? { ...p, status: "DECLINED" as const, rejectionFeedback: feedback }
                : p
            ),
          };
        });
        showToast("Proposal declined and feedback delivered to candidate.");
        setDecliningProposal(null);
      } else {
        showToast(res.error || "Failed to decline proposal.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to decline proposal";
      showToast(msg);
    } finally {
      setActionLoadingProposalId(null);
    }
  };

  const handleApproveMilestone = async (milestoneId: string) => {
    setIsCapturing(true);
    showToast("Dual SHA-256 Consensus: Initiating PayPal Sandbox Escrow Capture & Approval...");

    try {
      const res = await approveClientMilestone(milestoneId, {
        clientId: user?.id,
      });

      if (!res.success) {
        showToast(res.error || "Failed to approve milestone deliverable.");
        setIsCapturing(false);
        return;
      }

      // Update state locally
      setProjectData((prev) => {
        if (!prev) return null;
        const updatedMilestones = prev.milestones.map((m) =>
          m.id === milestoneId
            ? {
                ...m,
                status: "RELEASED" as const,
                statusLabel: "Approved & Released",
                captureId: "CAP_LIVE_SANDBOX_SUCCESS",
              }
            : m
        );

        const newReleased = updatedMilestones
          .filter((m) => m.status === "RELEASED")
          .reduce((sum, m) => sum + (parseFloat(m.amount.replace(/[^0-9.]/g, "")) || 0), 0);

        return {
          ...prev,
          status: "IN_PROGRESS",
          statusLabel: "In Progress",
          statusColor: "bg-blue-50 text-blue-700 border-blue-200/80",
          releasedAmount: `$${newReleased.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
          nextAction: {
            label: "Track Subsequent Milestone Development",
            description: "Milestone deliverable accepted and funds released from Sandbox Escrow.",
            type: "VIEW",
            urgent: false,
          },
          milestones: updatedMilestones,
          activities: [
            {
              id: `act_${Date.now()}`,
              timestamp: "Just now",
              actor: user?.name || "Client",
              role: "CLIENT" as const,
              action: "Milestone Deliverables Accepted & Released",
              detail: "Deliverable criteria accepted. PayPal sandbox escrow capture confirmed.",
              hash: `sha256:cap_${Date.now()}`,
            },
            ...prev.activities,
          ],
        };
      });

      showToast("Milestone deliverables approved! PayPal funds released to contractor.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to approve milestone";
      showToast(msg);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleApproveScopeDelta = (changeId: string) => {
    setProjectData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        changes: prev.changes.map((c) =>
          c.id === changeId ? { ...c, status: "APPROVED" as const } : c
        ),
        activities: [
          {
            id: `act_delta_${Date.now()}`,
            timestamp: "Just now",
            actor: user?.name || "Sambit Kumar",
            role: "CLIENT" as const,
            action: "Scope Change Delta Approved",
            detail: "Section 14 bilateral agreement amendment cryptographically signed.",
            hash: "sha256:cc9901...fa44",
          },
          ...prev.activities,
        ],
      };
    });
    showToast("Scope delta approved! Agreement revision signed under Section 14.");
  };

  const handlePostQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    setProjectData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        workspaceQuestions: [
          {
            id: `q_${Date.now()}`,
            author: user?.name || "Sambit Kumar",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80",
            date: "Just now",
            question: newQuestionText.trim(),
            status: "OPEN" as const,
          },
          ...prev.workspaceQuestions,
        ],
      };
    });
    setNewQuestionText("");
    showToast("Decision prompt posted to bilateral workspace log.");
  };

  const tabs: { id: ProjectTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "overview", label: "Overview", icon: Layers },
    { id: "brief", label: "Brief & PRD", icon: FileText },
    { id: "proposals", label: "Proposals", icon: Users, count: projectData?.proposals?.length || 0 },
    { id: "milestones", label: "Milestones", icon: CheckCircle2, count: projectData?.milestones?.length || 0 },
    { id: "workspace", label: "Workspace", icon: MessageSquare, count: projectData?.workspaceQuestions?.length || 0 },
    { id: "changes", label: "Changes", icon: GitPullRequest, count: projectData?.changes?.filter(c => c.status === "PENDING_CLIENT_APPROVAL").length || undefined },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "activity", label: "Activity", icon: Activity },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans">
        <DashboardSidebar
          currentRole="CLIENT"
          activeTab="projects"
          onTabChange={(tab) => {
            router.push(`/client/dashboard?tab=${tab}`);
          }}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardTopHeader />
          <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto space-y-6 animate-pulse">
            <div className="h-4 w-48 bg-slate-200 rounded-md" />
            <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
              <div className="h-8 w-96 bg-slate-200 rounded-lg" />
              <div className="h-4 w-full max-w-xl bg-slate-100 rounded-md" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-3 w-20 bg-slate-100 rounded" />
                    <div className="h-6 w-24 bg-slate-200 rounded" />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 rounded-2xl bg-white border border-slate-200 h-64" />
          </main>
        </div>
      </div>
    );
  }

  if (notFound || !projectData) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans selection:bg-[#4f46e5] selection:text-white">
        <DashboardSidebar
          currentRole="CLIENT"
          activeTab="projects"
          onTabChange={(tab) => {
            router.push(`/client/dashboard?tab=${tab}`);
          }}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardTopHeader />
          <main className="flex-1 px-4 sm:px-8 py-20 max-w-md w-full mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <FolderKanban className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Project Not Found</h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              We couldn&apos;t find a project with ID &ldquo;{projectId}&rdquo;. It may have been deleted or does not exist.
            </p>
            <div className="pt-2">
              <Link
                href="/client/dashboard?tab=projects"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f46e5] text-white text-xs font-bold shadow-xs hover:bg-[#4338ca] transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to My Projects</span>
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans selection:bg-[#4f46e5] selection:text-white">
      {/* 1. Left Navbar Sidebar */}
      <DashboardSidebar
        currentRole="CLIENT"
        activeTab="projects"
        onTabChange={(tab) => {
          router.push(`/client/dashboard?tab=${tab}`);
        }}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopHeader />

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto space-y-6">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Draft Notice Banner */}
          {projectData.status === "DRAFT" && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900">
                      Draft Specification
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    Project Draft Not Published Yet
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    This project is saved as a draft in your workspace. Resume editing to finalize requirements and publish to verified talent.
                  </p>
                </div>
              </div>

              <Link
                href={`/client/post-project?draftId=${projectData.id}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
              >
                <span>Resume & Publish Draft</span>
                <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              </Link>
            </div>
          )}

          {/* Breadcrumb & Navigation Back */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Link
                href="/client/dashboard?tab=projects"
                className="hover:text-[#4f46e5] flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>My Projects</span>
              </Link>
              <span>/</span>
              <span className="text-slate-900 font-bold truncate max-w-xs sm:max-w-md">
                {projectData.name}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/client/post-project"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-[#4f46e5] hover:border-[#4f46e5]/40 text-xs font-bold transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Post a New Project</span>
              </Link>
            </div>
          </div>

          {/* Project Header Card */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-heading">
                    {projectData.name}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${projectData.statusColor}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span>{projectData.statusLabel}</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {projectData.canonicalHash.slice(0, 19)}...
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {projectData.description}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    showToast("Project link copied to clipboard!");
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Total Agreed Budget</span>
                <div className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
                  {projectData.totalBudget}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Escrow Pre-Funded</span>
                <div className="text-base font-extrabold text-emerald-600 font-mono mt-0.5">
                  {projectData.escrowFunded}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Released to Date</span>
                <div className="text-base font-extrabold text-[#4f46e5] font-mono mt-0.5">
                  {projectData.releasedAmount}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-medium">Next Due Milestone</span>
                <div className="text-xs font-bold text-slate-800 mt-1 truncate">
                  {projectData.nextMilestoneDue}
                </div>
              </div>
            </div>

            {/* 8 Workspace Tabs Navigation Bar */}
            <div className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-3 no-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-[#eef2ff] text-[#4f46e5] shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={isActive ? 2.4 : 2} />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          isActive
                            ? "bg-[#4f46e5] text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ==============================================================
              TAB 1: OVERVIEW
             ============================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Next Action Urgent Banner */}
              {projectData.nextAction && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900">
                          Pending Decision
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      </div>
                      <h3 className="text-sm font-black text-slate-900">
                        {projectData.nextAction.label}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {projectData.nextAction.description}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab((projectData.nextAction.tabTarget as ProjectTab) || "milestones")}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                  >
                    <span>Take Action Now</span>
                    <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                  </button>
                </div>
              )}

              {/* Two Column Grid: Freelancer Card & Milestones Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 1/3: Assigned Freelancer & Spec Hash */}
                <div className="space-y-5">
                  {projectData.freelancer ? (
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Assigned Talent
                      </h3>

                      <div className="flex items-center gap-3.5">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                          <Image
                            src={projectData.freelancer.avatar}
                            alt={projectData.freelancer.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {projectData.freelancer.name}
                          </h4>
                          <p className="text-xs text-slate-500 truncate">
                            {projectData.freelancer.role}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-1">
                            <span className="font-semibold text-amber-600">â˜… {projectData.freelancer.rating}</span>
                            <span>â€¢</span>
                            <span>{projectData.freelancer.completedJobs} projects</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                        <span className="font-medium">Contract Rate</span>
                        <span className="font-bold text-slate-900 font-mono">
                          {projectData.freelancer.hourlyRate}
                        </span>
                      </div>

                      <div className="pt-1 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab("workspace")}
                          className="w-full py-2 px-3 rounded-xl bg-[#eef2ff] hover:bg-[#e0e7ff] text-[#4f46e5] text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Open Chat / Q&A</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-white border border-dashed border-slate-200 text-center space-y-2">
                      <Users className="w-8 h-8 text-slate-400 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-800">No Freelancer Assigned</h4>
                      <p className="text-xs text-slate-500">
                        Review submitted proposals or invite candidates.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab("proposals")}
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#4f46e5] text-white text-xs font-bold"
                      >
                        View Proposals
                      </button>
                    </div>
                  )}

                  {/* Cryptographic Consensus Hash Card */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Consensus Spec Lock</span>
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 break-all select-all">
                      {projectData.canonicalHash}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Immutable SHA-256 agreement stamp signed bilaterally by both client and freelancer.
                    </p>
                  </div>
                </div>

                {/* Right 2/3: Milestone Schedule Quickview */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                        Milestone Deliverables Progress
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab("milestones")}
                        className="text-xs font-semibold text-[#4f46e5] hover:underline"
                      >
                        Manage Milestones â†’
                      </button>
                    </div>

                    <div className="space-y-3">
                      {projectData.milestones.length === 0 ? (
                        <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                          <p className="text-xs font-semibold text-slate-700">No milestones configured yet</p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Add milestone releases to track deliverables and escrow checkpoints.
                          </p>
                        </div>
                      ) : (
                        projectData.milestones.map((m) => (
                          <div
                            key={m.id}
                            className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs ${
                                  m.status === "RELEASED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : m.status === "IN_REVIEW"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                M{m.number}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-slate-900">{m.title}</h4>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      m.status === "RELEASED"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : m.status === "IN_REVIEW"
                                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                                        : "bg-slate-100 text-slate-600 border border-slate-200"
                                    }`}
                                  >
                                    {m.statusLabel}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Due: {m.dueDate}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 font-mono text-xs font-bold text-slate-900">
                              <span>{m.amount}</span>
                              {m.status === "IN_REVIEW" && (
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("milestones")}
                                  className="px-2.5 py-1 rounded-lg bg-[#4f46e5] text-white text-[11px] font-bold"
                                >
                                  Review
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              TAB 2: BRIEF & PRD (SPEC DOCUMENT)
             ============================================================== */}
          {activeTab === "brief" && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 font-heading">
                      Product Requirements Document (PRD)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Requirements and technical specifications for milestone execution.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => showToast("Exporting PRD as PDF/Markdown...")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PRD</span>
                  </button>
                </div>
              </div>

              {/* Original Uploaded PDF / Client Attachment (Only shown if uploaded during creation) */}
              {projectData.briefAndPrd.uploadedDocument && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-slate-500">
                    Client Intake Document
                  </h3>
                  <ProjectUploadedDocumentCard
                    document={projectData.briefAndPrd.uploadedDocument}
                    projectTitle={projectData.name}
                    category={projectData.category}
                    budget={projectData.totalBudget}
                    overview={projectData.briefAndPrd.overview}
                    objectives={projectData.briefAndPrd.objectives}
                    technicalArchitecture={projectData.briefAndPrd.technicalArchitecture}
                    functionalRequirements={projectData.briefAndPrd.functionalRequirements}
                    acceptanceCriteria={projectData.briefAndPrd.acceptanceCriteria}
                    clientName="You (Client)"
                  />
                </div>
              )}

              {/* 1. Project Overview */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                  1. Overview & Business Context
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {projectData.briefAndPrd.overview}
                </p>
              </div>

              {/* 2. Key Objectives */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                  2. Core Objectives
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {projectData.briefAndPrd.objectives.map((obj, i) => (
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

              {/* 3. Technical Architecture */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                  3. Technical Architecture & Stack
                </h3>
                <div className="p-4 rounded-xl bg-[#eef2ff]/40 border border-[#e0e7ff] text-xs sm:text-sm text-slate-800 font-mono">
                  {projectData.briefAndPrd.technicalArchitecture}
                </div>
              </div>

              {/* 4. Functional Requirements */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                  4. Functional Requirements
                </h3>
                <ul className="space-y-2 text-xs text-slate-700">
                  {projectData.briefAndPrd.functionalRequirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                      <span className="font-mono font-bold text-[#4f46e5]">FR-{i + 1}:</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 5. Acceptance Criteria */}
              <div className="space-y-2">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                  5. Verifiable Acceptance Criteria
                </h3>
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/60 space-y-2">
                  {projectData.briefAndPrd.acceptanceCriteria.map((crit, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{crit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              TAB 3: PROPOSALS
             ============================================================== */}
          {activeTab === "proposals" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900 font-heading">
                    Freelancer Proposals ({projectData.proposals.length})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Compare candidate quotes, ratings, and proposed delivery timelines.
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                {projectData.proposals.length === 0 ? (
                  <div className="p-10 text-center rounded-2xl bg-white border border-dashed border-slate-200 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-[#4f46e5]">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Waiting for Proposals</h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                        Your project has been broadcasted to verified talent. Proposals from qualified contractors will appear here for your review and bilateral agreement.
                      </p>
                    </div>
                    <div className="pt-2">
                      <Link
                        href="/client/freelancers"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f46e5] text-white text-xs font-bold hover:bg-[#4338ca] transition shadow-xs"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Browse & Invite Talent</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  projectData.proposals.map((prop) => (
                    <div
                      key={prop.id}
                      className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <button
                            type="button"
                            onClick={() => {
                              const targetId = prop.freelancerId || "usr_freelancer_rohan";
                              router.push(`/client/freelancers/${targetId}?fromProject=${projectId}`);
                            }}
                            className="shrink-0 group text-left cursor-pointer"
                            title="View Freelancer Profile"
                          >
                            <UserAvatar
                              name={prop.freelancerName}
                              avatarUrl={prop.avatar}
                              size="lg"
                              className="group-hover:ring-2 group-hover:ring-indigo-500/30 transition rounded-xl"
                            />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const targetId = prop.freelancerId || "usr_freelancer_rohan";
                                  router.push(`/client/freelancers/${targetId}?fromProject=${projectId}`);
                                }}
                                className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition text-left cursor-pointer"
                              >
                                {prop.freelancerName}
                              </button>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  prop.status === "ACCEPTED"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : prop.status === "DECLINED"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : "bg-blue-50 text-blue-700 border border-blue-200"
                                }`}
                              >
                                {prop.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{prop.freelancerRole}</p>
                            <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
                              ★ {prop.rating}
                            </div>
                          </div>
                        </div>

                        <div className="text-left sm:text-right font-mono">
                          <div className="text-base font-extrabold text-slate-900">
                            {prop.proposedBudget}
                          </div>
                          <div className="text-xs text-slate-500">
                            Est. Timeline: {prop.estimatedTimeline}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                        {prop.coverLetter}
                      </p>

                      {/* Attached Proposal Document (Object Storage) */}
                      {prop.attachments && prop.attachments.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Attached Proposal Document</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {prop.attachments.map((att: any) => (
                              <div
                                key={att.id}
                                className="flex items-center gap-3 px-3 py-2 bg-indigo-50/70 border border-indigo-100/80 rounded-xl"
                              >
                                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                                <div className="text-xs">
                                  <div className="font-semibold text-slate-800 line-clamp-1 max-w-[200px]">
                                    {att.name}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">{att.size}</div>
                                </div>
                                <a
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={att.name}
                                  className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-indigo-600 shadow-2xs transition"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Download</span>
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Proposal Action Controls for Client */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <div className="text-[11.5px] text-slate-500">
                          {prop.status === "ACCEPTED" ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Agreement initialized and active in workspace.
                            </span>
                          ) : prop.status === "DECLINED" ? (
                            <span className="text-rose-600 font-medium">
                              Proposal was declined.
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Review candidate terms & approve to enter bilateral agreement.
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const targetId = prop.freelancerId || "usr_freelancer_rohan";
                              router.push(`/client/freelancers/${targetId}?fromProject=${projectId}`);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition shadow-2xs cursor-pointer"
                          >
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span>View Profile</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => router.push(`/client/projects/${projectId}/proposals/${prop.id}`)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white hover:bg-indigo-50/50 text-xs font-bold text-indigo-600 transition shadow-2xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review Details</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("workspace");
                              showToast(`Workspace discussions opened. Send a message to start talking with ${prop.freelancerName}.`);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-xs font-bold text-indigo-700 transition shadow-2xs cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Message</span>
                          </button>

                          {prop.status !== "ACCEPTED" && prop.status !== "DECLINED" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenDeclineModal(prop)}
                                disabled={actionLoadingProposalId === prop.id}
                                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition disabled:opacity-50 cursor-pointer"
                              >
                                Decline
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAcceptProposal(prop.id)}
                                disabled={actionLoadingProposalId === prop.id}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{actionLoadingProposalId === prop.id ? "Processing..." : "Approve & Accept Proposal"}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==============================================================
              TAB 4: MILESTONES (DELIVERABLES & ESCROW RELEASE ENGINE)
             ============================================================== */}
          {activeTab === "milestones" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 font-heading">
                    Milestone Schedule & Deliverable Reviews
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Milestones are locked under canonical hash. Funds release requires client acceptance.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {projectData.milestones.length === 0 ? (
                  <div className="p-10 text-center rounded-2xl bg-white border border-dashed border-slate-200 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">No Milestones Defined Yet</h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                        Milestones establish escrow release checkpoints protected by bilateral PayPal verification consensus. When proposals are accepted or customized, milestone checkpoints will appear here.
                      </p>
                    </div>
                  </div>
                ) : (
                  projectData.milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className={`p-5 rounded-2xl bg-white border shadow-2xs space-y-4 transition ${
                        milestone.status === "IN_REVIEW"
                          ? "border-amber-300 ring-2 ring-amber-100"
                          : "border-slate-200/90"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                              milestone.status === "RELEASED"
                                ? "bg-emerald-500 text-white shadow-xs"
                                : milestone.status === "IN_REVIEW"
                                ? "bg-amber-500 text-white shadow-xs"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            M{milestone.number}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900">
                                {milestone.title}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  milestone.status === "RELEASED"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : milestone.status === "IN_REVIEW"
                                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                                    : "bg-slate-100 text-slate-700 border border-slate-200"
                                }`}
                              >
                                {milestone.statusLabel}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Due date: {milestone.dueDate}
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right font-mono">
                          <div className="text-base font-extrabold text-slate-900">
                            {milestone.amount}
                          </div>
                          {milestone.paypalOrderId && (
                            <div className="text-[11px] text-slate-400">
                              Order #{milestone.paypalOrderId}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Deliverable list */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Agreed Deliverables:
                        </span>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                          {milestone.deliverables.map((del, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <Check className="w-3.5 h-3.5 text-[#4f46e5]" />
                              <span>{del}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Autonomous Proof-of-Execution Deliverable Verifier with GitHub-Style Checks & Version History */}
                      {(milestone.status === "IN_REVIEW" || milestone.status === "RELEASED" || milestone.testReport) && (
                        <div className="pt-1">
                          <MilestoneAutomatedChecksCard
                            milestoneId={milestone.id}
                            milestoneTitle={milestone.title}
                            projectId={projectId}
                            acceptanceCriteria={milestone.deliverables}
                          />
                        </div>
                      )}

                      {/* Review Actions when IN_REVIEW */}
                      {milestone.status === "IN_REVIEW" && (
                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                          <p className="text-xs text-slate-500">
                            Review deliverables above. Approving will execute PayPal Sandbox capture.
                          </p>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowRevisionModal(true)}
                              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
                            >
                              Request Revision
                            </button>

                            <button
                              type="button"
                              disabled={isCapturing}
                              onClick={() => handleApproveMilestone(milestone.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                            >
                              {isCapturing ? (
                                <span>Capturing Escrow...</span>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  <span>Approve & Release Funds ({milestone.amount})</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==============================================================
              TAB 5: WORKSPACE (BILATERAL Q&A & DECISIONS)
             ============================================================== */}
          {activeTab === "workspace" && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 font-heading">
                  Bilateral Collaboration & Decision Log
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Structured questions and approvals between client and contractor.
                </p>
              </div>

              {/* Form to ask new question */}
              <form onSubmit={handlePostQuestion} className="space-y-2">
                <div className="relative">
                  <textarea
                    rows={2}
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder="Ask contractor a question or log an architectural decision..."
                    className="w-full p-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] resize-none"
                  />
                  <button
                    type="submit"
                    className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold flex items-center gap-1 shadow-2xs"
                  >
                    <Send className="w-3 h-3" />
                    <span>Post</span>
                  </button>
                </div>
              </form>

              {/* Questions list */}
              <div className="space-y-4">
                {projectData.workspaceQuestions.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-1">
                    <MessageSquare className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">No discussion threads yet</p>
                    <p className="text-[11px] text-slate-500">
                      Use the field above to ask your contractor architectural questions or record scope decisions.
                    </p>
                  </div>
                ) : (
                  projectData.workspaceQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{q.author}</span>
                          <span className="text-slate-400">• {q.date}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {q.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 font-medium">{q.question}</p>

                      {q.answer && (
                        <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-bold text-[#4f46e5]">{q.answeredBy}</span>
                            <span>{q.answeredAt}</span>
                          </div>
                          <p className="text-slate-700">{q.answer}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ==============================================================
              TAB 6: CHANGES (SECTION 14 SCOPE CHANGE DELTAS)
             ============================================================== */}
          {activeTab === "changes" && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 font-heading">
                  Section 14: Scope-Change Governance
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scope cannot change unilaterally. All amendments require dual cryptographically signed approvals.
                </p>
              </div>

              {projectData.changes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  No active scope-change requests. Both parties are aligned on the original spec.
                </div>
              ) : (
                <div className="space-y-4">
                  {projectData.changes.map((change) => (
                    <div
                      key={change.id}
                      className="p-5 rounded-xl border border-slate-200 space-y-4 bg-white"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">
                              {change.title}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                change.status === "APPROVED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {change.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Requested by {change.requestedByName} · {change.date}
                          </p>
                        </div>

                        <div className="text-left sm:text-right font-mono text-xs">
                          <span className="font-bold text-slate-900">{change.costDelta}</span>
                          <span className="text-slate-500 ml-2">({change.timeDelta})</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {change.summary}
                      </p>

                      {/* Diff Comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-200 text-rose-900">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
                            Original Specification
                          </span>
                          <span>{change.originalSpec}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 text-emerald-900">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                            Proposed Amendment
                          </span>
                          <span>{change.amendedSpec}</span>
                        </div>
                      </div>

                      {change.status === "PENDING_CLIENT_APPROVAL" && (
                        <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => showToast("Scope change declined.")}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveScopeDelta(change.id)}
                            className="px-4 py-1.5 rounded-xl bg-[#4f46e5] text-white text-xs font-bold hover:bg-[#4338ca] shadow-2xs"
                          >
                            Sign & Approve Delta
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              TAB 7: PAYMENTS (ESCROW & SETTLEMENT ENGINE)
             ============================================================== */}
          {activeTab === "payments" && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900 font-heading">
                    Financial Status & Escrow Ledger
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Backed by PayPal Orders v2 Sandbox with automated idempotency receipts.
                  </p>
                </div>
              </div>

              {/* Transactions Table */}
              {projectData.payments.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-1">
                  <CreditCard className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No escrow transactions recorded yet</p>
                  <p className="text-[11px] text-slate-500">
                    PayPal Sandbox escrow authorizations and release receipts will appear here as milestones are completed.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {projectData.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-slate-50/60 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">
                            {p.milestoneTitle}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === "CAPTURED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>Order #{p.orderId}</span>
                          <span>•</span>
                          <span>{p.date}</span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right font-mono">
                        <div className="text-sm font-extrabold text-slate-900">
                          {p.amount}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">
                          {p.proofHash}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==============================================================
              TAB 8: ACTIVITY (IMMUTABLE AUDIT LOG)
             ============================================================== */}
          {activeTab === "activity" && (
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900 font-heading">
                  Immutable Consensus Event Audit Log
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verifiable chronological record of approvals, dispatches, and releases.
                </p>
              </div>

              <div className="space-y-3">
                {projectData.activities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#4f46e5] mt-1.5 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{act.action}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                            {act.actor}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{act.detail}</p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-slate-400 text-[11px]">{act.timestamp}</div>
                      <div className="font-mono text-[10px] text-slate-400">{act.hash}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revision Modal */}
          {showRevisionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <h3 className="text-base font-extrabold text-slate-900">
                  Request Milestone Revision
                </h3>
                <p className="text-xs text-slate-500">
                  Specify which acceptance criteria were unfulfilled so the contractor can adjust the deliverable package.
                </p>
                <textarea
                  rows={4}
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="E.g. Webhook signature validation test case #14 is missing raw transmission check..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-[#4f46e5] focus:outline-none"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRevisionModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRevisionModal(false);
                      showToast("Revision request transmitted to contractor.");
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                  >
                    Send Revision Request
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Decline Proposal with Rejection Feedback Modal */}
          {decliningProposal && (
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
                    onClick={() => setDecliningProposal(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{decliningProposal.freelancerName}</p>
                      <p className="text-[11px] text-slate-500">{decliningProposal.freelancerRole}</p>
                    </div>
                    <span className="text-xs font-extrabold text-slate-900">{decliningProposal.proposedBudget}</span>
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
                    onClick={() => setDecliningProposal(null)}
                    disabled={actionLoadingProposalId === decliningProposal.id}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDecline}
                    disabled={actionLoadingProposalId === decliningProposal.id || !declineCustomFeedback.trim()}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{actionLoadingProposalId === decliningProposal.id ? "Sending..." : "Decline & Send Feedback"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function DedicatedProjectWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-xs text-slate-500 font-medium">
          Loading project workspace...
        </div>
      }
    >
      <ProjectWorkspaceContent />
    </Suspense>
  );
}


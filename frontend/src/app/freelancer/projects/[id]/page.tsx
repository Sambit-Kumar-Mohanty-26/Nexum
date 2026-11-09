"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  MapPin,
  Sparkles,
  Calendar,
  Send,
  Download,
  Eye,
  Bookmark,
  BookmarkCheck,
  Code2,
  DollarSign,
  ShieldCheck,
  Check,
  HelpCircle,
  Briefcase,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardTopHeader from "@/components/DashboardTopHeader";
import { useAuth } from "@/context/AuthContext";
import ProjectUploadedDocumentCard from "@/components/ProjectUploadedDocumentCard";
import { fetchProjectById, saveFreelancerProject, unsaveFreelancerProject } from "@/lib/api-client";

function FreelancerProjectDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const projectId = params?.id as string;
  const isJustSubmitted = searchParams?.get("submitted") === "true";

  const [project, setProject] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "specifications" | "milestones">("overview");

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);

    async function loadProject() {
      try {
        // 1. Fetch from freelancer endpoint or direct project proxy
        const res = await fetch(`/api/freelancer/projects/${projectId}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (res.ok) {
          const json = await res.json();
          if (json.project && isCurrent) {
            setProject(json.project);
            setIsSaved(Boolean(json.project.isSaved));
            setIsLoading(false);
            return;
          }
        }

        // Fallback: fetch via general project endpoint
        const generic = await fetchProjectById(projectId);
        if (generic && isCurrent) {
          setProject({
            id: generic.id,
            title: generic.title || generic.name,
            description: generic.description || generic.briefAndPrd?.overview || "",
            category: generic.category || "Web Development",
            skills: generic.requiredSkills || generic.skills || [],
            experienceLevel: generic.experienceLevel || "Intermediate",
            budgetType: generic.budgetType || "Fixed Price",
            budgetDisplay: generic.totalBudget || (generic.budgetCents ? `$${(generic.budgetCents / 100).toLocaleString()} fixed` : "$6,000.00 fixed"),
            budgetAmount: generic.budgetCents ? generic.budgetCents / 100 : 6000,
            location: generic.location || "Remote",
            visibility: generic.visibility || "PUBLIC",
            proposalsCount: generic.proposals?.length || 0,
            postedAt: generic.createdAt || new Date().toISOString(),
            client: generic.client || { name: "Client", company: "Client Team" },
            timelineDuration: generic.duration || generic.briefAndPrd?.timeline || "4 weeks",
            scopeOfWork: generic.scopeOfWork || [],
            detailedRequirements: generic.detailedRequirements || generic.briefAndPrd?.functionalRequirements?.join("\n") || null,
            milestones: generic.milestones || [],
            uploadedDocument: generic.uploadedDocument || generic.briefAndPrd?.uploadedDocument || null,
          });
          setIsLoading(false);
          return;
        }

        if (isCurrent) {
          setError("Project opportunity not found or is no longer open for proposals.");
          setIsLoading(false);
        }
      } catch (err) {
        if (isCurrent) {
          setError("Failed to load project details. Please check your connection.");
          setIsLoading(false);
        }
      }
    }

    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  const toggleSave = async () => {
    if (!project) return;
    if (isSaved) {
      setIsSaved(false);
      await unsaveFreelancerProject(project.id).catch(() => {});
    } else {
      setIsSaved(true);
      await saveFreelancerProject(project.id).catch(() => {});
    }
  };

  const handleApply = () => {
    router.push(`/freelancer/projects/${projectId}/apply`);
  };

  // Derive structured spec items
  const functionalRequirements: string[] = React.useMemo(() => {
    if (!project?.detailedRequirements) return [];
    return project.detailedRequirements
      .split("\n")
      .filter((line: string) => line.trim().startsWith("- **FR-") || line.trim().startsWith("- FR-") || line.trim().startsWith("FR-"))
      .map((line: string) => line.replace(/^-\s*/, "").trim());
  }, [project?.detailedRequirements]);

  const businessRules: string[] = React.useMemo(() => {
    if (!project?.detailedRequirements) return [];
    const lines = project.detailedRequirements.split("\n");
    const rulesIdx = lines.findIndex((l: string) => l.toLowerCase().includes("business rules"));
    if (rulesIdx === -1) return [];
    return lines
      .slice(rulesIdx + 1)
      .filter((line: string) => line.trim().startsWith("- "))
      .map((line: string) => line.replace(/^-\s*/, "").trim());
  }, [project?.detailedRequirements]);

  const scopeItems: string[] = React.useMemo(() => {
    if (Array.isArray(project?.scopeOfWork) && project.scopeOfWork.length > 0) {
      return project.scopeOfWork;
    }
    return [
      "Frontend dashboard with responsive layout and interactive workflows",
      "Robust REST APIs with TypeScript, validation, and role authorization",
      "PostgreSQL database design with schema migrations and seed scripts",
      "Automated verification testing and production deployment setup",
    ];
  }, [project?.scopeOfWork]);

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased overflow-hidden">
      {/* Sidebar */}
      <DashboardSidebar
        currentRole="FREELANCER"
        activeTab="find_projects"
        onTabChange={(tab) => {
          if (tab === "workspace") router.push("/freelancer/workspace");
          else router.push(`/freelancer/dashboard?tab=${tab}`);
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <DashboardTopHeader title="Project Specification Details" />

        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/freelancer/dashboard?tab=find_projects"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#4f46e5] transition group cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-white border border-slate-200 group-hover:border-indigo-300 shadow-2xs">
                <ArrowLeft className="w-4 h-4" />
              </div>
              <span>Back to Open Opportunities</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSave}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="w-4 h-4 text-[#4f46e5] fill-indigo-100" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    <span>Save Project</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleApply}
                disabled={project?.isFilled}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition shadow-xs flex items-center gap-1.5 active:scale-98 ${
                  project?.isFilled
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    : "bg-[#0f172a] hover:bg-[#4f46e5] text-white cursor-pointer"
                }`}
              >
                <span>{project?.isFilled ? "Position Filled" : "Submit Proposal"}</span>
                {!project?.isFilled && <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading project specification and PRD...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="p-8 text-center rounded-2xl bg-white border border-red-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">{error}</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                This project may have already been assigned to another contractor, or is temporarily restricted.
              </p>
              <Link
                href="/freelancer/dashboard?tab=find_projects"
                className="inline-block mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition"
              >
                Browse Other Projects
              </Link>
            </div>
          )}

          {/* Project Loaded */}
          {!isLoading && project && (
            <div className="space-y-6">
              {/* Header Showcase Card */}
              <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                    {project.category || "Engineering"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span>Verified Opportunity</span>
                  </span>
                  {project.isFilled ? (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full text-[10px] border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>Position Filled · In Progress</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[10px] border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Escrow Guaranteed</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-slate-500 font-medium text-[11px] ml-auto">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Posted {project.postedAt ? new Date(project.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recently"}</span>
                  </span>
                </div>

                <div className="space-y-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                    {project.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                {/* Key Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-600" />
                      <span>Client Budget</span>
                    </div>
                    <div className="font-mono font-black text-base text-slate-900">
                      {project.budgetDisplay || `$${(project.budgetAmount || 0).toLocaleString()} fixed`}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-600" />
                      <span>Duration</span>
                    </div>
                    <div className="font-bold text-sm text-slate-900">
                      {project.timelineDuration || "4 weeks"}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-indigo-600" />
                      <span>Location</span>
                    </div>
                    <div className="font-bold text-sm text-slate-900">
                      {project.location || "Remote"}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/60 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <FileText className="w-3 h-3 text-purple-600" />
                      <span>Proposals</span>
                    </div>
                    <div className="font-bold text-sm text-slate-900">
                      {project.proposalsCount || 0} submitted
                    </div>
                  </div>
                </div>
              </div>

              {/* Original Client Specification Document (PRD / Intake Doc) - Only shown if uploaded by client */}
              {project.uploadedDocument && Boolean(project.uploadedDocument.name) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Original Client Intake Document</span>
                    </h2>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Mutually Accessible
                    </span>
                  </div>

                  <ProjectUploadedDocumentCard
                    document={project.uploadedDocument}
                    projectTitle={project.title}
                    category={project.category}
                    budget={project.budgetDisplay}
                    timeline={project.timelineDuration}
                    overview={project.description}
                    objectives={scopeItems}
                    technicalArchitecture={project.skills?.join(", ")}
                    functionalRequirements={functionalRequirements.length > 0 ? functionalRequirements : scopeItems}
                    acceptanceCriteria={[
                      "All features and workflows pass documented test suite",
                      "Full source code and deployment runbook delivered",
                      "Milestone deliverable review accepted by client",
                    ]}
                    clientName={project.client?.name || "Client"}
                  />
                </div>
              )}

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === "overview"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Overview & Scope
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("specifications")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === "specifications"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Technical Specifications
                </button>
                {project.milestones && project.milestones.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("milestones")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      activeTab === "milestones"
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    Milestones Roadmap ({project.milestones.length})
                  </button>
                )}
              </div>

              {/* Tab 1: Overview & Scope */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Scope of Work */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      <span>Scope of Work</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {scopeItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Required Skills (Full List) */}
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-indigo-600" />
                      <span>Complete Required Skills ({project.skills?.length || 0})</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {project.skills?.map((skill: string) => (
                        <span
                          key={skill}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200/80 shadow-2xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Technical Specifications & Functional Requirements */}
              {activeTab === "specifications" && (
                <div className="space-y-6">
                  {/* Functional Requirements */}
                  {functionalRequirements.length > 0 && (
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span>Functional Requirements ({functionalRequirements.length})</span>
                      </h3>
                      <div className="space-y-2">
                        {functionalRequirements.map((fr, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 font-mono"
                          >
                            {fr}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Business Rules */}
                  {businessRules.length > 0 && (
                    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        <span>Mandatory Business & Security Rules</span>
                      </h3>
                      <div className="space-y-2">
                        {businessRules.map((rule, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs text-amber-900"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0 mt-1.5" />
                            <span>{rule}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Milestones Roadmap */}
              {activeTab === "milestones" && project.milestones && (
                <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Milestone Escrow Schedule</span>
                  </h3>
                  <div className="space-y-3">
                    {project.milestones.map((ms: any, idx: number) => {
                      const amountCents = ms.amountCents || ms.amountMinor || 0;
                      return (
                        <div
                          key={ms.id || idx}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-bold text-slate-900">
                                Milestone {idx + 1}: {ms.title}
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                · Due in {ms.days || 15} days
                              </span>
                            </div>
                            {ms.deliverables && (
                              <p className="text-[11px] text-slate-500">
                                Deliverable: {Array.isArray(ms.deliverables) ? ms.deliverables.join(", ") : ms.deliverables}
                              </p>
                            )}
                          </div>
                          <div className="font-mono font-bold text-sm text-slate-900 shrink-0">
                            ${(amountCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Success Notification if just submitted */}
              {isJustSubmitted && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold">Proposal Successfully Submitted to Client!</p>
                      <p className="text-[11px] text-emerald-700">
                        Your custom milestone breakdown and attached proposal document have been recorded in the consensus workspace.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/freelancer/dashboard?tab=proposals"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shrink-0"
                  >
                    View My Proposals
                  </Link>
                </div>
              )}

              {/* Bottom Sticky Action Bar */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Interested in this opportunity?</h4>
                  <p className="text-xs text-slate-500">
                    Submit your milestone breakdown and proposal directly to the client.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/freelancer/dashboard?tab=find_projects"
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
                  >
                    Cancel
                  </Link>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={project.isFilled || project.isApplied || isJustSubmitted}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 active:scale-98 ${
                      project.isFilled
                        ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                        : project.isApplied || isJustSubmitted
                        ? "bg-slate-100 text-slate-500 border border-slate-200 cursor-default"
                        : "bg-[#0f172a] hover:bg-[#4f46e5] text-white cursor-pointer"
                    }`}
                  >
                    <span>
                      {project.isFilled
                        ? "Position Filled"
                        : project.isApplied || isJustSubmitted
                        ? "Applied ✓"
                        : "Apply / Submit Proposal"}
                    </span>
                    {!project.isFilled && !project.isApplied && !isJustSubmitted && <ArrowRight className="w-3.5 h-3.5" />}
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

export default function FreelancerProjectDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#f8fafc]">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <FreelancerProjectDetailsContent />
    </Suspense>
  );
}


"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Search, FolderKanban } from "lucide-react";
import {
  FreelancerProjectItem,
  ProjectMilestone,
  MilestoneSubmission,
  ProjectTask,
  TaskStatus,
  ProjectFile,
  ProjectLifecycleStatus,
} from "@/lib/freelancer-projects-types";
import {
  calculateSummaryKPIs,
} from "@/lib/freelancer-projects-data";
import {
  fetchActiveProjects,
  submitMilestoneDeliverable,
  fetchProjectTasks,
  fetchProjectFiles,
  createProjectTask,
  updateProjectTask,
  fetchProjectHandover,
  ProjectHandoverData,
} from "@/lib/api-client";
import ProjectHandoverBanner from "@/components/handover/ProjectHandoverBanner";
import HandoverChecklistView from "@/components/handover/HandoverChecklistView";
import ProjectSummaryCards from "./projects/ProjectSummaryCards";
import ProjectDirectory from "./projects/ProjectDirectory";
import SelectedProjectHeader from "./projects/SelectedProjectHeader";
import ProjectTabs, { ProjectTabType } from "./projects/ProjectTabs";
import ProjectMilestonesTab from "./projects/ProjectMilestonesTab";
import ProjectOverviewTab from "./projects/ProjectOverviewTab";
import ProjectTasksTab from "./projects/ProjectTasksTab";
import ProjectFilesTab from "./projects/ProjectFilesTab";
import ProjectMessagesTab from "./projects/ProjectMessagesTab";
import ProjectPaymentsTab from "./projects/ProjectPaymentsTab";
import ProjectActivityTab from "./projects/ProjectActivityTab";
import MilestoneSubmissionModal from "./projects/MilestoneSubmissionModal";
import MilestoneDetailsModal from "./projects/MilestoneDetailsModal";
import ProposeMilestoneModal from "./projects/ProposeMilestoneModal";

interface FreelancerProjectsMilestonesViewProps {
  onSubmitDeliverableClick?: () => void;
  onNavigateTab: (tab: string) => void;
  showToast?: (msg: string) => void;
}

export default function FreelancerProjectsMilestonesView({
  onNavigateTab,
  showToast: parentShowToast,
}: FreelancerProjectsMilestonesViewProps) {
  // Toast handler
  const [internalToast, setInternalToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    if (parentShowToast) {
      parentShowToast(msg);
    } else {
      setInternalToast(msg);
      setTimeout(() => setInternalToast(null), 3500);
    }
  };

  // State: live projects list from database
  const [projects, setProjects] = useState<FreelancerProjectItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selected project tasks & files loaded dynamically
  const [selectedProjectTasks, setSelectedProjectTasks] = useState<ProjectTask[]>([]);
  const [selectedProjectFiles, setSelectedProjectFiles] = useState<ProjectFile[]>([]);

  // Filters & sorting
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("NEWEST");

  // Selected project active workspace tab
  const [activeTab, setActiveTab] = useState<ProjectTabType>("milestones");

  // Mobile layout switcher: 'directory' | 'workspace'
  const [mobileView, setMobileView] = useState<"directory" | "workspace">(
    "workspace"
  );

  // Modals state
  const [submittingMilestone, setSubmittingMilestone] =
    useState<ProjectMilestone | null>(null);
  const [viewingMilestone, setViewingMilestone] =
    useState<ProjectMilestone | null>(null);
  const [showProposeModal, setShowProposeModal] = useState(false);

  // Handover state
  const [freelancerHandoverData, setFreelancerHandoverData] = useState<ProjectHandoverData | null>(null);
  const [showFreelancerHandoverChecklist, setShowFreelancerHandoverChecklist] = useState<boolean>(false);

  // Dynamic Left/Right Sticky Tracking
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const [shorterColumn, setShorterColumn] = useState<"left" | "right" | "none">("none");

  // Fetch real projects from backend
  useEffect(() => {
    let mounted = true;
    async function loadBackendData() {
      try {
        setIsLoading(true);
        const res = await fetchActiveProjects();
        if (mounted && res.success && Array.isArray(res.projects)) {
          const mapped: FreelancerProjectItem[] = res.projects.map((live: any, idx: number) => {
            // Map live backend status to UI lifecycle status
            let mappedState: ProjectLifecycleStatus = "ACTIVE";
            let statusLabel = "In Progress";
            let statusBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200/80";

            if (
              live.agreementStatus === "PENDING_APPROVAL" ||
              live.derivedStatus === "INTAKE" ||
              live.derivedStatus === "MATCHING" ||
              live.derivedStatus === "DRAFT"
            ) {
              mappedState = "AWAITING_APPROVAL";
              statusLabel = "Awaiting Approval";
              statusBadgeColor = "bg-amber-50 text-amber-700 border-amber-200/80";
            } else if (
              live.derivedStatus === "COMPLETED" ||
              live.agreementStatus === "COMPLETED"
            ) {
              mappedState = "COMPLETED";
              statusLabel = "Completed";
              statusBadgeColor = "bg-purple-50 text-purple-700 border-purple-200";
            } else if (
              live.derivedStatus === "CANCELLED" ||
              live.agreementStatus === "TERMINATED"
            ) {
              mappedState = "CANCELLED";
              statusLabel = "Cancelled";
              statusBadgeColor = "bg-rose-50 text-rose-700 border-rose-200";
            } else {
              mappedState = "ACTIVE";
              statusLabel = live.derivedStatus === "IN_REVIEW" ? "In Review" : "In Progress";
              statusBadgeColor =
                live.derivedStatus === "IN_REVIEW"
                  ? "bg-amber-50 text-amber-700 border-amber-200/80"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200/80";
            }

            const totalBudgetCents = live.totalAmountMinor || 0;
            const totalBudgetDisplay =
              "$" +
              (totalBudgetCents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 }) +
              " USD";
            const progressPercent =
              live.totalMilestones > 0
                ? Math.round((live.completedMilestones / live.totalMilestones) * 100)
                : mappedState === "COMPLETED"
                ? 100
                : 0;

            const milestones = Array.isArray(live.milestones) ? live.milestones : [];

            const clientName = live.client?.name || "Client Partner";

            return {
              id: live.id || live.projectId || `proj-${idx}`,
              title: live.title || "Project",
              description:
                live.description || `${live.title || "Project"} bilateral agreement and verified milestones.`,
              state: mappedState,
              statusLabel,
              statusBadgeColor,
              client: {
                id: live.client?.id || `cli-${idx}`,
                name: clientName,
                companyName: clientName,
                verified: false,
                avatarLetter: (clientName[0] || "C").toUpperCase(),
                avatarBg: "bg-indigo-600 text-white",
                email: live.client?.email,
              },
              startDate: live.createdAt
                ? new Date(live.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "",
              dueDate: live.activeMilestone?.dueDate
                ? new Date(live.activeMilestone.dueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : milestones[0]?.dueDate || "No deadline",
              completedDate:
                mappedState === "COMPLETED" && live.updatedAt
                  ? new Date(live.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : undefined,
              totalBudgetCents,
              totalBudgetDisplay,
              currency: live.currency || "USD",
              pricingType: "FIXED_PRICE",
              agreementVersion: `v${live.activeVersionNumber || 1} ${
                mappedState === "COMPLETED"
                  ? "Fulfilled"
                  : mappedState === "AWAITING_APPROVAL"
                  ? "Under Review"
                  : "Active"
              }`,
              progressPercent,
              techTags: live.skills || [],
              thumbnailType: "GENERIC",
              milestones,
              tasks: [],
              files: [],
              progressSteps: [
                {
                  id: `ps-${idx}-1`,
                  title: "Requirements & contract scope",
                  status: "COMPLETED",
                },
                {
                  id: `ps-${idx}-2`,
                  title: "Milestone deliverable execution",
                  status: mappedState === "COMPLETED" ? "COMPLETED" : "CURRENT",
                },
                {
                  id: `ps-${idx}-3`,
                  title: "Final verification and payout",
                  status: mappedState === "COMPLETED" ? "COMPLETED" : "PENDING",
                },
              ],
              nextActions: live.activeMilestone
                ? [
                    {
                      id: `na-${live.activeMilestone.id}`,
                      title: `Deliverable: ${live.activeMilestone.title}`,
                      description: `Work status: ${live.activeMilestone.workStatus}`,
                      actionLabel:
                        live.activeMilestone.workStatus === "IN_PROGRESS" ||
                        live.activeMilestone.workStatus === "REVISIONS_REQUESTED"
                          ? "Submit Deliverables"
                          : "View Details",
                      actionType: "SUBMIT",
                      iconType: "DOCUMENT",
                    },
                  ]
                : [],
            };
          });

          // Deduplicate projects by ID to guarantee unique React keys
          const uniqueProjects = Array.from(new Map(mapped.map((p) => [p.id, p])).values());
          setProjects(uniqueProjects);
          if (uniqueProjects.length > 0) {
            setSelectedProjectId((prev) =>
              uniqueProjects.some((p) => p.id === prev) ? prev : uniqueProjects[0].id
            );
          }
        }
      } catch {
        setProjects([]);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadBackendData();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch real tasks and files for selected project
  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedProjectTasks([]);
      setSelectedProjectFiles([]);
      setFreelancerHandoverData(null);
      return;
    }

    let active = true;
    async function loadProjectDetails() {
      try {
        const [tasksRes, filesRes, handoverRes] = await Promise.all([
          fetchProjectTasks(selectedProjectId),
          fetchProjectFiles(selectedProjectId),
          fetchProjectHandover(selectedProjectId),
        ]);

        if (active) {
          if (handoverRes.success && handoverRes.data?.handover) {
            setFreelancerHandoverData(handoverRes.data.handover);
          } else {
            setFreelancerHandoverData(null);
          }
          if (tasksRes.success && Array.isArray(tasksRes.tasks)) {
            setSelectedProjectTasks(
              tasksRes.tasks.map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description || "",
                status: t.status === "DONE" ? "COMPLETED" : t.status === "IN_PROGRESS" ? "IN_PROGRESS" : "TO_DO",
                priority: (t.priority || "MEDIUM") as any,
                dueDate: t.dueDate
                  ? new Date(t.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "No deadline",
                relatedMilestoneId: t.milestoneId || "",
                milestoneTitle: t.milestoneId
                  ? projects.find((p) => p.id === selectedProjectId)?.milestones.find((m: any) => m.id === t.milestoneId)?.title || "Associated Milestone"
                  : "Project Task",
                completed: t.status === "DONE",
              }))
            );
          } else {
            setSelectedProjectTasks([]);
          }

          const activeProj = projects.find((p) => p.id === selectedProjectId);
          const uploadedDoc = (activeProj as any)?.uploadedDocument;
          const clientPrdDoc = uploadedDoc ? {
            id: `client_doc_${selectedProjectId}`,
            name: uploadedDoc.name,
            fileType: uploadedDoc.type || "application/pdf",
            fileSize: uploadedDoc.size || "Original Document",
            uploadedBy: "CLIENT" as const,
            uploadedByName: activeProj?.client?.name || "Client",
            uploadDate: activeProj?.startDate || "Intake",
            downloadUrl: uploadedDoc.dataUrl || undefined,
          } : null;

          const baseFiles = clientPrdDoc ? [clientPrdDoc] : [];

          if (filesRes.success && Array.isArray(filesRes.files)) {
            const mappedFiles = filesRes.files.map((f: any) => {
              const sizeStr =
                f.sizeBytes > 1024 * 1024
                  ? `${(f.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
                  : `${Math.round(f.sizeBytes / 1024)} KB`;
              return {
                id: f.fileId || f.id,
                name: f.name,
                fileType: f.mime || "Document",
                fileSize: sizeStr,
                uploadedBy: f.uploadedBy === "CLIENT" ? ("CLIENT" as const) : ("FREELANCER" as const),
                uploadedByName: f.uploader?.name || "Member",
                uploadDate: f.createdAt
                  ? new Date(f.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "",
                downloadUrl: `/api/files/${f.fileId || f.id}`,
              };
            });
            setSelectedProjectFiles([...baseFiles, ...mappedFiles]);
          } else {
            setSelectedProjectFiles(baseFiles);
          }
        }
      } catch {
        if (active) {
          setSelectedProjectTasks([]);
          setSelectedProjectFiles([]);
        }
      }
    }

    loadProjectDetails();
    return () => {
      active = false;
    };
  }, [selectedProjectId]);

  // Summary KPIs calculated strictly from real database records
  const summaryKPIs = useMemo(() => {
    return calculateSummaryKPIs(projects);
  }, [projects]);

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        if (selectedStatus !== "ALL" && p.state !== selectedStatus) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = p.title.toLowerCase().includes(q);
          const matchClient = p.client.companyName.toLowerCase().includes(q);
          const matchTags = p.techTags.some((t) => t.toLowerCase().includes(q));
          return matchTitle || matchClient || matchTags;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "PROGRESS") {
          return b.progressPercent - a.progressPercent;
        }
        if (sortBy === "DEADLINE") {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortBy === "OLDEST") {
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        }
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      });
  }, [projects, selectedStatus, searchQuery, sortBy]);

  // Selected project with dynamic tasks & files injected
  const selectedProject = useMemo(() => {
    const found = filteredProjects.find((p) => p.id === selectedProjectId);
    const base = found || filteredProjects[0] || projects[0] || null;
    if (!base) return null;
    return {
      ...base,
      tasks: selectedProjectTasks,
      files: selectedProjectFiles,
    };
  }, [filteredProjects, selectedProjectId, projects, selectedProjectTasks, selectedProjectFiles]);

  // Dynamic sticky height detection between directory and workspace columns
  useEffect(() => {
    const checkHeights = () => {
      if (!leftPanelRef.current || !rightPanelRef.current) return;

      if (window.innerWidth < 1024) {
        setShorterColumn("none");
        return;
      }

      const leftH = leftPanelRef.current.offsetHeight;
      const rightH = rightPanelRef.current.offsetHeight;

      if (Math.abs(leftH - rightH) < 48) {
        setShorterColumn("none");
      } else if (leftH < rightH) {
        setShorterColumn("left");
      } else {
        setShorterColumn("right");
      }
    };

    checkHeights();
    const timer = setTimeout(checkHeights, 150);
    window.addEventListener("resize", checkHeights);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkHeights);
    };
  }, [activeTab, projects, selectedProjectId, filteredProjects]);

  // Action handlers
  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setMobileView("workspace");
  };

  const handleDeliverableSubmitted = (submission: MilestoneSubmission) => {
    if (!submittingMilestone || !selectedProject) return;

    const links: string[] = [];
    if (submission.githubPrUrl) links.push(submission.githubPrUrl);
    if (submission.demoUrl) links.push(submission.demoUrl);

    submitMilestoneDeliverable(submittingMilestone.id, {
      note: submission.completionNote || submission.deliverableDescription || "Deliverable submitted",
      links: links.length > 0 ? links : undefined,
    }).catch((err) => {
      console.warn("Backend deliverable sync:", err);
    });

    setProjects((prevProjects) =>
      prevProjects.map((p) => {
        if (p.id !== selectedProject.id) return p;
        return {
          ...p,
          milestones: p.milestones.map((m) => {
            if (m.id !== submittingMilestone.id) return m;
            return {
              ...m,
              workStatus: "AWAITING_CLIENT_REVIEW",
              submittedAt: "Just now",
              submissions: [submission, ...m.submissions],
            };
          }),
        };
      })
    );

    setSubmittingMilestone(null);
    showToast(
      `Deliverable for ${submittingMilestone.title} submitted to client for verification.`
    );
  };

  const handleProposeMilestone = (newMs: ProjectMilestone) => {
    if (!selectedProject) return;
    setProjects((prevProjects) =>
      prevProjects.map((p) => {
        if (p.id !== selectedProject.id) return p;
        return {
          ...p,
          milestones: [...p.milestones, newMs],
        };
      })
    );
    setShowProposeModal(false);
    showToast(`New milestone proposed and pending bilateral agreement update.`);
  };

  const handleToggleTask = async (taskId: string) => {
    if (!selectedProject) return;
    const task = selectedProjectTasks.find((t) => t.id === taskId);
    if (!task) return;
    const nextCompleted = !task.completed;
    const nextStatus = nextCompleted ? "DONE" : "TODO";

    // Optimistic update
    setSelectedProjectTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: nextCompleted ? "COMPLETED" : "TO_DO",
              completed: nextCompleted,
            }
          : t
      )
    );

    try {
      const res = await updateProjectTask(taskId, { status: nextStatus as any });
      if (!res.success) {
        showToast(res.error || "Failed to update task status");
        setSelectedProjectTasks((prev) =>
          prev.map((t) => (t.id === taskId ? task : t))
        );
      }
    } catch {
      showToast("Failed to communicate with task service");
      setSelectedProjectTasks((prev) =>
        prev.map((t) => (t.id === taskId ? task : t))
      );
    }
  };

  const handleAddTask = async (newTask: ProjectTask) => {
    if (!selectedProjectId) return;
    try {
      const res = await createProjectTask(selectedProjectId, {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        dueDate: newTask.dueDate,
        status: "TODO" as any,
      });
      if (res.success && res.task) {
        const persistedTask: ProjectTask = {
          id: res.task.id,
          title: res.task.title,
          description: res.task.description || "",
          status: "TO_DO",
          priority: newTask.priority,
          dueDate: newTask.dueDate,
          relatedMilestoneId: res.task.milestoneId || "",
          milestoneTitle: "Project Task",
          completed: false,
        };
        setSelectedProjectTasks((prev) => [persistedTask, ...prev]);
        showToast(`Task "${newTask.title}" added to project.`);
      } else {
        showToast(res.error || "Failed to create task on backend");
      }
    } catch {
      showToast("Failed to create task");
    }
  };

  const handleUploadFile = (newFile: ProjectFile) => {
    setSelectedProjectFiles((prev) => [newFile, ...prev]);
  };

  return (
    <div className="space-y-6">
      {/* Internal Toast */}
      {internalToast && (
        <div className="fixed bottom-6 right-6 z-50 py-2.5 px-4 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg animate-in slide-in-from-bottom duration-200">
          {internalToast}
        </div>
      )}

      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            My Projects
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your active projects, track milestones, communicate with clients and deliver successfully.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab("find_projects")}
          className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-xs font-bold text-white transition shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Find More Projects</span>
        </button>
      </div>

      {/* 5 Summary KPI Cards across top */}
      <ProjectSummaryCards
        kpis={summaryKPIs}
        selectedFilter={selectedStatus}
        onSelectFilter={(filter) => setSelectedStatus(filter)}
      />

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Project Directory (5 cols on desktop) */}
        <div
          ref={leftPanelRef}
          className={`lg:col-span-5 space-y-4 ${
            shorterColumn === "left" ? "lg:sticky lg:self-start" : ""
          } ${mobileView === "workspace" ? "hidden lg:block" : "block"}`}
          style={
            shorterColumn === "left"
              ? { top: "min(1.5rem, calc(100vh - 100% - 1.5rem))" }
              : undefined
          }
        >
          {isLoading ? (
            <div className="p-8 text-center rounded-2xl bg-white border border-slate-200/90 text-slate-500 space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading delivery projects...</p>
            </div>
          ) : (
            <ProjectDirectory
              projects={projects}
              filteredProjects={filteredProjects}
              selectedProjectId={selectedProject?.id || ""}
              onSelectProject={handleSelectProject}
              selectedStatus={selectedStatus}
              onSelectStatus={setSelectedStatus}
              kpis={summaryKPIs}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          )}
        </div>

        {/* Right Panel: Selected Project Workspace (7 cols on desktop) */}
        <div
          ref={rightPanelRef}
          className={`lg:col-span-7 space-y-4 ${
            shorterColumn === "right" ? "lg:sticky lg:self-start" : ""
          } ${mobileView === "directory" ? "hidden lg:block" : "block"}`}
          style={
            shorterColumn === "right"
              ? { top: "min(1.5rem, calc(100vh - 100% - 1.5rem))" }
              : undefined
          }
        >
          {selectedProject ? (
            <>
              {/* Project Header */}
              <SelectedProjectHeader
                project={selectedProject}
                onBackToDirectory={() => setMobileView("directory")}
                onOpenWorkspace={() => onNavigateTab("workspace")}
                showToast={showToast}
              />

              {/* Handover & Documentation Protocol (100% Light Theme) */}
              {(!!freelancerHandoverData ||
                (selectedProject.milestones.length > 0 &&
                  selectedProject.milestones.every((m) => m.workStatus === "ACCEPTED"))) && (
                <div className="space-y-3">
                  <ProjectHandoverBanner
                    role="FREELANCER"
                    projectName={selectedProject.title}
                    handoverData={freelancerHandoverData}
                    onInitiateClick={() => {}}
                    onViewChecklistClick={() => setShowFreelancerHandoverChecklist((prev) => !prev)}
                  />

                  {showFreelancerHandoverChecklist && freelancerHandoverData && (
                    <HandoverChecklistView
                      projectId={selectedProject.id}
                      projectName={selectedProject.title}
                      role="FREELANCER"
                      handoverData={freelancerHandoverData}
                      onRefresh={async () => {
                        const res = await fetchProjectHandover(selectedProject.id);
                        if (res.success && res.data?.handover) {
                          setFreelancerHandoverData(res.data.handover);
                        }
                      }}
                      showToast={showToast}
                      onClose={() => setShowFreelancerHandoverChecklist(false)}
                    />
                  )}
                </div>
              )}

              {/* Project Navigation Tabs */}
              <ProjectTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                milestonesCount={selectedProject.milestones.length}
                tasksCount={selectedProject.tasks.length}
                filesCount={selectedProject.files.length}
              />

              {/* Tab Content */}
              <div className="pt-1">
                {activeTab === "milestones" && (
                  <ProjectMilestonesTab
                    project={selectedProject}
                    onOpenSubmitModal={(ms) => setSubmittingMilestone(ms)}
                    onOpenDetailsModal={(ms) => setViewingMilestone(ms)}
                    onOpenProposeModal={() => setShowProposeModal(true)}
                    onSendMessageAction={() => onNavigateTab("workspace")}
                    showToast={showToast}
                  />
                )}

                {activeTab === "overview" && (
                  <ProjectOverviewTab
                    project={selectedProject}
                    onNavigateToTab={(tab) => setActiveTab(tab)}
                    onOpenWorkspace={() => onNavigateTab("workspace")}
                  />
                )}

                {activeTab === "tasks" && (
                  <ProjectTasksTab
                    projectId={selectedProject.id}
                    tasks={selectedProject.tasks}
                    onToggleTask={handleToggleTask}
                    onAddTask={handleAddTask}
                    showToast={showToast}
                  />
                )}

                {activeTab === "files" && (
                  <ProjectFilesTab
                    projectId={selectedProject.id}
                    files={selectedProject.files}
                    onUploadFile={handleUploadFile}
                    showToast={showToast}
                  />
                )}

                {activeTab === "messages" && (
                  <ProjectMessagesTab
                    project={selectedProject}
                    onOpenWorkspace={() => onNavigateTab("workspace")}
                  />
                )}

                {activeTab === "payments" && (
                  <ProjectPaymentsTab
                    project={selectedProject}
                    onOpenEarnings={() => onNavigateTab("earnings")}
                  />
                )}

                {activeTab === "activity" && (
                  <ProjectActivityTab project={selectedProject} />
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200/90 text-slate-500">
              <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">No project selected</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Select a project from the directory or browse opportunities to begin delivering milestones.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {submittingMilestone && selectedProject && (
        <MilestoneSubmissionModal
          milestone={submittingMilestone}
          onClose={() => setSubmittingMilestone(null)}
          onSubmit={handleDeliverableSubmitted}
        />
      )}

      {viewingMilestone && selectedProject && (
        <MilestoneDetailsModal
          milestone={viewingMilestone}
          onClose={() => setViewingMilestone(null)}
          onOpenSubmitModal={(ms) => {
            setViewingMilestone(null);
            setSubmittingMilestone(ms);
          }}
          onSendMessage={() => onNavigateTab("workspace")}
        />
      )}

      {showProposeModal && selectedProject && (
        <ProposeMilestoneModal
          projectTitle={selectedProject.title}
          nextOrderIndex={selectedProject.milestones.length + 1}
          onClose={() => setShowProposeModal(false)}
          onPropose={handleProposeMilestone}
        />
      )}
    </div>
  );
}

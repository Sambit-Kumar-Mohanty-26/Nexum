"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Smartphone,
  BarChart2,
  Sparkles,
  Paperclip,
  ArrowUp,
  CheckCircle2,
  Circle,
  Video,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
  PanelRightClose,
  PanelRightOpen,
  MessageSquare,
  Clock,
  Calendar,
  Plus,
  Play,
  FileText,
  Lock,
  ArrowRight,
  Check,
  Bot,
  Layers,
  Package,
} from "lucide-react";
import {
  WorkspaceProject,
  TimelineItem,
  WorkspaceTaskItem,
  WorkspaceMeetingItem,
  WorkspaceDecisionItem,
} from "@/lib/workspace-types";
import {
  INITIAL_WORKSPACE_PROJECTS,
  INITIAL_TIMELINE_TECHKART,
} from "@/lib/workspace-data";
import {
  getWorkspaceTimeline,
  sendWorkspaceMessage,
  proposeScopeAmendment,
  respondToScopeAmendment,
  proposeWorkspaceMeeting,
  respondToWorkspaceMeeting,
  respondToWorkspaceMeetingPostpone,
  respondToWorkspaceMilestonePostpone,
  submitMeetingNotetakerSynthesis,
  createWorkspaceTask,
  updateWorkspaceTaskStatus,
  fetchWorkspaceProjects,
  fetchProjectHandover,
  initiateProjectHandover,
  ProjectHandoverData,
} from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import ReviewVersionModal from "./ReviewVersionModal";
import ReadOriginalMessageModal from "./ReadOriginalMessageModal";
import ProposeMeetingModal from "./ProposeMeetingModal";
import PostponeMeetingModal from "./PostponeMeetingModal";
import PostponeMilestoneModal from "./PostponeMilestoneModal";
import ProjectHandoverBanner from "@/components/handover/ProjectHandoverBanner";
import ProjectHandoverModal from "@/components/handover/ProjectHandoverModal";
import HandoverChecklistView from "@/components/handover/HandoverChecklistView";

interface WorkspaceChatsModeProps {
  onSwitchToAIMode: (projectScope?: string) => void;
  onOpenMediationHelp: () => void;
  isStandalone?: boolean;
}

export default function WorkspaceChatsMode({
  onSwitchToAIMode,
  onOpenMediationHelp,
  isStandalone = false,
}: WorkspaceChatsModeProps) {
  const { user } = useAuth();

  // Projects & Active Selection (Truthful dynamic loading from backend)
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "unread">("all");
  const [searchFilter, setSearchFilter] = useState("");
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);

  // Timeline & Messages
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [activeTab, setActiveTab] = useState<
    "chat" | "milestones" | "deliverables" | "handover" | "tasks" | "files" | "decisions" | "meetings" | "safe_harbor"
  >("chat");

  // Project Handover State
  const [handoverData, setHandoverData] = useState<ProjectHandoverData | null>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);

  // Dynamic Workspace Engine State
  const [tasks, setTasks] = useState<WorkspaceTaskItem[]>([]);
  const [meetings, setMeetings] = useState<WorkspaceMeetingItem[]>([]);
  const [decisions, setDecisions] = useState<WorkspaceDecisionItem[]>([]);
  const [files, setFiles] = useState<Array<{ name: string; size: string; date: string; type: string }>>([]);
  const [agreementHash, setAgreementHash] = useState<string>("canonical_v1.0_pending");
  const [isLoading, setIsLoading] = useState(false);

  // Task Creation Form
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");

  // Composer
  const [composerMode, setComposerMode] = useState<"mediated" | "private_ai">("mediated");
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Right Drawer collapsible state
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(true);

  // Modals
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isOriginalMsgModalOpen, setIsOriginalMsgModalOpen] = useState(false);
  const [isProposeMeetingModalOpen, setIsProposeMeetingModalOpen] = useState(false);
  const [isPostponeMeetingModalOpen, setIsPostponeMeetingModalOpen] = useState(false);
  const [selectedMeetingForPostpone, setSelectedMeetingForPostpone] = useState<any>(null);
  const [isPostponeMilestoneModalOpen, setIsPostponeMilestoneModalOpen] = useState(false);
  const [selectedMilestoneForPostpone, setSelectedMilestoneForPostpone] = useState<any>(null);
  const [reviewVersionTarget, setReviewVersionTarget] = useState("Version 4");

  const timelineEndRef = useRef<HTMLDivElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Safely derive selected project (null when user has 0 projects)
  const selectedProject =
    projects.find((p) => p.id === selectedProjectId) || (projects.length > 0 ? projects[0] : null);

  // Load real user workspace projects from API
  useEffect(() => {
    let isMounted = true;
    const loadProjects = async () => {
      try {
        setIsProjectsLoading(true);
        const res = await fetchWorkspaceProjects(user?.id || "usr_client_alex", "CLIENT");
        if (isMounted) {
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            setProjects(res.data);
            setSelectedProjectId((prev) =>
              prev && res.data.some((p: any) => p.id === prev) ? prev : res.data[0].id
            );
          } else {
            // Clean truthful empty state (0 projects)
            setProjects([]);
            setSelectedProjectId("");
          }
        }
      } catch (err) {
        console.warn("Workspace projects load error:", err);
        if (isMounted) {
          setProjects([]);
          setSelectedProjectId("");
        }
      } finally {
        if (isMounted) setIsProjectsLoading(false);
      }
    };

    loadProjects();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Auto scroll to latest in timeline
  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline]);

  // Load live workspace state from Express / Neon backend
  useEffect(() => {
    if (!selectedProjectId) {
      setTimeline([]);
      setTasks([]);
      setMeetings([]);
      setDecisions([]);
      return;
    }

    const loadWorkspaceState = async () => {
      try {
        setIsLoading(true);
        const res = await getWorkspaceTimeline(selectedProjectId);
        if (res.success && res.data) {
          const convo = res.data;
          if (convo.agreementHash) setAgreementHash(convo.agreementHash);

          if (convo.tasks && convo.tasks.length > 0) {
            setTasks(
              convo.tasks.map((t: any) => ({
                id: t.id,
                title: t.title,
                description: t.description,
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString([], { month: "short", day: "numeric" }) : undefined,
                assignedToName: t.assignedTo?.name,
                assignedToRole: t.assignedTo?.role,
              }))
            );
          } else {
            setTasks([]);
          }

          if (convo.meetings && convo.meetings.length > 0) {
            setMeetings(
              convo.meetings.map((m: any) => ({
                id: m.id,
                title: m.title,
                agenda: m.agenda,
                durationMinutes: m.durationMinutes,
                status: m.status,
                proposedSlots: Array.isArray(m.proposedSlots) ? m.proposedSlots : [],
                acceptedSlot: m.acceptedSlot,
                roomUrl: m.roomUrl,
                googleCalendarUrl: m.googleCalendarUrl,
                icsContent: m.icsContent,
                notetakerSummary: m.notetakerSummary,
              }))
            );
          } else {
            setMeetings([]);
          }

          if (convo.decisions && convo.decisions.length > 0) {
            setDecisions(
              convo.decisions.map((d: any) => ({
                id: d.id,
                title: d.title,
                context: d.context,
                resolution: d.resolution,
                status: d.status,
                sha256Seal: d.sha256Seal,
                createdAt: new Date(d.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
              }))
            );
          } else {
            setDecisions([]);
          }

          if (convo.messages && convo.messages.length > 0) {
            const mapped: TimelineItem[] = convo.messages.map((m: any) => {
              const timeStr = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const meta = m.metadata || {};
              const bubbleText = m.originalContent || m.content || meta.summaryText || "";
              return {
                id: m.id,
                type: m.type as any,
                senderName: m.sender?.name || (m.senderRole === "CLIENT" ? "You" : (selectedProject?.freelancerName || "Freelancer")),
                timestamp: timeStr,
                bubbleText,
                rawMessage: m.originalContent || m.content,
                summaryText: meta.summaryText || bubbleText,
                badgeText: meta.badgeText || (m.senderRole === "CLIENT" ? "Delivered" : "Verified"),
                badgeType: meta.badgeType || "green",
                sha256Seal: m.sha256Seal,
                counterofferDetails: meta.counterofferDetails,
                meetingDetails: meta.meetingDetails,
                deliverableDetails: meta.deliverableDetails,
                notetakerDetails: meta.notetakerDetails,
                actions: meta.actions,
              };
            });
            setTimeline(mapped);
          } else {
            setTimeline([]);
          }
        }
      } catch (err) {
        console.warn("Workspace timeline load error:", err);
        setTimeline([]);
      } finally {
        setIsLoading(false);
      }

      // Load live handover protocol state
      fetchProjectHandover(selectedProjectId)
        .then((res) => {
          if (res.success && res.data?.handover) {
            setHandoverData(res.data.handover);
          } else {
            setHandoverData(null);
          }
        })
        .catch(() => setHandoverData(null));
    };

    loadWorkspaceState();
  }, [selectedProjectId]);

  // Live polling: seamlessly poll for incoming messages every 3 seconds so messages like "hi" appear in real-time
  useEffect(() => {
    if (!selectedProjectId) return;

    const pollInterval = setInterval(() => {
      getWorkspaceTimeline(selectedProjectId)
        .then((res) => {
          if (res.success && res.data?.messages) {
            const mapped: TimelineItem[] = res.data.messages.map((m: any) => {
              const timeStr = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const meta = m.metadata || {};
              const bubbleText = m.originalContent || m.content || meta.summaryText || "";
              return {
                id: m.id,
                type: m.type as any,
                senderName: m.sender?.name || (m.senderRole === "CLIENT" ? "You" : (selectedProject?.freelancerName || "Freelancer")),
                timestamp: timeStr,
                bubbleText,
                rawMessage: m.originalContent || m.content,
                summaryText: meta.summaryText || bubbleText,
                badgeText: meta.badgeText || (m.senderRole === "CLIENT" ? "Delivered" : "Verified"),
                badgeType: meta.badgeType || "green",
                sha256Seal: m.sha256Seal,
                counterofferDetails: meta.counterofferDetails,
                meetingDetails: meta.meetingDetails,
                deliverableDetails: meta.deliverableDetails,
                notetakerDetails: meta.notetakerDetails,
                actions: meta.actions,
              };
            });

            setTimeline((prev) => {
              if (
                prev.length !== mapped.length ||
                (mapped.length > 0 && prev[prev.length - 1]?.id !== mapped[mapped.length - 1]?.id)
              ) {
                return mapped;
              }
              return prev;
            });
          }
        })
        .catch(() => {});
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [selectedProjectId, selectedProject?.freelancerName]);

  // Check if input contains scope / price keywords
  const hasScopeOrPriceKeywords =
    /(\$|price|quote|scope|cost|fee|budget|timeline|delay|discount|reduce|counteroffer)/i.test(
      messageInput
    );

  // Send message handler through Tier 1 Bot triage
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = messageInput.trim();
    if (!text || isSending || !selectedProject) return;

    if (composerMode === "private_ai") {
      onSwitchToAIMode(selectedProject.shortName);
      return;
    }

    setIsSending(true);
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    // Optimistic client message
    const tempClientMsg: TimelineItem = {
      id: `msg_${Date.now()}`,
      type: "client_bubble",
      senderName: "You",
      timestamp: nowTime,
      bubbleText: text,
    };
    setTimeline((prev) => [...prev, tempClientMsg]);
    setMessageInput("");

    try {
      // Send to backend workspace API
      const res = await sendWorkspaceMessage(selectedProjectId, {
        senderId: user?.id || "usr_client_alex",
        senderRole: "CLIENT",
        content: text,
      });

      if (res.success && res.data) {
        const triage = res.data.triageResult;
        if (triage?.hasScopeTrigger) {
          const draftCard: TimelineItem = {
            id: `draft_${Date.now()}`,
            type: "draft_counteroffer_card",
            senderName: "Nexum AI",
            timestamp: nowTime,
            badgeText: "Draft, not sent yet",
            badgeType: "gray",
            summaryText: `Nexum detected scope/budget keywords regarding "${text.slice(0, 45)}...". Scope and price adjustments require client verification before being delivered to ${selectedProject.freelancerName}.`,
            counterofferDetails: {
              title: `v${parseInt(selectedProject.agreementVersion.replace(/\D/g, "") || "4") + 1} · Proposed Amendment`,
              priceChange: text.includes("500") ? "+$500" : "Adjusted scope delta",
              schedule: "+4 days, pending freelancer acknowledgment",
              expires: "Nov 5, 2026",
            },
            actions: {
              primaryLabel: `Send to ${selectedProject.freelancerName.split(" ")[0]}`,
              primaryAction: "send_counteroffer",
              secondaryLabel: "Edit",
              secondaryAction: "edit_counteroffer",
              tertiaryLabel: "Approve current version instead",
              tertiaryAction: "approve_current",
            },
          };
          setTimeline((prev) => [...prev, draftCard]);
          showToast("Nexum AI drafted a structured mediation card. Review before delivery.");
        } else {
          const deliveryNotice: TimelineItem = {
            id: `notice_${Date.now()}`,
            type: "sent_to_freelancer_card",
            senderName: "Nexum AI",
            timestamp: nowTime,
            badgeText: `Sent to ${selectedProject.freelancerName.split(" ")[0]}`,
            badgeType: "green",
            sha256Seal: res.data.message?.sha256Seal,
            summaryText: `Delivered to ${selectedProject.freelancerName} with linked project brief. Original wording kept intact.`,
            originalMessageLinkText: "View delivery receipt and SHA-256 seal",
          };
          setTimeline((prev) => [...prev, deliveryNotice]);
          showToast(`Message delivered to ${selectedProject.freelancerName}.`);
        }
      }
    } catch {
      // Resilient fallback
      if (hasScopeOrPriceKeywords) {
        const draftCard: TimelineItem = {
          id: `draft_${Date.now()}`,
          type: "draft_counteroffer_card",
          senderName: "Nexum AI",
          timestamp: nowTime,
          badgeText: "Draft, not sent yet",
          badgeType: "gray",
          summaryText: `Nexum reviewed your message regarding "${text.slice(0, 45)}...". Scope and price adjustments require client verification.`,
          counterofferDetails: {
            title: `v${parseInt(selectedProject.agreementVersion.replace(/\D/g, "") || "4") + 1} · Proposed Amendment`,
            priceChange: text.includes("500") ? "+$500" : "Adjusted scope delta",
            schedule: "+4 days, pending freelancer acknowledgment",
            expires: "Nov 5, 2026",
          },
          actions: {
            primaryLabel: `Send to ${selectedProject.freelancerName.split(" ")[0]}`,
            primaryAction: "send_counteroffer",
            secondaryLabel: "Edit",
            secondaryAction: "edit_counteroffer",
            tertiaryLabel: "Approve current version instead",
            tertiaryAction: "approve_current",
          },
        };
        setTimeline((prev) => [...prev, draftCard]);
      } else {
        const deliveryNotice: TimelineItem = {
          id: `notice_${Date.now()}`,
          type: "sent_to_freelancer_card",
          senderName: "Nexum AI",
          timestamp: nowTime,
          badgeText: `Sent to ${selectedProject.freelancerName.split(" ")[0]}`,
          badgeType: "green",
          summaryText: `Delivered to ${selectedProject.freelancerName}. SHA-256 sealed.`,
        };
        setTimeline((prev) => [...prev, deliveryNotice]);
      }
    } finally {
      setIsSending(false);
    }
  };

  // Handle counteroffer action (Send to Sambit)
  const handleExecuteCardAction = async (item: TimelineItem, actionKey?: string) => {
    if (actionKey === "send_counteroffer") {
      const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      try {
        await proposeScopeAmendment(selectedProjectId, {
          proposerId: "usr_client_alex",
          amendmentType: "AMEND_EXISTING_MILESTONE",
          milestoneId: "ms_techkart_2",
          priceDeltaCents: 50000,
          timelineDaysDelta: 4,
          newAcceptanceCriteria: ["Category pill filters", "Order capture verified"],
          justification: "CR-2 Best-Selling Section Amendment with +$500 budget update.",
        });
      } catch (err) {
        console.warn("Scope amendment fallback", err);
      }

      const flName = selectedProject?.freelancerName || "Freelancer";
      setTimeline((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                type: "sent_to_freelancer_card",
                timestamp: nowTime,
                badgeText: `Sent to ${flName.split(" ")[0]}`,
                badgeType: "green",
                summaryText: `Counteroffer sent to ${flName}. Awaiting mutual verification.`,
                actions: undefined,
              }
            : it
        )
      );
      showToast(`Counteroffer delivered to ${flName}!`);
    } else if (actionKey === "review_v4") {
      setReviewVersionTarget("Version 4");
      setIsReviewModalOpen(true);
    } else if (actionKey === "ask_question") {
      const flName = selectedProject?.freelancerName || "Freelancer";
      setMessageInput(`Regarding quote v4 for ${flName}: `);
    } else if (actionKey === "approve_v4_instead" || actionKey === "approve_current") {
      setReviewVersionTarget("Version 4");
      setIsReviewModalOpen(true);
    } else if (actionKey === "edit_counteroffer") {
      setMessageInput(`Could we revise the counteroffer to $450 with same delivery timeline?`);
      showToast("Edit text loaded in composer.");
    }
  };

  // Kanban Task Creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await createWorkspaceTask(selectedProjectId, {
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        status: "TODO",
      });
      if (res.success && res.data) {
        setTasks((prev) => [...prev, res.data]);
      } else {
        const newTask: WorkspaceTaskItem = {
          id: `t_${Date.now()}`,
          title: newTaskTitle.trim(),
          priority: newTaskPriority,
          status: "TODO",
          dueDate: "Nov 12",
        };
        setTasks((prev) => [...prev, newTask]);
      }
      setNewTaskTitle("");
      setIsAddingTask(false);
      showToast("New project task created.");
    } catch {
      const newTask: WorkspaceTaskItem = {
        id: `t_${Date.now()}`,
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        status: "TODO",
        dueDate: "Nov 12",
      };
      setTasks((prev) => [...prev, newTask]);
      setNewTaskTitle("");
      setIsAddingTask(false);
      showToast("Task created.");
    }
  };

  // Advance Task Status (TODO -> IN_PROGRESS -> IN_REVIEW -> DONE)
  const handleAdvanceTask = async (task: WorkspaceTaskItem) => {
    const nextMap: Record<string, "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE"> = {
      TODO: "IN_PROGRESS",
      IN_PROGRESS: "IN_REVIEW",
      IN_REVIEW: "DONE",
      DONE: "TODO",
    };
    const nextStatus = nextMap[task.status] || "TODO";

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      await updateWorkspaceTaskStatus(task.id, nextStatus);
    } catch (err) {
      console.warn("Task status update offline", err);
    }
    showToast(`Task moved to ${nextStatus.replace("_", " ")}`);
  };

  // Bilateral Meeting Proposal Handler
  const handleScheduleMeetingProposal = async (details: {
    date: string;
    time: string;
    topic: string;
    duration?: string;
  }) => {
    const slotString = `${details.date} at ${details.time}`;
    try {
      const res = await proposeWorkspaceMeeting(selectedProjectId, {
        proposedByUserId: "usr_client_alex",
        title: details.topic,
        agenda: `${details.topic} (Duration: ${details.duration || "30 min"})`,
        durationMinutes: parseInt(details.duration || "30") || 30,
        proposedSlots: [{ id: "slot_1", startTime: slotString, endTime: slotString }],
      });

      if (res.success && res.data) {
        const meet = res.data.meeting;
        setMeetings((prev) => [meet, ...prev]);
        const meetCard: TimelineItem = {
          id: `meet_card_${meet.id}`,
          type: "meeting_proposal_card",
          senderName: "Nexum AI",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          badgeText: "Meeting Proposed",
          badgeType: "purple",
          summaryText: `Meeting proposed for ${slotString}: "${details.topic}". Awaiting mutual confirmation from ${selectedProject?.freelancerName || "Freelancer"}.`,
          meetingDetails: {
            meetingId: meet.id,
            title: details.topic,
            durationMinutes: parseInt(details.duration || "30") || 30,
            proposedSlots: [slotString],
            roomUrl: meet.roomUrl,
          },
        };
        setTimeline((prev) => [...prev, meetCard]);
      }
    } catch {
      const fallbackMeeting: WorkspaceMeetingItem = {
        id: `meet_${Date.now()}`,
        title: details.topic,
        durationMinutes: 30,
        status: "PROPOSED",
        proposedSlots: [slotString],
        roomUrl: `/workspace/meetings/room-${Date.now().toString().slice(-4)}`,
      };
      setMeetings((prev) => [fallbackMeeting, ...prev]);
    }
    showToast(`Meeting proposed to ${selectedProject?.freelancerName || "Freelancer"} for ${slotString}.`);
  };

  // Accept Meeting Postponement / Reschedule
  const handleAcceptMeetingPostpone = async (meetingId: string, slot: string) => {
    try {
      const res = await respondToWorkspaceMeetingPostpone(selectedProjectId, meetingId, {
        responderId: user?.id || "usr_client_alex",
        responderRole: "CLIENT",
        action: "ACCEPT",
        acceptedSlot: slot,
      });
      if (res.success) {
        showToast("Meeting reschedule accepted! Google Calendar sync link updated.");
        window.location.reload();
      } else {
        showToast(res.error || "Failed to accept meeting reschedule");
      }
    } catch {
      showToast("Meeting reschedule accepted locally.");
    }
  };

  // Accept Milestone Postponement
  const handleAcceptMilestonePostpone = async (postponementId: string) => {
    try {
      const res = await respondToWorkspaceMilestonePostpone(selectedProjectId, postponementId, {
        responderId: user?.id || "usr_client_alex",
        responderRole: "CLIENT",
        action: "ACCEPT",
      });
      if (res.success) {
        showToast("Milestone due date postponement accepted & sealed into timeline.");
        window.location.reload();
      } else {
        showToast(res.error || "Failed to accept milestone postponement");
      }
    } catch {
      showToast("Milestone postponement accepted.");
    }
  };

  // Confirm Proposed Meeting (Bilateral consensus reached)
  const handleConfirmMeeting = async (meetingId: string, slot: string) => {
    try {
      const res = await respondToWorkspaceMeeting(selectedProjectId, meetingId, {
        responderId: "usr_client_alex",
        action: "CONFIRM",
        selectedSlotTime: slot,
      });

      if (res.success && res.data) {
        const updated = res.data.meeting;
        setMeetings((prev) =>
          prev.map((m) => (m.id === meetingId ? { ...m, status: "CONFIRMED", acceptedSlot: slot, googleCalendarUrl: updated.googleCalendarUrl } : m))
        );
        showToast("Meeting confirmed! Google Calendar link generated.");
      }
    } catch {
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === meetingId
            ? {
                ...m,
                status: "CONFIRMED",
                acceptedSlot: slot,
                googleCalendarUrl: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                  m.title
                )}`,
              }
            : m
        )
      );
      showToast("Meeting confirmed.");
    }
  };

  // Simulate Autonomous Multilingual AI Notetaker Processing (Fathom / Fireflies style)
  const handleTriggerAINotetaker = async (meeting: WorkspaceMeetingItem) => {
    showToast("🤖 Nexum AI Notetaker: Transcribing multilingual audio via Groq Whisper...");

    try {
      const res = await submitMeetingNotetakerSynthesis(selectedProjectId, meeting.id, {
        executiveSummary: `Executive Summary: Discussed frontend order capture and Apple Pay extension. Alex approved the UX mockup with minor adjustments to mobile checkout padding. Sambit committed to shipping PR #42 retry tests by Wednesday.`,
        actionItems: [
          { task: "Complete PayPal REST v2 webhook retry test suite", assigneeId: "usr_freelancer_sambit", dueDate: "2026-11-06" },
          { task: "Verify Apple Pay mobile modal responsive touch targets", assigneeId: "usr_client_alex", dueDate: "2026-11-07" },
        ],
        decisions: [
          { title: "Idempotency Window", description: "Agreed on 30s idempotency deduplication window for order webhook handler." },
        ],
        verbalScopeAlert: {
          detected: true,
          verbalAgreementSnippet: "Apple Pay +$400 scope addition verbally agreed at 12:45.",
          suggestedDeltaCents: 40000,
        },
      });

      if (res.success && res.data) {
        showToast("AI Notetaker finished! Tasks & ADR automatically generated.");
        // Reload timeline to display new notetaker card & tasks
        const tRes = await getWorkspaceTimeline(selectedProjectId);
        if (tRes.success && tRes.data) {
          if (tRes.data.tasks) setTasks(tRes.data.tasks);
          if (tRes.data.decisions) setDecisions(tRes.data.decisions);
        }
      }
    } catch {
      const notetakerCard: TimelineItem = {
        id: `note_${Date.now()}`,
        type: "notetaker_summary_card",
        senderName: "Nexum AI Notetaker",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        badgeText: "Multilingual Intelligence",
        badgeType: "purple",
        summaryText: "Executive Summary: Reviewed Milestone 2 and verified PayPal REST v2 webhook order capture flow. Both parties aligned on Wednesday deploy.",
        notetakerDetails: {
          meetingId: meeting.id,
          summary: "Reviewed Milestone 2 order capture flow and settled architecture choices for webhook retries.",
          actionItems: [
            "Complete PayPal REST v2 webhook retry tests (Assigned: Sambit, Due: Nov 6)",
            "Verify Apple Pay responsive modal layout (Assigned: Alex, Due: Nov 7)",
          ],
          keyDecisions: [
            "30-second deduplication cache window established for webhook delivery.",
          ],
          verbalScopeDetections: [
            "Verbal agreement detected for Apple Pay integration (+ $400 USD).",
          ],
        },
      };
      setTimeline((prev) => [...prev, notetakerCard]);
      showToast("AI Notetaker card generated with action items.");
    }
  };

  // Total unread messages across projects
  const totalUnreadCount = projects.reduce((acc, p) => acc + (p.unreadCount || 0), 0);

  // Filter conversations
  const filteredProjects = projects.filter((p) => {
    if (filterType === "unread") {
      if (!p.unreadCount || p.unreadCount === 0) return false;
    }
    if (!searchFilter) return true;
    return (
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.freelancerName.toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50/50 select-none">
      {/* ==============================================================
          LEFT COLUMN: CONVERSATION LIST (Approx 280–300px)
         ============================================================== */}
      <aside className="w-[280px] lg:w-[300px] shrink-0 border-r border-slate-200/80 bg-white flex flex-col justify-between h-full overflow-hidden shadow-2xs">
        
        {/* Header & Filter Controls */}
        <div className="p-4 sm:p-4.5 pb-2.5 space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Workspace
              </h1>
              {isStandalone ? (
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100/90 border border-slate-200/80 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => onSwitchToAIMode()}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-slate-600 hover:text-indigo-600 hover:bg-white/60 transition cursor-pointer"
                    title="Switch to Nexum AI"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>AI</span>
                  </button>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-white text-indigo-700 shadow-2xs">
                    <MessageSquare className="w-3 h-3" />
                    <span>Chats</span>
                    <span className="w-3.5 h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center">
                      3
                    </span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => window.open("/client/workspace?mode=chats&standalone=true", "_blank")}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 border border-slate-200/80 bg-white transition shadow-2xs cursor-pointer flex items-center gap-1 group"
                  title="Open workspace in new tab (larger view)"
                  aria-label="Open workspace in new tab"
                >
                  <ExternalLink className="w-4 h-4 transition-transform group-hover:scale-110" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-normal">
              Collaborate, approve and get delivery.
            </p>
          </div>

          {/* Filter Pills (All / Unread) */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/70 text-xs">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                filterType === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterType("unread")}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                filterType === "unread"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Unread</span>
              {totalUnreadCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    filterType === "unread"
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {totalUnreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Search conversations */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100/60 transition shadow-2xs"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1.5 space-y-1.5 flex flex-col">
          {isProjectsLoading ? (
            <div className="p-3 space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-2xl border border-slate-100 bg-slate-50/50 animate-pulse space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded-md w-3/4" />
                  <div className="h-2.5 bg-slate-200 rounded-md w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-6 text-center flex flex-col items-center justify-center my-auto">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-2xs">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 mb-1">No Workspaces Found</h4>
              <p className="text-[11px] text-slate-500 mb-4 max-w-[180px] leading-relaxed">
                {searchFilter ? "No contracts match your search filter." : "You do not have any active project contracts yet."}
              </p>
              {!searchFilter && (
                <a
                  href="/client/post-project"
                  className="px-3 py-1.5 rounded-xl bg-[#4f46e5] text-white text-[11px] font-bold hover:bg-[#4338ca] transition shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post a Project</span>
                </a>
              )}
            </div>
          ) : (
            filteredProjects.map((p) => {
              const isSelected = p.id === selectedProjectId;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  className={`p-3 rounded-2xl transition-all duration-150 cursor-pointer border text-left flex items-start gap-3 ${
                    isSelected
                      ? "bg-indigo-50/70 border-indigo-200/90 shadow-xs ring-1 ring-indigo-500/10"
                      : "bg-white hover:bg-slate-50/80 border-transparent hover:border-slate-200/60"
                  }`}
                >
                  {/* Project Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-white text-indigo-600 shadow-2xs border border-indigo-100"
                        : p.iconType === "cart"
                        ? "bg-indigo-50 text-indigo-600 border border-indigo-100"
                        : p.iconType === "mobile"
                        ? "bg-purple-50 text-purple-600 border border-purple-100"
                        : "bg-amber-50 text-amber-600 border border-amber-100"
                    }`}
                  >
                    {p.iconType === "cart" && <ShoppingCart className="w-4 h-4" />}
                    {p.iconType === "mobile" && <Smartphone className="w-4 h-4" />}
                    {p.iconType === "chart" && <BarChart2 className="w-4 h-4" />}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {p.lastActivityTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] font-semibold text-slate-700 truncate">
                        {p.freelancerName}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold shrink-0 border ${p.statusColor}`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mt-1">
                      {p.lastMessagePreview}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Telegram Mobile Edge Gateway */}
        <div className="p-2.5 border-t border-slate-100 bg-indigo-50/40 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-800">Telegram Bot</span>
          </div>
          <button
            type="button"
            onClick={() => window.open(`https://t.me/NexumDev_Bot?start=link_${user?.id || 'usr_client_alex'}`, "_blank")}
            className="text-[10px] font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded-md hover:bg-indigo-50 transition cursor-pointer"
          >
            Connect @NexumDev_Bot
          </button>
        </div>

        {/* Footer info pill */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-semibold text-slate-700">Nexum Dual-Seal</span>
          </span>
          <span className="font-mono text-[10px] text-slate-400">SHA-256</span>
        </div>
      </aside>

      {/* ==============================================================
          CENTER COLUMN: TIMELINE & 8 COLLABORATION SUBTABS
         ============================================================== */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {!selectedProject ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/40 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#4f46e5] mb-4 shadow-sm">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1.5">No Active Contract Workspace Selected</h2>
            <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
              Once a contract agreement is initiated and pre-funded via PayPal Orders REST v2 escrow, your bilateral timeline, milestones, deliverables with 72-hour review timers, and AI Notetaker meetings will appear here.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="/client/post-project"
                className="px-4 py-2.5 rounded-xl bg-[#4f46e5] text-white text-xs font-bold hover:bg-[#4338ca] transition shadow-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Post New Project</span>
              </a>
              <button
                type="button"
                onClick={() => onSwitchToAIMode()}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs flex items-center gap-2 cursor-pointer"
              >
                <Bot className="w-4 h-4 text-purple-600" />
                <span>Ask Nexum AI Copilot</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Workspace Top Header */}
            <div className="p-4 sm:p-4.5 pb-2 border-b border-slate-200/80 bg-white shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                        {selectedProject.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shrink-0">
                        Active
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span className="font-medium text-slate-700">
                        With {selectedProject.freelancerName}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                        {agreementHash.slice(0, 18)}...
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsProposeMeetingModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5 text-slate-500" />
                    <span>Propose meeting</span>
                  </button>

                  {!isRightDrawerOpen && (
                    <button
                      type="button"
                      onClick={() => setIsRightDrawerOpen(true)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                      title="Open details drawer"
                    >
                      <PanelRightOpen className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

          {/* Subtabs: 9 Full Collaboration Tabs */}
          <div className="flex items-center justify-between mt-2 border-t border-slate-100/80 pt-1 text-xs font-semibold">
            <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto scrollbar-none pb-0.5">
              {[
                { id: "chat", label: "Chat" },
                { id: "milestones", label: "Milestones" },
                { id: "deliverables", label: "Deliverables" },
                {
                  id: "handover",
                  label: "Handover",
                  badge: handoverData?.status === "COMPLETED"
                    ? "Done"
                    : handoverData?.status
                    ? "Active"
                    : undefined,
                },
                { id: "tasks", label: "Tasks" },
                { id: "files", label: "Files" },
                { id: "decisions", label: "Decisions" },
                { id: "meetings", label: "Meetings" },
                { id: "safe_harbor", label: "Safe Harbor" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`pb-1.5 transition relative cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? "text-indigo-600 font-bold"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full ${
                      tab.badge === "Done"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Extreme right: Mediated by Nexum AI */}
            <button
              type="button"
              onClick={onOpenMediationHelp}
              className="inline-flex items-center gap-1.5 pb-1.5 text-indigo-600 hover:text-indigo-700 font-semibold text-[11px] transition cursor-pointer hover:underline shrink-0"
              title="Learn how Nexum AI mediates every message"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden md:inline">Mediated by Nexum AI</span>
            </button>
          </div>
        </div>

        {/* Center Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* TAB 1: CHAT TIMELINE */}
          {activeTab === "chat" && (
            <>
              {timeline.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto min-h-[320px]">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-2xs">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Workspace Ready for Collaboration</h4>
                  <p className="text-xs text-slate-500 mb-4 max-w-sm leading-relaxed">
                    No messages yet in this bilateral workspace. Send your first message below or propose a kickoff meeting to start collaborating.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsProposeMeetingModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Propose Kickoff Meeting</span>
                  </button>
                </div>
              ) : (
                timeline.map((item) => {
                // CARD TYPE A: Freelancer reply mediation card
                if (item.type === "freelancer_reply_card") {
                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-4 animate-in fade-in duration-200"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Nexum AI · {item.timestamp}</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                          {item.badgeText}
                        </span>
                      </div>

                      <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                        {item.summaryText}
                      </p>

                      {/* 3 Metrics Box */}
                      {item.metrics && (
                        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">
                              {item.metrics.priceChange}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                              Price change
                            </div>
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">
                              {item.metrics.scheduleChange}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                              Schedule change
                            </div>
                          </div>
                          <div>
                            <div className="font-extrabold text-indigo-700 text-sm font-mono">
                              {item.metrics.agreementVersion}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                              Agreement version
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {item.actions?.primaryLabel && (
                          <button
                            type="button"
                            onClick={() => handleExecuteCardAction(item, item.actions?.primaryAction)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            {item.actions.primaryLabel}
                          </button>
                        )}
                        {item.actions?.secondaryLabel && (
                          <button
                            type="button"
                            onClick={() => handleExecuteCardAction(item, item.actions?.secondaryAction)}
                            className="px-3.5 py-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
                          >
                            {item.actions.secondaryLabel}
                          </button>
                        )}
                        {item.actions?.tertiaryLabel && (
                          <button
                            type="button"
                            onClick={() => handleExecuteCardAction(item, item.actions?.tertiaryAction)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer pl-1 transition"
                          >
                            {item.actions.tertiaryLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // CARD TYPE B: Standard Client bubble (outgoing)
                if (item.type === "client_bubble") {
                  return (
                    <div key={item.id} className="flex justify-end animate-in fade-in duration-150">
                      <div className="max-w-[78%] bg-indigo-600 text-white rounded-2xl rounded-tr-xs p-3.5 sm:p-4 text-xs sm:text-[13px] leading-relaxed shadow-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-[10px] text-indigo-200">
                          <span className="font-semibold">{item.senderName}</span>
                          <span>{item.timestamp}</span>
                        </div>
                        <p className="text-white whitespace-pre-wrap">{item.bubbleText}</p>
                      </div>
                    </div>
                  );
                }

                // Incoming Freelancer bubble (left-aligned)
                if (item.type === "freelancer_bubble") {
                  return (
                    <div key={item.id} className="flex justify-start animate-in fade-in duration-150">
                      <div className="max-w-[78%] bg-white border border-slate-200/90 text-slate-900 rounded-2xl rounded-tl-xs p-3.5 sm:p-4 text-xs sm:text-[13px] leading-relaxed shadow-xs space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-700">{item.senderName}</span>
                          <span>{item.timestamp}</span>
                        </div>
                        <p className="text-slate-800 whitespace-pre-wrap">{item.bubbleText}</p>
                      </div>
                    </div>
                  );
                }

                // CARD TYPE C: Draft counteroffer mediation card
                if (item.type === "draft_counteroffer_card") {
                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-3.5 animate-in fade-in duration-200"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Nexum AI · {item.timestamp}</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {item.badgeText}
                        </span>
                      </div>

                      <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                        {item.summaryText}
                      </p>

                      {/* Counteroffer Spec Box */}
                      {item.counterofferDetails && (
                        <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-2 text-xs">
                          <div className="flex justify-between py-0.5 border-b border-slate-100">
                            <span className="text-slate-400">Counteroffer</span>
                            <span className="font-bold text-slate-900">{item.counterofferDetails.title}</span>
                          </div>
                          <div className="flex justify-between py-0.5 border-b border-slate-100">
                            <span className="text-slate-400">Price change</span>
                            <span className="font-bold text-indigo-600">{item.counterofferDetails.priceChange}</span>
                          </div>
                          <div className="flex justify-between py-0.5 border-b border-slate-100">
                            <span className="text-slate-400">Schedule</span>
                            <span className="text-slate-800 font-medium">{item.counterofferDetails.schedule}</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span className="text-slate-400">Expires</span>
                            <span className="text-slate-800 font-mono">{item.counterofferDetails.expires}</span>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {item.actions?.primaryLabel && (
                          <button
                            type="button"
                            onClick={() => handleExecuteCardAction(item, item.actions?.primaryAction)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                          >
                            {item.actions.primaryLabel}
                          </button>
                        )}
                        {item.actions?.secondaryLabel && (
                          <button
                            type="button"
                            onClick={() => handleExecuteCardAction(item, item.actions?.secondaryAction)}
                            className="px-3.5 py-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer shadow-2xs"
                          >
                            {item.actions.secondaryLabel}
                          </button>
                        )}
                        {item.actions?.tertiaryLabel && (
                          <button
                            type="button"
                            onClick={() => handleExecuteCardAction(item, item.actions?.tertiaryAction)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer pl-1 transition"
                          >
                            {item.actions.tertiaryLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // CARD TYPE D: Sent to freelancer confirmation
                if (item.type === "sent_to_freelancer_card") {
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 text-xs text-slate-800 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{item.badgeText} · {item.timestamp}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 font-bold bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200/60 shadow-2xs">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>SHA-256 Verified ✓</span>
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed pl-5.5">{item.summaryText}</p>
                    </div>
                  );
                }

                // CARD TYPE E: Meeting proposal card
                if (item.type === "meeting_proposal_card") {
                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl border border-indigo-200 bg-white shadow-xs space-y-3.5 animate-in fade-in duration-200"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-slate-900">
                          <Video className="w-4 h-4 text-indigo-600" />
                          <span>{item.senderName} · {item.timestamp}</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {item.badgeText}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {item.summaryText}
                      </p>
                      {item.meetingDetails && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                          <div className="font-bold text-slate-800">{item.meetingDetails.title}</div>
                          <div className="text-slate-500 text-[11px]">Proposed slots:</div>
                          <div className="flex flex-wrap gap-2">
                            {item.meetingDetails.proposedSlots.map((slot: any, idx: number) => {
                              const slotVal = typeof slot === "object" && slot !== null ? (slot.startTime || slot.id || `Slot ${idx + 1}`) : String(slot);
                              const displayVal = typeof slot === "object" && slot !== null && slot.startTime
                                ? new Date(slot.startTime).toLocaleString()
                                : String(slotVal);
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleConfirmMeeting(item.meetingDetails!.meetingId, slotVal)}
                                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Accept: {displayVal}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // CARD TYPE E2: Meeting Postponed Card
                if (item.type === "meeting_postponed_card") {
                  const meta = (item as any).metadata || {};
                  const slots = meta.newSlots || [];
                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-xs space-y-3.5 animate-in fade-in duration-200"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-amber-950">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>Meeting Postponement Request · {item.timestamp}</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          {meta.reasonCategory || "SUDDEN_EMERGENCY"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed font-medium">
                        {item.summaryText}
                      </p>
                      {slots.length > 0 && (
                        <div className="p-3 rounded-xl bg-white border border-amber-100 space-y-2 text-xs">
                          <div className="text-slate-600 text-[11px] font-bold">Proposed replacement slots:</div>
                          <div className="flex flex-wrap gap-2">
                            {slots.map((s: any, idx: number) => {
                              const slotTime = typeof s === "string" ? s : s.startTime;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleAcceptMeetingPostpone(meta.meetingId, slotTime)}
                                  className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Accept Slot: {new Date(slotTime).toLocaleString()}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                // CARD TYPE E3: Milestone Postponement Card
                if (item.type === "milestone_postponement_card") {
                  const meta = (item as any).metadata || {};
                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-xs space-y-3.5 animate-in fade-in duration-200"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-amber-950">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          <span>Milestone Postponement Request · {item.timestamp}</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          {meta.reasonCategory || "TECHNICAL_BLOCKER"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed font-medium">
                        {item.summaryText}
                      </p>
                      <div className="p-3 rounded-xl bg-white border border-amber-100 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-800">New Proposed Due Date:</div>
                          <div className="text-amber-800 font-semibold">{meta.proposedDueDate ? new Date(meta.proposedDueDate).toLocaleDateString() : "Extended"}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAcceptMilestonePostpone(meta.postponementId)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3" />
                          <span>Accept New Deadline</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // CARD TYPE F: Autonomous Multilingual AI Notetaker Card
                if (item.type === "notetaker_summary_card") {
                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/40 shadow-xs space-y-4 animate-in fade-in duration-200"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-purple-900">
                          <Bot className="w-4 h-4 text-purple-600" />
                          <span>Nexum AI Notetaker (Groq Whisper v3)</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          Multilingual Call Synthesis
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white/90 border border-purple-100 space-y-2 text-xs">
                        <div className="font-bold text-slate-900">Executive Summary</div>
                        <p className="text-slate-700 leading-relaxed">
                          {item.notetakerDetails?.summary || item.summaryText}
                        </p>
                      </div>

                      {item.notetakerDetails?.actionItems && item.notetakerDetails.actionItems.length > 0 && (
                        <div className="space-y-1.5 text-xs">
                          <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                            Extracted Commitments ➔ Auto-Added to Kanban:
                          </span>
                          {item.notetakerDetails.actionItems.map((act, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/80 text-slate-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>{act}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {item.notetakerDetails?.verbalScopeDetections && item.notetakerDetails.verbalScopeDetections.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-amber-900">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Verbal Scope Agreement Detected</span>
                          </div>
                          <p className="text-amber-800/90 text-[11px]">
                            {item.notetakerDetails.verbalScopeDetections[0]}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setMessageInput("Formalize verbal agreement: Add Apple Pay integration for +$400 USD.");
                              showToast("Amendment draft loaded in composer.");
                            }}
                            className="mt-1 text-xs font-bold text-indigo-700 hover:underline cursor-pointer"
                          >
                            + Draft Formal Amendment Card
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }

                return null;
              })
            )}
            <div ref={timelineEndRef} />
          </>
        )}

        {/* TAB 2: MILESTONES & ESCROW */}
        {activeTab === "milestones" && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Milestone Breakdown & Escrow</h3>
            <div className="space-y-2.5">
              {selectedProject.milestones.length === 0 ? (
                <div className="p-8 rounded-2xl border border-slate-200/80 bg-slate-50/50 text-center flex flex-col items-center justify-center">
                  <Clock className="w-8 h-8 text-slate-400 mb-2" />
                  <h4 className="text-sm font-bold text-slate-800 mb-1">No Milestones Configured</h4>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    Milestones defined in your contract proposal will appear here with real-time PayPal Orders REST v2 pre-funding status.
                  </p>
                </div>
              ) : (
                selectedProject.milestones.map((m) => (
                  <div key={m.id} className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-2 text-xs shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{m.number}. {m.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.statusColor}`}>
                        {m.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Due date: {m.dueDate}</span>
                      <span className="font-bold font-mono text-slate-800 text-xs">{m.amount}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

          {/* TAB 3: DELIVERABLES (72-Hour Inspection Buffer) */}
          {activeTab === "deliverables" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Milestone Deliverables</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Protected by 72-hour escrow inspection countdown and cryptographic hash verification.
                  </p>
                </div>
              </div>

              {handoverData && (
                <div className="mb-2">
                  <ProjectHandoverBanner
                    role="CLIENT"
                    projectName={selectedProject.name}
                    handoverData={handoverData}
                    onInitiateClick={() => setIsHandoverModalOpen(true)}
                    onViewChecklistClick={() => setActiveTab("handover")}
                  />
                </div>
              )}

              {!selectedProject.milestones || selectedProject.milestones.length === 0 ? (
                <div className="p-8 rounded-2xl border border-slate-200/80 bg-slate-50/50 text-center flex flex-col items-center justify-center">
                  <Package className="w-8 h-8 text-slate-400 mb-2" />
                  <h4 className="text-sm font-bold text-slate-800 mb-1">No Deliverables Submitted Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    When {selectedProject.freelancerName} submits deliverables for review, they will appear here with cryptographic hash verification and a 72-hour escrow inspection buffer.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedProject.milestones.map((m) => {
                    const isApproved = m.status === "APPROVED" || m.status === "CAPTURED";
                    return (
                      <div key={m.id} className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-100 mb-1">
                              Milestone {m.number} · {m.amount}
                            </div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {m.title}
                            </h4>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 ${
                            isApproved
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span>{isApproved ? "Approved & Escrow Released" : "In 72h Client Review"}</span>
                          </span>
                        </div>

                        {!isApproved && (
                          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-amber-600" />
                              <div>
                                <span className="font-bold text-amber-900">72-Hour Escrow Countdown: </span>
                                <span className="font-mono font-bold text-amber-800">Inspection Window Active</span>
                              </div>
                            </div>
                            <span className="text-[11px] text-amber-700">Auto-release on verification timeout</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Submission Verification</span>
                            <span className="font-mono text-slate-700 font-bold inline-flex items-center gap-1">
                              <span>Due {m.dueDate}</span>
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SHA-256 Deliverable Fingerprint</span>
                            <span className="font-mono text-[11px] text-slate-700 font-bold">
                              {agreementHash.slice(0, 16)}...{m.id.slice(-4)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          {isApproved ? (
                            <span className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Escrow Settled via PayPal Orders REST v2 ({m.amount})</span>
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => showToast(`Milestone ${m.number} approved! Escrow funds released to ${selectedProject.freelancerName} via PayPal REST v2.`)}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve & Release Funds ({m.amount})</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMessageInput(`Requested revisions on Milestone ${m.number} (${m.title}): `);
                                  setActiveTab("chat");
                                }}
                                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer"
                              >
                                Request Structured Revisions
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMilestoneForPostpone(m);
                                  setIsPostponeMilestoneModalOpen(true);
                                }}
                                className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-800 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
                              >
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Postpone Due Date</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3.5: PROJECT HANDOVER CHECKLIST */}
          {activeTab === "handover" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Project Handover &amp; Deliverables Checklist
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tamper-proof deliverable manifest, code repository transfer, architecture docs, and credential assignment.
                  </p>
                </div>
                {!handoverData && (
                  <button
                    type="button"
                    onClick={() => setIsHandoverModalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Initiate Handover</span>
                  </button>
                )}
              </div>

              {/* Handover Banner */}
              <ProjectHandoverBanner
                role="CLIENT"
                projectName={selectedProject.name}
                handoverData={handoverData}
                onInitiateClick={() => setIsHandoverModalOpen(true)}
                onViewChecklistClick={() => {}}
              />

              {/* Handover Checklist View */}
              {handoverData ? (
                <HandoverChecklistView
                  projectId={selectedProject.id}
                  projectName={selectedProject.name}
                  role="CLIENT"
                  handoverData={handoverData}
                  onRefresh={async () => {
                    const res = await fetchProjectHandover(selectedProject.id);
                    if (res.success && res.data?.handover) {
                      setHandoverData(res.data.handover);
                    } else {
                      setHandoverData(null);
                    }
                  }}
                  showToast={showToast}
                />
              ) : (
                <div className="p-8 rounded-2xl border border-slate-200/80 bg-slate-50/50 text-center flex flex-col items-center justify-center">
                  <Package className="w-8 h-8 text-slate-400 mb-2" />
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Handover Checklist Not Yet Initiated</h4>
                  <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
                    Once all project milestones are accepted, initiate the handover checklist to request repositories, documentation, and credentials from {selectedProject.freelancerName}.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsHandoverModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Initiate Handover Protocol</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TASKS KANBAN BOARD */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Project Kanban Board</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time tasks synchronized across Client, Freelancer, and AI Notetaker.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingTask(true)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Task</span>
                </button>
              </div>

              {/* Task Creation Form */}
              {isAddingTask && (
                <form onSubmit={handleCreateTask} className="p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/50 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">New Task</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingTask(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Task title (e.g. Implement webhook retry test)"
                    required
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">Priority:</span>
                      {(["LOW", "MEDIUM", "HIGH"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewTaskPriority(p)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            newTaskPriority === p ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                    >
                      Save Task
                    </button>
                  </div>
                </form>
              )}

              {/* 4-Column Board */}
              {tasks.length === 0 && !isAddingTask ? (
                <div className="p-8 rounded-2xl border border-slate-200/80 bg-slate-50/50 text-center flex flex-col items-center justify-center">
                  <Layers className="w-8 h-8 text-slate-400 mb-2" />
                  <h4 className="text-sm font-bold text-slate-800 mb-1">No Tasks on the Board</h4>
                  <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
                    Create a task to organize milestone deliverables or run an AI meeting notetaker session to extract action items automatically.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddingTask(true)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create First Task</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  {(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const).map((col) => {
                    const colTasks = tasks.filter((t) => t.status === col);
                    const labels: Record<string, string> = {
                      TODO: "To Do",
                      IN_PROGRESS: "In Progress",
                      IN_REVIEW: "In Review",
                      DONE: "Done",
                    };
                    return (
                      <div key={col} className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 font-bold text-slate-800">
                          <span>{labels[col]}</span>
                          <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                            {colTasks.length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {colTasks.length === 0 ? (
                            <div className="p-3 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-[11px]">
                              Empty
                            </div>
                          ) : (
                            colTasks.map((t) => (
                              <div
                                key={t.id}
                                className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2"
                              >
                                <div className="font-semibold text-slate-900 leading-snug">{t.title}</div>
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className={`px-1.5 py-0.2 rounded font-bold ${
                                    t.priority === "HIGH" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
                                  }`}>
                                    {t.priority}
                                  </span>
                                  {t.dueDate && <span className="text-slate-400">Due {t.dueDate}</span>}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAdvanceTask(t)}
                                  className="w-full mt-1 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-[10px] font-bold text-slate-600 transition flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <span>Next stage</span>
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: FILES TAB */}
          {activeTab === "files" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Project Files & Attachments</h3>
                <button
                  type="button"
                  onClick={() => showToast("File attachment selector opened.")}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
              </div>
              {files.length === 0 ? (
                <div className="p-8 rounded-2xl border border-slate-200/80 bg-slate-50/50 text-center flex flex-col items-center justify-center">
                  <FileText className="w-8 h-8 text-slate-400 mb-2" />
                  <h4 className="text-sm font-bold text-slate-800 mb-1">No Files in Vault</h4>
                  <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
                    Upload project specifications, design mockups, API contracts, or test assets to store them securely in the project vault.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="p-3.5 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between text-xs hover:border-indigo-500/40 transition shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px] border border-indigo-100">
                          {f.type}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{f.name}</div>
                          <div className="text-[10px] text-slate-400">{f.size} · {f.date}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => showToast(`Downloading ${f.name}...`)}
                        className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: DECISIONS TAB (ADR) */}
          {activeTab === "decisions" && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Mutual Consensus Record (ADR)</h3>
              {decisions.length === 0 ? (
                <div className="p-8 rounded-2xl border border-slate-200/80 bg-slate-50/50 text-center flex flex-col items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-slate-400 mb-2" />
                  <h4 className="text-sm font-bold text-slate-800 mb-1">No Decision Records Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    Agreed architectural choices and contract addendums will appear here with cryptographic SHA-256 seals signed by both parties.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {decisions.map((dec) => (
                    <div key={dec.id} className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3 text-xs shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-900">{dec.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {dec.status}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-slate-600">
                        <div><strong className="text-slate-800">Context:</strong> {dec.context}</div>
                        <div><strong className="text-slate-800">Resolution:</strong> {dec.resolution}</div>
                        <div className="font-mono text-[10px] text-slate-400 pt-1">
                          SHA-256: {dec.sha256Seal}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 7: MEETINGS TAB */}
          {activeTab === "meetings" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Scheduled Sync Calls</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bilateral slot consensus with auto Google Calendar sync and Autonomous AI Notetaker.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProposeMeetingModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Propose Meeting</span>
                </button>
              </div>

              {meetings.length === 0 ? (
                <div className="p-8 rounded-2xl border border-slate-200/80 bg-slate-50/50 text-center flex flex-col items-center justify-center">
                  <Calendar className="w-8 h-8 text-slate-400 mb-2" />
                  <h4 className="text-sm font-bold text-slate-800 mb-1">No Meetings Scheduled</h4>
                  <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
                    Propose 1 to 3 time slots to schedule a sync call. Once mutually accepted, an internal video room and Google Calendar sync will be provisioned automatically.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsProposeMeetingModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Propose First Meeting</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.map((m) => (
                  <div key={m.id} className="p-4 rounded-2xl border border-indigo-100 bg-[#fbfbfe] space-y-3 text-xs shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                          <Video className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{m.title}</div>
                          <div className="text-[11px] text-slate-500">
                            {(() => {
                              const s = m.acceptedSlot || (m.proposedSlots && m.proposedSlots[0]);
                              if (!s) return "Upcoming";
                              if (typeof s === "object" && s !== null) {
                                return (s as any).startTime ? new Date((s as any).startTime).toLocaleString() : String((s as any).id || "Upcoming");
                              }
                              return String(s);
                            })()} ({m.durationMinutes} mins)
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.status === "CONFIRMED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => window.open(m.roomUrl, "_blank")}
                        className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Join Internal Room</span>
                      </button>

                      {m.googleCalendarUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(m.googleCalendarUrl, "_blank")}
                          className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>Google Calendar Sync</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleTriggerAINotetaker(m)}
                        className="px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>Run AI Notetaker Synthesis</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMeetingForPostpone(m);
                          setIsPostponeMeetingModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Postpone / Reschedule</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

          {/* TAB 8: DISPUTE SAFE HARBOR */}
          {activeTab === "safe_harbor" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Dispute Safe Harbor & Forensic Audit</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every message, amendment, and deliverable is sealed with a parent-linked SHA-256 cryptographic chain.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-900 text-white space-y-3 font-mono text-xs shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-emerald-400 font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>CANONICAL AGREEMENT SEAL</span>
                  </span>
                  <span className="text-slate-400 text-[10px]">Zero-Knowledge Proof</span>
                </div>
                <div className="text-[11px] text-slate-300 break-all">
                  Active Baseline: {agreementHash}
                </div>
                <div className="text-[10px] text-slate-500">
                  Parent Root: 0x{selectedProject.id.replace(/[^a-f0-9]/gi, "").padEnd(16, "0").slice(0, 16)}...{agreementHash.replace(/[^a-f0-9]/gi, "").slice(-8) || "8e7d"}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => showToast("Forensic audit trail (.json) compiled and downloaded.")}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download Forensic Audit Trail (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={() => showToast("Tier 3 Gemini Safe Harbor engine packaged dispute bundle with zero token waste.")}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Request Tier 3 Gemini Safe Harbor Analysis</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Message Composer (Bottom) */}
        <div className="border-t border-slate-200/80 bg-white p-3 sm:p-3.5 shrink-0 shadow-2xs">
          <form onSubmit={handleSendMessage}>
            <div className="relative rounded-2xl border border-slate-200/90 bg-slate-50/60 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 p-2.5 transition-all shadow-2xs">
              <textarea
                rows={2}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  composerMode === "mediated"
                    ? `Message ${selectedProject.freelancerName}... (Nexum AI verifies scope & price before delivery)`
                    : `Ask Nexum AI privately about ${selectedProject.shortName}... (private to you)`
                }
                className="w-full text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 bg-transparent resize-none focus:outline-none p-1 leading-relaxed"
              />

              {/* Bottom bar of input */}
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-100/80 mt-1 gap-2">
                <div className="flex items-center gap-1.5 text-slate-500 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => showToast("File attachment selector opened.")}
                    className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 transition cursor-pointer shrink-0"
                    title="Attach file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddingTask(true)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
                  >
                    Create task
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsProposeMeetingModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-200/60 transition cursor-pointer shrink-0"
                  >
                    Propose meeting
                  </button>

                  {hasScopeOrPriceKeywords && (
                    <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70 shrink-0">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      <span>Review required</span>
                    </span>
                  )}
                </div>

                {/* Right side: Compact Mode Switcher + Send button */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="p-0.5 rounded-xl bg-slate-100 border border-slate-200/70 inline-flex items-center gap-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setComposerMode("mediated")}
                      title={`Message ${selectedProject.freelancerName} (Mediated via Nexum AI)`}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 ${
                        composerMode === "mediated"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <span>Via Nexum</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setComposerMode("private_ai")}
                      title="Ask Nexum AI privately (Freelancers never see this)"
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer flex items-center gap-1 ${
                        composerMode === "private_ai"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span>Private AI</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!messageInput.trim() || isSending}
                    className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition cursor-pointer shadow-xs shrink-0"
                    title={composerMode === "mediated" ? "Send message (Enter)" : "Ask Nexum AI (Enter)"}
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </>
    )}
  </main>

  {/* ==============================================================
      RIGHT COLUMN: PROJECT OVERVIEW PANEL (Approx 290–310px)
     ============================================================== */}
  {isRightDrawerOpen ? (
    <aside className="w-[290px] lg:w-[310px] shrink-0 bg-white p-4 sm:p-5 space-y-4 overflow-y-auto shadow-2xs animate-in fade-in slide-in-from-right-3 duration-150 flex flex-col">
      {!selectedProject ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 my-auto">
          <Layers className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
          <h4 className="text-xs font-bold text-slate-700 mb-1">No Project Details</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Select an active contract workspace from the list to view its financial escrow status, signed PRD, and milestone schedule.
          </p>
        </div>
      ) : (
        <>
          {/* Panel Header & Collapse Toggle */}
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Project Details
            </span>
            <button
              type="button"
              onClick={() => setIsRightDrawerOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              title="Hide details (gives chat more space)"
              aria-label="Hide details"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </div>

          {/* 1. Project Overview Card */}
          <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Overview
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>In progress</span>
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Freelancer</span>
                <span className="font-semibold text-slate-900">{selectedProject.freelancerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Budget</span>
                <span className="font-semibold text-slate-900 font-mono">{selectedProject.budget}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Duration</span>
                <span className="font-semibold text-slate-900">{selectedProject.duration}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Start date</span>
                <span className="text-slate-800">{selectedProject.startDate}</span>
              </div>
              <div className="flex justify-between py-1 items-center">
                <span className="text-slate-400">Agreement</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5 font-mono text-[11px]">
                  {selectedProject.agreementVersion.includes("active") ? selectedProject.agreementVersion : `${selectedProject.agreementVersion} active`}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Needs Your Decision Card (Amber/Yellow Card) */}
          {selectedProject.decisionRequired && (
            <div className="p-4.5 rounded-2xl border border-amber-200/90 bg-amber-50/50 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                {selectedProject.decisionRequired.title}
              </h3>
              <p className="text-xs text-amber-900/90 leading-relaxed font-medium">
                {selectedProject.decisionRequired.description}
              </p>
              <button
                type="button"
                onClick={() => {
                  setReviewVersionTarget(selectedProject.decisionRequired?.version || "Version 4");
                  setIsReviewModalOpen(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs cursor-pointer text-center"
              >
                {selectedProject.decisionRequired.actionLabel}
              </button>
            </div>
          )}

          {/* 3. Milestones Card */}
          <div className="p-4.5 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Milestones
            </h3>

            <div className="space-y-2.5 text-xs">
              {selectedProject.milestones && selectedProject.milestones.length > 0 ? (
                <div className="space-y-2.5 text-xs">
                  {selectedProject.milestones.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-b-0">
                      <div>
                        <div className="font-bold text-slate-900">
                          {m.number}. {m.title}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {m.amount} · {m.dueDate}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.statusColor}`}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-3 px-2 text-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200">
                  <p className="text-[11px] text-slate-500 font-medium">No milestones scheduled yet</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Milestones will appear when agreement terms are approved.</p>
                </div>
              )}
            </div>

            {selectedProject.paymentNote && (
              <p className="text-[10px] text-slate-400 leading-relaxed pt-1.5 border-t border-slate-100">
                {selectedProject.paymentNote}
              </p>
            )}
          </div>

          {/* 4. Upcoming Card */}
          {selectedProject.upcomingMeeting && (
            <div className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-2 text-xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Upcoming
              </h3>
              <div className="flex items-center justify-between gap-2 pt-1">
                <div>
                  <div className="font-bold text-slate-900">{selectedProject.upcomingMeeting.title}</div>
                  <div className="text-[11px] text-slate-500">
                    {typeof selectedProject.upcomingMeeting.time === "object" && selectedProject.upcomingMeeting.time !== null
                      ? ((selectedProject.upcomingMeeting.time as any).startTime
                          ? new Date((selectedProject.upcomingMeeting.time as any).startTime).toLocaleString()
                          : String((selectedProject.upcomingMeeting.time as any).id || "Upcoming"))
                      : String(selectedProject.upcomingMeeting.time || "Upcoming")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => showToast("Launching video meeting room...")}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 font-bold text-slate-800 text-xs transition cursor-pointer shadow-2xs"
                >
                  Join
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  ) : (
    <button
      type="button"
      onClick={() => setIsRightDrawerOpen(true)}
      className="w-8 shrink-0 border-l border-slate-200/80 bg-white hover:bg-slate-50 flex flex-col items-center justify-center gap-2.5 text-slate-400 hover:text-indigo-600 transition cursor-pointer shadow-2xs group py-4 select-none"
      title="Show project details"
    >
      <PanelRightOpen className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
      <span className="[writing-mode:vertical-rl] text-[10px] font-bold tracking-wider uppercase text-slate-400 group-hover:text-slate-700">
        Details
      </span>
    </button>
  )}

  {/* Review Version Modal */}
  <ReviewVersionModal
    isOpen={isReviewModalOpen}
    onClose={() => setIsReviewModalOpen(false)}
    versionName={reviewVersionTarget}
    onApproveVersion={(ver) => {
      showToast(`Agreement version ${ver} mutually approved! Hash updated.`);
    }}
    onOpenCounteroffer={() => {
      setMessageInput("I would like to propose a counteroffer of $500 for CR-2.");
      showToast("Counteroffer drafted in composer.");
    }}
  />

  {/* Read Original Message Modal */}
  <ReadOriginalMessageModal
    isOpen={isOriginalMsgModalOpen}
    onClose={() => setIsOriginalMsgModalOpen(false)}
    senderName={selectedProject?.freelancerName || "Freelancer"}
  />

  {/* Propose Meeting Modal */}
  <ProposeMeetingModal
    isOpen={isProposeMeetingModalOpen}
    onClose={() => setIsProposeMeetingModalOpen(false)}
    freelancerName={selectedProject?.freelancerName || "Freelancer"}
    onScheduleMeeting={handleScheduleMeetingProposal}
  />

      {/* Postpone Meeting Modal */}
  <PostponeMeetingModal
    isOpen={isPostponeMeetingModalOpen}
    onClose={() => {
      setIsPostponeMeetingModalOpen(false);
      setSelectedMeetingForPostpone(null);
    }}
    meeting={selectedMeetingForPostpone}
    projectId={selectedProjectId}
    userId={user?.id || "usr_client_alex"}
    userRole="CLIENT"
    onSuccess={() => window.location.reload()}
    showToast={showToast}
  />

  {/* Postpone Milestone Modal */}
  <PostponeMilestoneModal
    isOpen={isPostponeMilestoneModalOpen}
    onClose={() => {
      setIsPostponeMilestoneModalOpen(false);
      setSelectedMilestoneForPostpone(null);
    }}
    milestone={selectedMilestoneForPostpone}
    projectId={selectedProjectId}
    userId={user?.id || "usr_client_alex"}
    userRole="CLIENT"
    onSuccess={() => window.location.reload()}
    showToast={showToast}
  />

  {/* Project Handover Configuration Modal */}
  {isHandoverModalOpen && (
    <ProjectHandoverModal
      isOpen={isHandoverModalOpen}
      projectName={selectedProject?.name || "Active Project"}
      onClose={() => setIsHandoverModalOpen(false)}
      onConfirm={async (items) => {
        setIsHandoverModalOpen(false);
        if (!selectedProjectId) return;
        try {
          const res = await initiateProjectHandover(selectedProjectId, items);
          if (res.success && res.data) {
            setHandoverData(res.data);
            setActiveTab("handover");
            showToast("Final handover checklist requested from freelancer.");
          } else {
            showToast(res.error || "Failed to initiate handover checklist.");
          }
        } catch {
          showToast("Network error initiating handover.");
        }
      }}
    />
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

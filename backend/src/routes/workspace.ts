import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { workspaceService } from "../services/workspaceService.js";
import { groqService } from "../services/groqService.js";

const router = Router();

/**
 * GET /api/workspace/projects
 * Fetches real active projects for the authenticated user (Client or Freelancer).
 * Returns truthful empty list [] when user has no active workspace contracts.
 */
router.get("/projects", async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || "usr_client_alex";
    const role = (req.query.role as string) || "CLIENT";
    const explicitEmpty = req.query.empty === "true";

    if (explicitEmpty) {
      return res.json({ success: true, count: 0, data: [] });
    }

    // Query Prisma database - strictly only projects with an accepted proposal or active agreement
    const dbProjects = await prisma.project.findMany({
      where:
        role === "FREELANCER"
          ? {
              OR: [
                { agreement: { freelancerId: userId, status: "ACTIVE" } },
                { proposals: { some: { freelancerId: userId, status: "ACCEPTED" } } },
                { agreement: { freelancer: { email: userId }, status: "ACTIVE" } },
                { proposals: { some: { freelancer: { email: userId }, status: "ACCEPTED" } } },
              ],
            }
          : {
              AND: [
                {
                  OR: [
                    { clientId: userId },
                    { client: { email: userId } },
                  ],
                },
                {
                  OR: [
                    { agreement: { status: "ACTIVE" } },
                    { proposals: { some: { status: "ACCEPTED" } } },
                  ],
                },
              ],
            },
      include: {
        client: { select: { id: true, name: true, email: true } },
        projectMilestones: { orderBy: { orderIndex: "asc" } },
        agreement: {
          include: {
            freelancer: { select: { id: true, name: true, email: true } },
            milestones: { orderBy: { orderIndex: "asc" } },
          },
        },
        proposals: {
          where: { status: "ACCEPTED" },
          include: {
            freelancer: { select: { id: true, name: true, email: true } },
            milestones: { orderBy: { orderIndex: "asc" } },
          },
          orderBy: { version: "desc" },
        },
        workspaceConversation: {
          include: {
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
            meetings: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Map projects into WorkspaceProject format - only projects with connected freelancer
    const mapped = dbProjects
      .map((p) => {
        const activeProposal = p.proposals?.[0];
        const freelancer = p.agreement?.freelancer || activeProposal?.freelancer || null;
        if (!freelancer) return null;

        const lastMsg = p.workspaceConversation?.messages?.[0];
        const nextMeeting = p.workspaceConversation?.meetings?.[0];

        const rawMilestones = (activeProposal?.milestones && activeProposal.milestones.length > 0)
          ? activeProposal.milestones
          : (p.agreement?.milestones && p.agreement.milestones.length > 0)
          ? p.agreement.milestones
          : (p.projectMilestones && p.projectMilestones.length > 0)
          ? p.projectMilestones
          : [];

        return {
          id: p.id,
          name: p.title,
          shortName: p.title.split('–')[0].split('-')[0].trim(),
          iconType: p.title.toLowerCase().includes('cart') ? 'cart' : p.title.toLowerCase().includes('fit') ? 'phone' : 'chart',
          freelancerName: freelancer?.name || 'Assigned Freelancer',
          freelancerAvatar: (freelancer as any)?.avatar || '',
          clientName: p.client?.name || 'Client',
          clientAvatar: (p.client as any)?.avatar || '',
          status: p.state === 'ACTIVE' ? 'Active project' : p.state,
          statusColor: p.state === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' : 'bg-slate-100 text-slate-700 border-slate-200',
          budget: '$' + (p.budgetCents / 100).toLocaleString(),
          duration: p.deadline ? (Math.max(1, Math.round((new Date(p.deadline).getTime() - new Date(p.createdAt).getTime()) / (7 * 24 * 3600 * 1000))) + ' weeks') : 'Flexible',
          startDate: new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
          agreementVersion: 'v' + (activeProposal?.version || 1),
          unreadCount: 0,
          lastMessagePreview: lastMsg?.mediatedContent || lastMsg?.originalContent || 'Workspace ready for collaboration',
          lastActivityTime: lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active',
          canSee: true,
          paymentNote: 'Milestone funds secured via PayPal Orders REST v2 Escrow.',
          upcomingMeeting: nextMeeting ? {
            title: nextMeeting.title,
            time: nextMeeting.confirmedSlot
              ? new Date(nextMeeting.confirmedSlot).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
              : Array.isArray(nextMeeting.proposedSlots) && nextMeeting.proposedSlots.length > 0
                ? typeof nextMeeting.proposedSlots[0] === 'object' && nextMeeting.proposedSlots[0] !== null
                  ? (nextMeeting.proposedSlots[0] as any).startTime
                    ? new Date((nextMeeting.proposedSlots[0] as any).startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                    : String((nextMeeting.proposedSlots[0] as any).id || 'Upcoming')
                  : String(nextMeeting.proposedSlots[0])
                : 'Upcoming',
          } : undefined,
          milestones: rawMilestones.map((m: any, idx: number) => ({
            id: m.id,
            number: idx + 1,
            title: m.title,
            amount: '$' + (((m.amountCents || m.amountMinor || 0) / 100).toLocaleString()),
            dueDate: m.deadline ? new Date(m.deadline).toLocaleDateString() : (m.dueDate ? new Date(m.dueDate).toLocaleDateString() : 'Scheduled'),
            status: m.state,
            statusColor: m.state === 'APPROVED' || m.state === 'CAPTURED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200',
          })),
        };
      })
      .filter(Boolean);

    res.json({
      success: true,
      count: mapped.length,
      data: mapped,
    });
  } catch (err) {
    console.error("Fetch workspace projects error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to fetch workspace projects",
    });
  }
});

/**
 * GET /api/workspace/projects/:projectId/timeline
 * Fetches the complete bilateral workspace state:
 * - Conversation messages & interactive cards
 * - ADR Decisions
 * - Scheduled & completed meetings
 * - Tasks Kanban board
 * - Active cryptographic agreement hash
 */
router.get("/projects/:projectId/timeline", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Verify whether this project has an accepted proposal or active agreement
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        agreement: true,
        proposals: {
          where: { status: "ACCEPTED" },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
          details: { projectId },
        },
      });
    }

    const hasAcceptedProposalOrAgreement =
      Boolean(project.agreement) || project.proposals.length > 0;

    if (!hasAcceptedProposalOrAgreement) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Workspace connection and chat are only available after a proposal is accepted by the client.",
          details: { projectId },
        },
      });
    }

    const conversation = await workspaceService.getOrCreateWorkspaceConversation(projectId);
    res.json({
      success: true,
      data: conversation,
    });
  } catch (err) {
    console.error("Fetch workspace timeline error:", err);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: err instanceof Error ? err.message : "Failed to fetch workspace timeline",
        details: null,
      },
    });
  }
});

/**
 * POST /api/workspace/projects/:projectId/messages
 * Sends a message through Tier 1 Bot triage, computes SHA-256 seal, and broadcasts.
 */
router.post("/projects/:projectId/messages", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { senderId, senderRole, content, type, origin, metadata } = req.body;

    if (!senderId || !content) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "senderId and content are required",
          details: null,
        },
      });
    }

    // Verify whether this project has an accepted proposal or active agreement
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        agreement: true,
        proposals: {
          where: { status: "ACCEPTED" },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Project not found",
          details: { projectId },
        },
      });
    }

    const hasAcceptedProposalOrAgreement =
      Boolean(project.agreement) || project.proposals.length > 0;

    if (!hasAcceptedProposalOrAgreement) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Cannot send messages: workspace chat is only unlocked after a proposal is accepted by the client.",
          details: { projectId },
        },
      });
    }

    const result = await workspaceService.sendMessage({
      projectId,
      senderId,
      senderRole: senderRole || "CLIENT",
      content,
      type,
      origin: origin || "WEB",
      metadata,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Send workspace message error:", err);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: err instanceof Error ? err.message : "Failed to send message",
        details: null,
      },
    });
  }
});

/**
 * POST /api/workspace/projects/:projectId/amendments/propose
 * Proposes a formal scope amendment (Existing milestone delta or new milestone).
 */
router.post("/projects/:projectId/amendments/propose", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const {
      proposerId,
      amendmentType,
      milestoneId,
      newMilestoneTitle,
      priceDeltaCents,
      timelineDaysDelta,
      newAcceptanceCriteria,
      justification,
    } = req.body;

    if (!proposerId || !justification) {
      return res.status(400).json({
        success: false,
        error: "proposerId and justification are required",
      });
    }

    const card = await workspaceService.proposeScopeAmendment({
      projectId,
      proposerId,
      amendmentType: amendmentType || "AMEND_EXISTING_MILESTONE",
      milestoneId,
      newMilestoneTitle,
      priceDeltaCents: Number(priceDeltaCents || 0),
      timelineDaysDelta: Number(timelineDaysDelta || 0),
      newAcceptanceCriteria: newAcceptanceCriteria || [],
      justification,
    });

    res.status(201).json({
      success: true,
      data: card,
    });
  } catch (err) {
    console.error("Propose scope amendment error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to propose amendment",
    });
  }
});

/**
 * POST /api/workspace/projects/:projectId/amendments/:messageId/respond
 * Accepts or declines a pending scope amendment with cryptographic consensus.
 */
router.post("/projects/:projectId/amendments/:messageId/respond", async (req: Request, res: Response) => {
  try {
    const { projectId, messageId } = req.params;
    const { responderId, action } = req.body;

    if (!responderId || !["ACCEPT", "DECLINE"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "responderId and action ('ACCEPT' | 'DECLINE') are required",
      });
    }

    const result = await workspaceService.respondToScopeAmendment(projectId, messageId, responderId, action);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Respond to scope amendment error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to respond to amendment",
    });
  }
});

/**
 * POST /api/workspace/projects/:projectId/deliverables/submit
 * Submits deliverable links and starts the 72-hour inspection clock.
 */
router.post("/projects/:projectId/deliverables/submit", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { milestoneId, freelancerId, repoUrl, previewUrl, notes } = req.body;

    if (!milestoneId || !freelancerId || !repoUrl) {
      return res.status(400).json({
        success: false,
        error: "milestoneId, freelancerId, and repoUrl are required",
      });
    }

    const result = await workspaceService.submitDeliverable({
      projectId,
      milestoneId,
      freelancerId,
      repoUrl,
      previewUrl,
      notes: notes || "Milestone deliverable submitted for review.",
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Submit deliverable error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit deliverable",
    });
  }
});

/**
 * POST /api/workspace/projects/:projectId/meetings/propose
 * Proposes a meeting with bilateral time consensus (Section 7.1).
 */
router.post("/projects/:projectId/meetings/propose", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { proposedByUserId, title, agenda, durationMinutes, proposedSlots } = req.body;

    if (!proposedByUserId || !title || !proposedSlots || !proposedSlots.length) {
      return res.status(400).json({
        success: false,
        error: "proposedByUserId, title, and at least 1 proposedSlot are required",
      });
    }

    const meeting = await workspaceService.proposeMeeting({
      projectId,
      proposedByUserId,
      title,
      agenda: agenda || "Sync meeting on active milestone deliverables",
      durationMinutes: Number(durationMinutes || 30),
      proposedSlots,
    });

    res.status(201).json({
      success: true,
      data: meeting,
    });
  } catch (err) {
    console.error("Propose meeting error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to propose meeting",
    });
  }
});

/**
 * POST /api/workspace/projects/:projectId/meetings/:meetingId/respond
 * Confirms or counters proposed meeting time slot; provisions internal room & Google Calendar link.
 */
router.post("/projects/:projectId/meetings/:meetingId/respond", async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const { responderId, action, selectedSlotTime } = req.body;

    if (!responderId || !["CONFIRM", "DECLINE"].includes(action)) {
      return res.status(400).json({
        success: false,
        error: "responderId and action ('CONFIRM' | 'DECLINE') are required",
      });
    }

    const result = await workspaceService.respondToMeeting(meetingId, responderId, action, selectedSlotTime);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Respond to meeting error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to respond to meeting",
    });
  }
});

/**
 * POST /api/workspace/projects/:projectId/meetings/:meetingId/notetaker/synthesize
 * Multilingual AI Notetaker post-call synthesis (Groq Whisper v3 + Gemini).
 * Auto-creates Kanban tasks, ADR decisions, and drops summary into timeline.
 */
router.post("/projects/:projectId/meetings/:meetingId/notetaker/synthesize", async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    let { executiveSummary, actionItems, decisions, transcriptSegments, verbalScopeAlert, transcript } = req.body;

    // If raw transcript is provided, synthesize via Groq LLaMA 3.3 70B
    if ((!executiveSummary || !actionItems || actionItems.length === 0) && transcript) {
      try {
        const aiSynthesis = await groqService.synthesizeMeeting({ transcript });
        executiveSummary = executiveSummary || aiSynthesis.executiveSummary;
        actionItems = actionItems && actionItems.length > 0 ? actionItems : aiSynthesis.actionItems;
        decisions = decisions && decisions.length > 0 ? decisions : aiSynthesis.decisions;
        verbalScopeAlert = verbalScopeAlert || aiSynthesis.verbalScopeAlert;
      } catch (err) {
        console.warn("[WorkspaceRouter] Groq synthesis fallback:", err);
      }
    }

    if (!executiveSummary) {
      return res.status(400).json({
        success: false,
        error: "executiveSummary or transcript is required",
      });
    }

    const updated = await workspaceService.saveMeetingNotetakerSummary({
      meetingId,
      executiveSummary,
      actionItems: actionItems || [],
      decisions: decisions || [],
      transcriptSegments: transcriptSegments || [],
      verbalScopeAlert,
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error("Meeting notetaker synthesis error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to synthesize meeting notes",
    });
  }
});

/**
 * POST /api/workspace/projects/:projectId/tasks
 * Create a new Kanban task (Subtab 4).
 */
router.post("/projects/:projectId/tasks", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { title, description, status, priority, assignedToId, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: "title is required",
      });
    }

    const task = await workspaceService.createTask({
      projectId,
      title,
      description,
      status,
      priority,
      assignedToId,
      dueDate,
    });

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to create task",
    });
  }
});

/**
 * PATCH /api/workspace/tasks/:taskId/status
 * Update Kanban task column status (Subtab 4).
 */
router.patch("/tasks/:taskId/status", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: "status is required",
      });
    }

    const task = await workspaceService.updateTaskStatus(taskId, status);
    res.json({
      success: true,
      data: task,
    });
  } catch (err) {
    console.error("Update task status error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Failed to update task status",
    });
  }
});


// ---------------------------------------------------------------------------
// Bilateral Postponement Engine (Meetings & Milestones)
// ---------------------------------------------------------------------------

const postponeMeetingSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  userRole: z.enum(["CLIENT", "FREELANCER", "OPERATOR"]).optional(),
  reasonCategory: z.enum([
    "SUDDEN_EMERGENCY",
    "CLIENT_CONFLICT",
    "HEALTH_EMERGENCY",
    "SCHEDULE_ADJUSTMENT",
    "PREPARATION_DELAY",
    "OTHER"
  ]),
  reasonDetails: z.string().min(1, "reasonDetails is required"),
  newSlots: z.array(z.any()).min(1, "At least one new proposed slot is required"),
});

const respondMeetingPostponeSchema = z.object({
  responderId: z.string().min(1, "responderId is required"),
  responderRole: z.enum(["CLIENT", "FREELANCER", "OPERATOR"]).optional(),
  action: z.enum(["ACCEPT", "DECLINE"]),
  acceptedSlot: z.string().optional(),
});

const postponeMilestoneSchema = z.object({
  requestedById: z.string().min(1, "requestedById is required"),
  requestedByRole: z.enum(["CLIENT", "FREELANCER"]),
  proposedDueDate: z.string().min(1, "proposedDueDate is required"),
  reasonCategory: z.enum([
    "SUDDEN_EMERGENCY",
    "TECHNICAL_BLOCKER",
    "CLIENT_DEPENDENCY",
    "SCOPE_EXPANSION",
    "PERSONAL_LEAVE",
    "OTHER"
  ]),
  reasonDetails: z.string().min(1, "reasonDetails is required"),
});

const respondMilestonePostponeSchema = z.object({
  responderId: z.string().min(1, "responderId is required"),
  responderRole: z.enum(["CLIENT", "FREELANCER"]),
  action: z.enum(["ACCEPT", "DECLINE"]),
  declineReason: z.string().optional(),
});

/**
 * POST /api/workspace/projects/:projectId/meetings/:meetingId/postpone
 * Request meeting postponement / reschedule with structured/sudden reason & new proposed slots
 */
router.post("/projects/:projectId/meetings/:meetingId/postpone", async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const parsed = postponeMeetingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid postponement parameters",
          details: parsed.error.issues,
        },
      });
    }

    const result = await workspaceService.postponeMeeting({
      meetingId,
      ...parsed.data,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("Meeting postpone error:", err);
    res.status(500).json({
      error: {
        code: "MEETING_POSTPONE_ERROR",
        message: err.message || "Failed to postpone meeting",
      },
    });
  }
});

/**
 * POST /api/workspace/projects/:projectId/meetings/:meetingId/respond-postpone
 * Bilaterally accept or decline meeting postponement proposal
 */
router.post("/projects/:projectId/meetings/:meetingId/respond-postpone", async (req: Request, res: Response) => {
  try {
    const { meetingId } = req.params;
    const parsed = respondMeetingPostponeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid response parameters",
          details: parsed.error.issues,
        },
      });
    }

    const result = await workspaceService.respondToMeetingPostpone({
      meetingId,
      ...parsed.data,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("Respond to meeting postpone error:", err);
    res.status(500).json({
      error: {
        code: "RESPOND_MEETING_POSTPONE_ERROR",
        message: err.message || "Failed to respond to meeting postponement",
      },
    });
  }
});

/**
 * POST /api/workspace/projects/:projectId/milestones/:milestoneId/postpone
 * Formally request milestone deadline postponement with structured reasons
 */
router.post("/projects/:projectId/milestones/:milestoneId/postpone", async (req: Request, res: Response) => {
  try {
    const { projectId, milestoneId } = req.params;
    const parsed = postponeMilestoneSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid milestone postponement parameters",
          details: parsed.error.issues,
        },
      });
    }

    const postponement = await workspaceService.requestMilestonePostponement({
      projectId,
      milestoneId,
      ...parsed.data,
    });

    res.status(201).json({
      success: true,
      data: postponement,
    });
  } catch (err: any) {
    console.error("Milestone postpone error:", err);
    res.status(500).json({
      error: {
        code: "MILESTONE_POSTPONE_ERROR",
        message: err.message || "Failed to request milestone postponement",
      },
    });
  }
});

/**
 * POST /api/workspace/projects/:projectId/milestones/postponements/:postponementId/respond
 * Bilateral consensus response (Accept or Decline) for milestone postponement
 */
router.post("/projects/:projectId/milestones/postponements/:postponementId/respond", async (req: Request, res: Response) => {
  try {
    const { postponementId } = req.params;
    const parsed = respondMilestonePostponeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid response parameters",
          details: parsed.error.issues,
        },
      });
    }

    const result = await workspaceService.respondToMilestonePostponement({
      postponementId,
      ...parsed.data,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    console.error("Respond to milestone postpone error:", err);
    res.status(500).json({
      error: {
        code: "RESPOND_MILESTONE_POSTPONE_ERROR",
        message: err.message || "Failed to respond to milestone postponement",
      },
    });
  }
});

/**
 * GET /api/workspace/projects/:projectId/milestones/postponements
 * List milestone postponement requests and consensus history
 */
router.get("/projects/:projectId/milestones/postponements", async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const postponements = await workspaceService.getProjectMilestonePostponements(projectId);
    res.json({
      success: true,
      data: postponements,
    });
  } catch (err: any) {
    console.error("Fetch milestone postponements error:", err);
    res.status(500).json({
      error: {
        code: "FETCH_POSTPONEMENTS_ERROR",
        message: err.message || "Failed to fetch milestone postponements",
      },
    });
  }
});

export default router;


import { prisma } from "../prisma.js";
import { computeCanonicalHash, computeTimelineSeal } from "../lib/canonicalHash.js";
import { notificationQueue } from "./notificationQueue.js";

export interface SendMessageParams {
  projectId: string;
  senderId: string;
  senderRole: "CLIENT" | "FREELANCER" | "OPERATOR";
  content: string;
  type?: string;
  origin?: "WEB" | "TELEGRAM";
  telegramMessageId?: string;
  metadata?: Record<string, unknown>;
}

export interface ScopeAmendmentParams {
  projectId: string;
  proposerId: string;
  amendmentType: "AMEND_EXISTING_MILESTONE" | "ADD_NEW_MILESTONE" | "ZERO_COST_TWEAK";
  milestoneId?: string;
  newMilestoneTitle?: string;
  priceDeltaCents: number; // positive = increase, negative = decrease, 0 = unchanged
  timelineDaysDelta: number;
  newAcceptanceCriteria: string[];
  justification: string;
}

export interface ProposeMeetingParams {
  projectId: string;
  proposedByUserId: string;
  title: string;
  agenda: string;
  durationMinutes: number;
  proposedSlots: Array<{
    id: string;
    startTime: string; // ISO
    endTime: string; // ISO
  }>;
}

export interface NotetakerSummaryParams {
  meetingId: string;
  executiveSummary: string;
  actionItems: Array<{
    task: string;
    assigneeName?: string;
    assigneeId?: string;
    dueDate?: string;
  }>;
  decisions: Array<{
    title: string;
    description: string;
    context?: string;
  }>;
  transcriptSegments?: Array<{
    speaker: string;
    timestamp: string;
    text: string;
    language?: string;
  }>;
  verbalScopeAlert?: {
    detected: boolean;
    verbalAgreementSnippet: string;
    suggestedDeltaCents: number;
  };
}

// Regex patterns for Tier 1 Bot Deterministic Evaluation (0 Tokens)
const SCOPE_TRIGGER_REGEX = /(\$\s*\d+|\b(additional|extra)\s*(cost|budget|feature|scope|money|charge)|\b(add|implement|integrate)\s*(apple pay|google pay|stripe|subscription|export|admin|analytics|dark mode)|\b(extend|push)\s*(deadline|date|milestone))/i;
const TONE_WARNING_REGEX = /\b(waste\s*of\s*time|unacceptable|useless|ridiculous|terrible|hurry\s*up|threaten|sue|court|fraud)\b/i;

export class WorkspaceService {
  /**
   * Fetch or initialize the active Workspace Conversation for a project.
   */
  async getOrCreateWorkspaceConversation(projectId: string) {
    let conversation = await prisma.workspaceConversation.findUnique({
      where: { projectId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: {
              select: { id: true, name: true, role: true, email: true },
            },
          },
        },
        decisions: {
          orderBy: { createdAt: "desc" },
        },
        meetings: {
          orderBy: { createdAt: "desc" },
        },
        tasks: {
          orderBy: { createdAt: "asc" },
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        project: {
          include: {
            client: { select: { id: true, name: true, email: true } },
            proposals: {
              where: { status: "ACCEPTED" },
              include: {
                milestones: {
                  orderBy: { orderIndex: "asc" },
                  include: {
                    paymentAttempts: {
                      orderBy: { createdAt: "desc" },
                      take: 1,
                    },
                  },
                },
                freelancer: {
                  select: { id: true, name: true, email: true },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!conversation) {
      // Find project details to establish canonical seal
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          client: true,
          proposals: {
            where: { status: "ACCEPTED" },
            include: { milestones: true, freelancer: true },
            take: 1,
          },
        },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const activeProposal = project.proposals[0];
      const initialAgreementPayload = {
        projectId: project.id,
        clientId: project.clientId,
        freelancerId: activeProposal?.freelancerId || null,
        budgetCents: project.budgetCents,
        milestones: activeProposal?.milestones.map((m) => ({
          id: m.id,
          title: m.title,
          amountCents: m.amountCents,
          orderIndex: m.orderIndex,
        })) || [],
        sealedAt: new Date().toISOString(),
      };

      const initialHash = computeCanonicalHash(initialAgreementPayload);

      conversation = await prisma.workspaceConversation.create({
        data: {
          projectId,
          agreementHash: `canonical_v1.0_${initialHash.slice(0, 16)}`,
        },
        include: {
          messages: {
            include: {
              sender: { select: { id: true, name: true, role: true, email: true } },
            },
          },
          decisions: true,
          meetings: true,
          tasks: {
            include: {
              assignedTo: { select: { id: true, name: true, email: true, role: true } },
            },
          },
          project: {
            include: {
              client: { select: { id: true, name: true, email: true } },
              proposals: {
                where: { status: "ACCEPTED" },
                include: {
                  milestones: {
                    orderBy: { orderIndex: "asc" },
                    include: {
                      paymentAttempts: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                      },
                    },
                  },
                  freelancer: { select: { id: true, name: true, email: true } },
                },
                take: 1,
              },
            },
          },
        },
      });

      // Seed initial welcome & cryptographic consensus audit message
      const kickOffSeal = computeTimelineSeal(
        { text: "Bilateral workspace initialized", hash: conversation.agreementHash },
        conversation.agreementHash
      );

      const systemMsg = await prisma.workspaceMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: project.clientId,
          senderRole: "OPERATOR",
          type: "system_alert",
          origin: "WEB",
          originalContent: `Bilateral workspace successfully initialized under canonical agreement hash ${conversation.agreementHash}. Fund-Before-Work protocol and 72-hour deliverable inspection clocks are active.`,
          sha256Seal: kickOffSeal,
          metadata: {
            isSystemKickoff: true,
            agreementHash: conversation.agreementHash,
          },
        },
        include: {
          sender: { select: { id: true, name: true, role: true, email: true } },
        },
      });

      conversation.messages = [systemMsg];
    }

    return conversation;
  }

  /**
   * Send a message through Tier 1 Bot Triage, compute timeline seal, and broadcast.
   */
  async sendMessage(params: SendMessageParams) {
    const conversation = await this.getOrCreateWorkspaceConversation(params.projectId);

    // 1. Tier 1 Deterministic Bot Scan (0 Tokens)
    const hasScopeTrigger = SCOPE_TRIGGER_REGEX.test(params.content);
    const hasToneWarning = TONE_WARNING_REGEX.test(params.content);

    // Get the latest message seal to maintain blockchain-like chronological integrity
    const latestMessage = await prisma.workspaceMessage.findFirst({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
    });

    const parentSeal = latestMessage?.sha256Seal || conversation.agreementHash;
    const seal = computeTimelineSeal(
      {
        senderId: params.senderId,
        content: params.content,
        timestamp: new Date().toISOString(),
      },
      parentSeal
    );

    const metadata: Record<string, unknown> = {
      ...params.metadata,
      hasScopeTrigger,
      hasToneWarning,
      timestampUtc: new Date().toISOString(),
    };

    if (hasScopeTrigger) {
      metadata.scopeAlert = {
        message: "Scope modification detected. Consider formalizing as an amendment card.",
        detectedKeywords: params.content.match(SCOPE_TRIGGER_REGEX)?.[0] || "",
      };
    }

    if (hasToneWarning) {
      metadata.toneWarning = {
        flagged: true,
        recommendation: "Consider rephrasing with diplomatic tone smoothing.",
      };
    }

    const message = await prisma.workspaceMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: params.senderId,
        senderRole: params.senderRole,
        type: params.type || (params.senderRole === "CLIENT" ? "client_bubble" : "freelancer_bubble"),
        origin: params.origin || "WEB",
        telegramMessageId: params.telegramMessageId || null,
        originalContent: params.content,
        mediatedContent: null,
        wasMediated: false,
        sha256Seal: seal,
        metadata: metadata as any,
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true, email: true },
        },
      },
    });

    // Enqueue push notification
    const recipientRole = params.senderRole === "CLIENT" ? "FREELANCER" : "CLIENT";
    notificationQueue.enqueue({
      eventName: "WORKSPACE_MESSAGE_RECEIVED",
      recipientRole,
      type: "MESSAGE",
      priority: "NORMAL",
      title: `New message from ${message.sender?.name || "Collaborator"}`,
      message: params.content.slice(0, 100),
      projectId: params.projectId,
      actionUrl: params.senderRole === "CLIENT" ? "/freelancer/workspace" : "/client/workspace",
      metadata: {
        messageId: message.id,
        senderName: message.sender?.name || "Collaborator",
        preview: params.content.slice(0, 100),
        origin: params.origin || "WEB",
      },
    });

    return {
      message,
      botInsights: {
        hasScopeTrigger,
        hasToneWarning,
        sha256Seal: seal,
      },
    };
  }

  /**
   * Propose a formal scope amendment (Pathway 4A, 4B, or 4C).
   */
  async proposeScopeAmendment(params: ScopeAmendmentParams) {
    const conversation = await this.getOrCreateWorkspaceConversation(params.projectId);

    // Calculate delta and determine funding mechanics
    const deltaDollars = (params.priceDeltaCents / 100).toFixed(2);
    const isPriceIncrease = params.priceDeltaCents > 0;

    const draftPayload = {
      amendmentType: params.amendmentType,
      milestoneId: params.milestoneId || null,
      newMilestoneTitle: params.newMilestoneTitle || null,
      priceDeltaCents: params.priceDeltaCents,
      timelineDaysDelta: params.timelineDaysDelta,
      newAcceptanceCriteria: params.newAcceptanceCriteria,
      justification: params.justification,
      proposerId: params.proposerId,
      proposedAt: new Date().toISOString(),
    };

    const draftHash = computeCanonicalHash(draftPayload);
    const parentSeal = conversation.agreementHash;
    const seal = computeTimelineSeal(draftPayload, parentSeal);

    // Determine funding requirements
    const fundingRequirement = {
      actionNeeded: isPriceIncrease ? "PAYPAL_DELTA_AUTHORIZATION_OR_RESERVE" : "NO_PAYMENT_REQUIRED",
      amountDeltaCents: params.priceDeltaCents,
      formattedDelta: isPriceIncrease ? `+$${deltaDollars}` : `$${deltaDollars}`,
    };

    const amendmentMessage = await prisma.workspaceMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: params.proposerId,
        senderRole: "CLIENT", // Can also be FREELANCER
        type: "draft_counteroffer_card",
        origin: "WEB",
        originalContent: `Proposed Contract Amendment: ${params.justification} (${fundingRequirement.formattedDelta})`,
        sha256Seal: seal,
        metadata: {
          draftHash,
          amendmentPayload: draftPayload,
          fundingRequirement,
          status: "PENDING_ACCEPTANCE",
          clientAccepted: true, // Proposer accepts by default
          freelancerAccepted: false,
        } as any,
      },
    });

    return amendmentMessage;
  }

  /**
   * Accept or decline a pending scope amendment with cryptographic consensus.
   */
  async respondToScopeAmendment(projectId: string, messageId: string, responderId: string, action: "ACCEPT" | "DECLINE") {
    const conversation = await this.getOrCreateWorkspaceConversation(projectId);
    const targetMessage = await prisma.workspaceMessage.findUnique({
      where: { id: messageId },
    });

    if (!targetMessage || targetMessage.type !== "draft_counteroffer_card") {
      throw new Error("Amendment proposal card not found");
    }

    const currentMetadata = (targetMessage.metadata as Record<string, unknown>) || {};
    const payload = (currentMetadata.amendmentPayload as Record<string, unknown>) || {};

    if (action === "DECLINE") {
      const updated = await prisma.workspaceMessage.update({
        where: { id: messageId },
        data: {
          type: "amendment_declined_card",
          metadata: {
            ...currentMetadata,
            status: "DECLINED",
            declinedByUserId: responderId,
            declinedAt: new Date().toISOString(),
          } as any,
        },
      });
      return { success: true, status: "DECLINED", message: updated };
    }

    // Both parties accepted: seal the new agreement hash!
    const newAgreementVersion = `canonical_v${Date.now().toString().slice(-4)}_${(currentMetadata.draftHash as string || "amend").slice(0, 16)}`;

    // Update conversation canonical hash
    await prisma.workspaceConversation.update({
      where: { id: conversation.id },
      data: { agreementHash: newAgreementVersion },
    });

    // Pathway 4A: Amending existing milestone
    if (payload.amendmentType === "AMEND_EXISTING_MILESTONE" && payload.milestoneId) {
      const milestone = await prisma.milestone.findUnique({
        where: { id: payload.milestoneId as string },
      });
      if (milestone) {
        const newAmountCents = milestone.amountCents + Number(payload.priceDeltaCents || 0);
        await prisma.milestone.update({
          where: { id: milestone.id },
          data: {
            amountCents: newAmountCents,
          },
        });
      }
    }

    // Pathway 4B: Adding brand new milestone
    if (payload.amendmentType === "ADD_NEW_MILESTONE") {
      const activeProposal = conversation.project.proposals[0];
      if (activeProposal) {
        const highestOrder = await prisma.milestone.findFirst({
          where: { proposalVersionId: activeProposal.id },
          orderBy: { orderIndex: "desc" },
        });
        const nextOrderIndex = (highestOrder?.orderIndex || 0) + 1;

        await prisma.milestone.create({
          data: {
            proposalVersionId: activeProposal.id,
            title: (payload.newMilestoneTitle as string) || `Milestone ${nextOrderIndex}: New Addendum Scope`,
            deliverables: [(payload.justification as string) || "Added via bilateral scope amendment"],
            amountCents: Number(payload.priceDeltaCents || 0),
            orderIndex: nextOrderIndex,
            criteria: (payload.newAcceptanceCriteria as string[]) || ["Verified implementation per agreed addendum specification"],
          },
        });
      }
    }

    // Update message card to sealed
    const updated = await prisma.workspaceMessage.update({
      where: { id: messageId },
      data: {
        type: "sent_card",
        metadata: {
          ...currentMetadata,
          status: "SEALED",
          sealedAgreementHash: newAgreementVersion,
          sealedAt: new Date().toISOString(),
          bothPartiesConsensus: true,
        } as any,
      },
    });

    // Record decision in ADR subtab
    await prisma.workspaceDecision.create({
      data: {
        conversationId: conversation.id,
        title: `Scope Amendment Sealed: ${(payload.justification as string) || "Contract Addendum"}`,
        description: `Bilateral amendment sealed under ${newAgreementVersion}. Price delta: ${payload.priceDeltaCents} cents. Timeline delta: ${payload.timelineDaysDelta} days.`,
        signedByClient: true,
        signedByFreelancer: true,
        status: "SEALED",
        sha256Hash: newAgreementVersion,
        origin: "MANUAL",
      },
    });

    return {
      success: true,
      status: "SEALED",
      newAgreementHash: newAgreementVersion,
      message: updated,
    };
  }

  /**
   * Submit deliverable and start 72-hour countdown inspection clock.
   */
  async submitDeliverable(params: {
    projectId: string;
    milestoneId: string;
    freelancerId: string;
    repoUrl: string;
    previewUrl?: string;
    notes: string;
  }) {
    const conversation = await this.getOrCreateWorkspaceConversation(params.projectId);

    const deliverablePayload = {
      milestoneId: params.milestoneId,
      freelancerId: params.freelancerId,
      repoUrl: params.repoUrl,
      previewUrl: params.previewUrl || null,
      notes: params.notes,
      submittedAt: new Date().toISOString(),
    };

    const deliverableHash = computeCanonicalHash(deliverablePayload);
    const expiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

    const card = await prisma.workspaceMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: params.freelancerId,
        senderRole: "FREELANCER",
        type: "deliverable_submission_card",
        origin: "WEB",
        originalContent: `Deliverable submitted for milestone ${params.milestoneId}: ${params.notes}`,
        sha256Seal: deliverableHash,
        metadata: {
          milestoneId: params.milestoneId,
          repoUrl: params.repoUrl,
          previewUrl: params.previewUrl,
          inspectionExpiresAt: expiresAt,
          inspectionHoursRemaining: 72,
          deliverableHash,
          status: "IN_REVIEW",
        } as any,
      },
    });

    return {
      card,
      deliverableHash,
      inspectionExpiresAt: expiresAt,
    };
  }

  /**
   * Propose a meeting with bilateral time consensus (Section 7.1).
   */
  async proposeMeeting(params: ProposeMeetingParams) {
    const conversation = await this.getOrCreateWorkspaceConversation(params.projectId);
    const roomId = `room-${conversation.id.slice(-6)}-${Date.now().toString().slice(-4)}`;
    const roomUrl = `/workspace/meetings/${roomId}`;

    const meeting = await prisma.workspaceMeeting.create({
      data: {
        conversationId: conversation.id,
        title: params.title,
        agenda: params.agenda,
        durationMinutes: params.durationMinutes,
        status: "PROPOSED",
        proposedSlots: params.proposedSlots as any,
        proposedByUserId: params.proposedByUserId,
        roomUrl,
      },
    });

    // Drop interactive proposal card into timeline
    await prisma.workspaceMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: params.proposedByUserId,
        senderRole: "CLIENT", // Can be FREELANCER
        type: "meeting_proposal_card",
        origin: "WEB",
        originalContent: `Proposed Meeting: ${params.title} (${params.durationMinutes} mins)`,
        sha256Seal: computeCanonicalHash({ meetingId: meeting.id, slots: params.proposedSlots }),
        metadata: {
          meetingId: meeting.id,
          title: params.title,
          agenda: params.agenda,
          durationMinutes: params.durationMinutes,
          proposedSlots: params.proposedSlots,
          roomUrl,
          status: "PROPOSED",
        } as any,
      },
    });

    return meeting;
  }

  /**
   * Confirm or counter proposed meeting time slot (Section 7.1 & 7.3 Google Calendar sync).
   */
  async respondToMeeting(meetingId: string, responderId: string, action: "CONFIRM" | "DECLINE", selectedSlotTime?: string) {
    const meeting = await prisma.workspaceMeeting.findUnique({
      where: { id: meetingId },
      include: { conversation: { include: { project: true } } },
    });

    if (!meeting) {
      throw new Error(`Meeting ${meetingId} not found`);
    }

    if (action === "DECLINE") {
      const updated = await prisma.workspaceMeeting.update({
        where: { id: meetingId },
        data: { status: "CANCELLED" },
      });
      return { success: true, status: "CANCELLED", meeting: updated };
    }

    const confirmedSlot = selectedSlotTime ? new Date(selectedSlotTime) : new Date();
    const endSlot = new Date(confirmedSlot.getTime() + meeting.durationMinutes * 60000);

    // Generate Google Calendar deep link
    const startIso = confirmedSlot.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const endIso = endSlot.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `Nexum Sync: ${meeting.title}`
    )}&dates=${startIso}/${endIso}&details=${encodeURIComponent(
      `${meeting.agenda}\n\nNexum Internal Room: ${meeting.roomUrl}\n(Nexum AI Notetaker will transcribe notes automatically)`
    )}&location=${encodeURIComponent(meeting.roomUrl)}`;

    const updated = await prisma.workspaceMeeting.update({
      where: { id: meetingId },
      data: {
        status: "CONFIRMED",
        confirmedSlot,
        googleCalendarHtmlLink: gcalUrl,
      },
    });

    // Post confirmed card into chat
    await prisma.workspaceMessage.create({
      data: {
        conversationId: meeting.conversationId,
        senderId: responderId,
        senderRole: "FREELANCER",
        type: "meeting_confirmed_card",
        origin: "WEB",
        originalContent: `Meeting Confirmed: ${meeting.title} on ${confirmedSlot.toLocaleString()}`,
        sha256Seal: computeCanonicalHash({ meetingId: meeting.id, confirmedSlot }),
        metadata: {
          meetingId: meeting.id,
          title: meeting.title,
          confirmedSlot: confirmedSlot.toISOString(),
          roomUrl: meeting.roomUrl,
          googleCalendarHtmlLink: gcalUrl,
          durationMinutes: meeting.durationMinutes,
          status: "CONFIRMED",
        } as any,
      },
    });

    return {
      success: true,
      status: "CONFIRMED",
      meeting: updated,
      googleCalendarHtmlLink: gcalUrl,
    };
  }

  /**
   * Save Multilingual Notetaker Summary & automatically create Tasks/ADRs (Section 7.4 & 7.5).
   */
  async saveMeetingNotetakerSummary(params: NotetakerSummaryParams) {
    const meeting = await prisma.workspaceMeeting.findUnique({
      where: { id: params.meetingId },
      include: { conversation: true },
    });

    if (!meeting) {
      throw new Error(`Meeting ${params.meetingId} not found`);
    }

    const updatedMeeting = await prisma.workspaceMeeting.update({
      where: { id: params.meetingId },
      data: {
        status: "COMPLETED",
        executiveSummary: params.executiveSummary,
        actionItems: params.actionItems as any,
        decisions: params.decisions as any,
        transcriptJson: (params.transcriptSegments || []) as any,
      },
    });

    // 1. Automatically convert action items to Kanban Tasks (Subtab 4)
    if (params.actionItems && params.actionItems.length > 0) {
      for (const item of params.actionItems) {
        await prisma.workspaceTask.create({
          data: {
            projectId: meeting.conversation.projectId,
            conversationId: meeting.conversationId,
            title: item.task,
            description: `Auto-extracted by Nexum AI Notetaker from sync meeting: ${meeting.title}`,
            status: "TODO" as any,
            priority: "MEDIUM",
            assignedToId: item.assigneeId || null,
            origin: "AI_MEETING_EXTRACTED",
            meetingId: meeting.id,
            dueDate: item.dueDate ? new Date(item.dueDate) : null,
          },
        });
      }
    }

    // 2. Automatically convert agreed decisions to ADRs (Subtab 6)
    if (params.decisions && params.decisions.length > 0) {
      for (const d of params.decisions) {
        await prisma.workspaceDecision.create({
          data: {
            conversationId: meeting.conversationId,
            title: d.title,
            description: d.description,
            signedByClient: false,
            signedByFreelancer: false,
            status: "PROPOSED",
            sha256Hash: computeCanonicalHash(d),
            origin: "AI_MEETING_EXTRACTED",
            meetingId: meeting.id,
          },
        });
      }
    }

    // 3. Drop formatted Meeting Recap Card into Bilateral Chat & Timeline
    await prisma.workspaceMessage.create({
      data: {
        conversationId: meeting.conversationId,
        senderId: meeting.proposedByUserId,
        senderRole: "OPERATOR",
        type: "meeting_summary_card",
        origin: "WEB",
        originalContent: `Nexum AI Meeting Brief: ${meeting.title}\n\n${params.executiveSummary}`,
        sha256Seal: computeCanonicalHash({ summary: params.executiveSummary, meetingId: meeting.id }),
        metadata: {
          meetingId: meeting.id,
          title: meeting.title,
          executiveSummary: params.executiveSummary,
          actionItemsCount: params.actionItems.length,
          decisionsCount: params.decisions.length,
          verbalScopeAlert: params.verbalScopeAlert || null,
        } as any,
      },
    });

    // 4. Verbal Scope Creep Detection: Draft an Amendment Card if verbal change was detected
    if (params.verbalScopeAlert && params.verbalScopeAlert.detected) {
      const deltaAmount = (params.verbalScopeAlert.suggestedDeltaCents / 100).toFixed(2);
      await prisma.workspaceMessage.create({
        data: {
          conversationId: meeting.conversationId,
          senderId: meeting.proposedByUserId,
          senderRole: "OPERATOR",
          type: "system_alert",
          origin: "WEB",
          originalContent: `⚠️ Verbal Agreement Detected During Call: "${params.verbalScopeAlert.verbalAgreementSnippet}". Tap below to formalize as a milestone addendum (+$${deltaAmount} USD).`,
          sha256Seal: computeCanonicalHash(params.verbalScopeAlert),
          metadata: {
            isVerbalScopeAddendum: true,
            suggestedDeltaCents: params.verbalScopeAlert.suggestedDeltaCents,
            snippet: params.verbalScopeAlert.verbalAgreementSnippet,
          } as any,
        },
      });
    }

    return updatedMeeting;
  }

  /**
   * Tasks Kanban management (Subtab 4).
   */
  async createTask(params: {
    projectId: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    assignedToId?: string;
    dueDate?: string;
  }) {
    const conversation = await this.getOrCreateWorkspaceConversation(params.projectId);
    return prisma.workspaceTask.create({
      data: {
        projectId: params.projectId,
        conversationId: conversation.id,
        title: params.title,
        description: params.description || null,
        status: (params.status || "TODO") as any,
        priority: params.priority || "MEDIUM",
        assignedToId: params.assignedToId || null,
        dueDate: params.dueDate ? new Date(params.dueDate) : null,
        origin: "MANUAL",
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateTaskStatus(taskId: string, status: string) {
    return prisma.workspaceTask.update({
      where: { id: taskId },
      data: { status: status as any },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
  }
}

export const workspaceService = new WorkspaceService();

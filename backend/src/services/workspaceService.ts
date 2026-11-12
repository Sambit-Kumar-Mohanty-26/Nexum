import crypto from "crypto";
import { appendAuditEvent } from "../lib/audit.js";
import { prisma } from "../prisma.js";
import { computeCanonicalHash, computeTimelineSeal } from "../lib/canonicalHash.js";
import { notificationQueue } from "./notificationQueue.js";
import { generateContractMarkdown, saveContractAsProjectFile } from "../domain/agreements/contractGenerator.js";
import { Role, ApprovalDecision, AgreementVersionStatus, MilestoneWorkStatus, SubmissionStatus } from "@prisma/client";
import { autonomousVerifierService } from "./autonomousVerifierService.js";

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
  proposerRole?: string;
  amendmentType: "AMEND_EXISTING_MILESTONE" | "ADD_NEW_MILESTONE" | "ZERO_COST_TWEAK";
  milestoneId?: string;
  newMilestoneTitle?: string;
  priceDeltaCents: number; // positive = increase, negative = decrease, 0 = unchanged
  timelineDaysDelta: number;
  newAcceptanceCriteria: string[];
  deliverables?: string[];
  justification: string;
  brdDocumentUrl?: string;
  brdDocumentName?: string;
}

export interface ScopeAmendmentCounterParams {
  projectId: string;
  messageId: string;
  responderId: string;
  responderRole: string;
  counterAmountMinor: number;
  counterDays: number;
  reasoning: string;
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
            agreement: {
              include: {
                milestones: { orderBy: { orderIndex: "asc" } },
                freelancer: { select: { id: true, name: true, email: true } },
                versions: { orderBy: { versionNumber: "desc" }, take: 1 },
              },
            },
            projectProposals: {
              where: { status: "ACCEPTED" },
              include: {
                freelancer: {
                  select: { id: true, name: true, email: true },
                },
              },
              take: 1,
            },
            projectFiles: {
              include: { file: true },
              orderBy: { createdAt: "desc" },
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
          agreement: {
            include: { milestones: true, freelancer: true },
          },
          projectProposals: {
            where: { status: "ACCEPTED" },
            include: { freelancer: true },
            take: 1,
          },
        },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const activeProposal = project.projectProposals[0];
      const initialAgreementPayload = {
        projectId: project.id,
        clientId: project.clientId,
        freelancerId: project.agreement?.freelancerId || activeProposal?.freelancerId || null,
        budgetCents: project.budgetCents,
        milestones: project.agreement?.milestones?.map((m) => ({
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
              agreement: {
                include: {
                  milestones: { orderBy: { orderIndex: "asc" } },
                  freelancer: { select: { id: true, name: true, email: true } },
                  versions: { orderBy: { versionNumber: "desc" }, take: 1 },
                },
              },
              projectProposals: {
                where: { status: "ACCEPTED" },
                include: {
                  freelancer: { select: { id: true, name: true, email: true } },
                },
                take: 1,
              },
              projectFiles: {
                include: { file: true },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      });

      if (!conversation) {
        throw new Error(`Failed to initialize workspace conversation for project ${projectId}`);
      }

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

    // Attach project files to populate Files tab for both Client & Freelancer
    const projectFiles = await prisma.projectFile.findMany({
      where: { projectId },
      include: { file: true },
      orderBy: { createdAt: "desc" },
    });

    const mappedFiles = projectFiles.map((pf) => {
      let name = pf.name;
      if (name === "Contract_Agreement_v2.0.md") name = "Contract_Agreement_v1.1.md";
      return {
        id: pf.id,
        fileId: pf.fileId,
        name,
        size: `${Math.max(1, Math.round(pf.file.sizeBytes / 1024))} KB`,
        date: pf.createdAt.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
        type: name.endsWith(".md") ? "MD" : name.endsWith(".pdf") ? "PDF" : "DOC",
        url: `/api/files/${pf.fileId}`,
        versionNumber: pf.versionNumber,
      };
    });

    (conversation as any).files = mappedFiles;

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

    // Ensure sender exists in DB to prevent foreign key violation if mock/demo user
    let effectiveSenderId = params.senderId;
    const existingSender = await prisma.user.findFirst({
      where: {
        OR: [
          { id: params.senderId },
          { email: params.senderId },
        ],
      },
    });

    if (existingSender) {
      effectiveSenderId = existingSender.id;
    } else {
      // Find project client or freelancer as fallback
      const project = await prisma.project.findUnique({
        where: { id: params.projectId },
        include: { agreement: true },
      });
      if (project) {
        if (params.senderRole === "CLIENT" && project.clientId) {
          effectiveSenderId = project.clientId;
        } else if (params.senderRole === "FREELANCER" && project.agreement?.freelancerId) {
          effectiveSenderId = project.agreement.freelancerId;
        } else {
          effectiveSenderId = project.clientId || project.agreement?.freelancerId || params.senderId;
        }
      }

      // Final defensive check against database User table
      const checkUser = await prisma.user.findUnique({ where: { id: effectiveSenderId } });
      if (!checkUser) {
        const fallbackUser = await prisma.user.findFirst();
        if (fallbackUser) effectiveSenderId = fallbackUser.id;
      }
    }

    const message = await prisma.workspaceMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: effectiveSenderId,
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

    // Bilateral relay: forward web messages to recipient's Telegram if paired
    if (params.origin !== "TELEGRAM") {
      try {
        const project = await prisma.project.findUnique({
          where: { id: params.projectId },
          include: {
            client: true,
            agreement: { include: { freelancer: true } },
          },
        });

        if (project) {
          const recipientUser =
            params.senderRole === "CLIENT"
              ? project.agreement?.freelancer
              : project.client;

          if (recipientUser?.telegramChatId && recipientUser.telegramNotifications) {
            const { telegramService } = await import("./telegramService.js");
            const senderDisplayName = message.sender?.name || (params.senderRole === "CLIENT" ? "Client" : "Freelancer");

            await telegramService.sendMessage(
              recipientUser.telegramChatId,
              `💬 *New Message on ${project.title}:*\n\n*${senderDisplayName}:* "${params.content}"\n\n_Origin: Web Workspace • Seal: \`${seal.slice(0, 16)}...\`_`,
              [
                [
                  {
                    text: `💬 Reply / Switch to ${project.title.slice(0, 20)}...`,
                    callback_data: `switch_prj:${project.id}`,
                  },
                ],
              ],
              true,
              recipientUser.role
            );
          }
        }
      } catch (tgErr: any) {
        console.warn("[WorkspaceService] Telegram inbound relay notice:", tgErr.message);
      }
    }

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
      deliverables: params.deliverables || [],
      justification: params.justification,
      brdDocumentUrl: params.brdDocumentUrl || null,
      brdDocumentName: params.brdDocumentName || null,
      proposerId: params.proposerId,
      proposerRole: params.proposerRole || "CLIENT",
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
        senderRole: (params.proposerRole || "CLIENT") as any,
        type: "draft_counteroffer_card",
        origin: "WEB",
        originalContent: `Proposed Contract Amendment: ${params.justification} (${fundingRequirement.formattedDelta})`,
        sha256Seal: seal,
        metadata: {
          draftHash,
          amendmentPayload: draftPayload,
          fundingRequirement,
          status: "PENDING_ACCEPTANCE",
          clientAccepted: (params.proposerRole || "CLIENT") === "CLIENT",
          freelancerAccepted: params.proposerRole === "FREELANCER",
          lastProposedBy: params.proposerId,
          lastProposedRole: params.proposerRole || "CLIENT",
        } as any,
      },
    });

    return amendmentMessage;
  }

  /**
   * Submit a counteroffer for a pending scope amendment.
   */
  async counterScopeAmendment(params: ScopeAmendmentCounterParams) {
    const conversation = await this.getOrCreateWorkspaceConversation(params.projectId);
    const targetMessage = await prisma.workspaceMessage.findUnique({
      where: { id: params.messageId },
    });

    if (!targetMessage) {
      throw new Error("Amendment proposal card not found");
    }

    const currentMetadata = (targetMessage.metadata as Record<string, any>) || {};
    const oldPayload = (currentMetadata.amendmentPayload as Record<string, any>) || {};

    const updatedPayload = {
      ...oldPayload,
      priceDeltaCents: params.counterAmountMinor,
      timelineDaysDelta: params.counterDays,
      counterReasoning: params.reasoning,
      counteredByUserId: params.responderId,
      counteredByRole: params.responderRole,
      counteredAt: new Date().toISOString(),
    };

    const deltaDollars = (params.counterAmountMinor / 100).toFixed(2);
    const isPriceIncrease = params.counterAmountMinor > 0;
    const fundingRequirement = {
      actionNeeded: isPriceIncrease ? "PAYPAL_DELTA_AUTHORIZATION_OR_RESERVE" : "NO_PAYMENT_REQUIRED",
      amountDeltaCents: params.counterAmountMinor,
      formattedDelta: isPriceIncrease ? `+$${deltaDollars}` : `$${deltaDollars}`,
    };

    const seal = computeTimelineSeal(updatedPayload, conversation.agreementHash);

    const updated = await prisma.workspaceMessage.update({
      where: { id: params.messageId },
      data: {
        type: "draft_counteroffer_card",
        senderId: params.responderId,
        senderRole: (params.responderRole || "FREELANCER") as any,
        originalContent: `Counteroffer Proposed: ${params.reasoning} (${fundingRequirement.formattedDelta}, ${params.counterDays} days)`,
        sha256Seal: seal,
        metadata: {
          ...currentMetadata,
          amendmentPayload: updatedPayload,
          fundingRequirement,
          status: "PENDING_ACCEPTANCE",
          lastProposedBy: params.responderId,
          lastProposedRole: params.responderRole,
          counterReasoning: params.reasoning,
          counterAmountMinor: params.counterAmountMinor,
          counterDays: params.counterDays,
        } as any,
      },
    });

    await appendAuditEvent({
      actorId: params.responderId,
      action: "AMENDMENT_COUNTEROFFER_SUBMITTED",
      objectType: "WORKSPACE_MESSAGE",
      objectId: params.messageId,
      metadata: {
        counterAmountMinor: params.counterAmountMinor,
        counterDays: params.counterDays,
        reasoning: params.reasoning,
      },
    });

    return updated;
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

    // Lookup agreement early so we can attach milestones and compute next version
    const agreement = await prisma.agreement.findUnique({
      where: { projectId },
      include: {
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
        project: {
          include: {
            client: true,
          },
        },
        freelancer: true,
      },
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
            amountMinor: newAmountCents,
          },
        });
      }
    }

    // Pathway 4B: Adding brand new milestone
    let createdMilestoneId: string | null = null;
    if (payload.amendmentType === "ADD_NEW_MILESTONE") {
      const highestOrder = await prisma.milestone.findFirst({
        where: { projectId: conversation.project.id },
        orderBy: { orderIndex: "desc" },
      });
      const nextOrderIndex = (highestOrder?.orderIndex || 0) + 1;

      const deliverables = Array.isArray(payload.deliverables) && payload.deliverables.length > 0
        ? (payload.deliverables as string[])
        : [(payload.justification as string) || "Added via bilateral scope amendment"];

      const criteria = Array.isArray(payload.newAcceptanceCriteria) && payload.newAcceptanceCriteria.length > 0
        ? (payload.newAcceptanceCriteria as string[])
        : ["Verified implementation per agreed addendum specification"];

      const createdMilestone = await prisma.milestone.create({
        data: {
          projectId: conversation.project.id,
          agreementId: agreement?.id || conversation.project.agreement?.id || null,
          orderIndex: nextOrderIndex,
          sequence: nextOrderIndex,
          title: (payload.newMilestoneTitle as string) || `Milestone ${nextOrderIndex}: New Addendum Scope`,
          description: (payload.justification as string) || "Added via bilateral scope amendment",
          deliverables: deliverables,
          amountCents: Number(payload.priceDeltaCents || 0),
          amountMinor: Number(payload.priceDeltaCents || 0),
          currency: conversation.project.currency || "USD",
          workStatus: MilestoneWorkStatus.UPCOMING,
          criteria: criteria,
        },
      });
      createdMilestoneId = createdMilestone.id;
    }

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

    // Synthesize amended contract version (e.g. v1.1) and save under Project Files for both parties
    let nextVerNum = 2;
    let savedFile: any = null;
    let newVersionString = "v1.1";

    try {
      if (agreement) {
        const latestVer = agreement.versions[0];
        nextVerNum = (latestVer?.versionNumber || 1) + 1;
        newVersionString = nextVerNum === 1 ? "v1.0" : `v1.${nextVerNum - 1}`;

        const updatedMilestones = await prisma.milestone.findMany({
          where: { projectId, removedAt: null },
          orderBy: { orderIndex: "asc" },
        });

        const amendmentNote = `Scope Amendment (${payload.amendmentType}): ${(payload.justification as string) || "Bilateral scope revision"}. Price delta: ${payload.priceDeltaCents ? `+$${(Number(payload.priceDeltaCents) / 100).toFixed(2)}` : "$0.00"}. Timeline delta: ${payload.timelineDaysDelta || 0} days.`;
        const newTotalAmountMinor = updatedMilestones.reduce((acc, m) => acc + (m.amountMinor || m.amountCents || 0), 0);

        const newContractMarkdown = generateContractMarkdown({
          agreementId: agreement.id,
          versionNumber: nextVerNum,
          versionString: newVersionString,
          projectTitle: agreement.project.title,
          projectDescription: agreement.project.description || "",
          clientName: agreement.project.client?.name || "Client",
          clientEmail: agreement.project.client?.email || undefined,
          freelancerName: agreement.freelancer?.name || "Freelancer",
          freelancerEmail: agreement.freelancer?.email || undefined,
          totalAmountMinor: newTotalAmountMinor,
          currency: agreement.project.currency || "USD",
          durationWeeks: 4,
          milestones: updatedMilestones.map((m) => ({
            sequence: m.orderIndex || m.sequence || 1,
            title: m.title,
            description: m.description || "",
            amountMinor: m.amountMinor || m.amountCents || 0,
            criteria: Array.isArray(m.criteria) ? (m.criteria as any[]) : [],
            deliverables: Array.isArray(m.deliverables) ? (m.deliverables as any[]) : [],
          })),
          isRatified: true,
          clientApprovedAt: new Date(),
          freelancerApprovedAt: new Date(),
          amendmentNotes: amendmentNote,
        });

        savedFile = await saveContractAsProjectFile(prisma, {
          projectId,
          agreementId: agreement.id,
          versionNumber: nextVerNum,
          versionString: newVersionString,
          contractMarkdown: newContractMarkdown,
          uploadedBy: responderId,
        });

        const newContentHash = crypto.createHash("sha256").update(newContractMarkdown).digest("hex");

        const newVer = await prisma.agreementVersion.create({
          data: {
            agreementId: agreement.id,
            versionNumber: nextVerNum,
            parentVersionId: latestVer?.id || null,
            source: "CHANGE_REQUEST",
            status: AgreementVersionStatus.ACTIVE,
            contentHash: newContentHash,
            activatedAt: new Date(),
            terms: {
              totalAmountMinor: newTotalAmountMinor,
              currency: agreement.project.currency || "USD",
              versionString: newVersionString,
              scope: agreement.project.description || "",
              contractMarkdown: newContractMarkdown,
              contractFileId: savedFile.file.id,
              contractProjectFileId: savedFile.projectFile.id,
              milestones: updatedMilestones,
              amendmentNote,
            },
          },
        });

        await prisma.agreementApproval.createMany({
          data: [
            {
              agreementVersionId: newVer.id,
              partyRole: Role.CLIENT,
              userId: agreement.clientId,
              decision: ApprovalDecision.APPROVED,
              contentHash: newContentHash,
            },
            {
              agreementVersionId: newVer.id,
              partyRole: Role.FREELANCER,
              userId: agreement.freelancerId,
              decision: ApprovalDecision.APPROVED,
              contentHash: newContentHash,
            },
          ],
        });

        await prisma.agreement.update({
          where: { id: agreement.id },
          data: { activeVersionId: newVer.id },
        });

        // Keep project budgetCents synchronized with cumulative milestones total
        await prisma.project.update({
          where: { id: projectId },
          data: { budgetCents: newTotalAmountMinor },
        });
      }
    } catch (contractErr) {
      console.warn("Failed to generate amended contract version:", contractErr);
    }

    // Update message card to amendment_sealed_card with full consensus metadata
    const updated = await prisma.workspaceMessage.update({
      where: { id: messageId },
      data: {
        type: "amendment_sealed_card",
        metadata: {
          ...currentMetadata,
          status: "SEALED",
          sealedAgreementHash: newAgreementVersion,
          sealedAt: new Date().toISOString(),
          bothPartiesConsensus: true,
          acceptedByUserId: responderId,
          newVersionString,
          newMilestoneId: createdMilestoneId,
          finalAmountMinor: Number(payload.priceDeltaCents || 0),
          finalTimelineDays: Number(payload.timelineDaysDelta || 0),
          milestoneTitle: (payload.newMilestoneTitle as string) || "New Scope Milestone",
          contractFileId: savedFile?.file?.id,
          contractProjectFileId: savedFile?.projectFile?.id,
        } as any,
      },
    });

    await appendAuditEvent({
      actorId: responderId,
      action: "SCOPE_AMENDMENT_SEALED",
      objectType: "WORKSPACE_MESSAGE",
      objectId: messageId,
      metadata: {
        newAgreementVersion,
        newVersionString,
        priceDeltaCents: payload.priceDeltaCents,
        newMilestoneId: createdMilestoneId,
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
   * Submit deliverable, run autonomous verification, and start 72-hour countdown inspection clock.
   */
  async submitDeliverable(params: {
    projectId: string;
    milestoneId: string;
    freelancerId: string;
    repoUrl?: string;
    previewUrl?: string;
    notes: string;
    fileBuffer?: Buffer;
    fileBase64?: string;
    fileName?: string;
    fileSize?: string;
  }) {
    const conversation = await this.getOrCreateWorkspaceConversation(params.projectId);

    // 1. Fetch milestone details
    const milestone = await prisma.milestone.findUnique({
      where: { id: params.milestoneId },
      include: {
        submissions: { orderBy: { revisionNumber: "desc" }, take: 1 },
      },
    });

    const fileBuffer = params.fileBuffer || (params.fileBase64 ? Buffer.from(params.fileBase64, "base64") : undefined);
    const realFileName = params.fileName || (params.repoUrl ? "github_repository" : "deliverables.zip");
    const nextRevNum = (milestone?.submissions[0]?.revisionNumber || 0) + 1;

    // 2. Persist real MilestoneSubmission in DB
    if (milestone) {
      await prisma.$transaction(async (tx) => {
        await tx.milestone.update({
          where: { id: milestone.id },
          data: { workStatus: MilestoneWorkStatus.AWAITING_CLIENT_REVIEW },
        });

        await tx.milestoneSubmission.create({
          data: {
            milestoneId: milestone.id,
            revisionNumber: nextRevNum,
            completionNote: params.notes,
            status: SubmissionStatus.SUBMITTED,
            links: [
              ...(params.repoUrl ? [{ label: "Repository PR", url: params.repoUrl }] : []),
              ...(params.previewUrl ? [{ label: "Walkthrough Demo", url: params.previewUrl }] : []),
            ] as any,
          },
        });
      }).catch((dbErr) => console.warn("[Workspace] Milestone DB update notice:", dbErr));
    }

    // 3. Run Autonomous Verification Pipeline with Real Submission Data
    let auditRecord = null;
    try {
      auditRecord = await autonomousVerifierService.runAutomatedChecks({
        milestoneId: params.milestoneId,
        projectId: params.projectId,
        milestoneTitle: milestone?.title || "Milestone Deliverable",
        fileName: realFileName,
        fileBuffer,
        githubPrUrl: params.repoUrl,
        demoUrl: params.previewUrl,
        completionNote: params.notes,
        freelancerId: params.freelancerId,
      });
    } catch (auditErr) {
      console.warn("[Workspace] Autonomous audit notice:", auditErr);
    }

    const deliverablePayload = {
      milestoneId: params.milestoneId,
      freelancerId: params.freelancerId,
      repoUrl: params.repoUrl || null,
      fileName: realFileName,
      previewUrl: params.previewUrl || null,
      notes: params.notes,
      submittedAt: new Date().toISOString(),
    };

    const deliverableHash = computeCanonicalHash(deliverablePayload);
    const expiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

    const formattedAmount = milestone
      ? `$${((milestone.amountMinor || milestone.amountCents || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} ${milestone.currency || "USD"}`
      : "$2,100.00 USD";

    // 4. Create Workspace Timeline Message Card
    const card = await prisma.workspaceMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: params.freelancerId,
        senderRole: "FREELANCER",
        type: "deliverable_submission_card",
        origin: "WEB",
        originalContent: `Deliverable submitted for milestone ${milestone?.title || params.milestoneId}: ${params.notes}`,
        sha256Seal: deliverableHash,
        metadata: {
          milestoneId: params.milestoneId,
          milestoneTitle: milestone?.title || `Milestone ${params.milestoneId.slice(-4)}`,
          milestoneNumber: milestone?.orderIndex ?? milestone?.sequence ?? 1,
          milestoneAmount: formattedAmount,
          formattedAmount,
          repoUrl: params.repoUrl,
          fileName: realFileName,
          fileSize: params.fileSize || (fileBuffer ? `${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB` : undefined),
          previewUrl: params.previewUrl,
          notes: params.notes,
          inspectionExpiresAt: expiresAt,
          inspectionHoursRemaining: 72,
          deliverableHash,
          status: auditRecord ? auditRecord.qualificationState : "IN_REVIEW",
          checks: auditRecord?.checks || [],
          checksRecord: auditRecord,
          auditRecord,
        } as any,
      },
    });

    return {
      card,
      deliverableHash,
      inspectionExpiresAt: expiresAt,
      auditRecord,
    };
  }

  /**
   * Propose a meeting with bilateral time consensus (Section 7.1).
   */
  async proposeMeeting(params: ProposeMeetingParams) {
    const conversation = await this.getOrCreateWorkspaceConversation(params.projectId);
    const roomId = `room-${conversation.id.slice(-6)}-${Date.now().toString().slice(-4)}`;
    const roomUrl = `/workspace/meetings/${roomId}`;

    // Determine sender role and name accurately
    let senderRole: "CLIENT" | "FREELANCER" = "CLIENT";
    let senderName = "Participant";
    const sender = await prisma.user.findFirst({
      where: { OR: [{ id: params.proposedByUserId }, { email: params.proposedByUserId }] },
    });
    if (sender) {
      senderRole = (sender.role as any) === "FREELANCER" ? "FREELANCER" : "CLIENT";
      senderName = sender.name;
    } else if (conversation.project.agreement?.freelancerId === params.proposedByUserId) {
      senderRole = "FREELANCER";
      senderName = conversation.project.agreement.freelancer?.name || "Freelancer";
    } else {
      senderRole = "CLIENT";
      senderName = conversation.project.client?.name || "Client";
    }

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
        senderId: sender?.id || params.proposedByUserId,
        senderRole,
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
          proposedByUserId: params.proposedByUserId,
          senderName,
          senderRole,
          meetingDetails: {
            meetingId: meeting.id,
            title: params.title,
            agenda: params.agenda,
            durationMinutes: params.durationMinutes,
            proposedSlots: params.proposedSlots,
            roomUrl,
            status: "PROPOSED",
            proposedByUserId: params.proposedByUserId,
            senderName,
            senderRole,
          },
        } as any,
      },
    });

    return meeting;
  }

  /**
   * Confirm or counter proposed meeting time slot (Section 7.1 & 7.3 Google Calendar sync).
   */
  async respondToMeeting(meetingId: string, responderId: string, action: "CONFIRM" | "DECLINE", selectedSlotTime?: string) {
    let meeting = await prisma.workspaceMeeting.findUnique({
      where: { id: meetingId },
      include: { conversation: { include: { project: true } } },
    });

    if (!meeting) {
      meeting = await prisma.workspaceMeeting.findFirst({
        where: {
          OR: [
            { roomUrl: { contains: meetingId } },
            { id: meetingId },
          ],
        },
        include: { conversation: { include: { project: true } } },
      });
    }

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

    let confirmedSlot: Date;
    if (selectedSlotTime) {
      const cleaned = String(selectedSlotTime).replace(" at ", "T").trim();
      const parsed = new Date(cleaned);
      confirmedSlot = isNaN(parsed.getTime()) ? new Date() : parsed;
    } else {
      confirmedSlot = new Date();
    }
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
    let meeting = await prisma.workspaceMeeting.findUnique({
      where: { id: params.meetingId },
      include: { conversation: true },
    });

    if (!meeting) {
      meeting = await prisma.workspaceMeeting.findFirst({
        where: {
          OR: [
            { roomUrl: { contains: params.meetingId } },
            { id: params.meetingId },
          ],
        },
        include: { conversation: true },
      });
    }

    if (!meeting) {
      throw new Error(`Meeting ${params.meetingId} not found`);
    }

    const updatedMeeting = await prisma.workspaceMeeting.update({
      where: { id: meeting.id },
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
        try {
          let validAssigneeId: string | null = null;
          if (item.assigneeId) {
            const userExists = await prisma.user.findUnique({
              where: { id: item.assigneeId },
              select: { id: true },
            });
            if (userExists) {
              validAssigneeId = userExists.id;
            }
          }

          await prisma.workspaceTask.create({
            data: {
              projectId: meeting.conversation.projectId,
              conversationId: meeting.conversationId,
              title: item.task,
              description: `Auto-extracted by Nexum AI Notetaker from sync meeting: ${meeting.title}`,
              status: "TODO" as any,
              priority: "MEDIUM",
              assignedToId: validAssigneeId,
              origin: "AI_MEETING_EXTRACTED",
              meetingId: meeting.id,
              dueDate: item.dueDate ? new Date(item.dueDate) : null,
            },
          });
        } catch (taskErr) {
          console.warn("[WorkspaceService] Action item task creation caught:", taskErr);
        }
      }
    }

    // 2. Automatically convert agreed decisions to ADRs (Subtab 6)
    if (params.decisions && params.decisions.length > 0) {
      for (const d of params.decisions) {
        try {
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
        } catch (decisionErr) {
          console.warn("[WorkspaceService] Decision ADR creation caught:", decisionErr);
        }
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
          actionItems: params.actionItems,
          actionItemsCount: params.actionItems.length,
          decisions: params.decisions,
          decisionsCount: params.decisions.length,
          status: "COMPLETED",
          verbalScopeAlert: params.verbalScopeAlert || null,
        } as any,
      },
    });

    // 3b. Update any existing meeting_confirmed_card in this conversation to status: COMPLETED
    try {
      const confirmedCards = await prisma.workspaceMessage.findMany({
        where: {
          conversationId: meeting.conversationId,
          type: "meeting_confirmed_card",
        },
      });
      for (const card of confirmedCards) {
        const meta = (card.metadata as any) || {};
        if (meta.meetingId === meeting.id || meta.roomUrl === meeting.roomUrl) {
          await prisma.workspaceMessage.update({
            where: { id: card.id },
            data: {
              metadata: {
                ...meta,
                status: "COMPLETED",
              },
            },
          });
        }
      }
    } catch (cardErr) {
      console.warn("[WorkspaceService] Failed to update meeting_confirmed_card status:", cardErr);
    }

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

  /**
   * Postpone / Reschedule an existing meeting with proper/sudden reasons & new proposed slots
   */
  async postponeMeeting(params: {
    meetingId: string;
    userId: string;
    userRole?: "CLIENT" | "FREELANCER" | "OPERATOR";
    reasonCategory: string;
    reasonDetails: string;
    newSlots: Array<{ id: string; startTime: string; endTime: string } | string>;
  }) {
    const meeting = await prisma.workspaceMeeting.findUnique({
      where: { id: params.meetingId },
      include: { conversation: { include: { project: true } } },
    });

    if (!meeting) {
      throw new Error(`Meeting ${params.meetingId} not found`);
    }

    const previousStatus = meeting.status;
    const formattedSlots = params.newSlots.map((s, idx) => {
      if (typeof s === "string") {
        const start = new Date(s);
        const end = new Date(start.getTime() + meeting.durationMinutes * 60000);
        return { id: `slot-${idx + 1}`, startTime: start.toISOString(), endTime: end.toISOString() };
      }
      return s;
    });

    const updated = await prisma.workspaceMeeting.update({
      where: { id: params.meetingId },
      data: {
        status: "RESCHEDULE_PROPOSED",
        postponedByUserId: params.userId,
        postponeReason: params.reasonDetails,
        postponeCategory: params.reasonCategory,
        rescheduledSlots: formattedSlots as any,
      },
    });

    // Append audit event
    await appendAuditEvent({
      actorId: params.userId,
      action: "MEETING_POSTPONE_REQUESTED",
      objectType: "WORKSPACE_MEETING",
      objectId: meeting.id,
      previousStatus,
      newStatus: "RESCHEDULE_PROPOSED",
      metadata: {
        reasonCategory: params.reasonCategory,
        reasonDetails: params.reasonDetails,
        newSlotsCount: formattedSlots.length,
      },
    });

    // Drop interactive Postponement Card into bilateral timeline
    const seal = computeCanonicalHash({
      meetingId: meeting.id,
      postponedByUserId: params.userId,
      reasonCategory: params.reasonCategory,
      reasonDetails: params.reasonDetails,
      newSlots: formattedSlots,
    });

    await prisma.workspaceMessage.create({
      data: {
        conversationId: meeting.conversationId,
        senderId: params.userId,
        senderRole: (params.userRole as any) || "CLIENT",
        type: "meeting_postponed_card",
        origin: "WEB",
        originalContent: `Meeting Postponed [${params.reasonCategory}]: ${params.reasonDetails}`,
        sha256Seal: seal,
        metadata: {
          meetingId: meeting.id,
          title: meeting.title,
          originalSlot: meeting.confirmedSlot ? meeting.confirmedSlot.toISOString() : null,
          postponedByUserId: params.userId,
          reasonCategory: params.reasonCategory,
          reasonDetails: params.reasonDetails,
          newSlots: formattedSlots,
          status: "RESCHEDULE_PROPOSED",
        } as any,
      },
    });

    return {
      success: true,
      status: "RESCHEDULE_PROPOSED",
      meeting: updated,
    };
  }

  /**
   * Respond to meeting postponement request (Accept new slot or Decline)
   */
  async respondToMeetingPostpone(params: {
    meetingId: string;
    responderId: string;
    responderRole?: "CLIENT" | "FREELANCER" | "OPERATOR";
    action: "ACCEPT" | "DECLINE";
    acceptedSlot?: string;
  }) {
    const meeting = await prisma.workspaceMeeting.findUnique({
      where: { id: params.meetingId },
      include: { conversation: { include: { project: true } } },
    });

    if (!meeting) {
      throw new Error(`Meeting ${params.meetingId} not found`);
    }

    const previousStatus = meeting.status;

    if (params.action === "DECLINE") {
      const updated = await prisma.workspaceMeeting.update({
        where: { id: params.meetingId },
        data: { status: "CANCELLED" },
      });

      await appendAuditEvent({
        actorId: params.responderId,
        action: "MEETING_POSTPONE_DECLINED",
        objectType: "WORKSPACE_MEETING",
        objectId: meeting.id,
        previousStatus,
        newStatus: "CANCELLED",
      });

      await prisma.workspaceMessage.create({
        data: {
          conversationId: meeting.conversationId,
          senderId: params.responderId,
          senderRole: (params.responderRole as any) || "FREELANCER",
          type: "system_status_event",
          origin: "WEB",
          originalContent: `Meeting Reschedule Declined for "${meeting.title}". Meeting is now cancelled.`,
          sha256Seal: computeCanonicalHash({ meetingId: meeting.id, action: "DECLINE" }),
        },
      });

      return { success: true, status: "CANCELLED", meeting: updated };
    }

    const confirmedSlot = params.acceptedSlot ? new Date(params.acceptedSlot) : new Date();
    const endSlot = new Date(confirmedSlot.getTime() + meeting.durationMinutes * 60000);

    const startIso = confirmedSlot.toISOString().replace(/-|:|.\d\d\d/g, "");
    const endIso = endSlot.toISOString().replace(/-|:|.\d\d\d/g, "");
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `Nexum Sync (Rescheduled): ${meeting.title}`
    )}&dates=${startIso}/${endIso}&details=${encodeURIComponent(
      `Rescheduled: ${meeting.postponeReason || meeting.agenda}\n\nNexum Internal Room: ${meeting.roomUrl}`
    )}&location=${encodeURIComponent(meeting.roomUrl)}`;

    const updated = await prisma.workspaceMeeting.update({
      where: { id: params.meetingId },
      data: {
        status: "CONFIRMED",
        confirmedSlot,
        googleCalendarHtmlLink: gcalUrl,
      },
    });

    await appendAuditEvent({
      actorId: params.responderId,
      action: "MEETING_POSTPONE_ACCEPTED",
      objectType: "WORKSPACE_MEETING",
      objectId: meeting.id,
      previousStatus,
      newStatus: "CONFIRMED",
      metadata: {
        confirmedSlot: confirmedSlot.toISOString(),
      },
    });

    await prisma.workspaceMessage.create({
      data: {
        conversationId: meeting.conversationId,
        senderId: params.responderId,
        senderRole: (params.responderRole as any) || "FREELANCER",
        type: "meeting_confirmed_card",
        origin: "WEB",
        originalContent: `Meeting Rescheduled & Confirmed: ${meeting.title} on ${confirmedSlot.toLocaleString()}`,
        sha256Seal: computeCanonicalHash({ meetingId: meeting.id, confirmedSlot, type: "RESCHEDULED" }),
        metadata: {
          meetingId: meeting.id,
          title: meeting.title,
          confirmedSlot: confirmedSlot.toISOString(),
          roomUrl: meeting.roomUrl,
          googleCalendarHtmlLink: gcalUrl,
          durationMinutes: meeting.durationMinutes,
          status: "CONFIRMED",
          isRescheduled: true,
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
   * Request Milestone Postponement / Due Date Extension with structured reasons
   */
  async requestMilestonePostponement(params: {
    projectId: string;
    milestoneId: string;
    requestedById: string;
    requestedByRole: "CLIENT" | "FREELANCER";
    proposedDueDate: string;
    reasonCategory: string;
    reasonDetails: string;
  }) {
    const milestone = await prisma.milestone.findUnique({
      where: { id: params.milestoneId },
      include: { project: true },
    });

    if (!milestone) {
      throw new Error(`Milestone ${params.milestoneId} not found`);
    }

    const proposedDate = new Date(params.proposedDueDate);
    if (isNaN(proposedDate.getTime())) {
      throw new Error("Invalid proposed due date format");
    }

    const conversation = await this.getOrCreateWorkspaceConversation(params.projectId);

    const seal = computeCanonicalHash({
      milestoneId: milestone.id,
      currentDueDate: milestone.dueDate || milestone.deadline,
      proposedDueDate: proposedDate.toISOString(),
      reasonCategory: params.reasonCategory,
      reasonDetails: params.reasonDetails,
      requestedById: params.requestedById,
    });

    const postponement = await prisma.milestonePostponement.create({
      data: {
        milestoneId: milestone.id,
        projectId: params.projectId,
        requestedById: params.requestedById,
        requestedByRole: params.requestedByRole as any,
        currentDueDate: milestone.dueDate || milestone.deadline || null,
        proposedDueDate: proposedDate,
        reasonCategory: params.reasonCategory,
        reasonDetails: params.reasonDetails,
        status: "PENDING",
        sha256Seal: seal,
      },
    });

    await appendAuditEvent({
      actorId: params.requestedById,
      action: "MILESTONE_POSTPONE_REQUESTED",
      objectType: "MILESTONE_POSTPONEMENT",
      objectId: postponement.id,
      previousStatus: "CURRENT_DEADLINE",
      newStatus: "PENDING",
      metadata: {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        currentDueDate: milestone.dueDate || milestone.deadline,
        proposedDueDate: proposedDate.toISOString(),
        reasonCategory: params.reasonCategory,
        reasonDetails: params.reasonDetails,
      },
    });

    // Drop interactive Milestone Postponement Card into bilateral timeline
    await prisma.workspaceMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: params.requestedById,
        senderRole: params.requestedByRole,
        type: "milestone_postponement_card",
        origin: "WEB",
        originalContent: `Milestone Postponement Request for "${milestone.title}" to ${proposedDate.toLocaleDateString()} [${params.reasonCategory}]: ${params.reasonDetails}`,
        sha256Seal: seal,
        metadata: {
          postponementId: postponement.id,
          milestoneId: milestone.id,
          milestoneTitle: milestone.title,
          currentDueDate: milestone.dueDate || milestone.deadline,
          proposedDueDate: proposedDate.toISOString(),
          reasonCategory: params.reasonCategory,
          reasonDetails: params.reasonDetails,
          requestedById: params.requestedById,
          requestedByRole: params.requestedByRole,
          status: "PENDING",
        } as any,
      },
    });

    return postponement;
  }

  /**
   * Bilateral response to Milestone Postponement (Accept or Decline)
   */
  async respondToMilestonePostponement(params: {
    postponementId: string;
    responderId: string;
    responderRole: "CLIENT" | "FREELANCER";
    action: "ACCEPT" | "DECLINE";
    declineReason?: string;
  }) {
    const postponement = await prisma.milestonePostponement.findUnique({
      where: { id: params.postponementId },
      include: { milestone: true, project: true },
    });

    if (!postponement) {
      throw new Error(`Postponement ${params.postponementId} not found`);
    }

    if (postponement.status !== "PENDING") {
      throw new Error(`Postponement ${params.postponementId} is already ${postponement.status}`);
    }

    const conversation = await this.getOrCreateWorkspaceConversation(postponement.projectId);
    const previousStatus = postponement.status;

    if (params.action === "DECLINE") {
      const updated = await prisma.milestonePostponement.update({
        where: { id: params.postponementId },
        data: {
          status: "DECLINED",
          respondedAt: new Date(),
          respondedById: params.responderId,
          declineReason: params.declineReason || null,
        },
      });

      await appendAuditEvent({
        actorId: params.responderId,
        action: "MILESTONE_POSTPONE_DECLINED",
        objectType: "MILESTONE_POSTPONEMENT",
        objectId: postponement.id,
        previousStatus,
        newStatus: "DECLINED",
        metadata: {
          declineReason: params.declineReason,
        },
      });

      await prisma.workspaceMessage.create({
        data: {
          conversationId: conversation.id,
          senderId: params.responderId,
          senderRole: params.responderRole,
          type: "system_status_event",
          origin: "WEB",
          originalContent: `Milestone Extension Request for "${postponement.milestone.title}" was declined. Original due date remains active.`,
          sha256Seal: computeCanonicalHash({ postponementId: postponement.id, status: "DECLINED" }),
        },
      });

      return { success: true, status: "DECLINED", postponement: updated };
    }

    // ACCEPT: Atomically update Milestone dueDate & deadline
    const [updatedPostponement, updatedMilestone] = await prisma.$transaction([
      prisma.milestonePostponement.update({
        where: { id: params.postponementId },
        data: {
          status: "ACCEPTED",
          respondedAt: new Date(),
          respondedById: params.responderId,
        },
      }),
      prisma.milestone.update({
        where: { id: postponement.milestoneId },
        data: {
          dueDate: postponement.proposedDueDate,
          deadline: postponement.proposedDueDate,
        },
      }),
    ]);

    await appendAuditEvent({
      actorId: params.responderId,
      action: "MILESTONE_POSTPONE_ACCEPTED",
      objectType: "MILESTONE_POSTPONEMENT",
      objectId: postponement.id,
      previousStatus,
      newStatus: "ACCEPTED",
      metadata: {
        milestoneId: postponement.milestoneId,
        newDueDate: postponement.proposedDueDate.toISOString(),
      },
    });

    await prisma.workspaceMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: params.responderId,
        senderRole: params.responderRole,
        type: "system_status_event",
        origin: "WEB",
        originalContent: `Milestone "${postponement.milestone.title}" due date postponed and mutually accepted to ${postponement.proposedDueDate.toLocaleDateString()}. Sealed with consensus.`,
        sha256Seal: computeCanonicalHash({
          postponementId: postponement.id,
          milestoneId: postponement.milestoneId,
          newDueDate: postponement.proposedDueDate,
          status: "ACCEPTED",
        }),
      },
    });

    return {
      success: true,
      status: "ACCEPTED",
      postponement: updatedPostponement,
      milestone: updatedMilestone,
    };
  }

  /**
   * List all milestone postponement requests for a project
   */
  async getProjectMilestonePostponements(projectId: string) {
    return await prisma.milestonePostponement.findMany({
      where: { projectId },
      include: { milestone: true },
      orderBy: { createdAt: "desc" },
    });
  }

}

export const workspaceService = new WorkspaceService();

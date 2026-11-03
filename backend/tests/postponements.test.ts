import { describe, it, expect, beforeAll } from "vitest";
import prisma from "../src/prisma.js";
import { workspaceService } from "../src/services/workspaceService.js";

describe("Phase 10: Bilateral Postponement Engine (Meetings & Milestones)", () => {
  let testProjectId: string;
  let testClientId: string;
  let testFreelancerId: string;
  let testMilestoneId: string;
  let testMeetingId: string;

  beforeAll(async () => {
    // 1. Find or create test users
    const clientUser = await prisma.user.findFirst({
      where: { role: "CLIENT" },
    });
    const freelancerUser = await prisma.user.findFirst({
      where: { role: "FREELANCER" },
    });

    testClientId = clientUser?.id || "usr_client_alex";
    testFreelancerId = freelancerUser?.id || "usr_freelancer_rohan";

    // 2. Find or create a test project with a milestone
    let project = await prisma.project.findFirst({
      where: { clientId: testClientId },
      include: { projectMilestones: true },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          clientId: testClientId,
          title: "Postponement Verification Project",
          description: "Integration test fixture for meeting and milestone postponement engine",
          state: "ACTIVE",
          budgetCents: 500000,
        },
        include: { projectMilestones: true },
      });
    }

    testProjectId = project.id;

    // 3. Find or create milestone
    if (project.projectMilestones.length > 0) {
      testMilestoneId = project.projectMilestones[0].id;
    } else {
      const ms = await prisma.milestone.create({
        data: {
          projectId: testProjectId,
          title: "Milestone 1: Prototype Engine",
          description: "Initial deliverable for verification",
          dueDate: new Date(Date.now() + 7 * 86400 * 1000),
          deadline: new Date(Date.now() + 7 * 86400 * 1000),
          amountCents: 250000,
          amountMinor: 250000,
          currency: "USD",
          workStatus: "IN_PROGRESS",
          state: "NOT_STARTED",
        },
      });
      testMilestoneId = ms.id;
    }

    // 4. Propose an initial test meeting
    const slot1 = new Date(Date.now() + 86400 * 1000).toISOString();
    const meeting = await workspaceService.proposeMeeting({
      projectId: testProjectId,
      proposedByUserId: testClientId,
      title: "Architecture & Sprint Check-in",
      agenda: "Review architecture diagram and API spec",
      durationMinutes: 30,
      proposedSlots: [
        {
          id: "slot-initial-1",
          startTime: slot1,
          endTime: new Date(Date.now() + 86400 * 1000 + 1800 * 1000).toISOString(),
        },
      ],
    });
    testMeetingId = meeting.id;
  });

  describe("1. Meeting Postponement with Proper / Sudden Reasons", () => {
    it("should successfully request meeting postponement due to a sudden medical emergency", async () => {
      const newSlot1 = new Date(Date.now() + 3 * 86400 * 1000).toISOString();
      const newSlot2 = new Date(Date.now() + 4 * 86400 * 1000).toISOString();

      const result = await workspaceService.postponeMeeting({
        meetingId: testMeetingId,
        userId: testFreelancerId,
        userRole: "FREELANCER",
        reasonCategory: "SUDDEN_EMERGENCY",
        reasonDetails: "Sudden acute health emergency, hospitalized overnight. Need to reschedule sync call.",
        newSlots: [newSlot1, newSlot2],
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("RESCHEDULE_PROPOSED");
      expect(result.meeting.postponeCategory).toBe("SUDDEN_EMERGENCY");
      expect(result.meeting.postponeReason).toContain("Sudden acute health emergency");
      expect(Array.isArray(result.meeting.rescheduledSlots)).toBe(true);

      // Verify audit event exists
      const audit = await prisma.auditEvent.findFirst({
        where: {
          objectId: testMeetingId,
          action: "MEETING_POSTPONE_REQUESTED",
        },
        orderBy: { timestamp: "desc" },
      });
      expect(audit).not.toBeNull();
      expect(audit?.actorId).toBe(testFreelancerId);

      // Verify timeline message card
      const conversation = await workspaceService.getOrCreateWorkspaceConversation(testProjectId);
      const card = await prisma.workspaceMessage.findFirst({
        where: {
          conversationId: conversation.id,
          type: "meeting_postponed_card",
        },
        orderBy: { createdAt: "desc" },
      });
      expect(card).not.toBeNull();
      expect(card?.originalContent).toContain("[SUDDEN_EMERGENCY]");
    });

    it("should allow counterparty to accept the proposed rescheduled meeting slot", async () => {
      const meeting = await prisma.workspaceMeeting.findUnique({
        where: { id: testMeetingId },
      });
      const slots = meeting?.rescheduledSlots as any[];
      const chosenSlot = slots[0].startTime;

      const responseResult = await workspaceService.respondToMeetingPostpone({
        meetingId: testMeetingId,
        responderId: testClientId,
        responderRole: "CLIENT",
        action: "ACCEPT",
        acceptedSlot: chosenSlot,
      });

      expect(responseResult.success).toBe(true);
      expect(responseResult.status).toBe("CONFIRMED");
      expect(responseResult.meeting.status).toBe("CONFIRMED");
      expect(responseResult.googleCalendarHtmlLink).toContain("calendar.google.com");

      // Verify audit event
      const audit = await prisma.auditEvent.findFirst({
        where: {
          objectId: testMeetingId,
          action: "MEETING_POSTPONE_ACCEPTED",
        },
        orderBy: { timestamp: "desc" },
      });
      expect(audit).not.toBeNull();
    });

    it("should allow counterparty to decline a rescheduled meeting and cancel cleanly", async () => {
      // Propose another meeting to test decline
      const m2 = await workspaceService.proposeMeeting({
        projectId: testProjectId,
        proposedByUserId: testClientId,
        title: "Sprint Review Call 2",
        agenda: "Check sprint items",
        durationMinutes: 45,
        proposedSlots: [{
          id: "slot-dec-1",
          startTime: new Date(Date.now() + 2 * 86400 * 1000).toISOString(),
          endTime: new Date(Date.now() + 2 * 86400 * 1000 + 2700 * 1000).toISOString(),
        }],
      });

      await workspaceService.postponeMeeting({
        meetingId: m2.id,
        userId: testClientId,
        reasonCategory: "CLIENT_CONFLICT",
        reasonDetails: "Board meeting overlap, rescheduling required.",
        newSlots: [new Date(Date.now() + 5 * 86400 * 1000).toISOString()],
      });

      const declineRes = await workspaceService.respondToMeetingPostpone({
        meetingId: m2.id,
        responderId: testFreelancerId,
        action: "DECLINE",
      });

      expect(declineRes.success).toBe(true);
      expect(declineRes.status).toBe("CANCELLED");
      expect(declineRes.meeting.status).toBe("CANCELLED");
    });
  });

  describe("2. Milestone Postponement with Structured Reasons & Bilateral Acceptance", () => {
    let createdPostponementId: string;

    it("should create a formal milestone postponement request with proper category and details", async () => {
      const initialMilestone = await prisma.milestone.findUnique({
        where: { id: testMilestoneId },
      });

      const proposedDate = new Date(Date.now() + 14 * 86400 * 1000).toISOString();

      const postponement = await workspaceService.requestMilestonePostponement({
        projectId: testProjectId,
        milestoneId: testMilestoneId,
        requestedById: testFreelancerId,
        requestedByRole: "FREELANCER",
        proposedDueDate: proposedDate,
        reasonCategory: "TECHNICAL_BLOCKER",
        reasonDetails: "Third-party payment gateway sandbox credentials pending partner compliance check. Need 7-day buffer.",
      });

      createdPostponementId = postponement.id;
      expect(postponement.id).toBeDefined();
      expect(postponement.status).toBe("PENDING");
      expect(postponement.reasonCategory).toBe("TECHNICAL_BLOCKER");
      expect(postponement.reasonDetails).toContain("payment gateway sandbox credentials");
      expect(postponement.sha256Seal).toBeDefined();

      // Verify audit event
      const audit = await prisma.auditEvent.findFirst({
        where: {
          objectId: postponement.id,
          action: "MILESTONE_POSTPONE_REQUESTED",
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.actorId).toBe(testFreelancerId);

      // Verify timeline message card
      const conversation = await workspaceService.getOrCreateWorkspaceConversation(testProjectId);
      const card = await prisma.workspaceMessage.findFirst({
        where: {
          conversationId: conversation.id,
          type: "milestone_postponement_card",
        },
        orderBy: { createdAt: "desc" },
      });
      expect(card).not.toBeNull();
      expect(card?.originalContent).toContain("[TECHNICAL_BLOCKER]");
    });

    it("should list milestone postponements for the project", async () => {
      const list = await workspaceService.getProjectMilestonePostponements(testProjectId);
      expect(Array.isArray(list)).toBe(true);
      expect(list.some((p) => p.id === createdPostponementId)).toBe(true);
    });

    it("should allow counterparty (Client) to accept postponement, updating milestone dueDate", async () => {
      const acceptResult = await workspaceService.respondToMilestonePostponement({
        postponementId: createdPostponementId,
        responderId: testClientId,
        responderRole: "CLIENT",
        action: "ACCEPT",
      });

      expect(acceptResult.success).toBe(true);
      expect(acceptResult.status).toBe("ACCEPTED");
      expect(acceptResult.postponement.status).toBe("ACCEPTED");

      // Verify milestone dueDate was actually updated in PostgreSQL
      const updatedMs = await prisma.milestone.findUnique({
        where: { id: testMilestoneId },
      });
      expect(updatedMs?.dueDate?.toISOString()).toBe(
        acceptResult.postponement.proposedDueDate.toISOString()
      );

      // Verify audit event
      const audit = await prisma.auditEvent.findFirst({
        where: {
          objectId: createdPostponementId,
          action: "MILESTONE_POSTPONE_ACCEPTED",
        },
      });
      expect(audit).not.toBeNull();
    });

    it("should reject double response on an already resolved postponement", async () => {
      await expect(
        workspaceService.respondToMilestonePostponement({
          postponementId: createdPostponementId,
          responderId: testClientId,
          responderRole: "CLIENT",
          action: "ACCEPT",
        })
      ).rejects.toThrow(/already ACCEPTED/);
    });

    it("should allow counterparty to decline milestone postponement with feedback", async () => {
      const proposedDate2 = new Date(Date.now() + 21 * 86400 * 1000).toISOString();

      const p2 = await workspaceService.requestMilestonePostponement({
        projectId: testProjectId,
        milestoneId: testMilestoneId,
        requestedById: testFreelancerId,
        requestedByRole: "FREELANCER",
        proposedDueDate: proposedDate2,
        reasonCategory: "PERSONAL_LEAVE",
        reasonDetails: "Requesting additional 14 days personal leave.",
      });

      const declineRes = await workspaceService.respondToMilestonePostponement({
        postponementId: p2.id,
        responderId: testClientId,
        responderRole: "CLIENT",
        action: "DECLINE",
        declineReason: "Launch deadline is locked with client board. Cannot delay by 14 days.",
      });

      expect(declineRes.success).toBe(true);
      expect(declineRes.status).toBe("DECLINED");
      expect(declineRes.postponement.declineReason).toContain("Launch deadline is locked");

      // Verify milestone dueDate was NOT updated
      const finalMs = await prisma.milestone.findUnique({
        where: { id: testMilestoneId },
      });
      expect(finalMs?.dueDate?.toISOString()).not.toBe(new Date(proposedDate2).toISOString());

      // Verify decline audit event
      const audit = await prisma.auditEvent.findFirst({
        where: {
          objectId: p2.id,
          action: "MILESTONE_POSTPONE_DECLINED",
        },
      });
      expect(audit).not.toBeNull();
    });
  });
});


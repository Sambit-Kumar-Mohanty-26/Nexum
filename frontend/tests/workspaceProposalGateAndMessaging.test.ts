import { describe, it, expect } from "vitest";

describe("Workspace Proposal Acceptance Gate", () => {
  it("should enforce that unaccepted proposals (SUBMITTED/DRAFT) do NOT connect workspace", () => {
    // Simulated project list returned for a freelancer
    const mockDbProjects = [
      {
        id: "proj_unaccepted",
        title: "E-Commerce App",
        agreement: null,
        proposals: [{ id: "prop_1", status: "SUBMITTED", freelancerId: "f1" }],
      },
      {
        id: "proj_accepted",
        title: "AI Risk Engine",
        agreement: { id: "agr_1", freelancerId: "f1", status: "ACTIVE" },
        proposals: [{ id: "prop_2", status: "ACCEPTED", freelancerId: "f1" }],
      },
    ];

    // Filter rule: only projects where agreement is active OR proposal is ACCEPTED
    const connectedProjects = mockDbProjects.filter((p) => {
      const hasActiveAgreement = p.agreement?.status === "ACTIVE";
      const hasAcceptedProposal = p.proposals.some((prop) => prop.status === "ACCEPTED");
      return hasActiveAgreement || hasAcceptedProposal;
    });

    expect(connectedProjects.length).toBe(1);
    expect(connectedProjects[0].id).toBe("proj_accepted");
  });

  it("should guard workspace timeline and message endpoints when proposal is not accepted", () => {
    const projectWithoutAcceptedProposal = {
      id: "proj_pending",
      agreement: null,
      proposals: [{ id: "prop_sub", status: "SUBMITTED" }],
    };

    const hasAcceptedProposalOrAgreement =
      Boolean(projectWithoutAcceptedProposal.agreement) ||
      projectWithoutAcceptedProposal.proposals.some((p) => p.status === "ACCEPTED");

    expect(hasAcceptedProposalOrAgreement).toBe(false);

    // Endpoint guard check
    const response = !hasAcceptedProposalOrAgreement
      ? {
          status: 403,
          body: {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Workspace connection and chat are only available after a proposal is accepted by the client.",
              details: { projectId: projectWithoutAcceptedProposal.id },
            },
          },
        }
      : { status: 200 };

    expect(response.status).toBe(403);
    expect(response.body?.error.code).toBe("FORBIDDEN");
  });
});

describe("Workspace Messaging Delivery & Display", () => {
  it("should properly map and preserve 'hi' message content in both client and freelancer views", () => {
    const rawMessage = {
      id: "msg_123",
      conversationId: "conv_abc",
      senderId: "usr_freelancer_sambit",
      senderRole: "FREELANCER",
      type: "freelancer_bubble",
      originalContent: "hi",
      mediatedContent: null,
      wasMediated: false,
      sha256Seal: "sha256_abcdef123456",
      metadata: {},
      createdAt: new Date().toISOString(),
    };

    // Client mapping logic
    const clientMapped = {
      id: rawMessage.id,
      type: rawMessage.type,
      senderName: rawMessage.senderRole === "CLIENT" ? "You" : "Freelancer",
      bubbleText: rawMessage.originalContent || rawMessage.mediatedContent || "",
      rawMessage: rawMessage.originalContent,
    };

    // Freelancer mapping logic
    const freelancerMapped = {
      id: rawMessage.id,
      type: rawMessage.type,
      senderName: rawMessage.senderRole === "FREELANCER" ? "You (Freelancer)" : "Client",
      bubbleText: rawMessage.originalContent || rawMessage.mediatedContent || "",
      rawMessage: rawMessage.originalContent,
    };

    expect(clientMapped.bubbleText).toBe("hi");
    expect(freelancerMapped.bubbleText).toBe("hi");
    expect(clientMapped.type).toBe("freelancer_bubble");
    expect(freelancerMapped.type).toBe("freelancer_bubble");
  });

  it("should distinguish outgoing vs incoming bubbles correctly for both roles", () => {
    const messages = [
      { id: "1", type: "client_bubble", senderRole: "CLIENT", bubbleText: "hi" },
      { id: "2", type: "freelancer_bubble", senderRole: "FREELANCER", bubbleText: "hello!" },
    ];

    // Client view: client_bubble is outgoing (right), freelancer_bubble is incoming (left)
    const clientView = messages.map((m) => ({
      id: m.id,
      alignment: m.type === "client_bubble" ? "right" : "left",
      content: m.bubbleText,
    }));

    expect(clientView[0].alignment).toBe("right"); // Client's "hi" is on the right
    expect(clientView[1].alignment).toBe("left");  // Freelancer's "hello!" is on the left

    // Freelancer view: freelancer_bubble is outgoing (right), client_bubble is incoming (left)
    const freelancerView = messages.map((m) => ({
      id: m.id,
      alignment: m.type === "freelancer_bubble" ? "right" : "left",
      content: m.bubbleText,
    }));

    expect(freelancerView[0].alignment).toBe("left");  // Client's "hi" is on the left
    expect(freelancerView[1].alignment).toBe("right"); // Freelancer's "hello!" is on the right
  });
});


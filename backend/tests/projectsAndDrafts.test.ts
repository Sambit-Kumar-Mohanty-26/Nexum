import { describe, it, expect, beforeEach } from "vitest";
import { clientOverviewService } from "../src/services/clientOverviewService.js";

describe("Projects & Drafts Lifecycle with Consensus Spec", () => {
  beforeEach(() => {
    clientOverviewService.reset();
  });

  it("should create, list, resume, update, and delete a draft project", async () => {
    const clientId = "usr_client_draft_tester";

    // 1. Initial state for fresh user should be empty
    const initial = await clientOverviewService.getProjects({ clientId });
    expect(initial.projects.length).toBe(0);
    expect(initial.stats.totalCount).toBe(0);
    expect(initial.stats.countsByStatus.DRAFT).toBe(0);

    // 2. Client saves a draft project specification
    const draft = await clientOverviewService.createProject({
      clientId,
      title: "Zero-Knowledge KYC Verification Module",
      description: "Privacy module proving accreditation without sensitive IDs.",
      state: "DRAFT",
      budgetCents: 0,
      category: "Blockchain / Web3",
      subcategory: "Smart Contracts",
      requiredSkills: ["Solidity", "Circom", "Web3.js"],
      detailedRequirements: "• Zero knowledge circuit\n• Verifier contract",
      scopeOfWork: ["Circom circuit", "Verifier contract"],
      budgetType: "FIXED",
      timelineDuration: "2 months",
      milestones: [
        { title: "M1: Circuit Design", amountCents: 150000 },
        { title: "M2: Verifier Contract", amountCents: 150000 },
      ],
    });

    expect(draft.id).toBeDefined();
    expect(draft.state).toBe("DRAFT");

    // 3. Query drafts specifically
    const draftsOnly = await clientOverviewService.getProjects({
      clientId,
      status: "DRAFT",
    });
    expect(draftsOnly.projects.length).toBe(1);
    expect(draftsOnly.projects[0].id).toBe(draft.id);
    expect(draftsOnly.projects[0].status).toBe("DRAFT");
    expect(draftsOnly.projects[0].statusLabel).toBe("Draft");
    expect(draftsOnly.projects[0].nextAction.type).toBe("RESUME");
    expect(draftsOnly.stats.totalCount).toBe(1);
    expect(draftsOnly.stats.countsByStatus.DRAFT).toBe(1);

    // 4. Retrieve draft by ID to resume in wizard
    const fetchedDraft = await clientOverviewService.getProjectById(draft.id, clientId);
    expect(fetchedDraft).toBeDefined();
    expect(fetchedDraft.title).toBe("Zero-Knowledge KYC Verification Module");
    expect(fetchedDraft.category).toBe("Blockchain / Web3");
    expect(fetchedDraft.requiredSkills).toContain("Circom");

    // 5. Update draft (e.g. user adds more requirements)
    const updatedDraft = await clientOverviewService.createProject({
      id: draft.id,
      clientId,
      title: "Zero-Knowledge KYC Verification Module (Updated)",
      description: "Updated description with audited verifier.",
      state: "DRAFT",
      budgetCents: 400000,
      category: "Blockchain / Web3",
      subcategory: "Smart Contracts",
      requiredSkills: ["Solidity", "Circom", "Web3.js", "ZK-SNARKs"],
    });

    expect(updatedDraft.id).toBe(draft.id);
    expect(updatedDraft.title).toBe("Zero-Knowledge KYC Verification Module (Updated)");

    // Total count should still be 1 (not duplicated)
    const afterUpdate = await clientOverviewService.getProjects({ clientId });
    expect(afterUpdate.stats.totalCount).toBe(1);
    expect(afterUpdate.projects[0].name).toBe("Zero-Knowledge KYC Verification Module (Updated)");

    // 6. Publish the project (converts draft to ACTIVE)
    const published = await clientOverviewService.createProject({
      id: draft.id,
      clientId,
      title: "Zero-Knowledge KYC Verification Module (Updated)",
      description: "Updated description with audited verifier.",
      state: "ACTIVE",
      budgetCents: 400000,
    });

    expect(published.state).toBe("ACTIVE");
    const afterPublish = await clientOverviewService.getProjects({ clientId });
    expect(afterPublish.stats.countsByStatus.DRAFT).toBe(0);
    expect(afterPublish.stats.countsByStatus.IN_REVIEW + afterPublish.stats.countsByStatus.IN_PROGRESS).toBe(1);

    // 7. Delete the project
    const deleteRes = await clientOverviewService.deleteProject(draft.id, clientId);
    expect(deleteRes.success).toBe(true);

    const afterDelete = await clientOverviewService.getProjects({ clientId });
    expect(afterDelete.stats.totalCount).toBe(0);
    expect(afterDelete.projects.length).toBe(0);
  });
});


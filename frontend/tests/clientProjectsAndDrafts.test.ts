import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchClientProjects,
  fetchProjectById,
  saveProject,
  deleteProject,
} from "../src/lib/api-client";

describe("Client Projects & Drafts API Client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch projects with dynamic counts and lifecycle stats", async () => {
    const mockData = {
      success: true,
      count: 8,
      data: [
        {
          id: "proj_1",
          name: "Bilateral E-Commerce Payment Rails",
          status: "IN_REVIEW",
          needsAction: true,
        },
        {
          id: "proj_5",
          name: "Zero-Knowledge KYC Verification Module",
          status: "DRAFT",
          needsAction: false,
        },
      ],
      stats: {
        totalCount: 8,
        inProgressCount: 3,
        needsActionCount: 3,
        countsByStatus: {
          ALL: 8,
          IN_PROGRESS: 2,
          IN_REVIEW: 1,
          DRAFT: 1,
        },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as any);

    const res = await fetchClientProjects({ status: "DRAFT" });
    expect(res.success).toBe(true);
    expect(res.count).toBe(8);
    expect(res.stats.needsActionCount).toBe(3);
    expect(res.stats.countsByStatus.DRAFT).toBe(1);
  });

  it("should fetch single project or draft specification by ID", async () => {
    const mockProject = {
      id: "proj_5",
      title: "Zero-Knowledge KYC Verification Module",
      state: "DRAFT",
      category: "Blockchain / Web3",
      requiredSkills: ["Solidity", "Circom"],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockProject }),
    } as any);

    const data = await fetchProjectById("proj_5");
    expect(data).toBeDefined();
    expect(data.id).toBe("proj_5");
    expect(data.title).toBe("Zero-Knowledge KYC Verification Module");
    expect(data.state).toBe("DRAFT");
    expect(data.requiredSkills).toContain("Circom");
  });

  it("should save or update a project draft with full intake specification", async () => {
    const draftPayload = {
      title: "NextGen Autonomous Mediation Agent",
      description: "AI-assisted bilateral dispute mitigation",
      state: "DRAFT",
      budgetCents: 500000,
      category: "AI / Machine Learning",
      requiredSkills: ["Next.js", "Python", "FastAPI"],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: "Draft saved successfully",
        data: { id: "prj_new_draft_123", ...draftPayload },
      }),
    } as any);

    const result = await saveProject(draftPayload);
    expect(result.success).toBe(true);
    expect(result.data?.id).toBe("prj_new_draft_123");
    expect(result.data?.state).toBe("DRAFT");
  });

  it("should delete a draft project cleanly", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Project "proj_5" successfully removed.',
      }),
    } as any);

    const result = await deleteProject("proj_5");
    expect(result.success).toBe(true);
    expect(result.message).toContain("successfully removed");
  });
});


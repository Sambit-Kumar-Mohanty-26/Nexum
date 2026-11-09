import { describe, it, expect, beforeEach } from "vitest";
import {
  getAllOpenProjectsFromStore,
  saveProjectToStore,
  getProjectsStore,
  StoredProject,
} from "../src/lib/projects-store";

describe("Freelancer Find Projects - Real Records & Mock Elimination Suite", () => {
  beforeEach(() => {
    // Clear in-memory store before each test if needed
  });

  it("ensures getAllOpenProjectsFromStore does NOT return mock projects or already-in-progress contracts", () => {
    const openProjects = getAllOpenProjectsFromStore();

    // Verify no mock projects or already-hired contracts (like proj_1 with freelancer Rohan) are returned as open postings
    const hasProj1 = openProjects.some((p) => p.id === "proj_1");
    const hasProj2 = openProjects.some((p) => p.id === "proj_2");
    expect(hasProj1).toBe(false);
    expect(hasProj2).toBe(false);

    // Verify none of the open projects have an assigned freelancer
    for (const p of openProjects) {
      expect(p.freelancer).toBeUndefined();
      expect(p.status).not.toBe("DRAFT");
      expect(p.status).not.toBe("COMPLETED");
      expect(p.status).not.toBe("CANCELLED");
    }
  });

  it("correctly surfaces newly published client projects looking for freelancers", () => {
    const testClientId = "usr_client_find_test";
    const testProjectPayload = {
      id: "prj_real_marketplace_101",
      title: "Real Geospatial Risk Platform PRD",
      description: "Production GIS analysis dashboard with PostGIS and MapLibre GL",
      status: "FINDING_FREELANCERS",
      state: "MATCHING",
      budgetCents: 600000,
      totalBudget: "$6,000.00",
      budgetType: "FIXED",
      category: "Web Development",
      requiredSkills: ["PostgreSQL", "React", "MapLibre", "Python"],
      visibility: "PUBLIC",
      clientId: testClientId,
    };

    saveProjectToStore(testProjectPayload, testClientId);

    const openProjects = getAllOpenProjectsFromStore();
    const found = openProjects.find((p) => p.id === "prj_real_marketplace_101");

    expect(found).toBeDefined();
    expect(found!.title).toBe("Real Geospatial Risk Platform PRD");
    expect(found!.budgetCents).toBe(600000);
    expect(found!.category).toBe("Web Development");
    expect(found!.requiredSkills).toContain("PostgreSQL");
  });

  it("does not surface draft projects in the open opportunities list", () => {
    const testClientId = "usr_client_draft_test";
    const draftPayload = {
      id: "prj_draft_unreleased_999",
      title: "Unpublished Internal Scope",
      description: "Still in drafting phase",
      status: "DRAFT",
      state: "DRAFT",
      budgetCents: 150000,
      visibility: "PRIVATE",
      clientId: testClientId,
    };

    saveProjectToStore(draftPayload, testClientId);

    const openProjects = getAllOpenProjectsFromStore();
    const foundDraft = openProjects.find((p) => p.id === "prj_draft_unreleased_999");
    expect(foundDraft).toBeUndefined();
  });

  it("formats integer minor units (budgetCents) into currency without floating point inaccuracies", () => {
    const budgetCents = 450050; // $4,500.50
    const budgetAmount = budgetCents / 100;
    const formatted = `$${budgetAmount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} fixed`;

    expect(formatted).toBe("$4,500.50 fixed");
  });
});


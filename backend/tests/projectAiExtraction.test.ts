import { describe, it, expect } from "vitest";
import { openSourceAiService } from "../src/services/openSourceAiService.js";

describe("Open-Source AI Document Extraction & Assistant", () => {
  it("should extract project parameters from technical PRD text", async () => {
    const samplePrd = `
# Bilateral Payment Gateway & Ledger Synchronization
We are building a robust bilateral escrow and payout settlement platform.
The architecture requires high availability, zero downtime, and end-to-end type safety.

Requirements:
- Build Next.js 15 front-end checkout and buyer workspace
- Implement Node.js and TypeScript microservices for PayPal v2 webhook ingestion
- Design PostgreSQL schema with Prisma ORM and row-level security
- Configure Docker containerization and CI/CD pipelines
- Perform end-to-end test assertions with Jest and Playwright

Budget:
Total milestone budget is estimated at $4,500 USD across 4 weekly sprints.
`;

    const extracted = await openSourceAiService.extractProjectFromDocument(samplePrd, "Bilateral_PRD.md");

    expect(extracted).toBeDefined();
    expect(extracted.title).toContain("Bilateral Payment Gateway");
    expect(extracted.category).toBe("Development & IT");
    expect(extracted.requiredSkills.some((s) => ["Next.js", "TypeScript", "Node.js", "PostgreSQL", "Docker"].includes(s))).toBe(true);
    expect(extracted.scopeOfWork.length).toBeGreaterThan(0);
    expect(extracted.detailedRequirements).toContain("•");
    expect(extracted.estimatedBudgetCents).toBe(450000);
  });

  it("should throw EMPTY_DOCUMENT error when text is blank", async () => {
    await expect(openSourceAiService.extractProjectFromDocument("   ")).rejects.toThrow("EMPTY_DOCUMENT");
  });

  it("should enrich overview with technical architecture benchmarks", async () => {
    const basicOverview = "A simple portal for managing client deliverables.";
    const enriched = await openSourceAiService.improveOverview({
      title: "Deliverable Portal",
      overview: basicOverview,
      category: "Web Development",
    });

    expect(enriched).toBeDefined();
    expect(enriched.length).toBeGreaterThan(basicOverview.length);
    expect(enriched).toContain("Technical Architecture & Standards");
  });

  it("should suggest relevant technical skills excluding already selected skills", async () => {
    const existing = ["Next.js", "React"];
    const suggested = await openSourceAiService.suggestSkills({
      title: "Full-Stack Web App",
      overview: "Building PostgreSQL backend with Docker and Redis caching",
      category: "Web Development",
      existingSkills: existing,
    });

    expect(Array.isArray(suggested)).toBe(true);
    expect(suggested.length).toBeGreaterThan(0);
    // Should not contain existing skills
    expect(suggested.includes("Next.js")).toBe(false);
  });
});


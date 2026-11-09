import { describe, it, expect } from "vitest";
import { generateContractMarkdown } from "../src/domain/agreements/contractGenerator.js";
import crypto from "crypto";

describe("Phase 6: Contract Agreement Generator & Escrow Locking", () => {
  it("should generate a legal-grade Markdown contract with v1.0 and synchronized milestones", () => {
    const markdown = generateContractMarkdown({
      agreementId: "agr_test_terrashield_001",
      versionNumber: 1,
      projectTitle: "TerraShield - AI-Driven Multi-Hazard Risk and Relocation Decision-Support System",
      projectDescription: "Geospatial hazard risk analysis platform with PostGIS and automated verification.",
      clientName: "Sambit Kumar Mohanty",
      clientEmail: "sambit@example.com",
      freelancerName: "Freelancer Specialist",
      freelancerEmail: "specialist@example.com",
      totalAmountMinor: 600000, // $6,000.00
      currency: "USD",
      durationWeeks: 7,
      milestones: [
        {
          sequence: 1,
          title: "Architecture & PostGIS Spatial Ingestion Pipeline",
          description: "Database modeling, raster processing, and ingestion endpoints.",
          amountMinor: 200000, // $2,000.00
          durationWeeks: 2,
          criteria: ["Spatial index benchmarks < 50ms", "Zero unhandled spatial projection errors"],
          deliverables: ["Ingestion API service", "Schema migration scripts"],
        },
        {
          sequence: 2,
          title: "Multi-Hazard Relocation Decision Engine & MapLibre Dashboard",
          description: "Relocation ranking algorithm and reactive map visualizations.",
          amountMinor: 400000, // $4,000.00
          durationWeeks: 5,
          criteria: ["MapLibre vector tile rendering at 60fps", "Automated consensus verification passes"],
          deliverables: ["Frontend dashboard", "Decision-support API"],
        },
      ],
      isRatified: false,
      clientApprovedAt: new Date("2026-11-09T09:00:00Z"),
      freelancerApprovedAt: null,
    });

    expect(markdown).toContain("# BILATERAL FREELANCE SERVICE & ESCROW AGREEMENT");
    expect(markdown).toContain("**Version:** v1.0");
    expect(markdown).toContain("**Status:** DRAFT (PENDING MUTUAL HUMAN RATIFICATION)");
    expect(markdown).toContain("**Total Fixed-Price Commitment:** $6,000.00 USD");
    expect(markdown).toContain("Architecture & PostGIS Spatial Ingestion Pipeline");
    expect(markdown).toContain("$2000.00 USD");
    expect(markdown).toContain("Multi-Hazard Relocation Decision Engine & MapLibre Dashboard");
    expect(markdown).toContain("$4000.00 USD");
    expect(markdown).toContain("Pre-Funding Requirement:");
    expect(markdown).toContain("PayPal REST v2");
    expect(markdown).toContain("DOCUMENT REVISION & ADD-ON VERSIONING POLICY");
    expect(markdown).toContain("Signed on Mon, 09 Nov 2026 09:00:00 GMT");
    expect(markdown).toContain("Pending Freelancer Ratification");
  });

  it("should generate amended contract v2.0 with add-on notes when scope changes", () => {
    const markdownV2 = generateContractMarkdown({
      agreementId: "agr_test_terrashield_001",
      versionNumber: 2,
      projectTitle: "TerraShield - AI-Driven Multi-Hazard Risk and Relocation Decision-Support System",
      clientName: "Sambit Kumar Mohanty",
      freelancerName: "Freelancer Specialist",
      totalAmountMinor: 650000, // $6,500.00 after +$500 add-on
      currency: "USD",
      durationWeeks: 8,
      milestones: [
        {
          sequence: 1,
          title: "Architecture & PostGIS Ingestion",
          amountMinor: 200000,
        },
        {
          sequence: 2,
          title: "Relocation Decision Engine",
          amountMinor: 400000,
        },
        {
          sequence: 3,
          title: "Satellite Tile Layer Add-on",
          amountMinor: 50000, // +$500.00
        },
      ],
      isRatified: true,
      clientApprovedAt: new Date("2026-11-09T10:00:00Z"),
      freelancerApprovedAt: new Date("2026-11-09T10:05:00Z"),
      amendmentNotes: "Add-on CR-1: High-resolution satellite raster streaming integration (+ $500.00 USD).",
    });

    expect(markdownV2).toContain("**Version:** v2.0");
    expect(markdownV2).toContain("**Status:** RATIFIED & LEGALLY BINDING");
    expect(markdownV2).toContain("**Total Fixed-Price Commitment:** $6,500.00 USD");
    expect(markdownV2).toContain("Satellite Tile Layer Add-on");
    expect(markdownV2).toContain("$500.00 USD");
    expect(markdownV2).toContain("Add-on CR-1: High-resolution satellite raster streaming integration (+ $500.00 USD)");
    expect(markdownV2).toContain("Signed on Mon, 09 Nov 2026 10:00:00 GMT");
    expect(markdownV2).toContain("Signed on Mon, 09 Nov 2026 10:05:00 GMT");
  });

  it("should maintain immutable cryptographic hashes across different contract versions", () => {
    const v1 = generateContractMarkdown({
      agreementId: "agr_1",
      versionNumber: 1,
      projectTitle: "Test",
      clientName: "Client",
      freelancerName: "Freelancer",
      totalAmountMinor: 100000,
      milestones: [{ sequence: 1, title: "M1", amountMinor: 100000 }],
    });

    const v2 = generateContractMarkdown({
      agreementId: "agr_1",
      versionNumber: 2,
      projectTitle: "Test",
      clientName: "Client",
      freelancerName: "Freelancer",
      totalAmountMinor: 150000,
      milestones: [
        { sequence: 1, title: "M1", amountMinor: 100000 },
        { sequence: 2, title: "M2", amountMinor: 50000 },
      ],
    });

    const hash1 = crypto.createHash("sha256").update(v1).digest("hex");
    const hash2 = crypto.createHash("sha256").update(v2).digest("hex");

    expect(hash1).not.toBe(hash2);
    expect(hash1.length).toBe(64);
    expect(hash2.length).toBe(64);
  });
});

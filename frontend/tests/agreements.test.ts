import { describe, it, expect } from "vitest";
import {
  toCanonicalJson,
  computeSha256,
  computeAgreementHash,
  verifyAgreementHash,
  AgreementSnapshot,
} from "../src/lib/agreements/hash";
import { computeAgreementDiff } from "../src/lib/agreements/diff";

describe("Agreements: Canonical Hashing and Diff Engine", () => {
  const baseAgreement: AgreementSnapshot = {
    projectId: "proj_ecommerce_001",
    version: 1,
    title: "Nexum Cross-Border Checkout",
    scopeSummary: "Build a responsive checkout flow with PayPal Orders v2 integration.",
    totalAmountCents: 450000,
    currency: "USD",
    milestones: [
      {
        id: "ms_01",
        title: "Architecture & UI Prototypes",
        amountCents: 150000,
        deliverables: ["Figma prototypes", "System architecture doc"],
        criteria: ["Tested with 3 demo users", "Approved by client"],
        targetDate: "2026-11-02",
        fundingRule: "FUND_BEFORE_WORK",
      },
      {
        id: "ms_02",
        title: "PayPal Orders v2 & State Machine",
        amountCents: 300000,
        deliverables: ["REST v2 adapter", "Reconciliation worker"],
        criteria: ["Passes timeout recovery test", "Zero double-charge guarantee"],
        targetDate: "2026-11-08",
        fundingRule: "FUND_BEFORE_WORK",
      },
    ],
    assumptions: ["Client provides PayPal sandbox accounts"],
    exclusions: ["No physical goods fulfillment"],
    createdAtIso: "2026-10-28T12:00:00Z",
  };

  describe("Canonical JSON & SHA-256 Hashing Stability", () => {
    it("produces identical canonical JSON and hash regardless of object key insertion order", () => {
      // Reordered keys at top level and nested levels
      const reordered: AgreementSnapshot = {
        createdAtIso: "2026-10-28T12:00:00Z",
        currency: "USD",
        exclusions: ["No physical goods fulfillment"],
        assumptions: ["Client provides PayPal sandbox accounts"],
        milestones: [
          {
            targetDate: "2026-11-02",
            fundingRule: "FUND_BEFORE_WORK",
            criteria: ["Tested with 3 demo users", "Approved by client"],
            deliverables: ["Figma prototypes", "System architecture doc"],
            amountCents: 150000,
            title: "Architecture & UI Prototypes",
            id: "ms_01",
          },
          {
            fundingRule: "FUND_BEFORE_WORK",
            targetDate: "2026-11-08",
            criteria: ["Passes timeout recovery test", "Zero double-charge guarantee"],
            deliverables: ["REST v2 adapter", "Reconciliation worker"],
            amountCents: 300000,
            title: "PayPal Orders v2 & State Machine",
            id: "ms_02",
          },
        ],
        totalAmountCents: 450000,
        scopeSummary: "Build a responsive checkout flow with PayPal Orders v2 integration.",
        title: "Nexum Cross-Border Checkout",
        version: 1,
        projectId: "proj_ecommerce_001",
      };

      const json1 = toCanonicalJson(baseAgreement);
      const json2 = toCanonicalJson(reordered);
      expect(json1).toBe(json2);

      const hash1 = computeSha256(json1);
      const hash2 = computeSha256(json2);
      expect(hash1).toBe(hash2);

      expect(verifyAgreementHash(reordered, hash1)).toBe(true);
    });

    it("changes the SHA-256 hash when any content field is modified", () => {
      const { hash: originalHash } = computeAgreementHash(baseAgreement);

      const modified: AgreementSnapshot = {
        ...baseAgreement,
        totalAmountCents: 450001, // Single cent change
      };

      const { hash: newHash } = computeAgreementHash(modified);
      expect(newHash).not.toBe(originalHash);
      expect(verifyAgreementHash(modified, originalHash)).toBe(false);
    });
  });

  describe("Diff Engine (computeAgreementDiff)", () => {
    it("detects no changes for identical snapshots", () => {
      const diff = computeAgreementDiff(baseAgreement, baseAgreement);
      expect(diff.hasChanges).toBe(false);
      expect(diff.humanSummary.length).toBe(0);
      expect(diff.milestonesSummary.unchangedCount).toBe(2);
    });

    it("detects scope revision, price change, and milestone additions", () => {
      const v2Agreement: AgreementSnapshot = {
        ...baseAgreement,
        version: 2,
        parentVersionId: "v1_hash",
        scopeSummary: "Expanded: checkout flow plus multi-currency settlement display.",
        totalAmountCents: 550000, // +$1000.00 USD
        milestones: [
          baseAgreement.milestones[0],
          baseAgreement.milestones[1],
          {
            id: "ms_03",
            title: "Multi-Currency Display & Audit Log",
            amountCents: 100000,
            deliverables: ["AG Grid timeline table"],
            criteria: ["Full history visible"],
            targetDate: "2026-11-10",
            fundingRule: "FUND_BEFORE_WORK",
          },
        ],
      };

      const diff = computeAgreementDiff(baseAgreement, v2Agreement);
      expect(diff.hasChanges).toBe(true);
      expect(diff.scopeChanged).toBe(true);
      expect(diff.amountChanged).toBe(true);
      expect(diff.deltaAmountCents).toBe(100000); // +$1000.00
      expect(diff.milestonesSummary.addedCount).toBe(1);
      expect(diff.milestonesSummary.unchangedCount).toBe(2);

      // Verify human-readable summary explains changes cleanly
      const summaryText = diff.humanSummary.join(" ");
      expect(summaryText).toContain("Total budget changed by +$1000.00 USD");
      expect(summaryText).toContain('Added new Milestone "Multi-Currency Display & Audit Log"');
    });
  });
});


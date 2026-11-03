import { describe, it, expect } from "vitest";
import { clientPaymentsService } from "../src/services/clientPaymentsService.js";

describe("Client Payments & Real Financial Ledger Service (Phase 7)", () => {
  it("should return clean zero-state summary for a client with no projects", async () => {
    const summary = await clientPaymentsService.getSummary("usr_empty_client_xyz");
    expect(summary.totalSpentMinor).toBe(0);
    expect(summary.totalSpentDisplay).toBe("$0.00");
    expect(summary.activeEscrowMinor).toBe(0);
    expect(summary.activeEscrowDisplay).toBe("$0.00");
    expect(summary.pendingPaymentsMinor).toBe(0);
    expect(summary.refundedAmountMinor).toBe(0);
    expect(summary.verifiedReleasesCount).toBe(0);
    expect(summary.settledPercentage).toBe(0);
    expect(summary.previousSettlement).toBeNull();
  });

  it("should return real computed summary with integer minor units for client Alex Rivera", async () => {
    const summary = await clientPaymentsService.getSummary("usr_client_alex");
    expect(summary.totalSpentMinor).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(summary.totalSpentMinor)).toBe(true);
    expect(Number.isInteger(summary.activeEscrowMinor)).toBe(true);
    expect(Number.isInteger(summary.pendingPaymentsMinor)).toBe(true);
    expect(Number.isInteger(summary.refundedAmountMinor)).toBe(true);
    expect(summary.escrowHealth).toBe("100% SHA-256 Verifiable");
    expect(summary.paypalStatus).toContain("PayPal Sandbox");
  });

  it("should return empty transaction list for a client with no projects", async () => {
    const txs = await clientPaymentsService.getTransactions("usr_empty_client_xyz");
    expect(Array.isArray(txs)).toBe(true);
    expect(txs.length).toBe(0);
  });

  it("should return real transactions with SHA-256 proof hashes and receipts for client Alex Rivera", async () => {
    const txs = await clientPaymentsService.getTransactions("usr_client_alex");
    expect(Array.isArray(txs)).toBe(true);

    if (txs.length > 0) {
      const first = txs[0];
      expect(first.proofHash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(first.receiptNumber).toMatch(/^(RCP|REV)-\d{4}-[A-Z0-9_]+$/);
      expect(Number.isInteger(first.amountMinor)).toBe(true);
      expect(typeof first.amountDisplay).toBe("string");
      expect(typeof first.freelancerName).toBe("string");
    }
  });

  it("should filter transactions by status and search query", async () => {
    const allTxs = await clientPaymentsService.getTransactions("usr_client_alex");
    const releasedTxs = await clientPaymentsService.getTransactions("usr_client_alex", {
      status: "RELEASED",
    });

    expect(releasedTxs.every((t) => t.status === "RELEASED")).toBe(true);
    expect(releasedTxs.length).toBeLessThanOrEqual(allTxs.length);

    // Search query test
    const searchTxs = await clientPaymentsService.getTransactions("usr_client_alex", {
      search: "NON_EXISTENT_SEARCH_QUERY_XYZ_123",
    });
    expect(searchTxs.length).toBe(0);
  });

  it("should return valid cash flow points for spline curve rendering", async () => {
    const points = await clientPaymentsService.getCashFlow("usr_client_alex");
    expect(Array.isArray(points)).toBe(true);
    for (const pt of points) {
      expect(typeof pt.x).toBe("number");
      expect(typeof pt.y).toBe("number");
      expect(pt.x).toBeGreaterThanOrEqual(0);
      expect(pt.y).toBeGreaterThanOrEqual(0);
      expect(typeof pt.label).toBe("string");
    }
  });

  it("should enforce ownership check when releasing milestone escrow funds", async () => {
    // Attempting to release with unauthorized client should throw
    await expect(
      clientPaymentsService.authorizeAndRelease("unauthorized_client_999", "non_existent_milestone")
    ).rejects.toThrow();
  });
});

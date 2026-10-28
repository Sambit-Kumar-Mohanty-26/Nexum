import { describe, it, expect } from "vitest";
import {
  applyEvidence,
  createInitialPaymentRecord,
  PAYMENT_UI_MESSAGES,
  PaymentState,
  PaymentEvidence,
} from "../src/lib/payments/stateMachine";

describe("Payment State Machine (Specification v1.2 Compliance)", () => {
  it("initializes with NOT_STARTED and empty history", () => {
    const record = createInitialPaymentRecord("ORD-123");
    expect(record.state).toBe("NOT_STARTED");
    expect(record.orderId).toBe("ORD-123");
    expect(record.history.length).toBe(0);
    expect(PAYMENT_UI_MESSAGES[record.state]).toBe("Payment not started");
  });

  describe("Table-driven legal forward transitions", () => {
    const cases: Array<{
      name: string;
      initialState: PaymentState;
      evidence: PaymentEvidence;
      expectedState: PaymentState;
    }> = [
      {
        name: "NOT_STARTED + ORDER_CREATED -> CREATED",
        initialState: "NOT_STARTED",
        evidence: {
          type: "ORDER_CREATED",
          providerTimestamp: 1000,
          source: "API",
          providerOrderId: "ORD-123",
        },
        expectedState: "CREATED",
      },
      {
        name: "CREATED + ORDER_APPROVED -> APPROVED",
        initialState: "CREATED",
        evidence: {
          type: "ORDER_APPROVED",
          providerTimestamp: 2000,
          source: "WEBHOOK",
        },
        expectedState: "APPROVED",
      },
      {
        name: "APPROVED + CAPTURE_COMPLETED -> CAPTURED",
        initialState: "APPROVED",
        evidence: {
          type: "CAPTURE_COMPLETED",
          providerTimestamp: 3000,
          source: "API",
          providerCaptureId: "CAP-999",
        },
        expectedState: "CAPTURED",
      },
      {
        name: "APPROVED + CAPTURE_PENDING -> CAPTURE_PENDING",
        initialState: "APPROVED",
        evidence: {
          type: "CAPTURE_PENDING",
          providerTimestamp: 3000,
          source: "API",
        },
        expectedState: "CAPTURE_PENDING",
      },
      {
        name: "CAPTURE_PENDING + CAPTURE_COMPLETED -> CAPTURED",
        initialState: "CAPTURE_PENDING",
        evidence: {
          type: "CAPTURE_COMPLETED",
          providerTimestamp: 4000,
          source: "WEBHOOK",
          providerCaptureId: "CAP-999",
        },
        expectedState: "CAPTURED",
      },
      {
        name: "APPROVED + CAPTURE_DENIED -> DENIED",
        initialState: "APPROVED",
        evidence: {
          type: "CAPTURE_DENIED",
          providerTimestamp: 3000,
          source: "API",
        },
        expectedState: "DENIED",
      },
      {
        name: "CREATED + APPROVAL_REVERSED -> APPROVAL_REVERSED",
        initialState: "CREATED",
        evidence: {
          type: "APPROVAL_REVERSED",
          providerTimestamp: 2500,
          source: "WEBHOOK",
        },
        expectedState: "APPROVAL_REVERSED",
      },
      {
        name: "CAPTURED + REFUND_COMPLETED -> REFUNDED",
        initialState: "CAPTURED",
        evidence: {
          type: "REFUND_COMPLETED",
          providerTimestamp: 5000,
          source: "WEBHOOK",
        },
        expectedState: "REFUNDED",
      },
      {
        name: "CAPTURED + PARTIAL_REFUND_COMPLETED -> PARTIALLY_REFUNDED",
        initialState: "CAPTURED",
        evidence: {
          type: "PARTIAL_REFUND_COMPLETED",
          providerTimestamp: 5000,
          source: "WEBHOOK",
        },
        expectedState: "PARTIALLY_REFUNDED",
      },
    ];

    cases.forEach(({ name, initialState, evidence, expectedState }) => {
      it(name, () => {
        const initial = {
          state: initialState,
          lastProviderTimestamp: 500,
          updatedAt: 500,
          history: [],
        };
        const next = applyEvidence(initial, evidence, 6000);
        expect(next.state).toBe(expectedState);
        expect(next.history.length).toBe(1);
        expect(next.history[0].from).toBe(initialState);
        expect(next.history[0].to).toBe(expectedState);
      });
    });
  });

  describe("Reconciliation and UNKNOWN resilience", () => {
    it("moves to UNKNOWN on network timeout or 5xx without repeating capture", () => {
      const initial = {
        state: "APPROVED" as PaymentState,
        lastProviderTimestamp: 2000,
        updatedAt: 2000,
        history: [],
      };
      const timeoutEvidence: PaymentEvidence = {
        type: "TIMEOUT_OR_NETWORK_ERROR",
        providerTimestamp: 3000,
        source: "API",
      };
      const result = applyEvidence(initial, timeoutEvidence);
      expect(result.state).toBe("UNKNOWN");
      expect(PAYMENT_UI_MESSAGES[result.state]).toContain(
        "Please do not pay again yet"
      );
    });

    it("resolves from UNKNOWN to CAPTURED when reconciliation confirms completion", () => {
      const initial = {
        state: "UNKNOWN" as PaymentState,
        lastProviderTimestamp: 3000,
        updatedAt: 3000,
        history: [],
      };
      const reconcileEvidence: PaymentEvidence = {
        type: "RECONCILIATION_CONFIRMED",
        reconciledState: "CAPTURED",
        providerTimestamp: 3500,
        source: "RECONCILIATION",
        providerCaptureId: "CAP-RESOLVED",
      };
      const result = applyEvidence(initial, reconcileEvidence);
      expect(result.state).toBe("CAPTURED");
      expect(result.captureId).toBe("CAP-RESOLVED");
    });

    it("transitions from UNKNOWN to NEEDS_SUPPORT when backoff schedule is exhausted", () => {
      const initial = {
        state: "UNKNOWN" as PaymentState,
        lastProviderTimestamp: 3000,
        updatedAt: 3000,
        history: [],
      };
      const exhaustedEvidence: PaymentEvidence = {
        type: "BACKOFF_EXHAUSTED",
        providerTimestamp: 100000,
        source: "RECONCILIATION",
      };
      const result = applyEvidence(initial, exhaustedEvidence);
      expect(result.state).toBe("NEEDS_SUPPORT");
      expect(PAYMENT_UI_MESSAGES[result.state]).toContain(
        "Incident details are saved for review"
      );
    });
  });

  describe("Invariants: Terminal State Protection and Out-of-Order Webhooks", () => {
    it("handles out-of-order webhooks: CAPTURE_COMPLETED arrives before ORDER_APPROVED is processed", () => {
      let record = createInitialPaymentRecord("ORD-TEST");
      // 1. Order created
      record = applyEvidence(record, {
        type: "ORDER_CREATED",
        providerTimestamp: 1000,
        source: "API",
      });
      expect(record.state).toBe("CREATED");

      // 2. Out-of-order capture arrives before approval
      record = applyEvidence(record, {
        type: "CAPTURE_COMPLETED",
        providerTimestamp: 3000,
        source: "WEBHOOK",
        providerCaptureId: "CAP-EARLY",
      });
      expect(record.state).toBe("CAPTURED");

      // 3. Late arriving ORDER_APPROVED webhook with older timestamp is ignored and does NOT roll back CAPTURED
      record = applyEvidence(record, {
        type: "ORDER_APPROVED",
        providerTimestamp: 2000,
        source: "WEBHOOK",
      });
      expect(record.state).toBe("CAPTURED");
      expect(record.captureId).toBe("CAP-EARLY");
    });

    it("enforces timestamp monotonicity: rejects stale events with older timestamps", () => {
      const record = {
        state: "APPROVED" as PaymentState,
        lastProviderTimestamp: 5000,
        updatedAt: 5000,
        history: [],
      };

      const staleEvidence: PaymentEvidence = {
        type: "ORDER_CREATED",
        providerTimestamp: 1000, // Older than 5000
        source: "WEBHOOK",
      };

      const next = applyEvidence(record, staleEvidence);
      expect(next.state).toBe("APPROVED"); // Left untouched
      expect(next.lastProviderTimestamp).toBe(5000);
    });

    it("strictly preserves CAPTURED disclaimer wording (OECD compliance)", () => {
      const msg = PAYMENT_UI_MESSAGES.CAPTURED;
      expect(msg).toContain("PayPal confirms payment captured");
      expect(msg).toContain("does not verify the recipient's bank has credited funds");
      expect(msg.toLowerCase()).not.toContain("escrow");
    });
  });
});


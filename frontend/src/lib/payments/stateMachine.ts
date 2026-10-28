/**
 * Nexum Payment State Machine
 * Implements Specification v1.2 & Phase 4 Section 14 (P4-01, P4-02).
 *
 * Rules:
 * 1. Monotonicity: Evidence with an older provider timestamp than current state
 *    never moves a state backwards (except legal refund events after CAPTURED).
 * 2. Terminal states (CAPTURED, DENIED, REFUNDED) are protected against illegal rollbacks
 *    or out-of-order webhook delivery.
 * 3. Exact UI messages mandated by Specification v1.2 table.
 */

export type PaymentState =
  | "NOT_STARTED"
  | "CREATED"
  | "APPROVED"
  | "CAPTURE_PENDING"
  | "CAPTURED"
  | "DENIED"
  | "APPROVAL_REVERSED"
  | "UNKNOWN"
  | "NEEDS_SUPPORT"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type PaymentEvidenceType =
  | "ORDER_CREATED"
  | "ORDER_APPROVED"
  | "CAPTURE_COMPLETED"
  | "CAPTURE_PENDING"
  | "CAPTURE_DENIED"
  | "APPROVAL_REVERSED"
  | "TIMEOUT_OR_NETWORK_ERROR"
  | "RECONCILIATION_CONFIRMED"
  | "BACKOFF_EXHAUSTED"
  | "REFUND_COMPLETED"
  | "PARTIAL_REFUND_COMPLETED";

export interface PaymentEvidence {
  type: PaymentEvidenceType;
  providerTimestamp: number; // Unix ms
  source: "API" | "WEBHOOK" | "RECONCILIATION" | "FAULT_INJECTOR";
  providerOrderId?: string;
  providerCaptureId?: string;
  details?: Record<string, unknown>;
  reconciledState?: PaymentState; // Used when type is RECONCILIATION_CONFIRMED
}

export interface PaymentStateRecord {
  state: PaymentState;
  lastProviderTimestamp: number; // Monotonic clock from provider
  updatedAt: number; // Local timestamp
  orderId?: string;
  captureId?: string;
  history: {
    from: PaymentState;
    to: PaymentState;
    evidence: PaymentEvidence;
    timestamp: number;
  }[];
}

/**
 * UI messages mapping mandated by Specification v1.2 section 22.
 */
export const PAYMENT_UI_MESSAGES: Record<PaymentState, string> = {
  NOT_STARTED: "Payment not started",
  CREATED: "Awaiting buyer approval. Your payment has not been confirmed.",
  APPROVED: "Approved; capture not confirmed",
  CAPTURE_PENDING: "Payment pending. The project does not treat this as paid.",
  CAPTURED:
    "PayPal confirms payment captured. This does not verify the recipient's bank has credited funds.",
  DENIED: "Payment declined. Review the reason before trying again.",
  APPROVAL_REVERSED: "Approval was reversed. Payment-dependent work is paused.",
  UNKNOWN: "Status not confirmed. We are checking PayPal. Please do not pay again yet.",
  NEEDS_SUPPORT: "Needs support. Incident details are saved for review.",
  REFUNDED: "Refund status from provider evidence",
  PARTIALLY_REFUNDED: "Partial refund status from provider evidence",
};

/**
 * Creates an initial payment state record.
 */
export function createInitialPaymentRecord(orderId?: string): PaymentStateRecord {
  return {
    state: "NOT_STARTED",
    lastProviderTimestamp: 0,
    updatedAt: Date.now(),
    orderId,
    history: [],
  };
}

/**
 * Pure transition engine: computes the next PaymentStateRecord given the current state and new evidence.
 * Pure function: Does not mutate inputs, produces a fresh record.
 */
export function applyEvidence(
  current: PaymentStateRecord,
  evidence: PaymentEvidence,
  nowMs: number = Date.now()
): PaymentStateRecord {
  const { state: fromState, lastProviderTimestamp } = current;

  // 1. Monotonicity rule:
  // An event with an older provider timestamp than recorded state never moves
  // a state backwards, except refund events after CAPTURED.
  const isRefund =
    evidence.type === "REFUND_COMPLETED" ||
    evidence.type === "PARTIAL_REFUND_COMPLETED";

  if (
    evidence.providerTimestamp > 0 &&
    evidence.providerTimestamp < lastProviderTimestamp &&
    !isRefund
  ) {
    // Stale/out-of-order event with older timestamp is recorded in history but leaves state unchanged
    return {
      ...current,
      updatedAt: nowMs,
      history: [
        ...current.history,
        {
          from: fromState,
          to: fromState,
          evidence,
          timestamp: nowMs,
        },
      ],
    };
  }

  // 2. Terminal state protection:
  // CAPTURED can only transition to REFUNDED or PARTIALLY_REFUNDED.
  if (fromState === "CAPTURED") {
    if (evidence.type === "REFUND_COMPLETED") {
      return transitionTo("REFUNDED", current, evidence, nowMs);
    }
    if (evidence.type === "PARTIAL_REFUND_COMPLETED") {
      return transitionTo("PARTIALLY_REFUNDED", current, evidence, nowMs);
    }
    // Any other event (like late CHECKOUT.ORDER.APPROVED or duplicate capture) cannot rollback CAPTURED
    return recordNoop(current, evidence, nowMs);
  }

  // DENIED and REFUNDED are terminal
  if (fromState === "DENIED" || fromState === "REFUNDED") {
    return recordNoop(current, evidence, nowMs);
  }

  // 3. Transient / timeout handling:
  // Any non-terminal state encountering timeout, 5xx, or network failure enters UNKNOWN
  if (evidence.type === "TIMEOUT_OR_NETWORK_ERROR") {
    return transitionTo("UNKNOWN", current, evidence, nowMs);
  }

  // 4. Resolution from UNKNOWN via reconciliation:
  if (fromState === "UNKNOWN") {
    if (evidence.type === "RECONCILIATION_CONFIRMED" && evidence.reconciledState) {
      return transitionTo(evidence.reconciledState, current, evidence, nowMs);
    }
    if (evidence.type === "BACKOFF_EXHAUSTED") {
      return transitionTo("NEEDS_SUPPORT", current, evidence, nowMs);
    }
    // Also accept definite webhook events arriving while in UNKNOWN
    if (evidence.type === "CAPTURE_COMPLETED") {
      return transitionTo("CAPTURED", current, evidence, nowMs);
    }
    if (evidence.type === "CAPTURE_DENIED") {
      return transitionTo("DENIED", current, evidence, nowMs);
    }
    if (evidence.type === "ORDER_APPROVED") {
      return transitionTo("APPROVED", current, evidence, nowMs);
    }
    if (evidence.type === "APPROVAL_REVERSED") {
      return transitionTo("APPROVAL_REVERSED", current, evidence, nowMs);
    }
  }

  // 5. Standard Forward State Transitions
  switch (fromState) {
    case "NOT_STARTED":
      if (evidence.type === "ORDER_CREATED") {
        return transitionTo("CREATED", current, evidence, nowMs);
      }
      break;

    case "CREATED":
      if (evidence.type === "ORDER_APPROVED") {
        return transitionTo("APPROVED", current, evidence, nowMs);
      }
      if (evidence.type === "APPROVAL_REVERSED") {
        return transitionTo("APPROVAL_REVERSED", current, evidence, nowMs);
      }
      // Out-of-order: CAPTURE_COMPLETED arrives before ORDER_APPROVED was recorded
      if (evidence.type === "CAPTURE_COMPLETED") {
        return transitionTo("CAPTURED", current, evidence, nowMs);
      }
      if (evidence.type === "CAPTURE_DENIED") {
        return transitionTo("DENIED", current, evidence, nowMs);
      }
      break;

    case "APPROVED":
      if (evidence.type === "CAPTURE_COMPLETED") {
        return transitionTo("CAPTURED", current, evidence, nowMs);
      }
      if (evidence.type === "CAPTURE_PENDING") {
        return transitionTo("CAPTURE_PENDING", current, evidence, nowMs);
      }
      if (evidence.type === "CAPTURE_DENIED") {
        return transitionTo("DENIED", current, evidence, nowMs);
      }
      if (evidence.type === "APPROVAL_REVERSED") {
        return transitionTo("APPROVAL_REVERSED", current, evidence, nowMs);
      }
      break;

    case "CAPTURE_PENDING":
      if (evidence.type === "CAPTURE_COMPLETED") {
        return transitionTo("CAPTURED", current, evidence, nowMs);
      }
      if (evidence.type === "CAPTURE_DENIED") {
        return transitionTo("DENIED", current, evidence, nowMs);
      }
      break;

    case "APPROVAL_REVERSED":
      // Approval was reversed; cannot capture unless a new authorization/order occurs
      break;

    default:
      break;
  }

  // If no matching legal transition, record evidence without changing state
  return recordNoop(current, evidence, nowMs);
}

function transitionTo(
  nextState: PaymentState,
  current: PaymentStateRecord,
  evidence: PaymentEvidence,
  nowMs: number
): PaymentStateRecord {
  return {
    ...current,
    state: nextState,
    lastProviderTimestamp: Math.max(
      current.lastProviderTimestamp,
      evidence.providerTimestamp || 0
    ),
    updatedAt: nowMs,
    orderId: evidence.providerOrderId || current.orderId,
    captureId: evidence.providerCaptureId || current.captureId,
    history: [
      ...current.history,
      {
        from: current.state,
        to: nextState,
        evidence,
        timestamp: nowMs,
      },
    ],
  };
}

function recordNoop(
  current: PaymentStateRecord,
  evidence: PaymentEvidence,
  nowMs: number
): PaymentStateRecord {
  return {
    ...current,
    updatedAt: nowMs,
    history: [
      ...current.history,
      {
        from: current.state,
        to: current.state,
        evidence,
        timestamp: nowMs,
      },
    ],
  };
}


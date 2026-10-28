/**
 * Nexum Money Handling Utilities
 * Implements Specification v1.2 & Phase 1 (P4-03, C-10).
 *
 * Rules:
 * 1. Integer minor units only (cents for USD).
 * 2. Never use floating point math for financial ledger or contract totals.
 * 3. Convert to/from PayPal decimal string only at the provider adapter boundary.
 * 4. Milestone allocation must sum exactly to the agreement total.
 */

/**
 * Converts integer minor units (cents) to a PayPal decimal string (e.g. 15000 -> "150.00").
 * Throws an error if input is not a safe non-negative integer.
 */
export function centsToDecimalString(cents: number): string {
  if (typeof cents !== "number" || !Number.isInteger(cents) || cents < 0) {
    throw new Error(
      `Invalid money minor units: expected non-negative integer cents, received: ${cents}`
    );
  }

  const dollars = Math.floor(cents / 100);
  const remainingCents = cents % 100;
  return `${dollars}.${remainingCents.toString().padStart(2, "0")}`;
}

/**
 * Converts a decimal string (e.g. "150.00" or "45.5") to exact integer minor units (cents).
 * Avoids IEEE 754 floating point inaccuracies by parsing string parts directly.
 */
export function decimalStringToCents(val: string): number {
  if (typeof val !== "string") {
    throw new Error(`Expected decimal string, received ${typeof val}`);
  }

  const trimmed = val.trim();
  const match = trimmed.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new Error(
      `Invalid currency string format: "${trimmed}". Expected positive decimal like "100.00" or "25.50".`
    );
  }

  const wholePart = parseInt(match[1], 10);
  const decimalPart = match[2] ? match[2].padEnd(2, "0") : "00";
  const centsPart = parseInt(decimalPart.slice(0, 2), 10);

  return wholePart * 100 + centsPart;
}

/**
 * Format integer cents into a user-facing currency string.
 */
export function formatCentsToDisplay(cents: number, currency = "USD"): string {
  const decimalStr = centsToDecimalString(cents);
  const symbol = currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${decimalStr} ${currency}`;
}

/**
 * Verifies that the sum of milestone amounts equals the total agreement amount exactly.
 */
export function validateMilestoneAllocation(
  milestones: Array<{ amountCents: number }>,
  totalAmountCents: number
): { valid: boolean; sumCents: number; deltaCents: number } {
  if (!Array.isArray(milestones) || milestones.length === 0) {
    return {
      valid: false,
      sumCents: 0,
      deltaCents: totalAmountCents,
    };
  }

  const sumCents = milestones.reduce((acc, m) => {
    if (!Number.isInteger(m.amountCents) || m.amountCents < 0) {
      throw new Error(`Invalid milestone amount: ${m.amountCents}`);
    }
    return acc + m.amountCents;
  }, 0);

  const deltaCents = totalAmountCents - sumCents;
  return {
    valid: deltaCents === 0,
    sumCents,
    deltaCents,
  };
}


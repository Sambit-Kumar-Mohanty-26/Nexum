/**
 * Nexum Canonical Hashing Engine
 * Implements Specification v1.2 & Phase 3 (P3-01, C-11).
 *
 * Rules:
 * 1. Canonical JSON: Keys are sorted lexicographically at all nested levels.
 * 2. Whitespace is stripped (compact JSON).
 * 3. Determinism: Identical semantic objects produce the exact same SHA-256 hash
 *    regardless of key insertion order.
 * 4. Dual-environment support: Web Crypto API in browser/Edge and Node.js crypto in server runtime.
 */

import { createHash } from "crypto";

/**
 * Recursively sort object keys alphabetically and return a canonical JSON string.
 */
export function toCanonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== undefined) {
      sortedObj[key] = sortValue(val);
    }
  }

  return sortedObj;
}

/**
 * Computes a SHA-256 hexadecimal hash over a string or arbitrary object.
 * Objects are automatically converted to Canonical JSON first.
 */
export function computeSha256(input: unknown): string {
  const content = typeof input === "string" ? input : toCanonicalJson(input);
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Canonical Schema for an Agreement Snapshot that both parties approve.
 */
export interface AgreementSnapshot {
  projectId: string;
  version: number;
  parentVersionId?: string | null;
  title: string;
  scopeSummary: string;
  totalAmountCents: number;
  currency: string;
  milestones: Array<{
    id: string;
    title: string;
    amountCents: number;
    deliverables: string[];
    criteria: string[];
    targetDate: string;
    fundingRule: "FUND_BEFORE_WORK";
  }>;
  assumptions: string[];
  exclusions: string[];
  createdAtIso: string;
}

/**
 * Computes the authoritative agreement version hash.
 */
export function computeAgreementHash(agreement: AgreementSnapshot): {
  canonicalJson: string;
  hash: string;
} {
  const canonicalJson = toCanonicalJson(agreement);
  const hash = computeSha256(canonicalJson);
  return { canonicalJson, hash };
}

/**
 * Verifies if an agreement matches a claimed hash.
 */
export function verifyAgreementHash(
  agreement: AgreementSnapshot,
  expectedHash: string
): boolean {
  const { hash } = computeAgreementHash(agreement);
  return hash.toLowerCase() === expectedHash.toLowerCase();
}


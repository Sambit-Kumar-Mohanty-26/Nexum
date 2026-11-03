import crypto from "crypto";

/**
 * Deeply sort object keys alphabetically to produce a strictly deterministic JSON representation.
 */
export function canonicalStringify(obj: unknown): string {
  if (obj === null || obj === undefined) {
    return "null";
  }
  if (typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalStringify(item)).join(",")}]`;
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sortedKeys.map((key) => {
    const val = (obj as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${canonicalStringify(val)}`;
  });

  return `{${pairs.join(",")}}`;
}

/**
 * Computes a deterministic SHA-256 hash of any JavaScript object or primitive.
 */
export function computeCanonicalHash(data: unknown): string {
  const canonicalJson = canonicalStringify(data);
  return crypto.createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

/**
 * Computes a cryptographic timeline seal connecting the current event to an optional parent hash.
 */
export function computeTimelineSeal(payload: unknown, parentHash = ""): string {
  const raw = `${parentHash}:${canonicalStringify(payload)}`;
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}


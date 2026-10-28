/**
 * Nexum Agreement Diff Engine
 * Implements Specification v1.2 & Phase 3 (P3-11, C-08).
 *
 * Rules:
 * 1. Pure function comparing two agreement snapshots.
 * 2. Field-by-field delta calculation for scope, pricing, milestones, dates, assumptions.
 * 3. Structured output readable by both UI diff screens and AI diff explainers.
 */

import { AgreementSnapshot } from "./hash";

export interface MilestoneDelta {
  id: string;
  type: "ADDED" | "REMOVED" | "MODIFIED" | "UNCHANGED";
  title: { from?: string; to?: string; changed: boolean };
  amountCents: { from?: number; to?: number; deltaCents: number; changed: boolean };
  targetDate: { from?: string; to?: string; changed: boolean };
  deliverables: { added: string[]; removed: string[]; changed: boolean };
  criteria: { added: string[]; removed: string[]; changed: boolean };
}

export interface AgreementDiffResult {
  hasChanges: boolean;
  versionChange: { from: number; to: number };
  scopeChanged: boolean;
  scopeFrom?: string;
  scopeTo?: string;
  amountChanged: boolean;
  amountCentsFrom: number;
  amountCentsTo: number;
  deltaAmountCents: number;
  currencyChanged: boolean;
  milestonesSummary: {
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    unchangedCount: number;
  };
  milestoneDeltas: MilestoneDelta[];
  assumptions: { added: string[]; removed: string[] };
  exclusions: { added: string[]; removed: string[] };
  humanSummary: string[];
}

/**
 * Compares two agreement snapshots and computes an authoritative structured diff.
 */
export function computeAgreementDiff(
  prev: AgreementSnapshot,
  next: AgreementSnapshot
): AgreementDiffResult {
  const humanSummary: string[] = [];

  const scopeChanged = prev.scopeSummary !== next.scopeSummary;
  if (scopeChanged) {
    humanSummary.push("Project scope and objectives have been updated.");
  }

  const deltaAmountCents = next.totalAmountCents - prev.totalAmountCents;
  const amountChanged = deltaAmountCents !== 0;
  if (amountChanged) {
    const sign = deltaAmountCents > 0 ? "+" : "-";
    const absDollars = (Math.abs(deltaAmountCents) / 100).toFixed(2);
    humanSummary.push(
      `Total budget changed by ${sign}$${absDollars} USD (from $${(prev.totalAmountCents / 100).toFixed(2)} to $${(next.totalAmountCents / 100).toFixed(2)}).`
    );
  }

  const currencyChanged = prev.currency !== next.currency;
  if (currencyChanged) {
    humanSummary.push(`Currency changed from ${prev.currency} to ${next.currency}.`);
  }

  // Milestone diffing
  const prevMap = new Map(prev.milestones.map((m) => [m.id, m]));
  const nextMap = new Map(next.milestones.map((m) => [m.id, m]));

  const allMilestoneIds = Array.from(
    new Set([...prevMap.keys(), ...nextMap.keys()])
  );

  const milestoneDeltas: MilestoneDelta[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;
  let unchangedCount = 0;

  for (const id of allMilestoneIds) {
    const p = prevMap.get(id);
    const n = nextMap.get(id);

    if (!p && n) {
      addedCount++;
      milestoneDeltas.push({
        id,
        type: "ADDED",
        title: { to: n.title, changed: true },
        amountCents: { to: n.amountCents, deltaCents: n.amountCents, changed: true },
        targetDate: { to: n.targetDate, changed: true },
        deliverables: { added: n.deliverables, removed: [], changed: n.deliverables.length > 0 },
        criteria: { added: n.criteria, removed: [], changed: n.criteria.length > 0 },
      });
      humanSummary.push(`Added new Milestone "${n.title}" ($${(n.amountCents / 100).toFixed(2)}).`);
    } else if (p && !n) {
      removedCount++;
      milestoneDeltas.push({
        id,
        type: "REMOVED",
        title: { from: p.title, changed: true },
        amountCents: { from: p.amountCents, deltaCents: -p.amountCents, changed: true },
        targetDate: { from: p.targetDate, changed: true },
        deliverables: { added: [], removed: p.deliverables, changed: p.deliverables.length > 0 },
        criteria: { added: [], removed: p.criteria, changed: p.criteria.length > 0 },
      });
      humanSummary.push(`Removed Milestone "${p.title}".`);
    } else if (p && n) {
      const titleChanged = p.title !== n.title;
      const milestoneAmountDelta = n.amountCents - p.amountCents;
      const amountDiff = milestoneAmountDelta !== 0;
      const dateChanged = p.targetDate !== n.targetDate;

      const addedDeliv = n.deliverables.filter((d) => !p.deliverables.includes(d));
      const removedDeliv = p.deliverables.filter((d) => !n.deliverables.includes(d));
      const delivChanged = addedDeliv.length > 0 || removedDeliv.length > 0;

      const addedCrit = n.criteria.filter((c) => !p.criteria.includes(c));
      const removedCrit = p.criteria.filter((c) => !n.criteria.includes(c));
      const critChanged = addedCrit.length > 0 || removedCrit.length > 0;

      const isModified =
        titleChanged || amountDiff || dateChanged || delivChanged || critChanged;

      if (isModified) {
        modifiedCount++;
        milestoneDeltas.push({
          id,
          type: "MODIFIED",
          title: { from: p.title, to: n.title, changed: titleChanged },
          amountCents: {
            from: p.amountCents,
            to: n.amountCents,
            deltaCents: milestoneAmountDelta,
            changed: amountDiff,
          },
          targetDate: { from: p.targetDate, to: n.targetDate, changed: dateChanged },
          deliverables: { added: addedDeliv, removed: removedDeliv, changed: delivChanged },
          criteria: { added: addedCrit, removed: removedCrit, changed: critChanged },
        });

        if (amountDiff) {
          humanSummary.push(
            `Milestone "${n.title}" price adjusted by ${milestoneAmountDelta > 0 ? "+" : ""}$${(milestoneAmountDelta / 100).toFixed(2)}.`
          );
        }
        if (dateChanged) {
          humanSummary.push(
            `Milestone "${n.title}" deadline moved from ${p.targetDate} to ${n.targetDate}.`
          );
        }
      } else {
        unchangedCount++;
        milestoneDeltas.push({
          id,
          type: "UNCHANGED",
          title: { from: p.title, to: n.title, changed: false },
          amountCents: {
            from: p.amountCents,
            to: n.amountCents,
            deltaCents: 0,
            changed: false,
          },
          targetDate: { from: p.targetDate, to: n.targetDate, changed: false },
          deliverables: { added: [], removed: [], changed: false },
          criteria: { added: [], removed: [], changed: false },
        });
      }
    }
  }

  // Assumptions & Exclusions diff
  const addedAssumptions = next.assumptions.filter(
    (a) => !prev.assumptions.includes(a)
  );
  const removedAssumptions = prev.assumptions.filter(
    (a) => !next.assumptions.includes(a)
  );

  const addedExclusions = next.exclusions.filter(
    (e) => !prev.exclusions.includes(e)
  );
  const removedExclusions = prev.exclusions.filter(
    (e) => !next.exclusions.includes(e)
  );

  const hasChanges =
    scopeChanged ||
    amountChanged ||
    currencyChanged ||
    addedCount > 0 ||
    removedCount > 0 ||
    modifiedCount > 0 ||
    addedAssumptions.length > 0 ||
    removedAssumptions.length > 0 ||
    addedExclusions.length > 0 ||
    removedExclusions.length > 0;

  return {
    hasChanges,
    versionChange: { from: prev.version, to: next.version },
    scopeChanged,
    scopeFrom: prev.scopeSummary,
    scopeTo: next.scopeSummary,
    amountChanged,
    amountCentsFrom: prev.totalAmountCents,
    amountCentsTo: next.totalAmountCents,
    deltaAmountCents,
    currencyChanged,
    milestonesSummary: {
      addedCount,
      removedCount,
      modifiedCount,
      unchangedCount,
    },
    milestoneDeltas,
    assumptions: { added: addedAssumptions, removed: removedAssumptions },
    exclusions: { added: addedExclusions, removed: removedExclusions },
    humanSummary,
  };
}


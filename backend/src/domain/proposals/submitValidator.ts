/**
 * Pure function: Implements Proposal Submission Validation (Pages 26-27 of Guide).
 * Returns field-level errors and non-blocking warnings (ABOVE_BUDGET_MAX, BELOW_BUDGET_MIN).
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: string[];
}

export function validateForSubmit(
  version: any,
  listing: any,
  portfolioOwnedIds: string[]
): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];

  // 1. Cover letter: 50 to 4000 characters
  const coverLetter = (version.coverLetter || "").trim();
  if (!coverLetter) {
    errors.coverLetter = "Cover letter is required (50 to 4000 characters)";
  } else if (coverLetter.length < 50) {
    errors.coverLetter = `Cover letter must be at least 50 characters (currently ${coverLetter.length})`;
  } else if (coverLetter.length > 4000) {
    errors.coverLetter = `Cover letter cannot exceed 4000 characters (currently ${coverLetter.length})`;
  }

  // 2. Scope text: required, non-empty (fall back to coverLetter if not provided)
  const scopeText = (version.scopeText || version.scope || version.coverLetter || "").trim();
  if (!scopeText) {
    errors.scopeText = "Scope of work is required";
  }

  // 3. Deliverables: at least one required (fall back to milestonesJson if not explicitly passed)
  let deliverables = Array.isArray(version.deliverables) && version.deliverables.length > 0
    ? version.deliverables
    : Array.isArray(version.milestonesJson) && version.milestonesJson.length > 0
    ? version.milestonesJson.map((m: any, idx: number) => ({
        title: m.title || `Milestone ${idx + 1} Deliverable`,
        description: "Milestone deliverable package",
      }))
    : [];

  if (deliverables.length === 0) {
    errors.deliverables = "At least one deliverable is required";
  } else {
    for (let i = 0; i < deliverables.length; i++) {
      const d = deliverables[i];
      if (!d || !d.title || !String(d.title).trim()) {
        errors[`deliverables[${i}].title`] = `Deliverable ${i + 1} requires a valid title`;
      }
    }
  }

  // 4. Payment model & currency matching listing
  const listingPaymentModel = listing.budgetType === "HOURLY" ? "HOURLY" : "FIXED_PRICE";
  const proposalPaymentModel = version.paymentModel || "FIXED_PRICE";

  if (proposalPaymentModel !== listingPaymentModel) {
    errors.paymentModel = `Payment model mismatch: project requires ${listingPaymentModel}, proposal specified ${proposalPaymentModel}`;
  }

  const listingCurrency = listing.currency || "USD";
  const proposalCurrency = version.currency || "USD";
  if (proposalCurrency.toUpperCase() !== listingCurrency.toUpperCase()) {
    errors.currency = `Currency mismatch: project requires ${listingCurrency}, proposal specified ${proposalCurrency}`;
  }

  // 5. Model-specific pricing validation
  if (proposalPaymentModel === "FIXED_PRICE") {
    const totalAmount = version.totalAmountMinor ?? version.amountCents ?? 0;
    if (!Number.isInteger(totalAmount) || totalAmount <= 0) {
      errors.totalAmountMinor = "Fixed-price total amount must be a positive integer in minor units (cents)";
    }

    const milestones = Array.isArray(version.milestones || version.milestonesJson)
      ? version.milestones || version.milestonesJson
      : [];

    if (milestones.length === 0) {
      errors.milestones = "Fixed-price proposals require at least one milestone";
    } else {
      let milestoneSum = 0;
      for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        if (!m.title || !String(m.title).trim()) {
          errors[`milestones[${i}].title`] = `Milestone ${i + 1} requires a title`;
        }
        const criteria = Array.isArray(m.criteria) ? m.criteria : [];
        if (criteria.length === 0 || !criteria.some((c: any) => String(c).trim())) {
          errors[`milestones[${i}].criteria`] = `Milestone ${i + 1} requires at least one acceptance criterion`;
        }
        const amt = m.amountMinor ?? m.amountCents ?? 0;
        if (!Number.isInteger(amt) || amt <= 0) {
          errors[`milestones[${i}].amount`] = `Milestone ${i + 1} amount must be a positive integer in cents`;
        } else {
          milestoneSum += amt;
        }
      }

      if (totalAmount > 0 && milestoneSum !== totalAmount) {
        errors.milestonesSum = `Milestone amounts sum (${milestoneSum}) must equal total amount (${totalAmount}) exactly`;
      }
    }

    // Budget range warnings
    if (listing.budgetMaxCents && totalAmount > listing.budgetMaxCents) {
      warnings.push("ABOVE_BUDGET_MAX");
    }
    if (listing.budgetMinCents && totalAmount < listing.budgetMinCents) {
      warnings.push("BELOW_BUDGET_MIN");
    }
  } else if (proposalPaymentModel === "HOURLY") {
    const rate = version.hourlyRateMinor ?? 0;
    const hours = version.estimatedHours ?? 0;

    if (!Number.isInteger(rate) || rate <= 0) {
      errors.hourlyRateMinor = "Hourly rate must be a positive integer in cents";
    }
    if (!Number.isInteger(hours) || hours <= 0) {
      errors.estimatedHours = "Estimated hours must be a positive integer";
    }

    if (listing.budgetMaxCents && rate > listing.budgetMaxCents) {
      warnings.push("ABOVE_BUDGET_MAX");
    }
    if (listing.budgetMinCents && rate < listing.budgetMinCents) {
      warnings.push("BELOW_BUDGET_MIN");
    }
  }

  // 6. Estimated duration weeks: 1 to 104
  if (version.estimatedDurationWeeks !== undefined && version.estimatedDurationWeeks !== null) {
    const weeks = Number(version.estimatedDurationWeeks);
    if (!Number.isInteger(weeks) || weeks < 1 || weeks > 104) {
      errors.estimatedDurationWeeks = "Estimated duration must be an integer between 1 and 104 weeks";
    }
  }

  // 7. Start available on: not in the past
  if (version.startAvailableOn) {
    const parsedDate = new Date(version.startAvailableOn);
    if (isNaN(parsedDate.getTime())) {
      errors.startAvailableOn = "Invalid date format for startAvailableOn";
    } else {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      if (parsedDate < today) {
        errors.startAvailableOn = "Start date cannot be in the past";
      }
    }
  }

  // 8. Portfolio references: max 5, must belong to freelancer
  const portfolioRefs = Array.isArray(version.portfolioSnapshot) ? version.portfolioSnapshot : [];
  if (portfolioRefs.length > 5) {
    errors.portfolioSnapshot = "At most 5 portfolio references are allowed";
  } else {
    const ownedSet = new Set(portfolioOwnedIds);
    for (let i = 0; i < portfolioRefs.length; i++) {
      const ref = portfolioRefs[i];
      const pId = ref.portfolioProjectId || ref.id;
      if (pId && !ownedSet.has(pId)) {
        errors[`portfolioSnapshot[${i}]`] = `Portfolio project ${pId} does not belong to this freelancer`;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

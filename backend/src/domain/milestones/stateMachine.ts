import { MilestoneWorkStatus, Role } from "@prisma/client";

export class InvalidMilestoneTransitionError extends Error {
  code: string;
  statusCode: number;
  fromStatus: string;
  event: string;

  constructor(fromStatus: string, event: string, message?: string) {
    super(message || `Invalid milestone transition from ${fromStatus} on event '${event}'`);
    this.name = "InvalidMilestoneTransitionError";
    this.code = "INVALID_TRANSITION";
    this.statusCode = 409;
    this.fromStatus = fromStatus;
    this.event = event;
  }
}

export interface TransitionGuards {
  isFundingCaptured?: boolean;
  unmetCriteriaCount?: number;
  hasSubmissionContent?: boolean; // note + at least 1 file or link
  statusBeforeDispute?: MilestoneWorkStatus | null;
}

export function transitionMilestone(
  currentStatus: MilestoneWorkStatus,
  event: string,
  actorRole: Role,
  guards: TransitionGuards = {}
): {
  newStatus: MilestoneWorkStatus;
  statusBeforeDispute?: MilestoneWorkStatus | null;
} {
  // Terminal state: ACCEPTED is immutable
  if (currentStatus === MilestoneWorkStatus.ACCEPTED) {
    throw new InvalidMilestoneTransitionError(
      currentStatus,
      event,
      "Milestone is already ACCEPTED and cannot transition further"
    );
  }

  // Dispute resolution
  if (currentStatus === MilestoneWorkStatus.DISPUTED) {
    if (event === "resolve") {
      const restored = guards.statusBeforeDispute || MilestoneWorkStatus.IN_PROGRESS;
      return { newStatus: restored, statusBeforeDispute: null };
    }
    throw new InvalidMilestoneTransitionError(
      currentStatus,
      event,
      "Disputed milestone can only be resolved"
    );
  }

  // Client opening dispute on active states
  if (event === "dispute") {
    if (actorRole !== Role.CLIENT) {
      throw new InvalidMilestoneTransitionError(
        currentStatus,
        event,
        "Only client can open a milestone dispute"
      );
    }
    if (
      currentStatus === MilestoneWorkStatus.IN_PROGRESS ||
      currentStatus === MilestoneWorkStatus.READY_TO_SUBMIT ||
      currentStatus === MilestoneWorkStatus.AWAITING_CLIENT_REVIEW ||
      currentStatus === MilestoneWorkStatus.REVISIONS_REQUESTED
    ) {
      return {
        newStatus: MilestoneWorkStatus.DISPUTED,
        statusBeforeDispute: currentStatus,
      };
    }
    throw new InvalidMilestoneTransitionError(
      currentStatus,
      event,
      `Cannot dispute milestone in ${currentStatus} state`
    );
  }

  // Freelancer transitions
  if (actorRole === Role.FREELANCER) {
    if (event === "start") {
      if (currentStatus === MilestoneWorkStatus.UPCOMING) {
        const requireFunding = process.env.REQUIRE_FUNDING_TO_START === "true";
        if (requireFunding && !guards.isFundingCaptured) {
          throw new InvalidMilestoneTransitionError(
            currentStatus,
            event,
            "Cannot start milestone: pre-funded escrow required before work begins"
          );
        }
        return { newStatus: MilestoneWorkStatus.IN_PROGRESS };
      }
      throw new InvalidMilestoneTransitionError(currentStatus, event);
    }

    if (event === "mark_ready") {
      if (currentStatus === MilestoneWorkStatus.IN_PROGRESS) {
        return { newStatus: MilestoneWorkStatus.READY_TO_SUBMIT };
      }
      throw new InvalidMilestoneTransitionError(currentStatus, event);
    }

    if (event === "back_to_work") {
      if (currentStatus === MilestoneWorkStatus.READY_TO_SUBMIT) {
        return { newStatus: MilestoneWorkStatus.IN_PROGRESS };
      }
      throw new InvalidMilestoneTransitionError(currentStatus, event);
    }

    if (event === "submit") {
      if (
        currentStatus === MilestoneWorkStatus.READY_TO_SUBMIT ||
        currentStatus === MilestoneWorkStatus.REVISIONS_REQUESTED ||
        currentStatus === MilestoneWorkStatus.IN_PROGRESS ||
        currentStatus === MilestoneWorkStatus.UPCOMING
      ) {
        return { newStatus: MilestoneWorkStatus.AWAITING_CLIENT_REVIEW };
      }
      throw new InvalidMilestoneTransitionError(currentStatus, event);
    }
  }

  // Client transitions
  if (actorRole === Role.CLIENT) {
    if (event === "accept") {
      if (currentStatus === MilestoneWorkStatus.AWAITING_CLIENT_REVIEW) {
        return { newStatus: MilestoneWorkStatus.ACCEPTED };
      }
      throw new InvalidMilestoneTransitionError(currentStatus, event);
    }

    if (event === "request_revisions") {
      if (currentStatus === MilestoneWorkStatus.AWAITING_CLIENT_REVIEW) {
        if (!guards.unmetCriteriaCount || guards.unmetCriteriaCount < 1) {
          throw new InvalidMilestoneTransitionError(
            currentStatus,
            event,
            "Revision requests must cite at least one unmet acceptance criterion"
          );
        }
        return { newStatus: MilestoneWorkStatus.REVISIONS_REQUESTED };
      }
      throw new InvalidMilestoneTransitionError(currentStatus, event);
    }
  }

  throw new InvalidMilestoneTransitionError(currentStatus, event);
}

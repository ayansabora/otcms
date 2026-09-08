import { InvalidStateTransitionError } from "../../utils/appError.js";

export type CaseStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "ASSIGNED"
  | "HEARING_SCHEDULED"
  | "HEARING_IN_PROGRESS"
  | "DECISION_PENDING"
  | "DECIDED"
  | "CLOSED"
  | "REJECTED"
  | "WITHDRAWN";

/**
 * Explicit from -> allowed-to transition table (blueprint §8). This is the
 * single source of truth for the case lifecycle — server-enforced on every
 * status-changing request, never inferred from frontend state.
 *
 * DEFAULT PENDING CONFIRMATION (§27 Q5): REJECTED is currently reachable
 * only from early states (SUBMITTED/UNDER_REVIEW). If a case should be
 * rejectable later (e.g. found improperly filed after assignment), add the
 * relevant "REJECTED" entries to those states' arrays once confirmed.
 */
const TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED", "WITHDRAWN"],
  UNDER_REVIEW: ["VERIFIED", "REJECTED", "WITHDRAWN"],
  VERIFIED: ["ASSIGNED", "WITHDRAWN"],
  ASSIGNED: ["HEARING_SCHEDULED", "WITHDRAWN"],
  HEARING_SCHEDULED: ["HEARING_IN_PROGRESS", "WITHDRAWN"],
  HEARING_IN_PROGRESS: ["DECISION_PENDING", "HEARING_SCHEDULED", "WITHDRAWN"], // loop back = additional hearing needed
  DECISION_PENDING: ["DECIDED", "HEARING_IN_PROGRESS"], // panel may need another session before deciding
  DECIDED: ["CLOSED"],
  CLOSED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

// Which permission is required to *initiate* a transition into a given
// target status. Multiple permissions may be acceptable for one target.
const TRANSITION_PERMISSIONS: Record<CaseStatus, string[]> = {
  SUBMITTED: [],
  UNDER_REVIEW: ["case:transition"],
  VERIFIED: ["case:transition"],
  ASSIGNED: ["case:assign"],
  HEARING_SCHEDULED: ["hearing:manage"],
  HEARING_IN_PROGRESS: ["hearing:manage"],
  DECISION_PENDING: ["hearing:manage", "decision:record"],
  DECIDED: ["decision:approve"],
  CLOSED: ["case:transition"],
  REJECTED: ["case:transition"],
  WITHDRAWN: ["case:transition"],
};

export function getAllowedNextStatuses(current: CaseStatus): CaseStatus[] {
  return TRANSITIONS[current];
}

export function isValidTransition(from: CaseStatus, to: CaseStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertValidTransition(from: CaseStatus, to: CaseStatus): void {
  if (!isValidTransition(from, to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}

export function permissionsRequiredFor(to: CaseStatus): string[] {
  return TRANSITION_PERMISSIONS[to];
}

/**
 * Case types where witness testimony is required before a case may leave
 * UNDER_REVIEW, per blueprint §11 rules 2-3 (marriage confirmation, divorce
 * witness+elder approval). Minimum count is stored per-case
 * (`case.minWitnessesRequired`, defaulted at creation) so it stays
 * configurable rather than hard-coded, pending §27 Q3.
 */
export const CASE_TYPES_REQUIRING_WITNESSES: readonly string[] = ["MARRIAGE", "DIVORCE"];

export function requiresWitnessesBeforeVerification(caseType: string): boolean {
  return CASE_TYPES_REQUIRING_WITNESSES.includes(caseType);
}

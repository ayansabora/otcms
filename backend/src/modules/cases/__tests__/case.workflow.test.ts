import { describe, it, expect } from "vitest";
import {
  isValidTransition,
  assertValidTransition,
  getAllowedNextStatuses,
  requiresWitnessesBeforeVerification,
} from "../case.workflow.js";
import { InvalidStateTransitionError } from "../../../utils/appError.js";

describe("case workflow state machine", () => {
  it("allows the standard forward path", () => {
    const path: Parameters<typeof isValidTransition>[0][] = [
      "SUBMITTED",
      "UNDER_REVIEW",
      "VERIFIED",
      "ASSIGNED",
      "HEARING_SCHEDULED",
      "HEARING_IN_PROGRESS",
      "DECISION_PENDING",
      "DECIDED",
    ];
    for (let i = 0; i < path.length - 1; i++) {
      expect(isValidTransition(path[i]!, path[i + 1]!)).toBe(true);
    }
    expect(isValidTransition("DECIDED", "CLOSED")).toBe(true);
  });

  it("rejects skipping states", () => {
    expect(isValidTransition("SUBMITTED", "ASSIGNED")).toBe(false);
    expect(isValidTransition("SUBMITTED", "DECIDED")).toBe(false);
    expect(isValidTransition("VERIFIED", "HEARING_IN_PROGRESS")).toBe(false);
  });

  it("throws InvalidStateTransitionError for an invalid transition", () => {
    expect(() => assertValidTransition("CLOSED", "SUBMITTED")).toThrow(InvalidStateTransitionError);
  });

  it("does not allow transitions out of terminal states", () => {
    expect(getAllowedNextStatuses("CLOSED")).toEqual([]);
    expect(getAllowedNextStatuses("REJECTED")).toEqual([]);
    expect(getAllowedNextStatuses("WITHDRAWN")).toEqual([]);
  });

  it("allows looping back from HEARING_IN_PROGRESS for an additional hearing", () => {
    expect(isValidTransition("HEARING_IN_PROGRESS", "HEARING_SCHEDULED")).toBe(true);
  });

  it("allows a panel to request another hearing session before deciding", () => {
    expect(isValidTransition("DECISION_PENDING", "HEARING_IN_PROGRESS")).toBe(true);
  });

  it("flags marriage and divorce cases as requiring witnesses before verification", () => {
    expect(requiresWitnessesBeforeVerification("MARRIAGE")).toBe(true);
    expect(requiresWitnessesBeforeVerification("DIVORCE")).toBe(true);
    expect(requiresWitnessesBeforeVerification("DEBT")).toBe(false);
  });

  it("rejects withdrawal from a terminal DECIDED->CLOSED-only case", () => {
    expect(isValidTransition("DECIDED", "WITHDRAWN")).toBe(false);
  });
});

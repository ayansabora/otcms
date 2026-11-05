import { describe, it, expect } from "vitest";
import { recordConsentSchema, withdrawConsentSchema } from "../consent.validators.js";

const VALID_UUID  = "00000000-0000-7000-8000-000000000001";
const VALID_UUID2 = "00000000-0000-7000-8000-000000000002";

describe("recordConsentSchema", () => {
  it("accepts consent given = true", () => {
    const r = recordConsentSchema.safeParse({
      caseId: VALID_UUID, communityMemberId: VALID_UUID2, consentGiven: true,
    });
    expect(r.success).toBe(true);
  });

  it("accepts consent given = false (party refused)", () => {
    const r = recordConsentSchema.safeParse({
      caseId: VALID_UUID, communityMemberId: VALID_UUID2, consentGiven: false,
    });
    expect(r.success).toBe(true);
  });

  it("requires consentGiven field", () => {
    const r = recordConsentSchema.safeParse({
      caseId: VALID_UUID, communityMemberId: VALID_UUID2,
    });
    expect(r.success).toBe(false);
  });

  it("rejects non-boolean consentGiven", () => {
    const r = recordConsentSchema.safeParse({
      caseId: VALID_UUID, communityMemberId: VALID_UUID2, consentGiven: "yes",
    });
    expect(r.success).toBe(false);
  });

  it("rejects notes over 500 chars", () => {
    const r = recordConsentSchema.safeParse({
      caseId: VALID_UUID, communityMemberId: VALID_UUID2,
      consentGiven: true, notes: "x".repeat(501),
    });
    expect(r.success).toBe(false);
  });
});

describe("withdrawConsentSchema", () => {
  it("accepts a valid withdrawal reason", () => {
    const r = withdrawConsentSchema.safeParse({
      withdrawalReason: "Party has settled the matter privately",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an empty reason", () => {
    const r = withdrawConsentSchema.safeParse({ withdrawalReason: "" });
    expect(r.success).toBe(false);
  });

  it("rejects a single character reason", () => {
    const r = withdrawConsentSchema.safeParse({ withdrawalReason: "X" });
    expect(r.success).toBe(false);
  });

  it("rejects reason over 500 chars", () => {
    const r = withdrawConsentSchema.safeParse({ withdrawalReason: "a".repeat(501) });
    expect(r.success).toBe(false);
  });
});

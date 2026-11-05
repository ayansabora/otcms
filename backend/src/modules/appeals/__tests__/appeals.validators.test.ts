import { describe, it, expect } from "vitest";
import { fileAppealSchema, recordTransferSchema, recordOutcomeSchema } from "../appeals.validators.js";

const VALID_UUID = "00000000-0000-7000-8000-000000000001";

describe("fileAppealSchema", () => {
  const base = {
    caseId:             VALID_UUID,
    appellantPartyRole: "COMPLAINANT" as const,
    groundsForAppeal:   "The elder panel did not hear our key witness.",
    appellateCourtName: "Bale Robe Woreda Appellate Customary Court",
  };

  it("accepts a valid appeal", () => {
    expect(fileAppealSchema.safeParse(base).success).toBe(true);
  });

  it("accepts RESPONDENT as appellant", () => {
    const r = fileAppealSchema.safeParse({ ...base, appellantPartyRole: "RESPONDENT" });
    expect(r.success).toBe(true);
  });

  it("rejects unknown appellantPartyRole", () => {
    const r = fileAppealSchema.safeParse({ ...base, appellantPartyRole: "WITNESS" });
    expect(r.success).toBe(false);
  });

  it("rejects groundsForAppeal shorter than 10 chars", () => {
    const r = fileAppealSchema.safeParse({ ...base, groundsForAppeal: "Too short" });
    expect(r.success).toBe(false);
  });

  it("rejects groundsForAppeal over 5000 chars", () => {
    const r = fileAppealSchema.safeParse({ ...base, groundsForAppeal: "a".repeat(5001) });
    expect(r.success).toBe(false);
  });

  it("rejects missing appellateCourtName", () => {
    const { appellateCourtName: _, ...rest } = base;
    expect(fileAppealSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects non-UUID caseId", () => {
    const r = fileAppealSchema.safeParse({ ...base, caseId: "not-a-uuid" });
    expect(r.success).toBe(false);
  });
});

describe("recordTransferSchema", () => {
  it("accepts a valid transfer date", () => {
    const r = recordTransferSchema.safeParse({ transferredAt: "2026-03-10T08:00:00Z" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.transferredAt).toBeInstanceOf(Date);
  });

  it("coerces ISO string to Date", () => {
    const r = recordTransferSchema.safeParse({ transferredAt: "2026-03-10" });
    expect(r.success).toBe(true);
  });
});

describe("recordOutcomeSchema", () => {
  it("accepts a valid outcome", () => {
    const r = recordOutcomeSchema.safeParse({
      outcome:           "Appeal upheld — decision revised",
      outcomeReceivedAt: "2026-04-15T09:00:00Z",
    });
    expect(r.success).toBe(true);
  });

  it("rejects single-char outcome", () => {
    const r = recordOutcomeSchema.safeParse({
      outcome: "X", outcomeReceivedAt: "2026-04-15T09:00:00Z",
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing outcomeReceivedAt", () => {
    const r = recordOutcomeSchema.safeParse({ outcome: "Appeal dismissed" });
    expect(r.success).toBe(false);
  });
});

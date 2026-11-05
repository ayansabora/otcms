import { describe, it, expect } from "vitest";
import { issueSummonsSchema, recordServiceSchema } from "../summons.validators.js";

const VALID_UUID = "00000000-0000-7000-8000-000000000001";
const VALID_UUID2 = "00000000-0000-7000-8000-000000000002";

describe("issueSummonsSchema", () => {
  it("accepts a minimal valid payload", () => {
    const result = issueSummonsSchema.safeParse({
      caseId:       VALID_UUID,
      respondentId: VALID_UUID2,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.serviceMethod).toBe("PERSONAL"); // default
    }
  });

  it("accepts explicit serviceMethod values", () => {
    for (const method of ["PERSONAL", "REPRESENTATIVE", "POSTED"] as const) {
      const r = issueSummonsSchema.safeParse({
        caseId: VALID_UUID, respondentId: VALID_UUID2, serviceMethod: method,
      });
      expect(r.success).toBe(true);
    }
  });

  it("rejects invalid serviceMethod", () => {
    const r = issueSummonsSchema.safeParse({
      caseId: VALID_UUID, respondentId: VALID_UUID2, serviceMethod: "PHONE",
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing caseId", () => {
    const r = issueSummonsSchema.safeParse({ respondentId: VALID_UUID2 });
    expect(r.success).toBe(false);
  });

  it("rejects non-UUID caseId", () => {
    const r = issueSummonsSchema.safeParse({ caseId: "not-a-uuid", respondentId: VALID_UUID2 });
    expect(r.success).toBe(false);
  });

  it("accepts optional notes up to 1000 chars", () => {
    const r = issueSummonsSchema.safeParse({
      caseId: VALID_UUID, respondentId: VALID_UUID2, notes: "a".repeat(1000),
    });
    expect(r.success).toBe(true);
  });

  it("rejects notes over 1000 chars", () => {
    const r = issueSummonsSchema.safeParse({
      caseId: VALID_UUID, respondentId: VALID_UUID2, notes: "a".repeat(1001),
    });
    expect(r.success).toBe(false);
  });
});

describe("recordServiceSchema", () => {
  it("accepts a valid service record", () => {
    const r = recordServiceSchema.safeParse({
      servedAt:     "2026-01-15T10:00:00Z",
      servedToName: "Abdii Baqqalaa",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.servedAt).toBeInstanceOf(Date);
    }
  });

  it("rejects missing servedToName", () => {
    const r = recordServiceSchema.safeParse({ servedAt: "2026-01-15T10:00:00Z" });
    expect(r.success).toBe(false);
  });

  it("rejects servedToName shorter than 2 chars", () => {
    const r = recordServiceSchema.safeParse({ servedAt: "2026-01-15T10:00:00Z", servedToName: "A" });
    expect(r.success).toBe(false);
  });

  it("coerces ISO string to Date", () => {
    const r = recordServiceSchema.safeParse({
      servedAt: "2026-06-01T09:30:00.000Z",
      servedToName: "Test Person",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.servedAt).toBeInstanceOf(Date);
  });
});

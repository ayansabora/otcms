import { describe, it, expect } from "vitest";
import { recordDecisionSchema } from "../decisions.validators.js";

const VALID_UUID = "00000000-0000-7000-8000-000000000001";

describe("recordDecisionSchema", () => {
  const base = {
    caseId:      VALID_UUID,
    outcome:     "Land returned to complainant",
    description: "After extensive Jaarsummaa sessions, the elder panel determined that the land belongs to the complainant based on historical boundary markers.",
  };

  it("accepts a minimal valid decision", () => {
    const r = recordDecisionSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.decisionType).toBe("RULING"); // default
    }
  });

  it("accepts decisionType RECONCILIATION", () => {
    const r = recordDecisionSchema.safeParse({ ...base, decisionType: "RECONCILIATION" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.decisionType).toBe("RECONCILIATION");
  });

  it("accepts decisionType RULING", () => {
    const r = recordDecisionSchema.safeParse({ ...base, decisionType: "RULING" });
    expect(r.success).toBe(true);
  });

  it("rejects invalid decisionType", () => {
    const r = recordDecisionSchema.safeParse({ ...base, decisionType: "VERDICT" });
    expect(r.success).toBe(false);
  });

  it("rejects description shorter than 10 chars", () => {
    const r = recordDecisionSchema.safeParse({ ...base, description: "Too short" });
    expect(r.success).toBe(false);
  });

  it("rejects outcome shorter than 2 chars", () => {
    const r = recordDecisionSchema.safeParse({ ...base, outcome: "X" });
    expect(r.success).toBe(false);
  });

  it("accepts an optional requiredApprovals override", () => {
    const r = recordDecisionSchema.safeParse({ ...base, requiredApprovals: 3 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.requiredApprovals).toBe(3);
  });

  it("rejects requiredApprovals of 0", () => {
    const r = recordDecisionSchema.safeParse({ ...base, requiredApprovals: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects requiredApprovals over 20", () => {
    const r = recordDecisionSchema.safeParse({ ...base, requiredApprovals: 21 });
    expect(r.success).toBe(false);
  });
});

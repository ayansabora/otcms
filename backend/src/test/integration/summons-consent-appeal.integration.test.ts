/**
 * Integration tests for Summons, Consent, and Appeal modules.
 * Requires a running test MySQL database (NODE_ENV=test + DATABASE_URL=*test*).
 * Run with: npx vitest run --config vitest.integration.config.ts
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../database/prismaClient.js";
import { resetDatabase } from "../dbReset.js";
import { seedTestBaseline } from "../seedTestBaseline.js";
import { createTestUser } from "../createTestUser.js";
import { loginAs } from "../loginAs.js";

const app = createApp();

// ─── Shared setup helpers ────────────────────────────────────────────────────

/**
 * Creates two verified community members and a DEBT case at UNDER_REVIEW.
 * Returns the tokens and IDs needed by all three test suites.
 */
async function setupCase() {
  const officer = await createTestUser("RECORD_OFFICER");
  const manager = await createTestUser("COURT_MANAGER");
  const adminUser = await createTestUser("ADMIN");

  const officerToken  = await loginAs(app, officer.email, officer.password);
  const managerToken  = await loginAs(app, manager.email, manager.password);
  const adminToken    = await loginAs(app, adminUser.email, adminUser.password);

  // Register two community members
  const c1 = await request(app)
    .post("/api/v1/community-members")
    .set("Authorization", `Bearer ${officerToken}`)
    .send({ fullName: "Complainant Person" });

  const c2 = await request(app)
    .post("/api/v1/community-members")
    .set("Authorization", `Bearer ${officerToken}`)
    .send({ fullName: "Respondent Person" });

  // Verify both (admin has member:verify via ADMIN role — actually COURT_MANAGER
  // has member:verify, so use managerToken)
  for (const m of [c1.body.member, c2.body.member]) {
    await request(app)
      .patch(`/api/v1/community-members/${m.id}/verification`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ approve: true });
  }

  // Create case
  const caseRes = await request(app)
    .post("/api/v1/cases")
    .set("Authorization", `Bearer ${officerToken}`)
    .send({
      caseType: "DEBT",
      description: "A debt dispute brought to the traditional court for resolution.",
      parties: [
        { communityMemberId: c1.body.member.id, roleInCase: "COMPLAINANT" },
        { communityMemberId: c2.body.member.id, roleInCase: "RESPONDENT" },
      ],
    });

  // Advance to UNDER_REVIEW
  await request(app)
    .post(`/api/v1/cases/${caseRes.body.case.id}/transition`)
    .set("Authorization", `Bearer ${officerToken}`)
    .send({ toStatus: "UNDER_REVIEW" });

  return {
    caseId:       caseRes.body.case.id as string,
    complainantId: c1.body.member.id as string,
    respondentId:  c2.body.member.id as string,
    officerToken,
    managerToken,
    adminToken,
    officer,
    manager,
  };
}

// ─── Summons ─────────────────────────────────────────────────────────────────

describe("Summons module (integration)", () => {
  beforeAll(async () => { await resetDatabase(); await seedTestBaseline(); });
  beforeEach(async () => { await resetDatabase(); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("issues a summons to the respondent (attempt 1)", async () => {
    const { caseId, respondentId, officerToken } = await setupCase();

    const res = await request(app)
      .post("/api/v1/summons")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ caseId, respondentId, serviceMethod: "PERSONAL" });

    expect(res.status).toBe(201);
    expect(res.body.summons.attemptNumber).toBe(1);
    expect(res.body.summons.servedAt).toBeNull();
    expect(res.body.summons.serviceMethod).toBe("PERSONAL");
  });

  it("enforces max 3 summons attempts", async () => {
    const { caseId, respondentId, officerToken } = await setupCase();

    for (let i = 0; i < 3; i++) {
      const r = await request(app)
        .post("/api/v1/summons")
        .set("Authorization", `Bearer ${officerToken}`)
        .send({ caseId, respondentId });
      expect(r.status).toBe(201);
    }

    // 4th attempt must be rejected
    const fourth = await request(app)
      .post("/api/v1/summons")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ caseId, respondentId });
    expect(fourth.status).toBe(409);
  });

  it("records service of a summons", async () => {
    const { caseId, respondentId, officerToken } = await setupCase();

    const issued = await request(app)
      .post("/api/v1/summons")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ caseId, respondentId });

    const served = await request(app)
      .patch(`/api/v1/summons/${issued.body.summons.id}/serve`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ servedAt: new Date().toISOString(), servedToName: "Respondent Person" });

    expect(served.status).toBe(200);
    expect(served.body.summons.servedAt).toBeTruthy();
    expect(served.body.summons.servedToName).toBe("Respondent Person");
  });

  it("prevents double-serving the same summons", async () => {
    const { caseId, respondentId, officerToken } = await setupCase();

    const issued = await request(app)
      .post("/api/v1/summons")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ caseId, respondentId });

    await request(app)
      .patch(`/api/v1/summons/${issued.body.summons.id}/serve`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ servedAt: new Date().toISOString(), servedToName: "Person A" });

    const second = await request(app)
      .patch(`/api/v1/summons/${issued.body.summons.id}/serve`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ servedAt: new Date().toISOString(), servedToName: "Person B" });

    expect(second.status).toBe(409);
  });

  it("rejects summons if the community member is not a respondent in the case", async () => {
    const { caseId, complainantId, officerToken } = await setupCase();

    // Complainant cannot be summoned (not a RESPONDENT)
    const res = await request(app)
      .post("/api/v1/summons")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ caseId, respondentId: complainantId });

    expect(res.status).toBe(400);
  });

  it("blocks unauthenticated summons requests", async () => {
    const res = await request(app).post("/api/v1/summons").send({});
    expect(res.status).toBe(401);
  });

  it("lists summons filtered by caseId", async () => {
    const { caseId, respondentId, officerToken } = await setupCase();

    await request(app)
      .post("/api/v1/summons")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ caseId, respondentId });

    const listRes = await request(app)
      .get("/api/v1/summons")
      .set("Authorization", `Bearer ${officerToken}`)
      .query({ caseId });

    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(1);
    expect(listRes.body.items[0].caseId).toBe(caseId);
  });
});

// ─── Consent ─────────────────────────────────────────────────────────────────

describe("Consent module (integration)", () => {
  beforeAll(async () => { await resetDatabase(); await seedTestBaseline(); });
  beforeEach(async () => { await resetDatabase(); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("records consent given by both parties", async () => {
    const { caseId, complainantId, respondentId, managerToken } = await setupCase();

    const r1 = await request(app)
      .post("/api/v1/consent")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ caseId, communityMemberId: complainantId, consentGiven: true });

    expect(r1.status).toBe(201);
    expect(r1.body.consent.consentGiven).toBe(true);
    expect(r1.body.consent.withdrawnAt).toBeNull();

    const r2 = await request(app)
      .post("/api/v1/consent")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ caseId, communityMemberId: respondentId, consentGiven: true });

    expect(r2.status).toBe(201);
  });

  it("transitions case to WITHDRAWN when respondent refuses consent", async () => {
    const { caseId, respondentId, managerToken, officerToken } = await setupCase();

    const r = await request(app)
      .post("/api/v1/consent")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ caseId, communityMemberId: respondentId, consentGiven: false });

    expect(r.status).toBe(201);

    // Case must now be WITHDRAWN
    const caseRes = await request(app)
      .get(`/api/v1/cases/${caseId}`)
      .set("Authorization", `Bearer ${officerToken}`);

    expect(caseRes.body.case.status).toBe("WITHDRAWN");
  });

  it("rejects consent for a member not party to the case", async () => {
    const { caseId, managerToken } = await setupCase();

    // Create a third member who is NOT part of this case
    const officerUser = await createTestUser("RECORD_OFFICER");
    const officerToken2 = await loginAs(app, officerUser.email, officerUser.password);
    const stranger = await request(app)
      .post("/api/v1/community-members")
      .set("Authorization", `Bearer ${officerToken2}`)
      .send({ fullName: "Stranger Not In Case" });

    const r = await request(app)
      .post("/api/v1/consent")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ caseId, communityMemberId: stranger.body.member.id, consentGiven: true });

    expect(r.status).toBe(400);
  });

  it("withdraws a previously given consent and transitions case to WITHDRAWN", async () => {
    const { caseId, complainantId, managerToken, officerToken } = await setupCase();

    const given = await request(app)
      .post("/api/v1/consent")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ caseId, communityMemberId: complainantId, consentGiven: true });

    const withdrawn = await request(app)
      .patch(`/api/v1/consent/${given.body.consent.id}/withdraw`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ withdrawalReason: "Party no longer wishes to proceed through the OTC." });

    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body.consent.withdrawnAt).toBeTruthy();

    const caseRes = await request(app)
      .get(`/api/v1/cases/${caseId}`)
      .set("Authorization", `Bearer ${officerToken}`);
    expect(caseRes.body.case.status).toBe("WITHDRAWN");
  });

  it("lists consent records by case", async () => {
    const { caseId, complainantId, managerToken } = await setupCase();

    await request(app)
      .post("/api/v1/consent")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ caseId, communityMemberId: complainantId, consentGiven: true });

    const list = await request(app)
      .get("/api/v1/consent")
      .set("Authorization", `Bearer ${managerToken}`)
      .query({ caseId });

    expect(list.status).toBe(200);
    expect(list.body.consents).toHaveLength(1);
  });

  it("blocks unauthenticated consent requests", async () => {
    const res = await request(app).post("/api/v1/consent").send({});
    expect(res.status).toBe(401);
  });
});

// ─── Appeals ─────────────────────────────────────────────────────────────────

describe("Appeals module (integration)", () => {
  beforeAll(async () => { await resetDatabase(); await seedTestBaseline(); });
  beforeEach(async () => { await resetDatabase(); });
  afterAll(async () => { await prisma.$disconnect(); });

  /** Advances a case all the way to DECIDED (with 1 elder approval). */
  async function setupDecidedCase() {
    const ctx = await setupCase();

    // Verify -> Assign panel
    await request(app)
      .post(`/api/v1/cases/${ctx.caseId}/transition`)
      .set("Authorization", `Bearer ${ctx.officerToken}`)
      .send({ toStatus: "VERIFIED" });

    await request(app)
      .post(`/api/v1/cases/${ctx.caseId}/assign-panel`)
      .set("Authorization", `Bearer ${ctx.officerToken}`)
      .send({ userIds: [ctx.manager.id], leadUserId: ctx.manager.id });

    await request(app)
      .post(`/api/v1/cases/${ctx.caseId}/transition`)
      .set("Authorization", `Bearer ${ctx.officerToken}`)
      .send({ toStatus: "ASSIGNED" });

    // Schedule + run hearing
    await request(app)
      .post("/api/v1/hearings")
      .set("Authorization", `Bearer ${ctx.managerToken}`)
      .send({
        caseId:    ctx.caseId,
        startTime: new Date(Date.now() + 86_400_000).toISOString(),
        endTime:   new Date(Date.now() + 90_000_000).toISOString(),
        location:  "Bale Robe Court Hall",
      });

    for (const status of ["HEARING_SCHEDULED", "HEARING_IN_PROGRESS", "DECISION_PENDING"] as const) {
      await request(app)
        .post(`/api/v1/cases/${ctx.caseId}/transition`)
        .set("Authorization", `Bearer ${ctx.managerToken}`)
        .send({ toStatus: status });
    }

    // Record + approve decision
    const decRes = await request(app)
      .post("/api/v1/decisions")
      .set("Authorization", `Bearer ${ctx.managerToken}`)
      .send({ caseId: ctx.caseId, outcome: "Debt repaid", description: "Panel unanimous decision after Jaarsummaa." });

    await request(app)
      .post(`/api/v1/decisions/${decRes.body.decision.id}/approve`)
      .set("Authorization", `Bearer ${ctx.managerToken}`)
      .send({ approved: true });

    return ctx;
  }

  it("files an appeal for a DECIDED case", async () => {
    const ctx = await setupDecidedCase();

    const res = await request(app)
      .post("/api/v1/appeals")
      .set("Authorization", `Bearer ${ctx.officerToken}`)
      .send({
        caseId:             ctx.caseId,
        appellantPartyRole: "COMPLAINANT",
        groundsForAppeal:   "The panel did not consider all submitted evidence.",
        appellateCourtName: "Bale Robe Woreda Appellate Customary Court",
      });

    expect(res.status).toBe(201);
    expect(res.body.appeal.caseId).toBe(ctx.caseId);
    expect(res.body.appeal.appellantPartyRole).toBe("COMPLAINANT");
    expect(res.body.appeal.transferredAt).toBeNull();
    expect(res.body.appeal.outcome).toBeNull();
  });

  it("blocks filing an appeal for a non-DECIDED case", async () => {
    const { caseId, officerToken } = await setupCase();

    const res = await request(app)
      .post("/api/v1/appeals")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({
        caseId,
        appellantPartyRole: "COMPLAINANT",
        groundsForAppeal:   "Grounds here, but case is still UNDER_REVIEW.",
        appellateCourtName: "Bale Robe Woreda Appellate Customary Court",
      });

    expect(res.status).toBe(400);
  });

  it("blocks filing a second appeal when one is unresolved", async () => {
    const ctx = await setupDecidedCase();

    await request(app)
      .post("/api/v1/appeals")
      .set("Authorization", `Bearer ${ctx.officerToken}`)
      .send({
        caseId: ctx.caseId, appellantPartyRole: "COMPLAINANT",
        groundsForAppeal: "First appeal grounds (at least 10 chars).",
        appellateCourtName: "Bale Robe Woreda Court",
      });

    const second = await request(app)
      .post("/api/v1/appeals")
      .set("Authorization", `Bearer ${ctx.officerToken}`)
      .send({
        caseId: ctx.caseId, appellantPartyRole: "RESPONDENT",
        groundsForAppeal: "Second appeal grounds (at least 10 chars).",
        appellateCourtName: "Bale Robe Woreda Court",
      });

    expect(second.status).toBe(409);
  });

  it("records file transfer to appellate court", async () => {
    const ctx = await setupDecidedCase();

    const appealRes = await request(app)
      .post("/api/v1/appeals")
      .set("Authorization", `Bearer ${ctx.officerToken}`)
      .send({
        caseId: ctx.caseId, appellantPartyRole: "COMPLAINANT",
        groundsForAppeal: "Evidence was not properly examined by the panel.",
        appellateCourtName: "Bale Robe Woreda Court",
      });

    const transferRes = await request(app)
      .patch(`/api/v1/appeals/${appealRes.body.appeal.id}/transfer`)
      .set("Authorization", `Bearer ${ctx.managerToken}`)
      .send({ transferredAt: new Date().toISOString() });

    expect(transferRes.status).toBe(200);
    expect(transferRes.body.appeal.transferredAt).toBeTruthy();
  });

  it("records the appellate court outcome", async () => {
    const ctx = await setupDecidedCase();

    const appealRes = await request(app)
      .post("/api/v1/appeals")
      .set("Authorization", `Bearer ${ctx.officerToken}`)
      .send({
        caseId: ctx.caseId, appellantPartyRole: "COMPLAINANT",
        groundsForAppeal: "The panel decision was unjust and lacked evidence.",
        appellateCourtName: "Bale Robe Woreda Court",
      });

    // Transfer first
    await request(app)
      .patch(`/api/v1/appeals/${appealRes.body.appeal.id}/transfer`)
      .set("Authorization", `Bearer ${ctx.managerToken}`)
      .send({ transferredAt: new Date().toISOString() });

    const outcomeRes = await request(app)
      .patch(`/api/v1/appeals/${appealRes.body.appeal.id}/outcome`)
      .set("Authorization", `Bearer ${ctx.managerToken}`)
      .send({
        outcome:           "Appeal dismissed — original decision upheld",
        outcomeReceivedAt: new Date().toISOString(),
      });

    expect(outcomeRes.status).toBe(200);
    expect(outcomeRes.body.appeal.outcome).toBe("Appeal dismissed — original decision upheld");
  });

  it("blocks unauthenticated appeal requests", async () => {
    const res = await request(app).post("/api/v1/appeals").send({});
    expect(res.status).toBe(401);
  });

  it("lists appeals filtered by caseId", async () => {
    const ctx = await setupDecidedCase();

    await request(app)
      .post("/api/v1/appeals")
      .set("Authorization", `Bearer ${ctx.officerToken}`)
      .send({
        caseId: ctx.caseId, appellantPartyRole: "COMPLAINANT",
        groundsForAppeal: "Grounds for appeal listing test case.",
        appellateCourtName: "Bale Robe Woreda Court",
      });

    const listRes = await request(app)
      .get("/api/v1/appeals")
      .set("Authorization", `Bearer ${ctx.officerToken}`)
      .query({ caseId: ctx.caseId });

    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(1);
  });
});

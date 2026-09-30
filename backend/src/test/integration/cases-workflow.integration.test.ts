import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../database/prismaClient.js";
import { resetDatabase } from "../dbReset.js";
import { seedTestBaseline } from "../seedTestBaseline.js";
import { createTestUser } from "../createTestUser.js";
import { loginAs } from "../loginAs.js";

const app = createApp();

describe("Case lifecycle (integration)", () => {
  beforeAll(async () => {
    await resetDatabase();
    await seedTestBaseline();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("runs the full path: register members -> verify -> create case -> assign panel -> hearing -> decision -> closed", async () => {
    const recordOfficer = await createTestUser("RECORD_OFFICER");
    const admin = await createTestUser("ADMIN");
    const elder = await createTestUser("COURT_MANAGER");

    const officerToken = await loginAs(app, recordOfficer.email, recordOfficer.password);
    const adminToken = await loginAs(app, admin.email, admin.password);
    const elderToken = await loginAs(app, elder.email, elder.password);

    // 1. Record Officer registers two community members.
    const complainantRes = await request(app)
      .post("/api/v1/community-members")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ fullName: "Complainant Test" });
    expect(complainantRes.status).toBe(201);

    const respondentRes = await request(app)
      .post("/api/v1/community-members")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ fullName: "Respondent Test" });
    expect(respondentRes.status).toBe(201);

    // 2. Admin verifies both (member:verify).
    for (const member of [complainantRes.body.member, respondentRes.body.member]) {
      const verifyRes = await request(app)
        .patch(`/api/v1/community-members/${member.id}/verification`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ approve: true });
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.member.verificationStatus).toBe("VERIFIED");
    }

    // 3. Record Officer creates a case (a non-witness-requiring type, so the
    // path doesn't need the marriage/divorce witness gate for this test).
    const createCaseRes = await request(app)
      .post("/api/v1/cases")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({
        caseType: "DEBT",
        description: "A dispute over an unpaid debt between two neighbors.",
        parties: [
          { communityMemberId: complainantRes.body.member.id, roleInCase: "COMPLAINANT" },
          { communityMemberId: respondentRes.body.member.id, roleInCase: "RESPONDENT" },
        ],
      });
    expect(createCaseRes.status).toBe(201);
    const caseId = createCaseRes.body.case.id;
    expect(createCaseRes.body.case.status).toBe("SUBMITTED");
    expect(createCaseRes.body.case.caseNumber).toMatch(/^OTCMS-\d{4}-\d{4}$/);

    // 4. Transition SUBMITTED -> UNDER_REVIEW -> VERIFIED.
    const toReview = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ toStatus: "UNDER_REVIEW" });
    expect(toReview.status).toBe(200);

    const toVerified = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ toStatus: "VERIFIED" });
    expect(toVerified.status).toBe(200);

    // 5. Cannot mark ASSIGNED without a panel first.
    const assignWithoutPanel = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ toStatus: "ASSIGNED" });
    expect(assignWithoutPanel.status).toBe(409);

    // 6. Assign the elder panel, then transition to ASSIGNED.
    const assignPanelRes = await request(app)
      .post(`/api/v1/cases/${caseId}/assign-panel`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ userIds: [elder.id], leadUserId: elder.id });
    expect(assignPanelRes.status).toBe(200);

    const toAssigned = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ toStatus: "ASSIGNED" });
    expect(toAssigned.status).toBe(200);

    // 7. Schedule a hearing (requires hearing:manage — the elder has it).
    const hearingRes = await request(app)
      .post("/api/v1/hearings")
      .set("Authorization", `Bearer ${elderToken}`)
      .send({
        caseId,
        startTime: new Date(Date.now() + 86_400_000).toISOString(),
        endTime: new Date(Date.now() + 86_400_000 + 3_600_000).toISOString(),
        location: "Bale Robe Community Hall",
      });
    expect(hearingRes.status).toBe(201);

    const toHearingScheduled = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set("Authorization", `Bearer ${elderToken}`)
      .send({ toStatus: "HEARING_SCHEDULED" });
    expect(toHearingScheduled.status).toBe(200);

    const toHearingInProgress = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set("Authorization", `Bearer ${elderToken}`)
      .send({ toStatus: "HEARING_IN_PROGRESS" });
    expect(toHearingInProgress.status).toBe(200);

    const toDecisionPending = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set("Authorization", `Bearer ${elderToken}`)
      .send({ toStatus: "DECISION_PENDING" });
    expect(toDecisionPending.status).toBe(200);

    // 8. Record a decision (panel member only) and approve it — with a
    // 1-elder panel, a single approval reaches the default quorum.
    const decisionRes = await request(app)
      .post("/api/v1/decisions")
      .set("Authorization", `Bearer ${elderToken}`)
      .send({ caseId, outcome: "Debt to be repaid in installments", description: "The panel finds in favor of the complainant." });
    expect(decisionRes.status).toBe(201);
    expect(decisionRes.body.decision.approvalStatus).toBe("PENDING");

    const approveRes = await request(app)
      .post(`/api/v1/decisions/${decisionRes.body.decision.id}/approve`)
      .set("Authorization", `Bearer ${elderToken}`)
      .send({ approved: true });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.decision.approvalStatus).toBe("APPROVED");

    // 9. Case should now be DECIDED automatically (set by decisions.service).
    const caseAfterDecision = await request(app)
      .get(`/api/v1/cases/${caseId}`)
      .set("Authorization", `Bearer ${officerToken}`);
    expect(caseAfterDecision.body.case.status).toBe("DECIDED");

    // 10. Close the case.
    const toClosed = await request(app)
      .post(`/api/v1/cases/${caseId}/transition`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ toStatus: "CLOSED" });
    expect(toClosed.status).toBe(200);
    expect(toClosed.body.case.status).toBe("CLOSED");

    // 11. History should record every transition in order.
    const historyRes = await request(app)
      .get(`/api/v1/cases/${caseId}/history`)
      .set("Authorization", `Bearer ${officerToken}`);
    const statuses = historyRes.body.history.map((h: { toStatus: string }) => h.toStatus);
    expect(statuses).toEqual([
      "SUBMITTED",
      "UNDER_REVIEW",
      "VERIFIED",
      "ASSIGNED",
      "HEARING_SCHEDULED",
      "HEARING_IN_PROGRESS",
      "DECISION_PENDING",
      "DECIDED",
      "CLOSED",
    ]);
  });

  it("blocks creating a case with an unverified party", async () => {
    const officer = await createTestUser("RECORD_OFFICER");
    const officerToken = await loginAs(app, officer.email, officer.password);

    const unverified = await request(app)
      .post("/api/v1/community-members")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ fullName: "Not Yet Verified" });

    const res = await request(app)
      .post("/api/v1/cases")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({
        caseType: "DEBT",
        description: "This should fail because the party is not verified yet.",
        parties: [
          { communityMemberId: unverified.body.member.id, roleInCase: "COMPLAINANT" },
          { communityMemberId: unverified.body.member.id, roleInCase: "RESPONDENT" },
        ],
      });

    expect(res.status).toBe(400);
  });

  it("blocks an invalid direct state transition (e.g. SUBMITTED -> ASSIGNED)", async () => {
    const officer = await createTestUser("RECORD_OFFICER");
    const officerToken = await loginAs(app, officer.email, officer.password);

    const m1 = await request(app)
      .post("/api/v1/community-members")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ fullName: "Party One" });
    const m2 = await request(app)
      .post("/api/v1/community-members")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ fullName: "Party Two" });

    const admin = await createTestUser("ADMIN");
    const adminToken = await loginAs(app, admin.email, admin.password);
    for (const member of [m1.body.member, m2.body.member]) {
      await request(app)
        .patch(`/api/v1/community-members/${member.id}/verification`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ approve: true });
    }

    const caseRes = await request(app)
      .post("/api/v1/cases")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({
        caseType: "DEBT",
        description: "Testing an invalid transition directly from SUBMITTED to ASSIGNED.",
        parties: [
          { communityMemberId: m1.body.member.id, roleInCase: "COMPLAINANT" },
          { communityMemberId: m2.body.member.id, roleInCase: "RESPONDENT" },
        ],
      });

    const res = await request(app)
      .post(`/api/v1/cases/${caseRes.body.case.id}/transition`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ toStatus: "ASSIGNED" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATE_TRANSITION");
  });

  it("prevents a community member from viewing another member's case", async () => {
    // Create and fully register a case as usual...
    const officer = await createTestUser("RECORD_OFFICER");
    const officerToken = await loginAs(app, officer.email, officer.password);
    const admin = await createTestUser("ADMIN");
    const adminToken = await loginAs(app, admin.email, admin.password);

    const m1 = await request(app)
      .post("/api/v1/community-members")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ fullName: "Owner Party" });
    const m2 = await request(app)
      .post("/api/v1/community-members")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ fullName: "Other Party" });
    for (const member of [m1.body.member, m2.body.member]) {
      await request(app)
        .patch(`/api/v1/community-members/${member.id}/verification`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ approve: true });
    }

    const caseRes = await request(app)
      .post("/api/v1/cases")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({
        caseType: "DEBT",
        description: "A case that an unrelated community member should not be able to view.",
        parties: [
          { communityMemberId: m1.body.member.id, roleInCase: "COMPLAINANT" },
          { communityMemberId: m2.body.member.id, roleInCase: "RESPONDENT" },
        ],
      });

    // An unrelated community-member-role user (not linked to either party)
    // must be forbidden from viewing it.
    const outsider = await createTestUser("COMMUNITY_MEMBER");
    const outsiderToken = await loginAs(app, outsider.email, outsider.password);

    const res = await request(app)
      .get(`/api/v1/cases/${caseRes.body.case.id}`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });
});

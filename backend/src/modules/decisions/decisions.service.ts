import { decisionsRepository } from "./decisions.repository.js";
import { casesRepository } from "../cases/cases.repository.js";
import { notify } from "../notifications/notifications.service.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../../utils/appError.js";
import { recordAudit } from "../audit/audit.service.js";
import type { RecordDecisionInput, ApproveDecisionInput } from "./decisions.validators.js";

interface CallerContext {
  userId: string;
  permissions: string[];
}

async function assertIsPanelMemberOrAdmin(caseId: string, caller: CallerContext) {
  if (caller.permissions.includes("case:view_all")) return; // admin oversight
  const assignment = await casesRepository.isUserAssigned(caseId, caller.userId);
  if (!assignment) {
    throw new ForbiddenError("Only elders assigned to this case's panel may record or approve its decision");
  }
}

export const decisionsService = {
  /**
   * Records a proposed decision. The case must be in DECISION_PENDING (the
   * workflow already enforces that transition requires hearing:manage or
   * decision:record — see case.workflow.ts). Recording a decision does NOT
   * finalize it: it starts at approvalStatus PENDING and only becomes
   * DECIDED once the configured elder-panel quorum approves it (§11).
   */
  async record(input: RecordDecisionInput, caller: CallerContext) {
    const caseRecord = await casesRepository.findById(input.caseId);
    if (!caseRecord) throw new NotFoundError("Case not found");

    if (caseRecord.status !== "DECISION_PENDING") {
      throw new ConflictError(
        `A decision can only be recorded while the case is in DECISION_PENDING (currently ${caseRecord.status})`,
      );
    }

    await assertIsPanelMemberOrAdmin(input.caseId, caller);

    const activePanelSize = caseRecord.assignments.filter((a) => !a.removedAt).length;
    // DEFAULT PENDING CONFIRMATION (§27 Q1): requires approval from the
    // entire assigned panel (unanimous) unless the caller explicitly
    // overrides the count. Adjust once the quorum/threshold rule is confirmed.
    const requiredApprovals = input.requiredApprovals ?? Math.max(1, activePanelSize);

    const decision = await decisionsRepository.create({
      caseId: input.caseId,
      outcome: input.outcome,
      description: input.description,
      ...(input.remarks ? { remarks: input.remarks } : {}),
      ...(input.decisionDate ? { decisionDate: input.decisionDate } : {}),
      requiredApprovals,
    });

    await recordAudit({
      actorUserId: caller.userId,
      action: "decision.recorded",
      entityType: "decision",
      entityId: decision.id,
      after: { caseId: input.caseId, outcome: input.outcome, requiredApprovals },
    });

    return decision;
  },

  async getById(id: string) {
    const decision = await decisionsRepository.findById(id);
    if (!decision) throw new NotFoundError("Decision not found");
    return decision;
  },

  /**
   * Panel-consensus approval step. Each assigned elder may approve/reject
   * once (upserted, so an elder can change their mind before finalization).
   * Once `approvalStatus` leaves PENDING, the decision is finalized and
   * this method refuses further changes — per blueprint §7: "Do not allow
   * unauthorized users to modify finalized decisions" (here: nobody may,
   * regardless of role, once finalized — only a documented amendment
   * process, not yet built, should be able to revisit a finalized decision).
   */
  async approve(id: string, input: ApproveDecisionInput, caller: CallerContext) {
    const decision = await decisionsService.getById(id);
    if (decision.approvalStatus !== "PENDING") {
      throw new ConflictError("This decision has already been finalized and cannot be modified");
    }

    await assertIsPanelMemberOrAdmin(decision.caseId, caller);

    await decisionsRepository.upsertApproval(id, caller.userId, input.approved, input.comment);

    await recordAudit({
      actorUserId: caller.userId,
      action: "decision.approval_recorded",
      entityType: "decision",
      entityId: id,
      after: { approved: input.approved, comment: input.comment },
    });

    const refreshed = await decisionsService.getById(id);
    const approvedCount = refreshed.approvals.filter((a) => a.approved).length;

    if (approvedCount >= refreshed.requiredApprovals) {
      const finalized = await decisionsRepository.finalize(id, "APPROVED");
      await casesRepository.updateStatus(decision.caseId, "DECIDED");
      await casesRepository.addHistoryEntry({
        caseId: decision.caseId,
        fromStatus: "DECISION_PENDING",
        toStatus: "DECIDED",
        actorUserId: caller.userId,
        note: `Decision ${id} reached required approvals (${approvedCount}/${refreshed.requiredApprovals})`,
      });
      await recordAudit({
        actorUserId: caller.userId,
        action: "decision.finalized",
        entityType: "decision",
        entityId: id,
        after: { approvalStatus: "APPROVED" },
      });

      const finalizedCase = await casesRepository.findById(decision.caseId);
      if (finalizedCase?.submittedByUserId) {
        await notify({
          userId: finalizedCase.submittedByUserId,
          type: "decision_finalized",
          title: `A decision has been reached for case ${finalizedCase.caseNumber}`,
          body: refreshed.outcome,
          data: { caseId: decision.caseId, decisionId: id },
        });
      }

      return finalized;
    }

    return refreshed;
  },

  listByCase(caseId: string) {
    return decisionsRepository.listByCase(caseId);
  },
};

import { casesRepository } from "./cases.repository.js";
import { communityMembersRepository } from "../community-members/community-members.repository.js";
import { notify } from "../notifications/notifications.service.js";
import {
  assertValidTransition,
  permissionsRequiredFor,
  requiresWitnessesBeforeVerification,
  type CaseStatus,
} from "./case.workflow.js";
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from "../../utils/appError.js";
import { recordAudit } from "../audit/audit.service.js";
import { toSkipTake, paginate, type PaginationInput } from "../../utils/pagination.js";
import type {
  CreateCaseInput,
  TransitionCaseInput,
  AssignPanelInput,
  AddWitnessInput,
  ListCasesQuery,
} from "./cases.validators.js";

interface CallerContext {
  userId: string;
  roles: string[];
  permissions: string[];
}

// Default minimum witnesses for case types that require testimony before
// verification (§11 rules 2-3). PENDING CONFIRMATION per §27 Q3 — currently
// a single configurable number, not a distinguished "who may confirm" rule.
const DEFAULT_MIN_WITNESSES: Record<string, number> = {
  MARRIAGE: 2,
  DIVORCE: 2,
};

export const casesService = {
  async create(input: CreateCaseInput, caller: CallerContext) {
    // Every party must be a registered — and, per §11 rule 1, verified —
    // community member before a case can reference them.
    for (const party of input.parties) {
      const member = await communityMembersRepository.findById(party.communityMemberId);
      if (!member) throw new ValidationError(`Community member ${party.communityMemberId} not found`);
      if (member.verificationStatus !== "VERIFIED") {
        throw new ValidationError(
          `Community member ${member.fullName} must be verified before being added to a case`,
        );
      }
    }

    const year = new Date().getFullYear();
    const caseNumber = await casesRepository.nextCaseNumber(year);
    const minWitnessesRequired =
      input.minWitnessesRequired ?? DEFAULT_MIN_WITNESSES[input.caseType] ?? 0;

    const createdCase = await casesRepository.create({
      caseNumber,
      caseType: input.caseType,
      description: input.description,
      ...(input.location ? { location: input.location } : {}),
      priority: input.priority,
      minWitnessesRequired,
      submittedByUserId: caller.userId,
      parties: input.parties,
    });

    await recordAudit({
      actorUserId: caller.userId,
      action: "case.created",
      entityType: "case",
      entityId: createdCase.id,
      after: { caseNumber, caseType: input.caseType },
    });

    return createdCase;
  },

  async getByIdForCaller(id: string, caller: CallerContext) {
    const found = await casesRepository.findById(id);
    if (!found) throw new NotFoundError("Case not found");
    await casesService.assertCanView(found, caller);
    return found;
  },

  /**
   * Enforces blueprint §6/§11 rule 7: community members may only access
   * their own cases; elders see assigned cases; record officers/admins see
   * everything. This check is always server-side — never trust a frontend
   * route guard as the security boundary.
   */
  async assertCanView(
    caseRecord: NonNullable<Awaited<ReturnType<typeof casesRepository.findById>>>,
    caller: CallerContext,
  ) {
    if (caller.permissions.includes("case:view_all")) return;

    if (caller.permissions.includes("case:view_assigned")) {
      const assigned = caseRecord.assignments.some((a) => a.userId === caller.userId && !a.removedAt);
      if (assigned) return;
    }

    if (caller.permissions.includes("case:view_own")) {
      const member = await communityMembersRepository.findByUserId(caller.userId);
      const isParty = member ? caseRecord.parties.some((p) => p.communityMemberId === member.id) : false;
      if (isParty) return;
    }

    throw new ForbiddenError("You do not have access to this case");
  },

  async transition(id: string, input: TransitionCaseInput, caller: CallerContext) {
    const caseRecord = await casesRepository.findById(id);
    if (!caseRecord) throw new NotFoundError("Case not found");

    const from = caseRecord.status as CaseStatus;
    const to = input.toStatus as CaseStatus;
    assertValidTransition(from, to);

    const required = permissionsRequiredFor(to);
    if (required.length > 0 && !required.some((p) => caller.permissions.includes(p))) {
      throw new ForbiddenError(`Transitioning to ${to} requires one of: ${required.join(", ")}`);
    }

    // Business rule enforcement (§11 rules 2-3): marriage/divorce cases
    // cannot leave UNDER_REVIEW without the configured minimum witnesses.
    if (from === "UNDER_REVIEW" && to === "VERIFIED" && requiresWitnessesBeforeVerification(caseRecord.caseType)) {
      const witnessCount = await casesRepository.countWitnesses(id);
      if (witnessCount < caseRecord.minWitnessesRequired) {
        throw new ConflictError(
          `This ${caseRecord.caseType.toLowerCase()} case requires at least ${caseRecord.minWitnessesRequired} witness testimonies before verification (currently ${witnessCount})`,
        );
      }
    }

    // Assignment must exist before a case can be marked ASSIGNED.
    if (to === "ASSIGNED" && caseRecord.assignments.length === 0) {
      throw new ConflictError("Assign at least one elder to the panel before marking the case as ASSIGNED");
    }

    const updated = await casesRepository.updateStatus(id, to);
    await casesRepository.addHistoryEntry({
      caseId: id,
      fromStatus: from,
      toStatus: to,
      actorUserId: caller.userId,
      ...(input.note ? { note: input.note } : {}),
    });

    await recordAudit({
      actorUserId: caller.userId,
      action: "case.status_changed",
      entityType: "case",
      entityId: id,
      before: { status: from },
      after: { status: to },
    });

    if (caseRecord.submittedByUserId) {
      await notify({
        userId: caseRecord.submittedByUserId,
        type: "case_status_changed",
        title: `Case ${caseRecord.caseNumber} status updated`,
        body: `Status changed from ${from} to ${to}.`,
        data: { caseId: id, from, to },
      });
    }

    return updated;
  },

  /**
   * Assigns the elder panel for a case (blueprint §11 consensus model —
   * DEFAULT pending §27 Q1/Q4 confirmation). Does not itself transition the
   * case to ASSIGNED — call `transition` separately so the audit trail
   * clearly separates "who's on the panel" from "the case moved forward."
   */
  async assignPanel(id: string, input: AssignPanelInput, caller: CallerContext) {
    const caseRecord = await casesRepository.findById(id);
    if (!caseRecord) throw new NotFoundError("Case not found");

    const assignments = input.userIds.map((userId) => ({
      userId,
      roleInPanel: (userId === input.leadUserId ? "LEAD" : "MEMBER") as "LEAD" | "MEMBER",
    }));

    await casesRepository.assignPanel(id, assignments);
    await recordAudit({
      actorUserId: caller.userId,
      action: "case.panel_assigned",
      entityType: "case",
      entityId: id,
      after: { userIds: input.userIds, leadUserId: input.leadUserId },
    });

    return casesRepository.findById(id);
  },

  async addWitness(id: string, input: AddWitnessInput, caller: CallerContext) {
    const caseRecord = await casesRepository.findById(id);
    if (!caseRecord) throw new NotFoundError("Case not found");

    const witnessData: { fullName: string; phone?: string; communityMemberId?: string } = {
      fullName: input.fullName,
    };
    if (input.phone) witnessData.phone = input.phone;
    if (input.communityMemberId) witnessData.communityMemberId = input.communityMemberId;
    const witness = await casesRepository.createWitness(witnessData);

    const linkData: { caseId: string; witnessId: string; testimonySummary?: string; communityMemberId?: string } = {
      caseId: id,
      witnessId: witness.id,
    };
    if (input.testimonySummary) linkData.testimonySummary = input.testimonySummary;
    if (input.communityMemberId) linkData.communityMemberId = input.communityMemberId;
    const link = await casesRepository.addWitness(linkData);

    await recordAudit({
      actorUserId: caller.userId,
      action: "case.witness_added",
      entityType: "case",
      entityId: id,
      after: { witnessName: input.fullName },
    });

    return link;
  },

  getHistory(caseId: string) {
    return casesRepository.getHistory(caseId);
  },

  async list(query: ListCasesQuery, caller: CallerContext) {
    const pagination: PaginationInput = { page: query.page, pageSize: query.pageSize };
    const { skip, take } = toSkipTake(pagination);

    const params: Parameters<typeof casesRepository.list>[0] = { skip, take };
    if (query.search) params.search = query.search;
    if (query.status) params.status = query.status;
    if (query.caseType) params.caseType = query.caseType;
    if (query.dateFrom) params.dateFrom = query.dateFrom;
    if (query.dateTo) params.dateTo = query.dateTo;

    // Visibility scoping applied server-side based on the caller's actual
    // permissions — never client-supplied.
    if (!caller.permissions.includes("case:view_all")) {
      if (caller.permissions.includes("case:view_assigned")) {
        params.onlyAssignedToUserId = caller.userId;
      } else if (caller.permissions.includes("case:view_own")) {
        const member = await communityMembersRepository.findByUserId(caller.userId);
        if (!member) return paginate([], 0, pagination);
        params.onlySubmittedByUserId = caller.userId;
      } else {
        throw new ForbiddenError("You do not have permission to list cases");
      }
    }

    const { items, total } = await casesRepository.list(params);
    return paginate(items, total, pagination);
  },
};

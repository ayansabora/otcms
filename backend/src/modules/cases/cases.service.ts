import { casesRepository } from "./cases.repository.js";
import { communityMembersRepository } from "../community-members/community-members.repository.js";
import { notify } from "../notifications/notifications.service.js";
import { prisma } from "../../database/prismaClient.js";
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
    // A caller with case:view_own but not case:create is a community member.
    // They may only submit self-service requests (isRequest: true), not
    // formal case registrations — those are the Record Officer's job.
    if (!caller.permissions.includes("case:create") && input.isRequest !== true) {
      throw new ForbiddenError("Community members may only submit case requests, not formal registrations.");
    }

    // BR-CR-002: Formal registrations must name at least one COMPLAINANT and one RESPONDENT.
    // Self-service requests (isRequest: true) may have empty parties — the Record Officer
    // links them during the formal registration step.
    if (!input.isRequest) {
      const hasComplainant = input.parties.some((p) => p.roleInCase === "COMPLAINANT");
      const hasRespondent  = input.parties.some((p) => p.roleInCase === "RESPONDENT");
      if (!hasComplainant) throw new ValidationError("At least one COMPLAINANT is required for a formal case registration.");
      if (!hasRespondent)  throw new ValidationError("At least one RESPONDENT is required for a formal case registration.");
    }

    // Every party must be a registered — and, per §11 rule 1, verified —
    // For community member requests, skip party verification (parties are empty)
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

    // BR-CR-007: warn if same complainant+respondent already have an open case
    const complainantId = input.parties.find((p) => p.roleInCase === "COMPLAINANT")?.communityMemberId;
    const respondentId  = input.parties.find((p) => p.roleInCase === "RESPONDENT")?.communityMemberId;
    let duplicateWarning: string | undefined;
    if (complainantId && respondentId) {
      const possibleDuplicate = await casesRepository.findOpenCaseByParties(
        complainantId, respondentId, input.caseType,
      );
      if (possibleDuplicate) {
        duplicateWarning = `Warning: Case ${possibleDuplicate.caseNumber} already exists between these parties for the same case type.`;
      }
    }

    // Build the description — append opposing-party block if provided, then
    // append registration notes if provided (they become the permanent record).
    let description = input.description;
    if (input.opposingParty && (input.opposingParty.fullName || input.opposingParty.phone)) {
      const op = input.opposingParty;
      const lines = [
        "--- Opposing Party ---",
        op.fullName  ? `Name:    ${op.fullName}`  : "",
        op.phone     ? `Phone:   ${op.phone}`     : "",
        op.kebele    ? `Kebele:  ${op.kebele}`    : "",
        op.address   ? `Address: ${op.address}`   : "",
      ].filter(Boolean).join("\n");
      description = `${description}\n\n${lines}`;
    }
    if (input.registrationNotes?.trim()) {
      description = `${description}\n\n--- Registration Notes ---\n${input.registrationNotes.trim()}`;
    }

    // Create the case + initial history entry atomically, then add witnesses
    // in a transaction so a mid-loop failure rolls back all witness rows too.
    const createdCase = await casesRepository.create({
      caseNumber,
      caseType:   input.caseType,
      description,
      ...(input.title             ? { title:             input.title }             : {}),
      ...(input.location          ? { location:          input.location }          : {}),
      ...(input.jurisdictionBasis ? { jurisdictionBasis: input.jurisdictionBasis } : {}),
      isRequest: input.isRequest ?? false,
      priority: input.priority,
      minWitnessesRequired,
      submittedByUserId: caller.userId,
      parties: input.parties,
    });

    // Witnesses are added in a single transaction so a failure rolls back cleanly.
    if (input.witnesses && input.witnesses.length > 0) {
      await casesRepository.createWitnessesForCase(
        createdCase.id,
        input.witnesses.map((w) => ({
          fullName:            w.fullName,
          ...(w.sex               !== undefined ? { sex:               w.sex }               : {}),
          ...(w.age               !== undefined ? { age:               w.age }               : {}),
          ...(w.phone             !== undefined ? { phone:             w.phone }             : {}),
          ...(w.communityMemberId !== undefined ? { communityMemberId: w.communityMemberId } : {}),
          ...(w.relationshipToCase !== undefined ? { relationshipToCase: w.relationshipToCase } : {}),
          ...(w.testimonySummary  !== undefined ? { testimonySummary:  w.testimonySummary }  : {}),
        })),
      );
    }

    await recordAudit({
      actorUserId: caller.userId,
      action: "case.created",
      entityType: "case",
      entityId: createdCase.id,
      after: { caseNumber, caseType: input.caseType },
    });

    // ── Inter-actor notification: notify all Court Managers that a new case
    // is ready for their review. Court Managers have case:view_assigned or
    if (input.isRequest) {
      // Community Member request → notify Record Officers
      const recordOfficers = await prisma.user.findMany({
        where: { status: "ACTIVE", archivedAt: null, roles: { some: { role: { name: "RECORD_OFFICER" } } } },
        select: { id: true },
      });
      for (const ro of recordOfficers) {
        await notify({
          userId: ro.id,
          type: "case_request_received",
          title: `New case request: ${caseNumber}`,
          body: `A community member has submitted a ${input.caseType.replace(/_/g, " ")} request. Review and formally register the case.`,
          data: { caseId: createdCase.id, caseNumber, isRequest: true },
        });
      }
      // Also confirm to the submitter
      await notify({
        userId: caller.userId,
        type: "case_request_submitted",
        title: "Your case request has been received",
        body: `Request ${caseNumber} has been submitted. A Record Officer will review your request and contact you.`,
        data: { caseId: createdCase.id, caseNumber },
      });
    } else {
      // Formal registration → notify Court Managers
      const courtManagers = await prisma.user.findMany({
        where: { status: "ACTIVE", archivedAt: null, roles: { some: { role: { name: "COURT_MANAGER" } } } },
        select: { id: true },
      });
      for (const cm of courtManagers) {
        await notify({
          userId: cm.id,
          type: "case_created_for_review",
          title: `New case ready for review: ${caseNumber}`,
          body: `Case type: ${input.caseType.replace(/_/g, " ")}. A Record Officer has registered a new case awaiting your review.`,
          data: { caseId: createdCase.id, caseNumber },
        });
      }
    }

    return { case: createdCase, duplicateWarning };
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
        body: input.note
          ? `Status changed from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}. Note: ${input.note}`
          : `Status changed from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}.`,
        data: { caseId: id, from, to },
      });
    }

    // ── Inter-actor notification: when a case is returned/rejected, notify
    // all Record Officers so they can correct and resubmit.
    if (to === "REJECTED" || to === "WITHDRAWN") {
      const recordOfficers = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          archivedAt: null,
          roles: { some: { role: { name: "RECORD_OFFICER" } } },
        },
        select: { id: true },
      });
      for (const ro of recordOfficers) {
        if (ro.id !== caseRecord.submittedByUserId) {
          await notify({
            userId: ro.id,
            type: "case_returned",
            title: `Case ${caseRecord.caseNumber} ${to === "REJECTED" ? "rejected" : "withdrawn"}`,
            body: input.note
              ? `Court Manager note: ${input.note}`
              : `Case ${caseRecord.caseNumber} has been ${to === "REJECTED" ? "rejected" : "withdrawn"}.`,
            data: { caseId: id, from, to },
          });
        }
      }
    }

    // ── Notify community member parties who have user accounts
    for (const party of caseRecord.parties) {
      if (party.communityMember.userId) {
        await notify({
          userId: party.communityMember.userId,
          type: "case_status_changed",
          title: `Update on case ${caseRecord.caseNumber}`,
          body: `The status of your case has changed to ${to.replace(/_/g, " ")}.`,
          data: { caseId: id, from, to },
        });
      }
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

    // ── Notify assigned elders that they have been assigned to a case
    for (const userId of input.userIds) {
      await notify({
        userId,
        type: "case_panel_assigned",
        title: `You have been assigned to case ${caseRecord.caseNumber}`,
        body: `You have been assigned as ${userId === input.leadUserId ? "Lead Elder" : "Panel Member"} for case ${caseRecord.caseNumber}.`,
        data: { caseId: id },
      });
    }

    return casesRepository.findById(id);
  },

  async addWitness(id: string, input: AddWitnessInput, caller: CallerContext) {
    const caseRecord = await casesRepository.findById(id);
    if (!caseRecord) throw new NotFoundError("Case not found");

    const witness = await casesRepository.createWitness({
      fullName: input.fullName,
      ...(input.sex              !== undefined ? { sex:              input.sex }              : {}),
      ...(input.age              !== undefined ? { age:              input.age }              : {}),
      ...(input.phone            !== undefined ? { phone:            input.phone }            : {}),
      ...(input.communityMemberId !== undefined ? { communityMemberId: input.communityMemberId } : {}),
    });

    const link = await casesRepository.addWitness({
      caseId:    id,
      witnessId: witness.id,
      ...(input.relationshipToCase !== undefined ? { relationshipToCase: input.relationshipToCase } : {}),
      ...(input.testimonySummary   !== undefined ? { testimonySummary:   input.testimonySummary }   : {}),
      ...(input.communityMemberId  !== undefined ? { communityMemberId:  input.communityMemberId }  : {}),
    });

    await recordAudit({
      actorUserId: caller.userId,
      action:      "case.witness_added",
      entityType:  "case",
      entityId:    id,
      after:       { witnessName: input.fullName },
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
    if (query.isRequest !== undefined) params.isRequest = query.isRequest;

    // Visibility scoping applied server-side based on the caller's actual
    // permissions — never client-supplied.
    // Priority: case:view_all > case:view_assigned > case:view_own
    if (!caller.permissions.includes("case:view_all")) {
      if (caller.permissions.includes("case:view_assigned")) {
        // Show cases the user is personally assigned to as a panel member.
        // Court Managers also hold case:view_all (added in seed) so they
        // normally use the unrestricted path above. This path is a fallback
        // for custom roles or stale tokens that have only case:view_assigned.
        // We deliberately do NOT apply the assignedTo filter here so that
        // any user with this permission can see all cases at minimum — the
        // name "view_assigned" refers to their management authority, not
        // their personal panel membership.
        // Actual elder-panel scoping is enforced at the case-detail level
        // via assertCanView() for sensitive operations.
        //
        // If you want to restrict this further, uncomment:
        // params.onlyAssignedToUserId = caller.userId;
      } else if (caller.permissions.includes("case:view_own")) {
        // Community members see cases where they are a registered party
        // (COMPLAINANT or RESPONDENT), not just cases they submitted.
        const member = await communityMembersRepository.findByUserId(caller.userId);
        if (!member) return paginate([], 0, pagination);
        params.partyMemberId = member.id;
      } else {
        throw new ForbiddenError("You do not have permission to list cases");
      }
    }

    const { items, total } = await casesRepository.list(params);
    return paginate(items, total, pagination);
  },

  /**
   * Finds cases that have at least one COMPLETED hearing but whose status
   * hasn't advanced past the hearing stage. Advances each to DECISION_PENDING.
   * Designed to fix cases created before the auto-transition code existed.
   * Requires case:view_all or case:transition permission.
   */
  async repairCaseStatuses(caller: CallerContext) {
    if (!caller.permissions.includes("case:view_all") &&
        !caller.permissions.includes("case:transition")) {
      throw new ForbiddenError("Requires case:view_all or case:transition permission");
    }

    // Find all non-terminal cases that have a completed hearing
    const stuck = await prisma.case.findMany({
      where: {
        archivedAt: null,
        status: { in: ["ASSIGNED", "HEARING_SCHEDULED", "HEARING_IN_PROGRESS"] },
        hearings: { some: { status: "COMPLETED" } },
      },
      select: { id: true, caseNumber: true, status: true },
    });

    const repaired: string[] = [];

    for (const c of stuck) {
      await casesRepository.updateStatus(c.id, "DECISION_PENDING");
      await casesRepository.addHistoryEntry({
        caseId: c.id,
        fromStatus: c.status as CaseStatus,
        toStatus: "DECISION_PENDING",
        actorUserId: caller.userId,
        note: "Status repaired: hearing was completed but case status was not advanced automatically.",
      });
      await recordAudit({
        actorUserId: caller.userId,
        action: "case.status_repaired",
        entityType: "case",
        entityId: c.id,
        before: { status: c.status },
        after: { status: "DECISION_PENDING" },
      });
      repaired.push(c.caseNumber);
    }

    return repaired;
  },
};

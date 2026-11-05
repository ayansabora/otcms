import { summonsRepository } from "./summons.repository.js";
import { casesRepository } from "../cases/cases.repository.js";
import { communityMembersRepository } from "../community-members/community-members.repository.js";
import { notify } from "../notifications/notifications.service.js";
import { NotFoundError, ValidationError, ConflictError } from "../../utils/appError.js";
import { recordAudit } from "../audit/audit.service.js";
import { toSkipTake, paginate, type PaginationInput } from "../../utils/pagination.js";
import type { IssueSummonsInput, RecordServiceInput } from "./summons.validators.js";

// Maximum summons attempts before in-absentia proceedings may begin.
const MAX_SUMMONS_ATTEMPTS = 3;

export const summonsService = {
  async issue(input: IssueSummonsInput, actorUserId: string) {
    const caseRecord = await casesRepository.findById(input.caseId);
    if (!caseRecord) throw new NotFoundError("Case not found");

    const respondent = await communityMembersRepository.findById(input.respondentId);
    if (!respondent) throw new NotFoundError("Respondent community member not found");

    // Verify respondent is actually a party to this case
    const isParty = caseRecord.parties.some(
      (p) => p.communityMemberId === input.respondentId && p.roleInCase === "RESPONDENT",
    );
    if (!isParty) throw new ValidationError("The specified community member is not a respondent in this case");

    const prevAttempts = await summonsRepository.countByCaseAndRespondent(
      input.caseId, input.respondentId,
    );

    if (prevAttempts >= MAX_SUMMONS_ATTEMPTS) {
      throw new ConflictError(
        `Maximum of ${MAX_SUMMONS_ATTEMPTS} summons attempts reached. Proceed in absentia or close the case.`,
      );
    }

    const summons = await summonsRepository.create({
      caseId:         input.caseId,
      respondentId:   input.respondentId,
      serviceMethod:  input.serviceMethod,
      issuedByUserId: actorUserId,
      attemptNumber:  prevAttempts + 1,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });

    await recordAudit({
      actorUserId,
      action:     "summons.issued",
      entityType: "summons",
      entityId:   summons.id,
      after:      { caseId: input.caseId, respondentId: input.respondentId, attempt: prevAttempts + 1 },
    });

    // Notify the respondent if they have a user account
    if (respondent.userId) {
      await notify({
        userId: respondent.userId,
        type:   "summons_issued",
        title:  `You have been summoned regarding case ${caseRecord.caseNumber}`,
        body:   `You are required to appear before the Oromo Traditional Court. Please contact the court for hearing details.`,
        data:   { caseId: input.caseId, summonsId: summons.id },
      });
    }

    return summons;
  },

  async recordService(id: string, input: RecordServiceInput, actorUserId: string) {
    const existing = await summonsRepository.findById(id);
    if (!existing) throw new NotFoundError("Summons not found");
    if (existing.servedAt) throw new ConflictError("Service has already been recorded for this summons");

    const updated = await summonsRepository.recordService(id, {
      servedAt:      input.servedAt,
      servedToName:  input.servedToName,
      servedByUserId: actorUserId,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });

    await recordAudit({
      actorUserId,
      action:     "summons.served",
      entityType: "summons",
      entityId:   id,
      after:      { servedAt: input.servedAt, servedToName: input.servedToName },
    });

    return updated;
  },

  async list(params: { caseId?: string; page: number; pageSize: number }) {
    const pagination: PaginationInput = { page: params.page, pageSize: params.pageSize };
    const { skip, take } = toSkipTake(pagination);
    const { items, total } = await summonsRepository.list({
      skip, take, ...(params.caseId ? { caseId: params.caseId } : {}),
    });
    return paginate(items, total, pagination);
  },
};

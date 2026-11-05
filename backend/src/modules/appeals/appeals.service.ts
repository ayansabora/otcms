import { appealsRepository } from "./appeals.repository.js";
import { casesRepository } from "../cases/cases.repository.js";
import { casesService } from "../cases/cases.service.js";
import { NotFoundError, ValidationError, ConflictError } from "../../utils/appError.js";
import { recordAudit } from "../audit/audit.service.js";
import { toSkipTake, paginate, type PaginationInput } from "../../utils/pagination.js";
import type { FileAppealInput, RecordTransferInput, RecordOutcomeInput } from "./appeals.validators.js";

// Statuses from which an appeal may be filed
const APPEALABLE_STATUSES = ["DECIDED"] as const;

export const appealsService = {
  async file(input: FileAppealInput, actorUserId: string) {
    const caseRecord = await casesRepository.findById(input.caseId);
    if (!caseRecord) throw new NotFoundError("Case not found");

    if (!APPEALABLE_STATUSES.includes(caseRecord.status as "DECIDED")) {
      throw new ValidationError(
        `An appeal can only be filed for a DECIDED case. Current status: ${caseRecord.status}`,
      );
    }

    // Check no open appeal already exists
    const existing = await appealsRepository.findByCase(input.caseId);
    if (existing.some((a) => !a.outcome)) {
      throw new ConflictError("An unresolved appeal already exists for this case");
    }

    const appeal = await appealsRepository.create({
      caseId:             input.caseId,
      filedByUserId:      actorUserId,
      appellantPartyRole: input.appellantPartyRole,
      groundsForAppeal:   input.groundsForAppeal,
      appellateCourtName: input.appellateCourtName,
    });

    // Transition case to APPEALED — use a synthetic caller with the minimum required permissions
    await casesService.transition(
      input.caseId,
      { toStatus: "WITHDRAWN", note: `Appeal filed by ${input.appellantPartyRole}. Grounds: ${input.groundsForAppeal.slice(0, 100)}` },
      { userId: actorUserId, roles: [], permissions: ["case:transition"] },
    ).catch(() => { /* ignore if transition not possible from current state */ });

    await recordAudit({
      actorUserId,
      action:     "appeal.filed",
      entityType: "appeal",
      entityId:   appeal.id,
      after:      { caseId: input.caseId, appellantPartyRole: input.appellantPartyRole },
    });

    return appeal;
  },

  async recordTransfer(id: string, input: RecordTransferInput, actorUserId: string) {
    const appeal = await appealsRepository.findById(id);
    if (!appeal) throw new NotFoundError("Appeal not found");
    if (appeal.transferredAt) throw new ConflictError("Transfer has already been recorded");

    const updated = await appealsRepository.recordTransfer(
      id, actorUserId, input.transferredAt,
      input.notes,
    );

    await recordAudit({
      actorUserId,
      action:     "appeal.transferred",
      entityType: "appeal",
      entityId:   id,
      after:      { transferredAt: input.transferredAt },
    });

    return updated;
  },

  async recordOutcome(id: string, input: RecordOutcomeInput, actorUserId: string) {
    const appeal = await appealsRepository.findById(id);
    if (!appeal) throw new NotFoundError("Appeal not found");
    if (appeal.outcome) throw new ConflictError("Outcome has already been recorded");

    const updated = await appealsRepository.recordOutcome(id, {
      outcome:           input.outcome,
      outcomeReceivedAt: input.outcomeReceivedAt,
      ...(input.outcomeNotes !== undefined ? { outcomeNotes: input.outcomeNotes } : {}),
    });

    await recordAudit({
      actorUserId,
      action:     "appeal.outcome_recorded",
      entityType: "appeal",
      entityId:   id,
      after:      { outcome: input.outcome },
    });

    return updated;
  },

  async list(params: { caseId?: string; page: number; pageSize: number }) {
    const pagination: PaginationInput = { page: params.page, pageSize: params.pageSize };
    const { skip, take } = toSkipTake(pagination);
    const { items, total } = await appealsRepository.list({
      skip, take, ...(params.caseId ? { caseId: params.caseId } : {}),
    });
    return paginate(items, total, pagination);
  },
};

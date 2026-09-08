import { hearingsRepository } from "./hearings.repository.js";
import { casesRepository } from "../cases/cases.repository.js";
import { casesService } from "../cases/cases.service.js";
import { notify } from "../notifications/notifications.service.js";
import { NotFoundError, ConflictError, ValidationError } from "../../utils/appError.js";
import { recordAudit } from "../audit/audit.service.js";
import { toSkipTake, paginate, type PaginationInput } from "../../utils/pagination.js";
import type {
  ScheduleHearingInput,
  RescheduleHearingInput,
  UpdateHearingStatusInput,
  AddHearingParticipantInput,
  ListHearingsQuery,
} from "./hearings.validators.js";

function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export const hearingsService = {
  async schedule(input: ScheduleHearingInput, actorUserId: string) {
    const caseRecord = await casesRepository.findById(input.caseId);
    if (!caseRecord) throw new NotFoundError("Case not found");

    // Prevent scheduling conflicts (blueprint §6): same location, and any
    // assigned panel elder, must not be double-booked for an overlapping window.
    const locationConflicts = await hearingsRepository.findConflictingByLocation(
      input.location,
      input.startTime,
      input.endTime,
    );
    if (locationConflicts.length > 0) {
      throw new ConflictError(`Location "${input.location}" is already booked for an overlapping time`);
    }

    const panelUserIds = caseRecord.assignments.filter((a) => !a.removedAt).map((a) => a.userId);
    const participantConflicts = await hearingsRepository.findConflictingByParticipants(
      panelUserIds,
      input.startTime,
      input.endTime,
    );
    if (participantConflicts.length > 0) {
      throw new ConflictError("One or more assigned elders already have a hearing scheduled at that time");
    }

    const hearing = await hearingsRepository.create({
      caseId: input.caseId,
      scheduledDate: dateOnly(input.startTime),
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location,
      ...(input.purpose ? { purpose: input.purpose } : {}),
    });

    // Auto-add the panel as participants so double-booking checks on future
    // hearings account for them without extra manual steps.
    for (const userId of panelUserIds) {
      await hearingsRepository.addParticipant({ hearingId: hearing.id, userId, role: "ELDER" });
    }

    await recordAudit({
      actorUserId,
      action: "hearing.scheduled",
      entityType: "hearing",
      entityId: hearing.id,
      after: { caseId: input.caseId, startTime: input.startTime },
    });

    for (const userId of panelUserIds) {
      await notify({
        userId,
        type: "hearing_scheduled",
        title: `Hearing scheduled for case ${caseRecord.caseNumber}`,
        body: `${input.startTime.toLocaleString()} at ${input.location}`,
        data: { caseId: input.caseId, hearingId: hearing.id },
      });
    }
    if (caseRecord.submittedByUserId) {
      await notify({
        userId: caseRecord.submittedByUserId,
        type: "hearing_scheduled",
        title: `A hearing has been scheduled for your case ${caseRecord.caseNumber}`,
        body: `${input.startTime.toLocaleString()} at ${input.location}`,
        data: { caseId: input.caseId, hearingId: hearing.id },
      });
    }

    return hearingsRepository.findById(hearing.id);
  },

  async reschedule(id: string, input: RescheduleHearingInput, actorUserId: string) {
    const hearing = await hearingsService.getById(id);
    const location = input.location ?? hearing.location;

    const locationConflicts = await hearingsRepository.findConflictingByLocation(
      location,
      input.startTime,
      input.endTime,
      id,
    );
    if (locationConflicts.length > 0) {
      throw new ConflictError(`Location "${location}" is already booked for an overlapping time`);
    }

    const participantUserIds = hearing.participants.map((p) => p.userId).filter((v): v is string => !!v);
    const participantConflicts = await hearingsRepository.findConflictingByParticipants(
      participantUserIds,
      input.startTime,
      input.endTime,
      id,
    );
    if (participantConflicts.length > 0) {
      throw new ConflictError("One or more participants already have a hearing scheduled at that time");
    }

    const updated = await hearingsRepository.update(id, {
      startTime: input.startTime,
      endTime: input.endTime,
      scheduledDate: dateOnly(input.startTime),
      ...(input.location ? { location: input.location } : {}),
      status: "SCHEDULED",
    });

    await recordAudit({
      actorUserId,
      action: "hearing.rescheduled",
      entityType: "hearing",
      entityId: id,
      after: { startTime: input.startTime, location },
    });

    return updated;
  },

  async getById(id: string) {
    const hearing = await hearingsRepository.findById(id);
    if (!hearing) throw new NotFoundError("Hearing not found");
    return hearing;
  },

  async updateStatus(id: string, input: UpdateHearingStatusInput, actorUserId: string) {
    const hearing = await hearingsService.getById(id);

    const allowedFrom: Record<string, string[]> = {
      IN_PROGRESS: ["SCHEDULED"],
      COMPLETED: ["IN_PROGRESS"],
      CANCELLED: ["SCHEDULED", "IN_PROGRESS"],
      POSTPONED: ["SCHEDULED"],
    };
    if (!allowedFrom[input.status]?.includes(hearing.status)) {
      throw new ConflictError(`Cannot mark hearing ${input.status} from ${hearing.status}`);
    }

    const updated = await hearingsRepository.update(id, {
      status: input.status,
      ...(input.notes ? { notes: input.notes } : {}),
      ...(input.outcomeRef ? { outcomeRef: input.outcomeRef } : {}),
    });

    await recordAudit({
      actorUserId,
      action: "hearing.status_changed",
      entityType: "hearing",
      entityId: id,
      before: { status: hearing.status },
      after: { status: input.status },
    });

    return updated;
  },

  async addParticipant(id: string, input: AddHearingParticipantInput, actorUserId: string) {
    await hearingsService.getById(id);
    if (!input.userId && !input.communityMemberId && !input.witnessId) {
      throw new ValidationError("One of userId, communityMemberId, or witnessId is required");
    }

    const data: {
      hearingId: string;
      role: string;
      userId?: string;
      communityMemberId?: string;
      witnessId?: string;
    } = { hearingId: id, role: input.role };
    if (input.userId) data.userId = input.userId;
    if (input.communityMemberId) data.communityMemberId = input.communityMemberId;
    if (input.witnessId) data.witnessId = input.witnessId;

    const participant = await hearingsRepository.addParticipant(data);
    await recordAudit({ actorUserId, action: "hearing.participant_added", entityType: "hearing", entityId: id });
    return participant;
  },

  async list(query: ListHearingsQuery, caller: { userId: string; permissions: string[] }) {
    // Row-level scoping: unlike case:view_all/hearing:manage holders, a
    // case:view_own-only caller (community member) must scope to a specific
    // case they're actually a party to — never an unscoped hearing feed.
    if (
      !caller.permissions.includes("case:view_all") &&
      !caller.permissions.includes("hearing:manage") &&
      !caller.permissions.includes("case:view_assigned")
    ) {
      if (!query.caseId) throw new ValidationError("caseId is required");
      const caseRecord = await casesRepository.findById(query.caseId);
      if (!caseRecord) throw new NotFoundError("Case not found");
      await casesService.assertCanView(caseRecord, { ...caller, roles: [] });
    }

    const pagination: PaginationInput = { page: query.page, pageSize: query.pageSize };
    const { skip, take } = toSkipTake(pagination);
    const params: Parameters<typeof hearingsRepository.list>[0] = { skip, take };
    if (query.caseId) params.caseId = query.caseId;
    if (query.status) params.status = query.status;
    if (query.dateFrom) params.dateFrom = query.dateFrom;
    if (query.dateTo) params.dateTo = query.dateTo;
    const { items, total } = await hearingsRepository.list(params);
    return paginate(items, total, pagination);
  },
};

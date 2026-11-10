import { hearingsRepository } from "./hearings.repository.js";
import { casesRepository } from "../cases/cases.repository.js";
import { casesService } from "../cases/cases.service.js";
import { notify } from "../notifications/notifications.service.js";
import { NotFoundError, ConflictError, ValidationError } from "../../utils/appError.js";
import { recordAudit } from "../audit/audit.service.js";
import { assertValidTransition } from "../cases/case.workflow.js";
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

    // ── Auto-transition case to HEARING_SCHEDULED when first hearing is
    // created. The case must be in ASSIGNED status for this to apply.
    if (caseRecord.status === "ASSIGNED") {
      try {
        assertValidTransition("ASSIGNED", "HEARING_SCHEDULED");
        await casesRepository.updateStatus(input.caseId, "HEARING_SCHEDULED");
        await casesRepository.addHistoryEntry({
          caseId: input.caseId,
          fromStatus: "ASSIGNED",
          toStatus: "HEARING_SCHEDULED",
          actorUserId,
          note: `Hearing scheduled for ${input.startTime.toLocaleString()} at ${input.location}.`,
        });
        await recordAudit({
          actorUserId,
          action: "case.status_changed",
          entityType: "case",
          entityId: input.caseId,
          before: { status: "ASSIGNED" },
          after: { status: "HEARING_SCHEDULED" },
        });
      } catch {
        // If transition is invalid for some reason, do not block the hearing creation
      }
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

    // ── Auto-transition the case to DECISION_PENDING when a hearing is
    // completed. This connects the hearing workflow to the decision
    // recording workflow so that eligible cases automatically appear on
    // the Record Decision page without manual status changes.
    if (input.status === "COMPLETED" && hearing.caseId) {
      const caseRecord = await casesRepository.findById(hearing.caseId);
      if (caseRecord && caseRecord.status === "HEARING_IN_PROGRESS") {
        // Validate the transition is allowed (it should be per the workflow)
        assertValidTransition("HEARING_IN_PROGRESS", "DECISION_PENDING");

        await casesRepository.updateStatus(hearing.caseId, "DECISION_PENDING");
        await casesRepository.addHistoryEntry({
          caseId: hearing.caseId,
          fromStatus: "HEARING_IN_PROGRESS",
          toStatus: "DECISION_PENDING",
          actorUserId,
          note: `Hearing completed — case is now ready for decision recording.`,
        });

        await recordAudit({
          actorUserId,
          action: "case.status_changed",
          entityType: "case",
          entityId: hearing.caseId,
          before: { status: "HEARING_IN_PROGRESS" },
          after: { status: "DECISION_PENDING" },
        });

        // Notify assigned panel members that the case is ready for a decision
        const panelUserIds = caseRecord.assignments
          .filter((a) => !a.removedAt)
          .map((a) => a.userId);
        for (const userId of panelUserIds) {
          await notify({
            userId,
            type: "case_ready_for_decision",
            title: `Case ${caseRecord.caseNumber} is ready for a decision`,
            body: `The hearing has been completed. Please record your decision in the system.`,
            data: { caseId: hearing.caseId, hearingId: id },
          });
        }
      }
    }

    // ── Auto-transition the case to HEARING_IN_PROGRESS when a hearing
    // starts, so the case status reflects the active hearing session.
    if (input.status === "IN_PROGRESS" && hearing.caseId) {
      const caseRecord = await casesRepository.findById(hearing.caseId);
      if (caseRecord && caseRecord.status === "HEARING_SCHEDULED") {
        assertValidTransition("HEARING_SCHEDULED", "HEARING_IN_PROGRESS");

        await casesRepository.updateStatus(hearing.caseId, "HEARING_IN_PROGRESS");
        await casesRepository.addHistoryEntry({
          caseId: hearing.caseId,
          fromStatus: "HEARING_SCHEDULED",
          toStatus: "HEARING_IN_PROGRESS",
          actorUserId,
          note: `Hearing session started.`,
        });

        await recordAudit({
          actorUserId,
          action: "case.status_changed",
          entityType: "case",
          entityId: hearing.caseId,
          before: { status: "HEARING_SCHEDULED" },
          after: { status: "HEARING_IN_PROGRESS" },
        });
      }
    }

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

import { consentRepository } from "./consent.repository.js";
import { casesRepository } from "../cases/cases.repository.js";
import { communityMembersRepository } from "../community-members/community-members.repository.js";
import { NotFoundError, ValidationError, ConflictError } from "../../utils/appError.js";
import { recordAudit } from "../audit/audit.service.js";
import type { RecordConsentInput, WithdrawConsentInput } from "./consent.validators.js";

export const consentService = {
  async record(input: RecordConsentInput, actorUserId: string) {
    const caseRecord = await casesRepository.findById(input.caseId);
    if (!caseRecord) throw new NotFoundError("Case not found");

    const member = await communityMembersRepository.findById(input.communityMemberId);
    if (!member) throw new NotFoundError("Community member not found");

    // Member must be a party to this case
    const isParty = caseRecord.parties.some(
      (p) => p.communityMemberId === input.communityMemberId,
    );
    if (!isParty) throw new ValidationError("Community member is not a party to this case");

    const consent = await consentRepository.upsert({
      caseId:            input.caseId,
      communityMemberId: input.communityMemberId,
      consentGiven:      input.consentGiven,
      recordedByUserId:  actorUserId,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });

    await recordAudit({
      actorUserId,
      action:     input.consentGiven ? "consent.given" : "consent.refused",
      entityType: "consent_record",
      entityId:   consent.id,
      after:      { caseId: input.caseId, memberId: input.communityMemberId, consentGiven: input.consentGiven },
    });

    // If consent is refused, move case to WITHDRAWN
    if (!input.consentGiven) {
      const { casesService } = await import("../cases/cases.service.js");
      await casesService.transition(
        input.caseId,
        { toStatus: "WITHDRAWN", note: `${member.fullName} refused consent to OTC jurisdiction.` },
        { userId: actorUserId, roles: [], permissions: ["case:transition"] },
      );
    }

    return consent;
  },

  async withdraw(id: string, input: WithdrawConsentInput, actorUserId: string) {
    const consent = await consentRepository.findById(id);
    if (!consent) throw new NotFoundError("Consent record not found");
    if (consent.withdrawnAt) throw new ConflictError("Consent has already been withdrawn");
    if (!consent.consentGiven) throw new ValidationError("Cannot withdraw a consent that was already refused");

    const updated = await consentRepository.withdraw(id, input.withdrawalReason);

    await recordAudit({
      actorUserId,
      action:     "consent.withdrawn",
      entityType: "consent_record",
      entityId:   id,
      after:      { withdrawalReason: input.withdrawalReason },
    });

    // Move case to WITHDRAWN
    const { casesService } = await import("../cases/cases.service.js");
    await casesService.transition(
      consent.caseId,
      { toStatus: "WITHDRAWN", note: `Consent withdrawn: ${input.withdrawalReason}` },
      { userId: actorUserId, roles: [], permissions: ["case:transition"] },
    ).catch(() => { /* case may already be in a terminal state */ });

    return updated;
  },

  async listByCase(caseId: string) {
    const caseRecord = await casesRepository.findById(caseId);
    if (!caseRecord) throw new NotFoundError("Case not found");
    return consentRepository.listByCase(caseId);
  },

  allPartiesConsented(caseId: string) {
    return consentRepository.allPartiesConsented(caseId);
  },
};

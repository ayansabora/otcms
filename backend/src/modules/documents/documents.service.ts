import { randomUUID } from "node:crypto";
import { documentsRepository } from "./documents.repository.js";
import { casesRepository } from "../cases/cases.repository.js";
import { casesService } from "../cases/cases.service.js";
import { storageAdapter } from "./storage/index.js";
import { matchesDeclaredType } from "../../utils/fileSignature.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../utils/appError.js";
import { recordAudit } from "../audit/audit.service.js";
import { prisma } from "../../database/prismaClient.js";

interface CallerContext {
  userId: string;
  roles: string[];
  permissions: string[];
}

export const documentsService = {
  async upload(
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    meta: { caseId?: string; decisionId?: string; category?: string },
    caller: CallerContext,
  ) {
    let caseId = meta.caseId;

    if (meta.decisionId) {
      const decision = await prisma.decision.findUnique({ where: { id: meta.decisionId } });
      if (!decision) throw new NotFoundError("Decision not found");
      caseId = decision.caseId;
    }

    if (caseId) {
      const caseRecord = await casesRepository.findById(caseId);
      if (!caseRecord) throw new NotFoundError("Case not found");
      // Anyone uploading must at least be able to view the case they're
      // attaching evidence to (view scope also covers assigned elders and
      // court personnel who hold broader view permissions).
      await casesService.assertCanView(caseRecord, caller);
    }

    // Defense-in-depth: multer's fileFilter already checked the client's
    // claimed Content-Type against the allow-list; this re-verifies the
    // actual bytes match that claim, so a renamed executable can't sneak
    // through by lying about its MIME type.
    if (!matchesDeclaredType(file.buffer, file.mimetype)) {
      throw new ValidationError("File content does not match its declared type");
    }

    // Storage key deliberately has no relation to the original filename —
    // never trust/derive a filesystem path from client-supplied input.
    const storageKey = `${new Date().getUTCFullYear()}/${randomUUID()}`;
    await storageAdapter.save(storageKey, file.buffer);

    const doc = await documentsRepository.create({
      ...(meta.caseId ? { caseId: meta.caseId } : {}),
      ...(meta.decisionId ? { decisionId: meta.decisionId } : {}),
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageKey,
      ...(meta.category ? { category: meta.category } : {}),
      uploadedByUserId: caller.userId,
    });

    await recordAudit({
      actorUserId: caller.userId,
      action: "document.uploaded",
      entityType: "document",
      entityId: doc.id,
      after: { filename: doc.filename, caseId: meta.caseId, decisionId: meta.decisionId },
    });

    return doc;
  },

  /**
   * Enforces blueprint §14: authenticated → role → permission →
   * document ownership/case access, in that order, before any bytes are
   * returned. This is the ONLY path by which document bytes leave the
   * server — there is no static/public URL for uploaded files.
   */
  async getForDownload(id: string, caller: CallerContext) {
    if (!caller.permissions.includes("document:read")) {
      throw new ForbiddenError("You do not have permission to access documents");
    }

    const doc = await documentsRepository.findById(id);
    if (!doc || doc.archivedAt) throw new NotFoundError("Document not found");

    let caseId = doc.caseId;
    if (!caseId && doc.decisionId) {
      const decision = await prisma.decision.findUnique({ where: { id: doc.decisionId } });
      caseId = decision?.caseId ?? null;
    }

    if (caseId) {
      const caseRecord = await casesRepository.findById(caseId);
      if (!caseRecord) throw new NotFoundError("Document not found");
      await casesService.assertCanView(caseRecord, caller);
    }

    const data = await storageAdapter.read(doc.storageKey);

    await recordAudit({
      actorUserId: caller.userId,
      action: "document.accessed",
      entityType: "document",
      entityId: doc.id,
    });

    return { doc, data };
  },

  async listByCase(caseId: string, caller: CallerContext) {
    const caseRecord = await casesRepository.findById(caseId);
    if (!caseRecord) throw new NotFoundError("Case not found");
    await casesService.assertCanView(caseRecord, caller);
    return documentsRepository.listByCase(caseId);
  },

  async archive(id: string, caller: CallerContext) {
    const doc = await documentsRepository.findById(id);
    if (!doc) throw new NotFoundError("Document not found");
    if (!caller.permissions.includes("document:upload")) {
      throw new ForbiddenError("You do not have permission to remove documents");
    }
    const archived = await documentsRepository.archive(id);
    await recordAudit({ actorUserId: caller.userId, action: "document.archived", entityType: "document", entityId: id });
    return archived;
  },
};

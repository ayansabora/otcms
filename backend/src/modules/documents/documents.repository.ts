import { prisma } from "../../database/prismaClient.js";

export const documentsRepository = {
  create(data: {
    caseId?: string;
    decisionId?: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
    category?: string;
    uploadedByUserId: string;
  }) {
    return prisma.document.create({
      data: {
        ...(data.caseId ? { caseId: data.caseId } : {}),
        ...(data.decisionId ? { decisionId: data.decisionId } : {}),
        filename: data.filename,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        storageKey: data.storageKey,
        ...(data.category ? { category: data.category } : {}),
        uploadedByUserId: data.uploadedByUserId,
      },
    });
  },

  findById(id: string) {
    return prisma.document.findUnique({ where: { id } });
  },

  listByCase(caseId: string) {
    return prisma.document.findMany({ where: { caseId, archivedAt: null }, orderBy: { createdAt: "desc" } });
  },

  archive(id: string) {
    return prisma.document.update({ where: { id }, data: { archivedAt: new Date() } });
  },
};

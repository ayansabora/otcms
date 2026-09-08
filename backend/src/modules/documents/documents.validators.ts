import { z } from "zod";

export const uploadDocumentMetaSchema = z
  .object({
    caseId: z.string().uuid().optional(),
    decisionId: z.string().uuid().optional(),
    category: z.string().max(64).optional(),
  })
  .refine((data) => data.caseId ?? data.decisionId, {
    message: "Either caseId or decisionId is required",
  });
export type UploadDocumentMeta = z.infer<typeof uploadDocumentMetaSchema>;

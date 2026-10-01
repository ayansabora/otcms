import { api } from "./client";
import type { Document } from "../types/api";

export const documentsApi = {
  listByCase: (caseId: string) =>
    api.get<{ documents: Document[] }>("/documents", { caseId }),

  upload: (caseId: string, file: File, category?: string, decisionId?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("caseId", caseId);
    if (category) fd.append("category", category);
    if (decisionId) fd.append("decisionId", decisionId);
    return api.postForm<{ document: Document }>("/documents", fd);
  },

  // Returns a Blob — the api client passes through non-JSON responses.
  download: (id: string): Promise<Blob> =>
    api.get<Blob>(`/documents/${id}`),

  archive: (id: string) =>
    api.del<{ document: Document }>(`/documents/${id}`),
};

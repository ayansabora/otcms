import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FileText, Download, Search, Scale } from "lucide-react";
import { casesApi } from "../../api/cases";
import { documentsApi } from "../../api/documents";
import { useAuth } from "../../auth/AuthContext";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { SkeletonTable } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import { useToast } from "../../components/Toast";
import { Badge } from "../../components/Badge";
import type { Document } from "../../types/api";

export function DocumentsListPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Fetch the CM's cases (backend scopes to cases where they are a party)
  const { data: casesData, isLoading: casesLoading } = useQuery({
    queryKey: ["cases", "for-documents"],
    queryFn: () => casesApi.list({ pageSize: 50, isRequest: false }),
    enabled: !!user,
  });

  // Fetch documents for each case in a single combined query
  const cases = casesData?.items ?? [];
  const { data: allDocuments, isLoading: docsLoading } = useQuery({
    queryKey: ["documents", "all-for-user", cases.map((c) => c.id)],
    queryFn: async () => {
      const results: { doc: Document; caseNumber: string; caseId: string }[] = [];
      for (const c of cases) {
        try {
          const res = await documentsApi.listByCase(c.id);
          for (const doc of res.documents) {
            results.push({ doc, caseNumber: c.caseNumber, caseId: c.id });
          }
        } catch {
          // Skip cases where document fetch fails (e.g. access denied)
        }
      }
      return results;
    },
    enabled: !!cases.length && !casesLoading,
    staleTime: 30_000,
  });

  const documents = allDocuments ?? [];
  const filtered = !search
    ? documents
    : documents.filter(
        (d) =>
          d.doc.filename.toLowerCase().includes(search.toLowerCase()) ||
          d.caseNumber.toLowerCase().includes(search.toLowerCase()),
      );

  async function handleDownload(docId: string, filename: string) {
    setDownloadingId(docId);
    try {
      const blob = await documentsApi.download(docId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed. You may not have permission to access this file.");
    } finally {
      setDownloadingId(null);
    }
  }

  const isLoading = casesLoading || docsLoading;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Documents"
        subtitle="Documents from cases you are involved in as a plaintiff or defendant."
      />

      {/* Search */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
          <input
            placeholder="Search by filename or case number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-faint)]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
        {isLoading && <SkeletonTable rows={5} cols={5} />}

        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon={<FileText />}
            title="No documents available"
            description={
              search
                ? "No documents match your search."
                : "Documents associated with your cases will appear here once they are uploaded by court staff. Check back after hearings or decisions."
            }
          />
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-[var(--color-muted)] uppercase tracking-wide bg-[var(--color-bg)] border-b border-[var(--color-line)]">
                  <th className="px-5 py-3.5 font-semibold">Filename</th>
                  <th className="px-5 py-3.5 font-semibold">Case</th>
                  <th className="px-5 py-3.5 font-semibold">Type</th>
                  <th className="px-5 py-3.5 font-semibold">Size</th>
                  <th className="px-5 py-3.5 font-semibold">Uploaded</th>
                  <th className="px-5 py-3.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ doc, caseNumber, caseId }) => (
                  <tr key={doc.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <FileText size={15} className="text-[var(--color-primary)] shrink-0" />
                        <div>
                          <p className="font-medium text-[var(--color-ink)]">{doc.filename}</p>
                          {doc.category && (
                            <Badge variant="default" size="sm" className="mt-0.5 capitalize">{doc.category.replace(/_/g, " ")}</Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Link to={`/app/cases/${caseId}`} className="text-[var(--color-primary)] hover:underline text-xs font-medium">
                        {caseNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-xs text-[var(--color-muted)]">{doc.mimeType}</td>
                    <td className="px-5 py-4 text-xs text-[var(--color-muted)]">
                      {(doc.sizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-5 py-4 text-xs text-[var(--color-muted)] whitespace-nowrap">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Download size={13} />}
                        loading={downloadingId === doc.id}
                        onClick={() => handleDownload(doc.id, doc.filename)}
                      >
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info note */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-[var(--color-muted)] mt-4 flex items-center gap-2">
          <Scale size={12} className="shrink-0" />
          Only documents from cases where you are a registered party are shown. Access to documents is controlled by the court.
        </p>
      )}
    </div>
  );
}

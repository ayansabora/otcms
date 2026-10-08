import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../../api/client";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { SkeletonTable } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import { Badge } from "../../components/Badge";
import type { PaginatedResult } from "../../types/api";

interface AuditEntry {
  id: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

function actionVariant(action: string): "success" | "danger" | "warning" | "info" | "neutral" {
  if (action.includes("created") || action.includes("registered")) return "success";
  if (action.includes("deleted") || action.includes("revoked"))    return "danger";
  if (action.includes("failed")  || action.includes("locked"))     return "warning";
  if (action.includes("changed") || action.includes("updated"))    return "info";
  return "neutral";
}

export function AuditLogPage() {
  const [page, setPage]           = useState(1);
  const [entityType, setEntityType] = useState("");
  const [action, setAction]       = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit", { page, entityType, action }],
    queryFn: () =>
      api.get<PaginatedResult<AuditEntry>>("/audit-logs", {
        page, pageSize: 30,
        entityType: entityType || undefined,
        action: action || undefined,
      }),
  });

  const inputCls = "rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-faint)]";

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Audit Log"
        subtitle="Immutable record of all system actions"
      />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
          <input
            placeholder="Filter by action (e.g. case.created)…"
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className={`${inputCls} pl-9 w-full`}
          />
        </div>
        <input
          placeholder="Entity type (e.g. case)"
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          className={`${inputCls} w-44`}
        />
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
        {isLoading && <SkeletonTable rows={8} cols={4} />}
        {!isLoading && data?.items.length === 0 && (
          <EmptyState icon={<ClipboardList />} title="No audit entries" description="Actions performed in the system will appear here." />
        )}
        {!isLoading && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-[var(--color-muted)] uppercase tracking-wide bg-[var(--color-bg)] border-b border-[var(--color-line)]">
                  <th className="px-5 py-3.5 font-semibold">Time</th>
                  <th className="px-5 py-3.5 font-semibold">Action</th>
                  <th className="px-5 py-3.5 font-semibold">Entity</th>
                  <th className="px-5 py-3.5 font-semibold">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors">
                    <td className="px-5 py-4 text-xs text-[var(--color-muted)] whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={actionVariant(e.action)} dot>
                        {e.action}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-xs text-[var(--color-muted)]">
                      <span className="font-medium text-[var(--color-ink)]">{e.entityType}</span>
                      {e.entityId && <span className="ml-1 font-mono">#{e.entityId.slice(0, 8)}…</span>}
                    </td>
                    <td className="px-5 py-4 text-xs text-[var(--color-muted)] font-mono">
                      {e.ipAddress || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <Button variant="secondary" leftIcon={<ChevronLeft size={15} />} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-[var(--color-muted)]">Page {data.page} of {data.totalPages}</span>
          <Button variant="secondary" rightIcon={<ChevronRight size={15} />} disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

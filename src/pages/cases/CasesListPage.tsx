import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { casesApi } from "../../api/cases";
import { useAuth } from "../../auth/AuthContext";
import { StatusBadge } from "../../components/StatusBadge";
import { Button } from "../../components/Button";
import type { CaseStatus } from "../../types/api";

const STATUS_OPTIONS: CaseStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "VERIFIED",
  "ASSIGNED",
  "HEARING_SCHEDULED",
  "HEARING_IN_PROGRESS",
  "DECISION_PENDING",
  "DECIDED",
  "CLOSED",
  "REJECTED",
  "WITHDRAWN",
];

export function CasesListPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CaseStatus | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["cases", { page, search, status }],
    queryFn: () => casesApi.list({ page, pageSize: 20, search: search || undefined, status: status || undefined }),
  });

  const canCreate = user?.permissions.includes("case:create");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl mb-1">Cases</h1>
          <p className="text-sm text-[var(--color-muted)]">
            {data ? `${data.total} case${data.total === 1 ? "" : "s"}` : "—"}
          </p>
        </div>
        {canCreate && (
          <Link to="/app/cases/new">
            <Button>Register case</Button>
          </Link>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <input
          placeholder="Search by case number or description…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)]"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as CaseStatus | "");
            setPage(1);
          }}
          className="rounded-sm border border-[var(--color-line)] px-3 py-2 text-sm outline-none focus:border-[var(--color-forest)]"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white border border-[var(--color-line)] rounded-sm overflow-hidden">
        {isLoading && <p className="px-5 py-6 text-sm text-[var(--color-muted)]">Loading…</p>}

        {!isLoading && data?.items.length === 0 && (
          <p className="px-5 py-6 text-sm text-[var(--color-muted)]">No cases match your filters.</p>
        )}

        {!isLoading && data && data.items.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--color-muted)] text-xs uppercase tracking-wide bg-[var(--color-paper)]">
                <th className="px-5 py-2 font-medium">Case</th>
                <th className="px-5 py-2 font-medium">Type</th>
                <th className="px-5 py-2 font-medium">Priority</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-paper)]">
                  <td className="px-5 py-3">
                    <Link to={`/app/cases/${c.id}`} className="font-medium text-[var(--color-forest)] hover:underline">
                      {c.caseNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-[var(--color-muted)]">{c.caseType.replace(/_/g, " ").toLowerCase()}</td>
                  <td className="px-5 py-3 text-[var(--color-muted)]">{c.priority.toLowerCase()}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-3 text-[var(--color-muted)]">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-[var(--color-muted)]">
            Page {data.page} of {data.totalPages}
          </span>
          <Button variant="secondary" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

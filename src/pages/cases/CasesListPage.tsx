import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Search, ChevronLeft, ChevronRight, Scale } from "lucide-react";
import { casesApi } from "../../api/cases";
import { useAuth } from "../../auth/AuthContext";
import { StatusBadge, PriorityBadge } from "../../components/StatusBadge";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { SkeletonTable } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import type { CaseStatus, CaseType } from "../../types/api";

const STATUS_OPTIONS: CaseStatus[] = [
  "SUBMITTED","UNDER_REVIEW","VERIFIED","ASSIGNED","HEARING_SCHEDULED",
  "HEARING_IN_PROGRESS","DECISION_PENDING","DECIDED","CLOSED","REJECTED","WITHDRAWN",
];
const CASE_TYPE_OPTIONS: CaseType[] = [
  "MARRIAGE","DIVORCE","LAND_DISPUTE","PROPERTY_DISPUTE","DEBT","ASSAULT","DEFAMATION","OTHER",
];

export function CasesListPage() {
  const { user } = useAuth();
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState<CaseStatus | "">("");
  const [caseType, setCaseType] = useState<CaseType | "">("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["cases", { page, search, status, caseType }],
    queryFn: () => casesApi.list({ page, pageSize: 20,
      search: search || undefined, status: status || undefined, caseType: caseType || undefined }),
  });

  const canCreate = user?.permissions.includes("case:create");
  const filterActive = !!(search || status || caseType);

  const selectCls = "rounded-lg border border-[var(--color-line)] px-3 py-2.5 text-sm bg-[var(--color-surface)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors";

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Cases"
        subtitle={data ? `${data.total} case${data.total === 1 ? "" : "s"} found` : undefined}
        actions={canCreate ? (
          <Link to="/app/cases/new">
            <Button leftIcon={<Plus size={15} />}>Register Case</Button>
          </Link>
        ) : undefined}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
          <input
            placeholder="Search by case number or description…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-colors placeholder:text-[var(--color-faint)]"
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value as CaseStatus | ""); setPage(1); }} className={selectCls}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <select value={caseType} onChange={(e) => { setCaseType(e.target.value as CaseType | ""); setPage(1); }} className={selectCls}>
          <option value="">All Types</option>
          {CASE_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
        {filterActive && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatus(""); setCaseType(""); setPage(1); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
        {isLoading && <SkeletonTable rows={8} cols={6} />}

        {isError && (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-[var(--color-danger)] mb-3">Failed to load cases.</p>
            <Button variant="secondary" onClick={() => refetch()}>Try Again</Button>
          </div>
        )}

        {!isLoading && !isError && data?.items.length === 0 && (
          <EmptyState
            icon={<Scale />}
            title="No cases found"
            description={filterActive ? "No cases match your current filters." : "Register the first case to get started."}
            action={filterActive
              ? <Button variant="secondary" onClick={() => { setSearch(""); setStatus(""); setCaseType(""); }}>Clear Filters</Button>
              : canCreate ? <Link to="/app/cases/new"><Button leftIcon={<Plus size={15} />}>Register Case</Button></Link> : undefined
            }
          />
        )}

        {!isLoading && !isError && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-[var(--color-muted)] uppercase tracking-wide bg-[var(--color-bg)] border-b border-[var(--color-line)]">
                  <th className="px-5 py-3.5 font-semibold">Case No.</th>
                  <th className="px-5 py-3.5 font-semibold">Type</th>
                  <th className="px-5 py-3.5 font-semibold">Parties</th>
                  <th className="px-5 py-3.5 font-semibold">Priority</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Registered</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => {
                  const complainant = c.parties.find((p) => p.roleInCase === "COMPLAINANT");
                  const respondent  = c.parties.find((p) => p.roleInCase === "RESPONDENT");
                  return (
                    <tr key={c.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors group">
                      <td className="px-5 py-4">
                        <Link to={`/app/cases/${c.id}`} className="font-semibold text-[var(--color-primary)] hover:underline">
                          {c.caseNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-[var(--color-muted)] text-xs capitalize">
                        {c.caseType.replace(/_/g, " ").toLowerCase()}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs text-[var(--color-ink)] font-medium">{complainant?.communityMember.fullName ?? "—"}</p>
                        <p className="text-xs text-[var(--color-muted)]">vs. {respondent?.communityMember.fullName ?? "—"}</p>
                      </td>
                      <td className="px-5 py-4"><PriorityBadge priority={c.priority} /></td>
                      <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                      <td className="px-5 py-4 text-[var(--color-muted)] text-xs whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
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

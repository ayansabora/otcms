import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Scale, ChevronRight, FileText, Search, Calendar } from "lucide-react";
import { casesApi } from "../../api/cases";
import { communityMembersApi } from "../../api/communityMembers";
import { useAuth } from "../../auth/AuthContext";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { SkeletonTable } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import { Button } from "../../components/Button";

export function MyCasesPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Get the CM's community member profile to identify their role in each case
  const { data: myProfile } = useQuery({
    queryKey: ["community-members", "me"],
    queryFn: () => communityMembersApi.me(),
    enabled: !!user,
    staleTime: 120_000,
  });
  const myMemberId = myProfile?.member?.id;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-cases", page, search, statusFilter],
    // Backend scopes to cases where this CM is a party (case:view_own → partyMemberId filter)
    queryFn: () => casesApi.list({
      page,
      pageSize: 15,
      isRequest: false,
      search: search || undefined,
      status: (statusFilter || undefined) as never,
    }),
  });

  const cases = data?.items ?? [];

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="My Cases"
        subtitle="Cases in which you are registered as a plaintiff or defendant."
      />

      {/* Info card */}
      <Card className="mb-5">
        <CardBody>
          <div className="flex items-start gap-3">
            <FileText size={18} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-[var(--color-ink)] mb-1">About your cases</p>
              <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                This page shows all cases where you are listed as a party. You can view the status
                and details of each case. For questions about case progress, contact the court office.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
          <input
            placeholder="Search by case number or description…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-faint)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-[var(--color-line)] px-3 py-2.5 text-sm bg-[var(--color-surface)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
        >
          <option value="">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="VERIFIED">Verified</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="HEARING_SCHEDULED">Hearing Scheduled</option>
          <option value="HEARING_IN_PROGRESS">Hearing In Progress</option>
          <option value="DECISION_PENDING">Decision Pending</option>
          <option value="DECIDED">Decided</option>
          <option value="CLOSED">Closed</option>
          <option value="REJECTED">Rejected</option>
          <option value="WITHDRAWN">Withdrawn</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
        {isLoading && <SkeletonTable rows={5} cols={6} />}

        {isError && (
          <div className="px-6 py-10 text-center space-y-3">
            <p className="text-sm text-[var(--color-danger)]">Failed to load your cases.</p>
            <Button variant="secondary" onClick={() => refetch()}>Try Again</Button>
          </div>
        )}

        {!isLoading && !isError && cases.length === 0 && (
          <EmptyState
            icon={<Scale />}
            title="No cases found"
            description={
              search || statusFilter
                ? "No cases match your current filters."
                : "You are not currently listed as a party in any registered case. If you believe this is incorrect, contact the court office."
            }
          />
        )}

        {!isLoading && !isError && cases.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-[var(--color-muted)] uppercase tracking-wide bg-[var(--color-bg)] border-b border-[var(--color-line)]">
                  <th className="px-5 py-3.5 font-semibold">Case No.</th>
                  <th className="px-5 py-3.5 font-semibold">Type</th>
                  <th className="px-5 py-3.5 font-semibold">My Role</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Registered</th>
                  <th className="px-5 py-3.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  // Find the CM's party role in this case
                  const myParty = myMemberId
                    ? c.parties?.find((p) => p.communityMemberId === myMemberId)
                    : null;
                  // Find upcoming hearings
                  const upcomingHearing = c.hearings?.find(
                    (h) => h.status === "SCHEDULED" && new Date(h.startTime) > new Date(),
                  );

                  return (
                    <tr key={c.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors">
                      <td className="px-5 py-4">
                        <Link to={`/app/cases/${c.id}`} className="font-semibold text-[var(--color-primary)] hover:underline">
                          {c.caseNumber}
                        </Link>
                        {c.title && (
                          <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate max-w-48">{c.title}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-[var(--color-muted)] capitalize">
                        {c.caseType.replace(/_/g, " ").toLowerCase()}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        {myParty ? (
                          <span className={`px-2 py-0.5 rounded-md font-medium text-[11px] ${
                            myParty.roleInCase === "COMPLAINANT"
                              ? "bg-[var(--color-info-bg)] text-[var(--color-info)]"
                              : "bg-[var(--color-warning-bg)] text-[var(--color-warning)]"
                          }`}>
                            {myParty.roleInCase === "COMPLAINANT" ? "Plaintiff" : "Defendant"}
                          </span>
                        ) : (
                          <span className="text-[var(--color-muted)]">Party</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={c.status} />
                        {upcomingHearing && (
                          <p className="text-xs text-[var(--color-info)] mt-1 flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(upcomingHearing.startTime).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-[var(--color-muted)] whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4">
                        <Link to={`/app/cases/${c.id}`} className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
                          View <ChevronRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Previous</Button>
          <span className="text-sm text-[var(--color-muted)]">Page {data.page} of {data.totalPages}</span>
          <Button variant="secondary" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</Button>
        </div>
      )}
    </div>
  );
}

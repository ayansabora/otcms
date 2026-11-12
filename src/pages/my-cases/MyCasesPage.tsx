import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Scale, ChevronRight, FileText, Search, Calendar,
  UserCheck, AlertCircle, Info,
} from "lucide-react";
import { casesApi } from "../../api/cases";
import { communityMembersApi } from "../../api/communityMembers";
import { useAuth } from "../../auth/AuthContext";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { SkeletonTable } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import { Button } from "../../components/Button";

const STATUS_OPTIONS = [
  { value: "",                   label: "All Statuses" },
  { value: "SUBMITTED",          label: "Submitted" },
  { value: "UNDER_REVIEW",       label: "Under Review" },
  { value: "VERIFIED",           label: "Verified" },
  { value: "ASSIGNED",           label: "Assigned" },
  { value: "HEARING_SCHEDULED",  label: "Hearing Scheduled" },
  { value: "HEARING_IN_PROGRESS",label: "Hearing In Progress" },
  { value: "DECISION_PENDING",   label: "Decision Pending" },
  { value: "DECIDED",            label: "Decided" },
  { value: "CLOSED",             label: "Closed" },
  { value: "REJECTED",           label: "Rejected" },
  { value: "WITHDRAWN",          label: "Withdrawn" },
];

export function MyCasesPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  /* ── Load the CM's linked profile ───────────────────────────────────── */
  const {
    data: myProfileData,
    isLoading: profileLoading,
  } = useQuery({
    queryKey: ["community-members", "me"],
    queryFn: () => communityMembersApi.me(),
    enabled: !!user,
    staleTime: 120_000,
  });

  const myMemberId  = myProfileData?.member?.id;
  const profileMissing = !profileLoading && myProfileData !== undefined && !myMemberId;

  /* ── Load cases (backend scopes to this CM's party membership) ──────── */
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-cases", { page, search, statusFilter, memberId: myMemberId }],
    queryFn: () => casesApi.list({
      page,
      pageSize: 15,
      isRequest: false,
      search: search || undefined,
      status: (statusFilter || undefined) as never,
    }),
    // Don't fire until we know whether the user has a CM record
    enabled: !profileLoading,
  });

  const cases = data?.items ?? [];

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-6xl">
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
                This page shows all formally registered cases where you are listed as a plaintiff
                or defendant. Status updates made by court staff appear here automatically.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Profile not linked warning */}
      {profileMissing && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning-bg)] px-5 py-4">
          <AlertCircle size={16} className="text-[var(--color-warning-dark)] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-[var(--color-warning-dark)]">
              Your account is not linked to a community member profile
            </p>
            <p className="text-xs text-[var(--color-warning-dark)]/80 mt-1 leading-relaxed">
              To see your cases, your user account must be linked to your registered community member
              record. Please contact the court office to request linkage.
            </p>
          </div>
        </div>
      )}

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
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {(search || statusFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter(""); setPage(1); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
        {(isLoading || profileLoading) && <SkeletonTable rows={5} cols={7} />}

        {isError && (
          <div className="px-6 py-10 text-center space-y-3">
            <p className="text-sm text-[var(--color-danger)]">Failed to load your cases.</p>
            <Button variant="secondary" onClick={() => refetch()}>Try Again</Button>
          </div>
        )}

        {!isLoading && !profileLoading && !isError && cases.length === 0 && (
          <EmptyState
            icon={<Scale />}
            title={search || statusFilter ? "No cases match your filters" : "No Cases Found"}
            description={
              profileMissing
                ? "Your account is not linked to a community member record. Contact the court office."
                : search || statusFilter
                  ? "Try adjusting your search or status filter."
                  : "No cases are currently associated with your account. Cases in which you are registered as a plaintiff or defendant will appear here."
            }
            action={
              !search && !statusFilter && !profileMissing ? (
                <Link to="/app/case-request">
                  <Button size="sm" leftIcon={<FileText size={14} />}>Submit Case Request</Button>
                </Link>
              ) : undefined
            }
          />
        )}

        {!isLoading && !profileLoading && !isError && cases.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-[var(--color-muted)] uppercase tracking-wide bg-[var(--color-bg)] border-b border-[var(--color-line)]">
                  <th className="px-5 py-3.5 font-semibold">Case No.</th>
                  <th className="px-5 py-3.5 font-semibold">Case Type</th>
                  <th className="px-5 py-3.5 font-semibold">Plaintiff</th>
                  <th className="px-5 py-3.5 font-semibold">Defendant</th>
                  <th className="px-5 py-3.5 font-semibold">My Role</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Next Hearing</th>
                  <th className="px-5 py-3.5 font-semibold">Registered</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  const myParty = myMemberId
                    ? c.parties?.find((p) => p.communityMemberId === myMemberId)
                    : null;
                  const plaintiff  = c.parties?.find((p) => p.roleInCase === "COMPLAINANT");
                  const defendant  = c.parties?.find((p) => p.roleInCase === "RESPONDENT");
                  const nextHearing = c.hearings
                    ?.filter((h) => h.status === "SCHEDULED" && new Date(h.startTime) > new Date())
                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

                  return (
                    <tr
                      key={c.id}
                      className={`border-t border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors ${
                        myMemberId && myParty === null ? "opacity-70" : ""
                      }`}
                    >
                      {/* Case number + title */}
                      <td className="px-5 py-4">
                        <Link to={`/app/cases/${c.id}`} className="font-semibold text-[var(--color-primary)] hover:underline">
                          {c.caseNumber}
                        </Link>
                        {c.title && (
                          <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate max-w-36">{c.title}</p>
                        )}
                      </td>

                      {/* Case type */}
                      <td className="px-5 py-4 text-xs text-[var(--color-muted)] capitalize">
                        {c.caseType.replace(/_/g, " ").toLowerCase()}
                      </td>

                      {/* Plaintiff name */}
                      <td className="px-5 py-4">
                        {plaintiff ? (
                          <div className="flex items-center gap-1.5">
                            {myParty?.roleInCase === "COMPLAINANT" && (
                              <UserCheck size={12} className="text-[var(--color-info)] shrink-0" />
                            )}
                            <span className={`text-xs ${myParty?.roleInCase === "COMPLAINANT" ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-muted)]"}`}>
                              {plaintiff.communityMember.fullName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-faint)]">—</span>
                        )}
                      </td>

                      {/* Defendant name */}
                      <td className="px-5 py-4">
                        {defendant ? (
                          <div className="flex items-center gap-1.5">
                            {myParty?.roleInCase === "RESPONDENT" && (
                              <UserCheck size={12} className="text-[var(--color-warning)] shrink-0" />
                            )}
                            <span className={`text-xs ${myParty?.roleInCase === "RESPONDENT" ? "font-semibold text-[var(--color-ink)]" : "text-[var(--color-muted)]"}`}>
                              {defendant.communityMember.fullName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-faint)]">—</span>
                        )}
                      </td>

                      {/* My role */}
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
                          <span className="text-[var(--color-faint)] italic text-[11px]">Party</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={c.status} />
                      </td>

                      {/* Next hearing date */}
                      <td className="px-5 py-4">
                        {nextHearing ? (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--color-info)]">
                            <Calendar size={12} className="shrink-0" />
                            <span>{new Date(nextHearing.startTime).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-faint)]">—</span>
                        )}
                      </td>

                      {/* Registration date */}
                      <td className="px-5 py-4 text-xs text-[var(--color-muted)] whitespace-nowrap">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>

                      {/* View link */}
                      <td className="px-5 py-4">
                        <Link to={`/app/cases/${c.id}`} className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline whitespace-nowrap">
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

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ← Previous
          </Button>
          <span className="text-sm text-[var(--color-muted)]">Page {data.page} of {data.totalPages}</span>
          <Button variant="secondary" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            Next →
          </Button>
        </div>
      )}

      {/* Summary note */}
      {cases.length > 0 && (
        <div className="flex items-center gap-2 mt-4 text-xs text-[var(--color-muted)]">
          <Info size={12} className="shrink-0" />
          <span>
            Showing {cases.length} of {data?.total ?? 0} case{(data?.total ?? 0) !== 1 ? "s" : ""}.
            {" "}Case status updates made by court staff appear automatically.
          </span>
        </div>
      )}
    </div>
  );
}

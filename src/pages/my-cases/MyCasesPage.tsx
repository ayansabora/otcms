import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Scale, ChevronRight, FileText } from "lucide-react";
import { casesApi } from "../../api/cases";
import { useAuth } from "../../auth/AuthContext";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { StatusBadge, PriorityBadge } from "../../components/StatusBadge";
import { SkeletonTable } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import { Button } from "../../components/Button";

export function MyCasesPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-cases", page],
    // The backend scopes results to cases the caller is a party to (case:view_own permission).
    // We additionally exclude community-member self-service requests (isRequest: true)
    // since those are informal pre-registration submissions, not formal court cases yet.
    queryFn: () => casesApi.list({ page, pageSize: 15, isRequest: false }),
  });

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="My Cases"
        subtitle="Cases in which you are registered as a plaintiff or respondent."
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

      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
        {isLoading && <SkeletonTable rows={5} cols={4} />}

        {isError && (
          <div className="px-6 py-10 text-center space-y-3">
            <p className="text-sm text-[var(--color-danger)]">Failed to load your cases.</p>
            <Button variant="secondary" onClick={() => refetch()}>Try Again</Button>
          </div>
        )}

        {!isLoading && !isError && data?.items.length === 0 && (
          <EmptyState
            icon={<Scale />}
            title="No cases found"
            description="You are not currently listed as a party in any registered case. If you believe this is incorrect, contact the court office."
          />
        )}

        {!isLoading && !isError && data && data.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-[var(--color-muted)] uppercase tracking-wide bg-[var(--color-bg)] border-b border-[var(--color-line)]">
                  <th className="px-5 py-3.5 font-semibold">Case No.</th>
                  <th className="px-5 py-3.5 font-semibold">Type</th>
                  <th className="px-5 py-3.5 font-semibold">My Role</th>
                  <th className="px-5 py-3.5 font-semibold">Priority</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Registered</th>
                  <th className="px-5 py-3.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => {
                  // Determine the current user's role in this case
                  const myParty = c.parties?.find(
                    (p) => p.communityMember && user?.email &&
                    // Best we can do without communityMemberId in JWT — show both roles
                    (p.roleInCase === "COMPLAINANT" || p.roleInCase === "RESPONDENT"),
                  );
                  return (
                    <tr key={c.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors">
                      <td className="px-5 py-4 font-semibold text-[var(--color-primary)]">{c.caseNumber}</td>
                      <td className="px-5 py-4 text-xs text-[var(--color-muted)] capitalize">{c.caseType.replace(/_/g, " ").toLowerCase()}</td>
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
                      <td className="px-5 py-4"><PriorityBadge priority={c.priority} /></td>
                      <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                      <td className="px-5 py-4 text-xs text-[var(--color-muted)]">{new Date(c.createdAt).toLocaleDateString()}</td>
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

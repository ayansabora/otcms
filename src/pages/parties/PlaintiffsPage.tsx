import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Users, Search, ChevronRight } from "lucide-react";
import { casesApi } from "../../api/cases";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { SkeletonTable } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import type { CaseStatus } from "../../types/api";

/**
 * Plaintiff Management — shows all cases with their complainant parties listed.
 * This is a read-only management view for Record Officers.
 */
export function PlaintiffsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CaseStatus | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["cases", "plaintiffs-view", { search, status }],
    queryFn: () => casesApi.list({
      page: 1, pageSize: 50,
      search: search || undefined,
      status: status || undefined,
    }),
  });

  // Flatten all complainants across all cases
  type PlaintiffRow = {
    caseId: string;
    caseNumber: string;
    caseStatus: string;
    plaintiffName: string;
    plaintiffPhone?: string | null;
    plaintiffKebele?: string | null;
  };

  const plaintiffs: PlaintiffRow[] = [];
  data?.items.forEach((c) => {
    c.parties
      .filter((p) => p.roleInCase === "COMPLAINANT")
      .forEach((p) => {
        plaintiffs.push({
          caseId:          c.id,
          caseNumber:      c.caseNumber,
          caseStatus:      c.status,
          plaintiffName:   p.communityMember.fullName,
          plaintiffPhone:  p.communityMember.phone,
          plaintiffKebele: p.communityMember.kebele,
        });
      });
  });

  const filtered = search
    ? plaintiffs.filter((p) => p.plaintiffName.toLowerCase().includes(search.toLowerCase()))
    : plaintiffs;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Plaintiff Management"
        subtitle="All registered plaintiffs (complainants) across court cases."
      />

      <Card className="mb-5">
        <CardBody>
          <div className="flex items-start gap-3">
            <Users size={18} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--color-muted)] leading-relaxed">
              This page lists every complainant (plaintiff) registered in the system.
              Click a case number to view full case details and party information.
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
          <input
            placeholder="Search plaintiff name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-faint)]"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as CaseStatus | "")}
          className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]"
        >
          <option value="">All Case Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under Review</option>
          <option value="VERIFIED">Verified</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="HEARING_SCHEDULED">Hearing Scheduled</option>
          <option value="DECISION_PENDING">Decision Pending</option>
          <option value="DECIDED">Decided</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
        {isLoading && <SkeletonTable rows={6} cols={5} />}

        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon={<Users />}
            title="No plaintiffs found"
            description="No complainants match your search. Register a new case to add plaintiffs."
          />
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-[var(--color-muted)] uppercase tracking-wide bg-[var(--color-bg)] border-b border-[var(--color-line)]">
                  <th className="px-5 py-3.5 font-semibold">Plaintiff Name</th>
                  <th className="px-5 py-3.5 font-semibold">Phone</th>
                  <th className="px-5 py-3.5 font-semibold">Kebele</th>
                  <th className="px-5 py-3.5 font-semibold">Case</th>
                  <th className="px-5 py-3.5 font-semibold">Case Status</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={i} className="border-t border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors">
                    <td className="px-5 py-4 font-semibold text-[var(--color-ink)]">{p.plaintiffName}</td>
                    <td className="px-5 py-4 text-xs text-[var(--color-muted)]">{p.plaintiffPhone || "—"}</td>
                    <td className="px-5 py-4 text-xs text-[var(--color-muted)]">{p.plaintiffKebele || "—"}</td>
                    <td className="px-5 py-4">
                      <Link to={`/app/cases/${p.caseId}`} className="text-[var(--color-primary)] hover:underline font-medium text-xs">
                        {p.caseNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={p.caseStatus} /></td>
                    <td className="px-5 py-4">
                      <Link to={`/app/cases/${p.caseId}`} className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
                        View <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

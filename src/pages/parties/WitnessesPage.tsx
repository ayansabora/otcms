import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { UserPlus, Search, ChevronRight } from "lucide-react";
import { casesApi } from "../../api/cases";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { SkeletonTable } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";

export function WitnessesPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["cases", "witnesses-view", { search }],
    queryFn: () => casesApi.list({ page: 1, pageSize: 100, search: search || undefined }),
  });

  // Flatten all witnesses across all cases
  type WitnessRow = {
    caseId: string;
    caseNumber: string;
    caseStatus: string;
    witnessName: string;
    witnessPhone?: string | null;
    testimony?: string | null;
    testifiedAt?: string | null;
  };

  const witnesses: WitnessRow[] = [];
  data?.items.forEach((c) => {
    (c.witnesses ?? []).forEach((cw) => {
      witnesses.push({
        caseId:       c.id,
        caseNumber:   c.caseNumber,
        caseStatus:   c.status,
        witnessName:  cw.witness.fullName,
        witnessPhone: cw.witness.phone,
        testimony:    cw.testimonySummary,
        testifiedAt:  cw.testifiedAt,
      });
    });
  });

  const filtered = search
    ? witnesses.filter((w) => w.witnessName.toLowerCase().includes(search.toLowerCase()))
    : witnesses;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Witness Management"
        subtitle="All registered witnesses across court cases."
      />

      <Card className="mb-5">
        <CardBody>
          <div className="flex items-start gap-3">
            <UserPlus size={18} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--color-muted)] leading-relaxed">
              This page lists every witness recorded in the system across all cases.
              Witnesses can also be added from the Case Details page for any specific case.
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
          <input
            placeholder="Search witness name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 placeholder:text-[var(--color-faint)]"
          />
        </div>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
        {isLoading && <SkeletonTable rows={6} cols={5} />}

        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon={<UserPlus />}
            title="No witnesses found"
            description="No witnesses match your search. Witnesses are added during case registration or from the Case Details page."
          />
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] text-[var(--color-muted)] uppercase tracking-wide bg-[var(--color-bg)] border-b border-[var(--color-line)]">
                  <th className="px-5 py-3.5 font-semibold">Witness Name</th>
                  <th className="px-5 py-3.5 font-semibold">Phone</th>
                  <th className="px-5 py-3.5 font-semibold">Case</th>
                  <th className="px-5 py-3.5 font-semibold">Case Status</th>
                  <th className="px-5 py-3.5 font-semibold">Testimony Date</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((w, i) => (
                  <tr key={i} className="border-t border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors">
                    <td className="px-5 py-4 font-semibold text-[var(--color-ink)]">{w.witnessName}</td>
                    <td className="px-5 py-4 text-xs text-[var(--color-muted)]">{w.witnessPhone || "—"}</td>
                    <td className="px-5 py-4">
                      <Link to={`/app/cases/${w.caseId}`} className="text-[var(--color-primary)] hover:underline font-medium text-xs">
                        {w.caseNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={w.caseStatus} /></td>
                    <td className="px-5 py-4 text-xs text-[var(--color-muted)]">
                      {w.testifiedAt ? new Date(w.testifiedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <Link to={`/app/cases/${w.caseId}`} className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline">
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

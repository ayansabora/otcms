import { useQuery } from "@tanstack/react-query";
import { BarChart3, Scale, Calendar, ScrollText, Users } from "lucide-react";
import { reportsApi } from "../../api/reports";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/Card";
import { SkeletonCard } from "../../components/LoadingSpinner";
import { PageError } from "../../components/ErrorMessage";
import type { CasesByStatusRow, CasesByTypeRow } from "../../api/reports";

function HBar({ label, value, max, color = "var(--color-primary)" }: { label: string; value: number; max: number; color?: string }) {
  const pct = Math.round((value / Math.max(max, 1)) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[var(--color-muted)] w-40 shrink-0 truncate capitalize">{label.toLowerCase().replace(/_/g, " ")}</span>
      <div className="flex-1 h-2.5 bg-[var(--color-bg)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold text-[var(--color-ink)] w-8 text-right">{value}</span>
    </div>
  );
}

export function ReportsPage() {
  const { data: statusData, isLoading: statusLoading, isError: statusError } = useQuery({
    queryKey: ["reports", "cases-by-status"],
    queryFn: () => reportsApi.casesByStatus(),
  });
  const { data: typeData, isLoading: typeLoading } = useQuery({
    queryKey: ["reports", "cases-by-type"],
    queryFn: () => reportsApi.casesByType(),
  });
  const { data: hearingData, isLoading: hearingLoading } = useQuery({
    queryKey: ["reports", "hearing-schedule"],
    queryFn: () => reportsApi.hearingSchedule(),
  });
  const { data: decisionData, isLoading: decisionLoading } = useQuery({
    queryKey: ["reports", "decisions-summary"],
    queryFn: () => reportsApi.decisionsSummary(),
  });

  if (statusError) return <PageError />;

  const statusRows = (statusData?.rows ?? []) as CasesByStatusRow[];
  const typeRows   = (typeData?.rows ?? []) as CasesByTypeRow[];
  const maxStatus  = Math.max(...statusRows.map((r) => r.count), 1);
  const maxType    = Math.max(...typeRows.map((r) => r.count), 1);
  const totalCases = statusRows.reduce((s, r) => s + r.count, 0);
  const totalHearings   = (hearingData?.rows ?? []).length;
  const totalDecisions  = (decisionData?.rows ?? []).length;

  return (
    <div className="max-w-6xl">
      <PageHeader title="Reports" subtitle="Court statistics and analytics — all data is live from the database." />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Cases",     value: totalCases,   icon: <Scale />,      color: "var(--color-primary)" },
          { label: "Total Hearings",  value: totalHearings, icon: <Calendar />,  color: "var(--color-info)" },
          { label: "Total Decisions", value: totalDecisions,icon: <ScrollText />,color: "var(--color-warning)" },
          { label: "Case Types",      value: typeRows.length,icon: <Users />,    color: "var(--color-success)" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5 flex items-start gap-4 shadow-[var(--shadow-card)]">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 [&>svg]:w-5 [&>svg]:h-5" style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
              {icon}
            </div>
            <div>
              <p className="text-xs text-[var(--color-muted)] font-medium">{label}</p>
              <p className="font-display text-2xl font-bold" style={{ color }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cases by status */}
        <Card>
          <CardHeader title="Cases by Status" icon={<Scale />} />
          <CardBody>
            {statusLoading ? <SkeletonCard /> : (
              <div className="space-y-3">
                {statusRows.map((r) => (
                  <HBar key={r.status} label={r.status} value={r.count} max={maxStatus} />
                ))}
                {statusRows.length === 0 && <p className="text-sm text-[var(--color-muted)]">No data yet.</p>}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Cases by type */}
        <Card>
          <CardHeader title="Cases by Type" icon={<BarChart3 />} />
          <CardBody>
            {typeLoading ? <SkeletonCard /> : (
              <div className="space-y-3">
                {typeRows.map((r) => (
                  <HBar key={r.caseType} label={r.caseType} value={r.count} max={maxType} color="var(--color-gold)" />
                ))}
                {typeRows.length === 0 && <p className="text-sm text-[var(--color-muted)]">No data yet.</p>}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Hearing schedule */}
        <Card>
          <CardHeader title="Hearing Schedule" icon={<Calendar />} />
          <CardBody>
            {hearingLoading ? <SkeletonCard /> : (
              <div className="divide-y divide-[var(--color-line)] -mx-6">
                {(hearingData?.rows ?? []).slice(0, 8).map((r, i) => {
                  const row = r as Record<string, unknown>;
                  return (
                    <div key={i} className="flex items-center justify-between px-6 py-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-ink)]">{String(row.caseNumber ?? "—")}</p>
                        <p className="text-xs text-[var(--color-muted)]">{String(row.location ?? "")}</p>
                      </div>
                      <p className="text-xs text-[var(--color-muted)]">
                        {row.scheduledDate ? new Date(String(row.scheduledDate)).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  );
                })}
                {(hearingData?.rows ?? []).length === 0 && <p className="px-6 py-4 text-sm text-[var(--color-muted)]">No data yet.</p>}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Decisions summary */}
        <Card>
          <CardHeader title="Decisions Summary" icon={<ScrollText />} />
          <CardBody>
            {decisionLoading ? <SkeletonCard /> : (
              <div className="divide-y divide-[var(--color-line)] -mx-6">
                {(decisionData?.rows ?? []).slice(0, 8).map((r, i) => {
                  const row = r as Record<string, unknown>;
                  return (
                    <div key={i} className="flex items-center justify-between px-6 py-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--color-ink)]">{String(row.caseNumber ?? "—")}</p>
                        <p className="text-xs text-[var(--color-muted)] capitalize">{String(row.outcome ?? "").toLowerCase()}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                        row.approvalStatus === "APPROVED"
                          ? "bg-[var(--color-success-bg)] text-[var(--color-success)]"
                          : "bg-[var(--color-warning-bg)] text-[var(--color-warning)]"
                      }`}>
                        {String(row.approvalStatus ?? "PENDING")}
                      </span>
                    </div>
                  );
                })}
                {(decisionData?.rows ?? []).length === 0 && <p className="px-6 py-4 text-sm text-[var(--color-muted)]">No data yet.</p>}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Scale, Calendar, Clock, CheckCircle, Users, TrendingUp, ArrowRight, ChevronRight } from "lucide-react";import { casesApi } from "../api/cases";
import { reportsApi } from "../api/reports";
import { hearingsApi } from "../api/hearings";
import { useAuth } from "../auth/AuthContext";
import { StatusBadge, PriorityBadge } from "../components/StatusBadge";
import { Card, CardHeader, CardBody } from "../components/Card";
import { SkeletonTable, Skeleton } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";
import { Button } from "../components/Button";
import type { CasesByStatusRow, CasesByTypeRow } from "../api/reports";

/* ── Stat Card ──────────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  to?: string;
  accentColor?: string;
  loading?: boolean;
}

function StatCard({ label, value, icon, trend, to, accentColor = "var(--color-primary)", loading = false }: StatCardProps) {
  const inner = (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5 flex items-start justify-between hover:shadow-md hover:border-[var(--color-line-strong)] transition-all duration-200 group">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-3">{label}</p>
        {loading ? (
          <Skeleton className="h-9 w-16 mb-2" />
        ) : (
          <p className="font-display text-4xl font-bold leading-none mb-2" style={{ color: accentColor }}>
            {value}
          </p>
        )}
        {trend && <p className="text-xs text-[var(--color-muted)] flex items-center gap-1"><TrendingUp size={11} />{trend}</p>}
      </div>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ml-3" style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)` }}>
        <span style={{ color: accentColor }} className="[&>svg]:w-6 [&>svg]:h-6">{icon}</span>
      </div>
      {to && <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-faint)] opacity-0 group-hover:opacity-100 transition-opacity" />}
    </div>
  );
  if (to) return <Link to={to} className="relative block">{inner}</Link>;
  return <div className="relative">{inner}</div>;
}

/* ── Horizontal bar chart ───────────────────────────────────────────────── */
function BarChart({ data, labelKey, valueKey, color = "var(--color-primary)" }: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="space-y-3">
      {data.map((row, i) => {
        const label = String(row[labelKey] ?? "").replace(/_/g, " ");
        const value = Number(row[valueKey]) || 0;
        const pct = Math.round((value / max) * 100);
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-[var(--color-muted)] w-36 shrink-0 truncate capitalize">{label.toLowerCase()}</span>
            <div className="flex-1 h-2 bg-[var(--color-bg)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-xs font-semibold text-[var(--color-ink)] w-8 text-right">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Dashboard Page ─────────────────────────────────────────────────────── */
export function DashboardPage() {
  const { user } = useAuth();
  const canViewReports = user?.permissions.includes("report:generate");
  const canViewHearings = user?.permissions.some((p) =>
    ["case:view_all", "case:view_assigned", "hearing:manage"].includes(p),
  );

  const { data: recentCases, isLoading: casesLoading } = useQuery({
    queryKey: ["cases", "dashboard-recent"],
    queryFn: () => casesApi.list({ page: 1, pageSize: 7 }),
  });

  const { data: statusReport, isLoading: statsLoading } = useQuery({
    queryKey: ["reports", "cases-by-status"],
    queryFn: () => reportsApi.casesByStatus(),
    enabled: canViewReports ?? false,
  });

  const { data: typeReport } = useQuery({
    queryKey: ["reports", "cases-by-type"],
    queryFn: () => reportsApi.casesByType(),
    enabled: canViewReports ?? false,
  });

  const { data: upcomingHearings, isLoading: hearingsLoading } = useQuery({
    queryKey: ["hearings", "upcoming-dashboard"],
    queryFn: () => hearingsApi.list({ pageSize: 5, status: "SCHEDULED" }),
    enabled: canViewHearings ?? false,
  });

  const statusRows = (statusReport?.rows ?? []) as CasesByStatusRow[];
  const typeRows   = (typeReport?.rows ?? []) as CasesByTypeRow[];

  const totalCases   = statusRows.reduce((s, r) => s + r.count, 0);
  const pendingCases = statusRows.filter((r) => ["SUBMITTED","UNDER_REVIEW","VERIFIED","ASSIGNED"].includes(r.status)).reduce((s, r) => s + r.count, 0);
  const activeCases  = statusRows.filter((r) => ["HEARING_SCHEDULED","HEARING_IN_PROGRESS","DECISION_PENDING"].includes(r.status)).reduce((s, r) => s + r.count, 0);
  const closedCases  = statusRows.filter((r) => ["DECIDED","CLOSED"].includes(r.status)).reduce((s, r) => s + r.count, 0);

  const today = new Date().toDateString();
  const todayHearings = upcomingHearings?.items.filter((h) => new Date(h.startTime).toDateString() === today) ?? [];

  const greeting = (() => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good morning";
    if (hr < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="max-w-7xl space-y-6">
      {/* Welcome header with subtle gadaa pattern */}
      <div className="relative bg-[var(--color-primary-dark)] rounded-xl px-6 py-5 overflow-hidden">
        <div className="absolute inset-0 gadaa-pattern opacity-20" />
        <div className="absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-[var(--color-gold)]/10 to-transparent" />
        <div className="relative">
          <p className="text-white/60 text-sm font-medium mb-0.5">{greeting},</p>
          <h1 className="font-display text-2xl text-white font-semibold leading-tight">
            {user?.fullName || "Welcome"}
          </h1>
          <p className="text-white/50 text-sm mt-1">Oromo Traditional Court Management System — Bale Robe City</p>
        </div>
      </div>

      {/* Stats grid */}
      {canViewReports ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Cases"       value={statsLoading ? "—" : totalCases}   icon={<Scale />}       to="/app/cases"                             loading={statsLoading} />
          <StatCard label="Pending / Review"  value={statsLoading ? "—" : pendingCases} icon={<Clock />}       to="/app/cases?status=SUBMITTED"            loading={statsLoading} accentColor="var(--color-warning)" />
          <StatCard label="Active Hearings"   value={statsLoading ? "—" : activeCases}  icon={<Calendar />}    to="/app/cases?status=HEARING_SCHEDULED"    loading={statsLoading} accentColor="var(--color-info)" />
          <StatCard label="Decided / Closed"  value={statsLoading ? "—" : closedCases}  icon={<CheckCircle />} to="/app/cases?status=CLOSED"              loading={statsLoading} accentColor="var(--color-success)" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard label="Cases" value={recentCases?.total ?? "—"} icon={<Scale />} to="/app/cases" loading={casesLoading} />
          <StatCard label="Community Members" value="—" icon={<Users />} to="/app/members" accentColor="var(--color-info)" />
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent cases — 2/3 width */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Recent Cases"
              icon={<Scale />}
              action={
                <Link to="/app/cases">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={14} />}>View all</Button>
                </Link>
              }
            />
            {casesLoading ? (
              <SkeletonTable rows={5} cols={4} />
            ) : !recentCases?.items.length ? (
              <EmptyState
                icon={<Scale />}
                title="No cases yet"
                description="Register the first case to get started."
                action={<Link to="/app/cases/new"><Button size="sm">Register Case</Button></Link>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] text-[var(--color-muted)] uppercase tracking-wide bg-[var(--color-bg)] border-b border-[var(--color-line)]">
                      <th className="px-5 py-3 font-semibold">Case No.</th>
                      <th className="px-5 py-3 font-semibold">Type</th>
                      <th className="px-5 py-3 font-semibold">Priority</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCases.items.map((c) => (
                      <tr key={c.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors">
                        <td className="px-5 py-3.5">
                          <Link to={`/app/cases/${c.id}`} className="font-semibold text-[var(--color-primary)] hover:underline">
                            {c.caseNumber}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-[var(--color-muted)] text-xs capitalize">{c.caseType.replace(/_/g, " ").toLowerCase()}</td>
                        <td className="px-5 py-3.5"><PriorityBadge priority={c.priority} /></td>
                        <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Today's hearings */}
          {canViewHearings && (
            <Card>
              <CardHeader
                title="Today's Hearings"
                icon={<Calendar />}
                subtitle={todayHearings.length ? `${todayHearings.length} scheduled` : "None today"}
                action={<Link to="/app/hearings"><Button variant="ghost" size="sm">All</Button></Link>}
              />
              {hearingsLoading ? (
                <CardBody><div className="space-y-3"><Skeleton className="h-14" /><Skeleton className="h-14" /></div></CardBody>
              ) : todayHearings.length === 0 ? (
                <CardBody><p className="text-sm text-[var(--color-muted)]">No hearings scheduled for today.</p></CardBody>
              ) : (
                <div className="divide-y divide-[var(--color-line)]">
                  {todayHearings.map((h) => (
                    <Link key={h.id} to={`/app/hearings/${h.id}`} className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--color-bg)] transition-colors block">
                      <div className="w-10 h-10 rounded-lg bg-[var(--color-primary-subtle)] flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-[var(--color-primary)] leading-none">
                          {new Date(h.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--color-ink)] truncate">{h.case?.caseNumber ?? "Hearing"}</p>
                        <p className="text-xs text-[var(--color-muted)] truncate">{h.location}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Cases by type mini chart */}
          {canViewReports && typeRows.length > 0 && (
            <Card>
              <CardHeader title="Cases by Type" icon={<TrendingUp />} />
              <CardBody>
                <BarChart
                  data={typeRows as unknown as Record<string, unknown>[]}
                  labelKey="caseType"
                  valueKey="count"
                  color="var(--color-gold)"
                />
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {/* Cases by status — full width */}
      {canViewReports && statusRows.length > 0 && (
        <Card>
          <CardHeader title="Cases by Status" icon={<Scale />} />
          <CardBody>
            <BarChart
              data={statusRows as unknown as Record<string, unknown>[]}
              labelKey="status"
              valueKey="count"
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

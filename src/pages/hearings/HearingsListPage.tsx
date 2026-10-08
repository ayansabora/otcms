import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Calendar, List, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { hearingsApi } from "../../api/hearings";
import { useAuth } from "../../auth/AuthContext";
import { StatusBadge } from "../../components/StatusBadge";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/Card";
import { SkeletonTable } from "../../components/LoadingSpinner";
import { EmptyState } from "../../components/EmptyState";
import type { Hearing, HearingStatus } from "../../types/api";

const STATUS_OPTIONS: HearingStatus[] = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "POSTPONED"];

const HEARING_COLORS: Record<HearingStatus, string> = {
  SCHEDULED:   "bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info)]/30",
  IN_PROGRESS: "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]/30",
  COMPLETED:   "bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]/30",
  CANCELLED:   "bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]/30",
  POSTPONED:   "bg-gray-50 text-gray-600 border-gray-200",
};

/* ── Mini Calendar ─────────────────────────────────────────────────────── */
function CalendarView({ hearings }: { hearings: Hearing[] }) {
  const [current, setCurrent] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });

  const year  = current.getFullYear();
  const month = current.getMonth();
  const monthName = current.toLocaleString("default", { month: "long", year: "numeric" });

  // Build calendar grid
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const hearingsByDate: Record<number, Hearing[]> = {};
  hearings.forEach((h) => {
    const d = new Date(h.startTime);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      (hearingsByDate[day] ??= []).push(h);
    }
  });

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  return (
    <div>
      {/* Calendar nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))}
          className="p-2 rounded-lg hover:bg-[var(--color-bg)] transition-colors text-[var(--color-muted)]">
          <ChevronLeft size={18} />
        </button>
        <h3 className="font-semibold text-[var(--color-ink)]">{monthName}</h3>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))}
          className="p-2 rounded-lg hover:bg-[var(--color-bg)] transition-colors text-[var(--color-muted)]">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-[var(--color-muted)] uppercase tracking-wide py-1">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-px bg-[var(--color-line)] border border-[var(--color-line)] rounded-lg overflow-hidden">
        {cells.map((day, idx) => {
          const hls = day ? (hearingsByDate[day] ?? []) : [];
          return (
            <div
              key={idx}
              className={`bg-[var(--color-surface)] p-1.5 min-h-[64px] ${!day ? "bg-[var(--color-bg)]" : ""}`}
            >
              {day && (
                <>
                  <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-1 ${
                    isToday(day)
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-muted)]"
                  }`}>
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {hls.slice(0, 2).map((h) => (
                      <Link key={h.id} to={`/app/hearings/${h.id}`}
                        className={`block truncate rounded text-[9px] font-medium px-1 py-0.5 border ${HEARING_COLORS[h.status]}`}>
                        {h.case?.caseNumber ?? new Date(h.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Link>
                    ))}
                    {hls.length > 2 && (
                      <p className="text-[9px] text-[var(--color-muted)] px-1">+{hls.length - 2} more</p>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export function HearingsListPage() {
  const { user } = useAuth();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<HearingStatus | "">("");

  const { data, isLoading } = useQuery({
    queryKey: ["hearings", { page, status }],
    queryFn: () => hearingsApi.list({ page, pageSize: 20, status: status || undefined }),
  });

  // For calendar we fetch more (up to 100)
  const { data: calData } = useQuery({
    queryKey: ["hearings", "calendar"],
    queryFn: () => hearingsApi.list({ pageSize: 100 }),
    enabled: view === "calendar",
  });

  const canSchedule = user?.permissions.includes("hearing:manage");

  return (
    <div className="max-w-7xl">
      <PageHeader
        title="Hearings"
        subtitle={data ? `${data.total} hearing${data.total === 1 ? "" : "s"}` : undefined}
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-[var(--color-line)] overflow-hidden">
              <button
                onClick={() => setView("list")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${view === "list" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-muted)] hover:bg-[var(--color-bg)]"}`}
              >
                <List size={14} /> List
              </button>
              <button
                onClick={() => setView("calendar")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${view === "calendar" ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-muted)] hover:bg-[var(--color-bg)]"}`}
              >
                <Calendar size={14} /> Calendar
              </button>
            </div>
            {canSchedule && (
              <Link to="/app/hearings/schedule">
                <Button leftIcon={<Plus size={15} />}>Schedule Hearing</Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Calendar view */}
      {view === "calendar" && (
        <Card>
          <CardHeader title="Hearing Calendar" icon={<Calendar />} />
          <CardBody>
            <CalendarView hearings={calData?.items ?? []} />
          </CardBody>
        </Card>
      )}

      {/* List view */}
      {view === "list" && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as HearingStatus | ""); setPage(1); }}
              className="rounded-lg border border-[var(--color-line)] px-3 py-2.5 text-sm bg-[var(--color-surface)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
            {isLoading && <SkeletonTable rows={5} cols={5} />}
            {!isLoading && data?.items.length === 0 && (
              <EmptyState icon={<Calendar />} title="No hearings found" description="Schedule the first hearing from a case." />
            )}
            {!isLoading && data && data.items.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] text-[var(--color-muted)] uppercase tracking-wide bg-[var(--color-bg)] border-b border-[var(--color-line)]">
                      <th className="px-5 py-3 font-semibold">Date & Time</th>
                      <th className="px-5 py-3 font-semibold">Case</th>
                      <th className="px-5 py-3 font-semibold">Location</th>
                      <th className="px-5 py-3 font-semibold">Purpose</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((h) => (
                      <tr key={h.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-bg)] transition-colors">
                        <td className="px-5 py-4">
                          <Link to={`/app/hearings/${h.id}`} className="font-semibold text-[var(--color-primary)] hover:underline">
                            {new Date(h.startTime).toLocaleDateString()}
                          </Link>
                          <p className="text-xs text-[var(--color-muted)] mt-0.5">
                            {new Date(h.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–{new Date(h.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-xs">
                          {h.case ? <Link to={`/app/cases/${h.caseId}`} className="text-[var(--color-primary)] hover:underline font-medium">{h.case.caseNumber}</Link> : "—"}
                        </td>
                        <td className="px-5 py-4 text-[var(--color-muted)] text-xs">{h.location}</td>
                        <td className="px-5 py-4 text-[var(--color-muted)] text-xs">{h.purpose || "—"}</td>
                        <td className="px-5 py-4"><StatusBadge status={h.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button variant="secondary" leftIcon={<ChevronLeft size={15} />} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="text-sm text-[var(--color-muted)]">Page {data.page} of {data.totalPages}</span>
              <Button variant="secondary" rightIcon={<ChevronRight size={15} />} disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

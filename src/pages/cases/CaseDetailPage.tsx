import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { casesApi } from "../../api/cases";
import { ApiError } from "../../api/client";
import { StatusBadge } from "../../components/StatusBadge";
import { Button } from "../../components/Button";
import { useAuth } from "../../auth/AuthContext";
import type { CaseStatus } from "../../types/api";

// Mirrors backend case.workflow.ts — kept in sync manually for now. The
// backend is still the source of truth/enforcement; this only drives which
// buttons are offered.
const NEXT_STATUS_OPTIONS: Record<CaseStatus, CaseStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "REJECTED", "WITHDRAWN"],
  UNDER_REVIEW: ["VERIFIED", "REJECTED", "WITHDRAWN"],
  VERIFIED: ["ASSIGNED", "WITHDRAWN"],
  ASSIGNED: ["HEARING_SCHEDULED", "WITHDRAWN"],
  HEARING_SCHEDULED: ["HEARING_IN_PROGRESS", "WITHDRAWN"],
  HEARING_IN_PROGRESS: ["DECISION_PENDING", "HEARING_SCHEDULED", "WITHDRAWN"],
  DECISION_PENDING: ["DECIDED", "HEARING_IN_PROGRESS"],
  DECIDED: ["CLOSED"],
  CLOSED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState<CaseStatus | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["case", id],
    queryFn: () => casesApi.get(id!),
    enabled: !!id,
  });

  const { data: historyData } = useQuery({
    queryKey: ["case", id, "history"],
    queryFn: () => casesApi.history(id!),
    enabled: !!id,
  });

  async function handleTransition(toStatus: CaseStatus) {
    if (!id) return;
    setError(null);
    setTransitioning(toStatus);
    try {
      await casesApi.transition(id, toStatus);
      await queryClient.invalidateQueries({ queryKey: ["case", id] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update the case status.");
    } finally {
      setTransitioning(null);
    }
  }

  if (isLoading) return <p className="text-sm text-[var(--color-muted)]">Loading…</p>;
  if (!data) return <p className="text-sm text-[var(--color-status-danger)]">Case not found.</p>;

  const { case: c } = data;
  const nextOptions = NEXT_STATUS_OPTIONS[c.status] ?? [];
  const canTransition = user?.permissions.some((p) =>
    ["case:transition", "case:assign", "hearing:manage", "decision:record", "decision:approve"].includes(p),
  );

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide mb-1">
            {c.caseType.replace(/_/g, " ")}
          </p>
          <h1 className="font-display text-2xl mb-2">{c.caseNumber}</h1>
          <StatusBadge status={c.status} />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-[var(--color-status-danger)]/30 bg-[var(--color-status-danger)]/5 px-3 py-2 text-sm text-[var(--color-status-danger)]">
          {error}
        </div>
      )}

      <section className="bg-white border border-[var(--color-line)] rounded-sm p-5 mb-6">
        <h2 className="font-medium text-sm mb-3">Description</h2>
        <p className="text-sm text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap">{c.description}</p>
        {c.location && <p className="text-sm text-[var(--color-muted)] mt-3">Location: {c.location}</p>}
      </section>

      <section className="bg-white border border-[var(--color-line)] rounded-sm p-5 mb-6">
        <h2 className="font-medium text-sm mb-3">Parties</h2>
        <ul className="space-y-2">
          {c.parties.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-sm">
              <span>{p.communityMember.fullName}</span>
              <span className="text-[var(--color-muted)]">{p.roleInCase.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white border border-[var(--color-line)] rounded-sm p-5 mb-6">
        <h2 className="font-medium text-sm mb-3">Elder panel</h2>
        {c.assignments.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No elders assigned yet.</p>
        ) : (
          <ul className="space-y-2">
            {c.assignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <span>{a.user.fullName}</span>
                <span className="text-[var(--color-muted)]">{a.roleInPanel.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canTransition && nextOptions.length > 0 && (
        <section className="bg-white border border-[var(--color-line)] rounded-sm p-5 mb-6">
          <h2 className="font-medium text-sm mb-3">Move this case forward</h2>
          <div className="flex flex-wrap gap-2">
            {nextOptions.map((status) => (
              <Button
                key={status}
                variant={status === "REJECTED" || status === "WITHDRAWN" ? "danger" : "primary"}
                disabled={transitioning !== null}
                onClick={() => handleTransition(status)}
              >
                {transitioning === status ? "Updating…" : `Mark as ${status.replace(/_/g, " ").toLowerCase()}`}
              </Button>
            ))}
          </div>
        </section>
      )}

      <section className="bg-white border border-[var(--color-line)] rounded-sm p-5">
        <h2 className="font-medium text-sm mb-3">History</h2>
        {!historyData || historyData.history.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No history yet.</p>
        ) : (
          <ol className="space-y-3">
            {historyData.history.map((h) => (
              <li key={h.id} className="text-sm border-l-2 border-[var(--color-line)] pl-3">
                <span className="font-medium">{h.toStatus.replace(/_/g, " ")}</span>
                <span className="text-[var(--color-muted)]"> — {new Date(h.createdAt).toLocaleString()}</span>
                {h.note && <p className="text-[var(--color-muted)] mt-0.5">{h.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

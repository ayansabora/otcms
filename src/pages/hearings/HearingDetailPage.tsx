import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, Clock, MapPin, Scale, Users, ArrowLeft,
  CheckCircle, XCircle, PlayCircle, PauseCircle, Info,
} from "lucide-react";
import { hearingsApi } from "../../api/hearings";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/Button";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardHeader, CardBody } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { Badge } from "../../components/Badge";
import { PageLoading } from "../../components/LoadingSpinner";
import { ErrorMessage } from "../../components/ErrorMessage";
import { AlertMessage } from "../../components/ErrorMessage";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import type { HearingStatus } from "../../types/api";

const STATUS_ACTIONS: {
  status: Exclude<HearingStatus, "SCHEDULED">;
  label: string;
  icon: React.ReactNode;
  variant: "primary" | "secondary" | "danger" | "ghost";
  allowedFrom: HearingStatus[];
}[] = [
  {
    status: "IN_PROGRESS",
    label: "Start Hearing",
    icon: <PlayCircle size={14} />,
    variant: "primary",
    allowedFrom: ["SCHEDULED"],
  },
  {
    status: "COMPLETED",
    label: "Mark Completed",
    icon: <CheckCircle size={14} />,
    variant: "primary",
    allowedFrom: ["IN_PROGRESS"],
  },
  {
    status: "POSTPONED",
    label: "Postpone",
    icon: <PauseCircle size={14} />,
    variant: "secondary",
    allowedFrom: ["SCHEDULED"],
  },
  {
    status: "CANCELLED",
    label: "Cancel Hearing",
    icon: <XCircle size={14} />,
    variant: "danger",
    allowedFrom: ["SCHEDULED", "IN_PROGRESS"],
  },
];

export function HearingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [statusModal, setStatusModal] = useState<Exclude<HearingStatus, "SCHEDULED"> | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hearing", id],
    queryFn: () => hearingsApi.get(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: ({ status, notes }: { status: Exclude<HearingStatus, "SCHEDULED">; notes?: string }) =>
      hearingsApi.updateStatus(id!, status, notes),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["hearing", id] });
      queryClient.invalidateQueries({ queryKey: ["hearings"] });
      toast.success(`Hearing marked as ${result.hearing.status.replace(/_/g, " ").toLowerCase()}.`);
      setStatusModal(null);
      setStatusNote("");
      setActionError(null);
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : "Action failed.");
    },
  });

  const canManage = user?.permissions.includes("hearing:manage");

  if (isLoading) return <PageLoading />;
  if (isError || !data) return <ErrorMessage message="Hearing not found or could not be loaded." />;

  const hearing = data.hearing;

  const start   = new Date(hearing.startTime);
  const end     = new Date(hearing.endTime);
  const dateStr = start.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const startT  = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const endT    = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);

  const allowedActions = STATUS_ACTIONS.filter((a) => a.allowedFrom.includes(hearing.status));

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Hearing — ${hearing.case?.caseNumber ?? hearing.id.slice(0, 8)}`}
        subtitle={`${dateStr} · ${startT}–${endT}`}
        breadcrumb={[
          { label: "Hearings", to: "/app/hearings" },
          { label: hearing.case?.caseNumber ?? "Hearing" },
        ]}
        actions={
          <Link to="/app/hearings/schedule">
            <Button variant="secondary" size="sm" leftIcon={<Calendar size={14} />}>
              Schedule Another
            </Button>
          </Link>
        }
      />

      {/* Status bar */}
      <div className="flex items-center gap-3 mb-5 p-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
        <StatusBadge status={hearing.status} />
        <span className="text-sm text-[var(--color-muted)]">
          {hearing.status === "SCHEDULED"   && "Hearing is confirmed and upcoming."}
          {hearing.status === "IN_PROGRESS" && "Hearing session is currently in progress."}
          {hearing.status === "COMPLETED"   && "Hearing session has been completed."}
          {hearing.status === "POSTPONED"   && "Hearing has been postponed. Schedule a new session."}
          {hearing.status === "CANCELLED"   && "Hearing has been cancelled."}
        </span>
        {canManage && allowedActions.length > 0 && (
          <div className="ml-auto flex gap-2">
            {allowedActions.map((a) => (
              <Button
                key={a.status}
                variant={a.variant}
                size="sm"
                leftIcon={a.icon}
                onClick={() => { setStatusModal(a.status); setActionError(null); setStatusNote(""); }}
              >
                {a.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

        {/* Date & time */}
        <Card>
          <CardHeader title="Date & Time" icon={<Clock />} />
          <CardBody className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Calendar size={15} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--color-ink)]">{dateStr}</p>
                <p className="text-[var(--color-muted)]">{startT} – {endT}</p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">{durationMin} minutes</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin size={15} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[var(--color-ink)]">{hearing.location}</p>
                {hearing.purpose && <p className="text-xs text-[var(--color-muted)]">{hearing.purpose}</p>}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Case */}
        <Card>
          <CardHeader title="Associated Case" icon={<Scale />} />
          <CardBody className="space-y-2 text-sm">
            {hearing.case ? (
              <>
                <Link
                  to={`/app/cases/${hearing.caseId}`}
                  className="font-semibold text-[var(--color-primary)] hover:underline"
                >
                  {hearing.case.caseNumber}
                </Link>
                <p className="text-xs text-[var(--color-muted)] capitalize">
                  {hearing.case.caseType.replace(/_/g, " ").toLowerCase()}
                </p>
                <div className="pt-1">
                  <Link to={`/app/cases/${hearing.caseId}`}>
                    <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={13} />}>
                      Open Case
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-[var(--color-muted)]">Case information unavailable.</p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Participants */}
      <Card className="mb-4">
        <CardHeader title={`Participants (${hearing.participants?.length ?? 0})`} icon={<Users />} />
        <CardBody>
          {!hearing.participants || hearing.participants.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
              <Info size={14} />
              <span>No participants recorded yet. Elders assigned to the case panel are added automatically.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {hearing.participants.map((p) => {
                const name =
                  p.user?.fullName ??
                  p.communityMember?.fullName ??
                  (p.witnessId ? `Witness (${p.witnessId.slice(0, 8)}…)` : "Unknown");
                const sub  =
                  p.user?.email ??
                  (p.communityMemberId ? "Community member" : null);
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b border-[var(--color-line)] last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-ink)]">{name}</p>
                      {sub && <p className="text-xs text-[var(--color-muted)]">{sub}</p>}
                    </div>
                    <Badge variant="default" size="sm">{p.role}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Notes / outcome */}
      {(hearing.notes || hearing.outcomeRef) && (
        <Card>
          <CardHeader title="Notes & Outcome" icon={<Info />} />
          <CardBody className="space-y-2 text-sm">
            {hearing.notes    && <p className="text-[var(--color-ink)] whitespace-pre-wrap">{hearing.notes}</p>}
            {hearing.outcomeRef && <p className="text-[var(--color-muted)]">Outcome reference: {hearing.outcomeRef}</p>}
          </CardBody>
        </Card>
      )}

      {/* Status change modal */}
      <Modal
        isOpen={!!statusModal}
        onClose={() => { setStatusModal(null); setStatusNote(""); setActionError(null); }}
        title={STATUS_ACTIONS.find((a) => a.status === statusModal)?.label ?? "Update Status"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusModal(null)}>Cancel</Button>
            <Button
              variant={STATUS_ACTIONS.find((a) => a.status === statusModal)?.variant ?? "primary"}
              loading={updateMutation.isPending}
              onClick={() => {
                if (statusModal) updateMutation.mutate({ status: statusModal, notes: statusNote || undefined });
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wide mb-1.5">
              Notes (optional)
            </label>
            <textarea
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              rows={3}
              placeholder="Add any notes about this status change…"
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 resize-none"
            />
          </div>
          {actionError && <AlertMessage variant="danger" message={actionError} />}
        </div>
      </Modal>
    </div>
  );
}

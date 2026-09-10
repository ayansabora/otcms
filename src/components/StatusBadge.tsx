const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  SUBMITTED: { bg: "bg-[var(--color-status-neutral)]/10", text: "text-[var(--color-status-neutral)]", label: "Submitted" },
  UNDER_REVIEW: { bg: "bg-[var(--color-status-pending)]/10", text: "text-[var(--color-status-pending)]", label: "Under review" },
  VERIFIED: { bg: "bg-[var(--color-status-active)]/10", text: "text-[var(--color-status-active)]", label: "Verified" },
  ASSIGNED: { bg: "bg-[var(--color-status-active)]/10", text: "text-[var(--color-status-active)]", label: "Assigned" },
  HEARING_SCHEDULED: { bg: "bg-[var(--color-status-active)]/10", text: "text-[var(--color-status-active)]", label: "Hearing scheduled" },
  HEARING_IN_PROGRESS: { bg: "bg-[var(--color-status-active)]/10", text: "text-[var(--color-status-active)]", label: "Hearing in progress" },
  DECISION_PENDING: { bg: "bg-[var(--color-status-pending)]/10", text: "text-[var(--color-status-pending)]", label: "Decision pending" },
  DECIDED: { bg: "bg-[var(--color-status-success)]/10", text: "text-[var(--color-status-success)]", label: "Decided" },
  CLOSED: { bg: "bg-[var(--color-status-success)]/10", text: "text-[var(--color-status-success)]", label: "Closed" },
  REJECTED: { bg: "bg-[var(--color-status-danger)]/10", text: "text-[var(--color-status-danger)]", label: "Rejected" },
  WITHDRAWN: { bg: "bg-[var(--color-status-danger)]/10", text: "text-[var(--color-status-danger)]", label: "Withdrawn" },
  PENDING: { bg: "bg-[var(--color-status-pending)]/10", text: "text-[var(--color-status-pending)]", label: "Pending" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { bg: "bg-[var(--color-status-neutral)]/10", text: "text-[var(--color-status-neutral)]", label: status };
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[13px] font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

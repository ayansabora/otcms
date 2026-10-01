const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  // Case statuses
  SUBMITTED:           { bg: "bg-[var(--color-status-neutral)]/10", text: "text-[var(--color-status-neutral)]", label: "Submitted" },
  UNDER_REVIEW:        { bg: "bg-[var(--color-status-pending)]/10", text: "text-[var(--color-status-pending)]", label: "Under Review" },
  VERIFIED:            { bg: "bg-[var(--color-status-active)]/10",  text: "text-[var(--color-status-active)]",  label: "Verified" },
  ASSIGNED:            { bg: "bg-[var(--color-status-active)]/10",  text: "text-[var(--color-status-active)]",  label: "Assigned" },
  HEARING_SCHEDULED:   { bg: "bg-[var(--color-status-active)]/10",  text: "text-[var(--color-status-active)]",  label: "Hearing Scheduled" },
  HEARING_IN_PROGRESS: { bg: "bg-[var(--color-status-active)]/10",  text: "text-[var(--color-status-active)]",  label: "Hearing In Progress" },
  DECISION_PENDING:    { bg: "bg-[var(--color-status-pending)]/10", text: "text-[var(--color-status-pending)]", label: "Decision Pending" },
  DECIDED:             { bg: "bg-[var(--color-status-success)]/10", text: "text-[var(--color-status-success)]", label: "Decided" },
  CLOSED:              { bg: "bg-[var(--color-status-success)]/10", text: "text-[var(--color-status-success)]", label: "Closed" },
  REJECTED:            { bg: "bg-[var(--color-status-danger)]/10",  text: "text-[var(--color-status-danger)]",  label: "Rejected" },
  WITHDRAWN:           { bg: "bg-[var(--color-status-danger)]/10",  text: "text-[var(--color-status-danger)]",  label: "Withdrawn" },
  // Hearing statuses
  SCHEDULED:           { bg: "bg-[var(--color-status-active)]/10",  text: "text-[var(--color-status-active)]",  label: "Scheduled" },
  IN_PROGRESS:         { bg: "bg-[var(--color-status-pending)]/10", text: "text-[var(--color-status-pending)]", label: "In Progress" },
  COMPLETED:           { bg: "bg-[var(--color-status-success)]/10", text: "text-[var(--color-status-success)]", label: "Completed" },
  CANCELLED:           { bg: "bg-[var(--color-status-danger)]/10",  text: "text-[var(--color-status-danger)]",  label: "Cancelled" },
  POSTPONED:           { bg: "bg-[var(--color-status-neutral)]/10", text: "text-[var(--color-status-neutral)]", label: "Postponed" },
  // Decision approval statuses
  PENDING:             { bg: "bg-[var(--color-status-pending)]/10", text: "text-[var(--color-status-pending)]", label: "Pending" },
  APPROVED:            { bg: "bg-[var(--color-status-success)]/10", text: "text-[var(--color-status-success)]", label: "Approved" },
  // Member verification
  VERIFIED_MEMBER:     { bg: "bg-[var(--color-status-success)]/10", text: "text-[var(--color-status-success)]", label: "Verified" },
  PENDING_MEMBER:      { bg: "bg-[var(--color-status-pending)]/10", text: "text-[var(--color-status-pending)]", label: "Pending" },
  // User statuses
  ACTIVE:              { bg: "bg-[var(--color-status-success)]/10", text: "text-[var(--color-status-success)]", label: "Active" },
  INACTIVE:            { bg: "bg-[var(--color-status-neutral)]/10", text: "text-[var(--color-status-neutral)]", label: "Inactive" },
  SUSPENDED:           { bg: "bg-[var(--color-status-danger)]/10",  text: "text-[var(--color-status-danger)]",  label: "Suspended" },
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  LOW:    { bg: "bg-[var(--color-status-neutral)]/10", text: "text-[var(--color-status-neutral)]" },
  NORMAL: { bg: "bg-[var(--color-status-active)]/10",  text: "text-[var(--color-status-active)]" },
  HIGH:   { bg: "bg-[var(--color-status-pending)]/10", text: "text-[var(--color-status-pending)]" },
  URGENT: { bg: "bg-[var(--color-status-danger)]/10",  text: "text-[var(--color-status-danger)]" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? {
    bg: "bg-[var(--color-status-neutral)]/10",
    text: "text-[var(--color-status-neutral)]",
    label: status.replace(/_/g, " "),
  };
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[12px] font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const style = PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.NORMAL;
  return (
    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[12px] font-medium ${style.bg} ${style.text}`}>
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}

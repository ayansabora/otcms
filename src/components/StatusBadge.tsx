import { Badge } from "./Badge";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral" | "gold";

// Kept for external use
export type { BadgeVariant };

interface StatusConfig {
  variant: BadgeVariant;
  label: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  // Case statuses
  SUBMITTED:           { variant: "neutral",  label: "Submitted" },
  UNDER_REVIEW:        { variant: "info",     label: "Under Review" },
  VERIFIED:            { variant: "success",  label: "Verified" },
  ASSIGNED:            { variant: "gold",     label: "Assigned" },
  HEARING_SCHEDULED:   { variant: "info",     label: "Hearing Scheduled" },
  HEARING_IN_PROGRESS: { variant: "warning",  label: "In Progress" },
  DECISION_PENDING:    { variant: "warning",  label: "Decision Pending" },
  DECIDED:             { variant: "success",  label: "Decided" },
  CLOSED:              { variant: "success",  label: "Closed" },
  REJECTED:            { variant: "danger",   label: "Rejected" },
  WITHDRAWN:           { variant: "danger",   label: "Withdrawn" },
  // Hearing statuses
  SCHEDULED:           { variant: "info",     label: "Scheduled" },
  IN_PROGRESS:         { variant: "warning",  label: "In Progress" },
  COMPLETED:           { variant: "success",  label: "Completed" },
  CANCELLED:           { variant: "danger",   label: "Cancelled" },
  POSTPONED:           { variant: "neutral",  label: "Postponed" },
  // Decision approval
  PENDING:             { variant: "warning",  label: "Pending" },
  APPROVED:            { variant: "success",  label: "Approved" },
  // Member verification
  PENDING_MEMBER:      { variant: "warning",  label: "Pending" },
  VERIFIED_MEMBER:     { variant: "success",  label: "Verified" },
  REJECTED_MEMBER:     { variant: "danger",   label: "Rejected" },
  // User statuses
  ACTIVE:              { variant: "success",  label: "Active" },
  INACTIVE:            { variant: "neutral",  label: "Inactive" },
  SUSPENDED:           { variant: "danger",   label: "Suspended" },
};

const PRIORITY_MAP: Record<string, StatusConfig> = {
  LOW:    { variant: "neutral",  label: "Low" },
  NORMAL: { variant: "info",     label: "Normal" },
  HIGH:   { variant: "warning",  label: "High" },
  URGENT: { variant: "danger",   label: "Urgent" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? { variant: "neutral" as BadgeVariant, label: status.replace(/_/g, " ") };
  return <Badge variant={config.variant} dot>{config.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const config = PRIORITY_MAP[priority] ?? { variant: "neutral" as BadgeVariant, label: priority };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

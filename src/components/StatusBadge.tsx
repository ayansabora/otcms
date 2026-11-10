import { useTranslation } from "react-i18next";
import { Badge } from "./Badge";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral" | "gold";
export type { BadgeVariant };

/** Maps a raw status string → { variant, translationKey } */
const STATUS_MAP: Record<string, { variant: BadgeVariant; key: string }> = {
  // Case statuses
  SUBMITTED:           { variant: "neutral",  key: "cases.statuses.SUBMITTED" },
  UNDER_REVIEW:        { variant: "info",     key: "cases.statuses.UNDER_REVIEW" },
  VERIFIED:            { variant: "success",  key: "cases.statuses.VERIFIED" },
  ASSIGNED:            { variant: "gold",     key: "cases.statuses.ASSIGNED" },
  HEARING_SCHEDULED:   { variant: "info",     key: "cases.statuses.HEARING_SCHEDULED" },
  HEARING_IN_PROGRESS: { variant: "warning",  key: "cases.statuses.HEARING_IN_PROGRESS" },
  DECISION_PENDING:    { variant: "warning",  key: "cases.statuses.DECISION_PENDING" },
  DECIDED:             { variant: "success",  key: "cases.statuses.DECIDED" },
  CLOSED:              { variant: "success",  key: "cases.statuses.CLOSED" },
  REJECTED:            { variant: "danger",   key: "cases.statuses.REJECTED" },
  WITHDRAWN:           { variant: "danger",   key: "cases.statuses.WITHDRAWN" },
  // Hearing statuses
  SCHEDULED:           { variant: "info",     key: "hearings.statuses.SCHEDULED" },
  IN_PROGRESS:         { variant: "warning",  key: "hearings.statuses.IN_PROGRESS" },
  COMPLETED:           { variant: "success",  key: "hearings.statuses.COMPLETED" },
  CANCELLED:           { variant: "danger",   key: "hearings.statuses.CANCELLED" },
  POSTPONED:           { variant: "neutral",  key: "hearings.statuses.POSTPONED" },
  // Decision approval statuses
  PENDING:             { variant: "warning",  key: "decisions.approvalStatuses.PENDING" },
  APPROVED:            { variant: "success",  key: "decisions.approvalStatuses.APPROVED" },
  // Member verification
  PENDING_MEMBER:      { variant: "warning",  key: "members.statuses.PENDING" },
  VERIFIED_MEMBER:     { variant: "success",  key: "members.statuses.VERIFIED" },
  REJECTED_MEMBER:     { variant: "danger",   key: "members.statuses.REJECTED" },
  // User statuses
  ACTIVE:              { variant: "success",  key: "users.statuses.ACTIVE" },
  INACTIVE:            { variant: "neutral",  key: "users.statuses.INACTIVE" },
  SUSPENDED:           { variant: "danger",   key: "users.statuses.SUSPENDED" },
};

const PRIORITY_MAP: Record<string, { variant: BadgeVariant; key: string }> = {
  LOW:    { variant: "neutral",  key: "cases.priorities.LOW" },
  NORMAL: { variant: "info",     key: "cases.priorities.NORMAL" },
  HIGH:   { variant: "warning",  key: "cases.priorities.HIGH" },
  URGENT: { variant: "danger",   key: "cases.priorities.URGENT" },
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const config = STATUS_MAP[status];
  if (!config) return <Badge variant="neutral" dot>{status.replace(/_/g, " ")}</Badge>;
  return <Badge variant={config.variant} dot>{t(config.key)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const { t } = useTranslation();
  const config = PRIORITY_MAP[priority];
  if (!config) return <Badge variant="neutral">{priority}</Badge>;
  return <Badge variant={config.variant}>{t(config.key)}</Badge>;
}

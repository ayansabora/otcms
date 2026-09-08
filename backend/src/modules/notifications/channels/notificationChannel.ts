export interface NotificationPayload {
  userId: string;
  type: string; // e.g. "case_status_changed", "hearing_scheduled", "decision_recorded"
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

/**
 * Channel abstraction (blueprint §9/§18): notifications are raised through
 * one call site regardless of eventual delivery mechanism. Only an in-app
 * channel is implemented in this phase; SMS/email channels can be added as
 * new classes implementing this interface without touching call sites.
 */
export interface NotificationChannel {
  send(payload: NotificationPayload): Promise<void>;
}

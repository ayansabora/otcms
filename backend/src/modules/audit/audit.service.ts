import { prisma } from "../../database/prismaClient.js";
import { logger } from "../../config/logger.js";

export interface AuditEntry {
  actorUserId?: string;
  action: string; // e.g. "case.status_changed"
  entityType: string; // e.g. "case", "user", "decision"
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
}

/**
 * The single write path for audit_logs. Every mutating service method that
 * needs an audit trail (per blueprint §11 rule 10 and §20) should call this
 * rather than writing to the table directly, so the audit trail can't
 * silently drift or be bypassed by a forgotten call site.
 *
 * Audit writes are best-effort: a logging failure must never abort the
 * business operation it's describing, but it IS logged loudly so it's
 * never silently lost.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        ...(entry.actorUserId ? { actorUserId: entry.actorUserId } : {}),
        action: entry.action,
        entityType: entry.entityType,
        ...(entry.entityId ? { entityId: entry.entityId } : {}),
        ...(entry.before !== undefined ? { before: entry.before as object } : {}),
        ...(entry.after !== undefined ? { after: entry.after as object } : {}),
        ...(entry.ipAddress ? { ipAddress: entry.ipAddress } : {}),
      },
    });
  } catch (err) {
    logger.error({ err, entry }, "Failed to write audit log entry");
  }
}

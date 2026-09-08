import { prisma } from "../../database/prismaClient.js";
import { InAppChannel } from "./channels/inAppChannel.js";
import type { NotificationChannel, NotificationPayload } from "./channels/notificationChannel.js";
import { logger } from "../../config/logger.js";
import { toSkipTake, paginate, type PaginationInput } from "../../utils/pagination.js";

// Active channels. Adding SMS/email later means appending an adapter here —
// no call-site changes required (blueprint §9).
const channels: NotificationChannel[] = [new InAppChannel()];

/**
 * Single dispatch point for all domain events that should notify a user
 * (case submitted, hearing scheduled, decision recorded, etc.). Delivery
 * failures are logged, never thrown — a notification issue must not roll
 * back the business operation that triggered it.
 */
export async function notify(payload: NotificationPayload): Promise<void> {
  await Promise.all(
    channels.map((channel) =>
      channel.send(payload).catch((err) => logger.error({ err, payload }, "Notification delivery failed")),
    ),
  );
}

export const notificationsService = {
  async listForUser(userId: string, pagination: PaginationInput, unreadOnly = false) {
    const { skip, take } = toSkipTake(pagination);
    const where = { userId, ...(unreadOnly ? { readAt: null } : {}) };
    const [items, total] = await prisma.$transaction([
      prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      prisma.notification.count({ where }),
    ]);
    return paginate(items, total, pagination);
  },

  async markRead(id: string, userId: string) {
    return prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
  },

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  },
};

import { prisma } from "../../../database/prismaClient.js";
import type { NotificationChannel, NotificationPayload } from "./notificationChannel.js";

export class InAppChannel implements NotificationChannel {
  async send(payload: NotificationPayload): Promise<void> {
    await prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        ...(payload.body ? { body: payload.body } : {}),
        ...(payload.data ? { payload: payload.data as object } : {}),
      },
    });
  }
}

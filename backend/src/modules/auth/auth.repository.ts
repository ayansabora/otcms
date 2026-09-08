import { prisma } from "../../database/prismaClient.js";
import type { User } from "@prisma/client";

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
  },

  incrementFailedAttempts(userId: string, lockUntil: Date | null) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
        ...(lockUntil ? { lockedUntil: lockUntil } : {}),
      },
    });
  },

  resetFailedAttempts(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
  },

  updatePasswordHash(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    });
  },

  createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshTokenByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  revokeRefreshToken(id: string, replacedById?: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date(), ...(replacedById ? { replacedById } : {}) },
    });
  },

  revokeTokenFamily(familyId: string) {
    return prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};

export type AuthUser = User;

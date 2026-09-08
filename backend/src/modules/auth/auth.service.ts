import { randomUUID, randomBytes, createHash } from "node:crypto";
import { authRepository } from "./auth.repository.js";
import { hashPassword, verifyPassword, isPasswordCompliant } from "../../utils/password.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from "../../utils/jwt.js";
import { UnauthorizedError, ValidationError, ForbiddenError } from "../../utils/appError.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { recordAudit } from "../audit/audit.service.js";
import { prisma } from "../../database/prismaClient.js";
import type { LoginInput, ResetPasswordInput, ChangePasswordInput } from "./auth.validators.js";

type UserWithRoles = Awaited<ReturnType<typeof authRepository.findUserByEmail>>;

function extractRolesAndPermissions(user: NonNullable<UserWithRoles>) {
  const roles = user.roles.map((ur) => ur.role.name);
  const permissions = Array.from(
    new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code))),
  );
  return { roles, permissions };
}

function msFromTtl(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 15 * 60 * 1000;
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit as "s" | "m" | "h" | "d"];
  return value * unitMs;
}

export const authService = {
  async login(input: LoginInput, meta: { ipAddress?: string; userAgent?: string }) {
    const user = await authRepository.findUserByEmail(input.email);

    // Constant-shape response whether the user exists or not, to avoid
    // user-enumeration via timing/response differences.
    if (!user) {
      await verifyPassword("$argon2id$v=19$m=19456,t=2,p=1$00000000000000000000$0000000000000000000000000000000000000000", input.password);
      throw new UnauthorizedError("Invalid email or password");
    }

    if (user.status !== "ACTIVE") {
      throw new ForbiddenError("This account is not active. Contact an administrator.");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenError("Account temporarily locked due to repeated failed login attempts");
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      const shouldLock = attempts >= env.LOGIN_MAX_FAILED_ATTEMPTS;
      await authRepository.incrementFailedAttempts(
        user.id,
        shouldLock ? new Date(Date.now() + env.LOGIN_LOCKOUT_MINUTES * 60_000) : null,
      );
      await recordAudit({ actorUserId: user.id, action: "auth.login_failed", entityType: "user", entityId: user.id });
      throw new UnauthorizedError("Invalid email or password");
    }

    await authRepository.resetFailedAttempts(user.id);

    const { roles, permissions } = extractRolesAndPermissions(user);
    const accessToken = signAccessToken({ sub: user.id, roles, permissions });

    const familyId = randomUUID();
    const { token: refreshToken } = signRefreshToken(user.id, familyId);
    await authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      familyId,
      expiresAt: new Date(Date.now() + msFromTtl(env.JWT_REFRESH_TTL)),
      ...(meta.ipAddress ? { ipAddress: meta.ipAddress } : {}),
      ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    });

    await recordAudit({ actorUserId: user.id, action: "auth.login_succeeded", entityType: "user", entityId: user.id });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, roles, permissions },
    };
  },

  /**
   * Refresh-token rotation with reuse detection: every refresh issues a brand
   * new refresh token and revokes the old one. If a *previously revoked*
   * token is presented again, the entire token family is revoked — this is
   * the standard signal that a refresh token was stolen and replayed.
   */
  async refresh(rawToken: string, meta: { ipAddress?: string; userAgent?: string }) {
    let payload;
    try {
      payload = verifyRefreshToken(rawToken);
    } catch {
      throw new UnauthorizedError("Invalid or expired session");
    }

    const stored = await authRepository.findRefreshTokenByHash(hashToken(rawToken));
    if (!stored) throw new UnauthorizedError("Invalid or expired session");

    if (stored.revokedAt) {
      // Reuse of a rotated-away token — treat as compromise, kill the family.
      await authRepository.revokeTokenFamily(stored.familyId);
      logger.warn({ userId: stored.userId, familyId: stored.familyId }, "Refresh token reuse detected — family revoked");
      throw new UnauthorizedError("Session invalidated for security reasons. Please log in again.");
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedError("Session expired, please log in again");
    }

    const user = await authRepository.findUserById(payload.sub);
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedError("Account is not active");
    }

    const { roles, permissions } = extractRolesAndPermissions(user);
    const accessToken = signAccessToken({ sub: user.id, roles, permissions });

    const { token: newRefreshToken } = signRefreshToken(user.id, stored.familyId);
    const newStored = await authRepository.createRefreshToken({
      userId: user.id,
      tokenHash: hashToken(newRefreshToken),
      familyId: stored.familyId,
      expiresAt: new Date(Date.now() + msFromTtl(env.JWT_REFRESH_TTL)),
      ...(meta.ipAddress ? { ipAddress: meta.ipAddress } : {}),
      ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    });
    await authRepository.revokeRefreshToken(stored.id, newStored.id);

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(rawToken: string) {
    const stored = await authRepository.findRefreshTokenByHash(hashToken(rawToken));
    if (stored && !stored.revokedAt) {
      await authRepository.revokeTokenFamily(stored.familyId);
    }
  },

  /**
   * Always returns success regardless of whether the email exists —
   * prevents account enumeration via the password-reset flow.
   */
  async requestPasswordReset(email: string) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      logger.info({ email }, "Password reset requested for unknown email — no-op");
      return;
    }

    const rawToken = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(rawToken).digest("hex"),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Notification module (Phase 11) delivers this via email/SMS; for now,
    // deliberately NOT returning the token from the API — only a real
    // notification channel should ever receive it.
    logger.info({ userId: user.id }, "Password reset token generated");
  },

  async resetPassword(input: ResetPasswordInput) {
    const tokenHash = createHash("sha256").update(input.token).digest("hex");
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new ValidationError("This reset link is invalid or has expired");
    }

    if (!isPasswordCompliant(input.newPassword)) {
      throw new ValidationError("Password does not meet the required policy");
    }

    const passwordHash = await hashPassword(input.newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    await recordAudit({ actorUserId: record.userId, action: "auth.password_reset", entityType: "user", entityId: record.userId });
  },

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new UnauthorizedError();

    const valid = await verifyPassword(user.passwordHash, input.currentPassword);
    if (!valid) throw new ValidationError("Current password is incorrect");

    if (!isPasswordCompliant(input.newPassword)) {
      throw new ValidationError("Password does not meet the required policy");
    }

    const passwordHash = await hashPassword(input.newPassword);
    await authRepository.updatePasswordHash(userId, passwordHash);
    // Force re-login everywhere else after a password change.
    await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });

    await recordAudit({ actorUserId: userId, action: "auth.password_changed", entityType: "user", entityId: userId });
  },
};

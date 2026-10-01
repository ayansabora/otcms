import type { Request, Response } from "express";
import { authService } from "./auth.service.js";
import { loginSchema, requestPasswordResetSchema, resetPasswordSchema, changePasswordSchema } from "./auth.validators.js";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../utils/appError.js";
import { authRepository } from "./auth.repository.js";

const REFRESH_COOKIE_NAME = "otcms_refresh_token";
const REFRESH_COOKIE_PATH = "/api/v1/auth"; // scoped narrowly, not sent on every request

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

export const authController = {
  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input, {
      ...(req.ip ? { ipAddress: req.ip } : {}),
      ...(req.get("user-agent") ? { userAgent: req.get("user-agent")! } : {}),
    });

    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({ accessToken: result.accessToken, user: result.user });
  },

  async refresh(req: Request, res: Response) {
    const rawToken = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
    if (!rawToken) throw new UnauthorizedError("No active session");

    const result = await authService.refresh(rawToken, {
      ...(req.ip ? { ipAddress: req.ip } : {}),
      ...(req.get("user-agent") ? { userAgent: req.get("user-agent")! } : {}),
    });

    setRefreshCookie(res, result.refreshToken);
    res.status(200).json({ accessToken: result.accessToken });
  },

  async logout(req: Request, res: Response) {
    const rawToken = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
    if (rawToken) await authService.logout(rawToken);
    clearRefreshCookie(res);
    res.status(204).send();
  },

  async requestPasswordReset(req: Request, res: Response) {
    const input = requestPasswordResetSchema.parse(req.body);
    await authService.requestPasswordReset(input.email);
    // Always 202 regardless of whether the email exists — avoid enumeration.
    res.status(202).json({ message: "If that email is registered, a reset link has been sent." });
  },

  async resetPassword(req: Request, res: Response) {
    const input = resetPasswordSchema.parse(req.body);
    await authService.resetPassword(input);
    res.status(200).json({ message: "Password has been reset. Please log in." });
  },

  async changePassword(req: Request, res: Response) {
    const input = changePasswordSchema.parse(req.body);
    if (!req.user) throw new UnauthorizedError();
    await authService.changePassword(req.user.sub, input);
    res.status(200).json({ message: "Password changed successfully." });
  },

  async me(req: Request, res: Response) {
    if (!req.user) throw new UnauthorizedError();
    // Return full user profile from DB so the frontend has email, fullName etc.
    const user = await authRepository.findUserById(req.user.sub);
    if (!user) throw new UnauthorizedError();
    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.code))),
    );
    res.status(200).json({
      user: { id: user.id, email: user.email, fullName: user.fullName, roles, permissions },
    });
  },
};

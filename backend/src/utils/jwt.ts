import jwt, { type SignOptions } from "jsonwebtoken";
import { randomUUID, createHash } from "node:crypto";
import { env } from "../config/env.js";

export interface AccessTokenPayload {
  sub: string; // user id
  roles: string[];
  permissions: string[];
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  familyId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(userId: string, familyId: string): { token: string; jti: string } {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, jti, familyId } as RefreshTokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_TTL,
  } as SignOptions);
  return { token, jti };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

/**
 * We never store raw refresh tokens in the database — only a SHA-256 hash,
 * so a database leak alone can't be replayed as a valid session.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

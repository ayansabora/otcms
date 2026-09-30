import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
} from "../jwt.js";

describe("access tokens", () => {
  it("signs and verifies a valid access token, preserving claims", () => {
    const token = signAccessToken({ sub: "user-1", roles: ["ADMIN"], permissions: ["user:manage"] });
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.roles).toEqual(["ADMIN"]);
    expect(payload.permissions).toEqual(["user:manage"]);
  });

  it("rejects a token signed with a different secret", () => {
    const forged = jwt.sign({ sub: "attacker", roles: [], permissions: ["user:manage"] }, "wrong-secret");
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it("rejects a tampered token", () => {
    const token = signAccessToken({ sub: "user-1", roles: [], permissions: [] });
    const tampered = token.slice(0, -2) + "xx";
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});

describe("refresh tokens", () => {
  it("signs and verifies, embedding sub/jti/familyId", () => {
    const { token, jti } = signRefreshToken("user-1", "family-abc");
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe("user-1");
    expect(payload.familyId).toBe("family-abc");
    expect(payload.jti).toBe(jti);
  });

  it("produces a distinct jti on every call, even for the same user/family", () => {
    const a = signRefreshToken("user-1", "family-abc");
    const b = signRefreshToken("user-1", "family-abc");
    expect(a.jti).not.toBe(b.jti);
    expect(a.token).not.toBe(b.token);
  });
});

describe("hashToken", () => {
  it("is deterministic for the same input", () => {
    expect(hashToken("some-refresh-token")).toBe(hashToken("some-refresh-token"));
  });

  it("differs for different inputs and never returns the raw input", () => {
    const hash = hashToken("some-refresh-token");
    expect(hash).not.toBe("some-refresh-token");
    expect(hash).not.toBe(hashToken("a-different-token"));
  });
});

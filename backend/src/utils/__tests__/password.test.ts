import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, isPasswordCompliant } from "../password.js";

describe("password utils", () => {
  it("hashes a password and verifies it round-trips correctly", async () => {
    const hash = await hashPassword("CorrectHorse123!");
    expect(hash).not.toContain("CorrectHorse123!");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    await expect(verifyPassword(hash, "CorrectHorse123!")).resolves.toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("CorrectHorse123!");
    await expect(verifyPassword(hash, "WrongPassword123!")).resolves.toBe(false);
  });

  it("does not throw on a malformed hash, just returns false", async () => {
    await expect(verifyPassword("not-a-real-hash", "anything")).resolves.toBe(false);
  });

  it("enforces the password policy: minimum 12 chars, letter + number", () => {
    expect(isPasswordCompliant("Short1")).toBe(false); // too short
    expect(isPasswordCompliant("alllettersnodigits")).toBe(false); // no digit
    expect(isPasswordCompliant("123456789012")).toBe(false); // no letter
    expect(isPasswordCompliant("ValidPassword123")).toBe(true);
  });
});

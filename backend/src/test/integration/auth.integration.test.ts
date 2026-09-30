import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app.js";
import { prisma } from "../../database/prismaClient.js";
import { resetDatabase } from "../dbReset.js";
import { seedTestBaseline } from "../seedTestBaseline.js";
import { createTestUser } from "../createTestUser.js";

const app = createApp();

describe("Auth flow (integration)", () => {
  beforeAll(async () => {
    await resetDatabase();
    await seedTestBaseline();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("logs in with valid credentials and returns an access token + user", async () => {
    const { email, password } = await createTestUser("ADMIN");

    const res = await request(app).post("/api/v1/auth/login").send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTypeOf("string");
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.roles).toContain("ADMIN");
    expect(res.body.user.permissions).toContain("user:manage");
    // Refresh token must be an httpOnly cookie, never in the JSON body.
    expect(res.body.refreshToken).toBeUndefined();
    const setCookie = res.headers["set-cookie"];
    expect(setCookie?.[0]).toContain("otcms_refresh_token=");
    expect(setCookie?.[0]).toContain("HttpOnly");
  });

  it("rejects an invalid password without revealing whether the email exists", async () => {
    const { email } = await createTestUser("ADMIN");

    const wrongPassword = await request(app).post("/api/v1/auth/login").send({ email, password: "WrongPassword123!" });
    const unknownEmail = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@otcms.test", password: "WrongPassword123!" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it("locks the account after too many failed attempts", async () => {
    const { email } = await createTestUser("ADMIN");

    for (let i = 0; i < 5; i++) {
      await request(app).post("/api/v1/auth/login").send({ email, password: "WrongPassword123!" });
    }

    const res = await request(app).post("/api/v1/auth/login").send({ email, password: "TestPassword123!" });
    expect(res.status).toBe(403);
  });

  it("refreshes an access token using the refresh cookie, and rotates it", async () => {
    const { email, password } = await createTestUser("ADMIN");
    const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password });
    const cookie = loginRes.headers["set-cookie"][0];

    const refreshRes = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie)
      .set("x-otcms-csrf", "1");

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeTypeOf("string");
    expect(refreshRes.body.accessToken).not.toBe(loginRes.body.accessToken);
  });

  it("rejects requests to protected routes with no token", async () => {
    const res = await request(app).get("/api/v1/users");
    expect(res.status).toBe(401);
  });

  it("rejects requests to admin-only routes from a user without the right permission", async () => {
    const { email, password } = await createTestUser("COMMUNITY_MEMBER");
    const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password });

    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${loginRes.body.accessToken}`);

    expect(res.status).toBe(403);
  });

  it("rejects a refresh attempt missing the CSRF header, even with a valid cookie", async () => {
    const { email, password } = await createTestUser("ADMIN");
    const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password });
    const cookie = loginRes.headers["set-cookie"][0];

    const res = await request(app).post("/api/v1/auth/refresh").set("Cookie", cookie);
    expect(res.status).toBe(403);
  });

  it("logs out and invalidates the refresh token", async () => {
    const { email, password } = await createTestUser("ADMIN");
    const loginRes = await request(app).post("/api/v1/auth/login").send({ email, password });
    const cookie = loginRes.headers["set-cookie"][0];

    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie)
      .set("x-otcms-csrf", "1");
    expect(logoutRes.status).toBe(204);

    const refreshAfterLogout = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie)
      .set("x-otcms-csrf", "1");
    expect(refreshAfterLogout.status).toBe(401);
  });
});

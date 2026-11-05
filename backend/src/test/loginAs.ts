import type { Express } from "express";
import request from "supertest";

export async function loginAs(app: Express, email: string, password: string): Promise<string> {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });
  if (res.status !== 200) {
    throw new Error(`loginAs(${email}) failed with status ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body.accessToken as string;
}

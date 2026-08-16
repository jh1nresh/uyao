import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { __resetForTests } from "@/lib/kv";
import type { StoreUser } from "@/lib/store-auth";

import { handleLogin } from "./route";

const user: StoreUser = {
  userId: "user-a",
  membershipId: "membership-a",
  pharmacyId: "pharmacy-a",
  email: "owner@example.com",
  displayName: "王藥師",
  storeSlug: "A 藥局",
  storeName: "A 藥局",
  role: "owner",
};

beforeEach(() => {
  __resetForTests();
  process.env.STORE_OS_SESSION_SECRET = "test-session-secret-that-is-long-enough";
  process.env.DATABASE_URL = "postgres://test.invalid/uyao";
});

function login(body: unknown, valid = true) {
  const request = new NextRequest("http://localhost/api/store/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify(body),
  });
  return handleLogin(request, async () => valid ? user : null);
}

describe("POST /api/store/auth/login", () => {
  it("sets an HttpOnly same-site session cookie for valid credentials", async () => {
    const response = await login({
      username: "owner@example.com",
      password: "correct horse battery staple",
    });
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("uyao_store_session=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
  });

  it("rejects an invalid password without setting a cookie", async () => {
    const response = await login({ username: "owner@example.com", password: "wrong" }, false);
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("returns unavailable instead of pretending a database outage is a bad password", async () => {
    const response = await handleLogin(
      new NextRequest("http://localhost/api/store/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "owner@example.com", password: "anything" }),
      }),
      async () => { throw new Error("database down"); },
    );
    expect(response.status).toBe(503);
  });

  it("fails closed when auth is not configured", async () => {
    delete process.env.DATABASE_URL;
    const response = await login({ username: "owner@example.com", password: "anything" });
    expect(response.status).toBe(503);
  });
});

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { __resetForTests } from "@/lib/kv";
import { hashStorePassword } from "@/lib/store-auth";

import { POST } from "./route";

beforeEach(async () => {
  __resetForTests();
  process.env.STORE_OS_SESSION_SECRET = "test-session-secret-that-is-long-enough";
  process.env.STORE_OS_USERS_JSON = JSON.stringify([{
    id: "owner-a",
    username: "owner@example.com",
    displayName: "王藥師",
    storeSlug: "A 藥局",
    passwordHash: await hashStorePassword("correct horse battery staple", Buffer.alloc(16, 5)),
  }]);
});

function login(body: unknown) {
  return POST(new NextRequest("http://localhost/api/store/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify(body),
  }));
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
    const response = await login({ username: "owner@example.com", password: "wrong" });
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("fails closed when auth is not configured", async () => {
    delete process.env.STORE_OS_USERS_JSON;
    const response = await login({ username: "owner@example.com", password: "anything" });
    expect(response.status).toBe(503);
  });
});

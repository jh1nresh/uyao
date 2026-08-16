import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { __resetForTests } from "@/lib/kv";
import type { StoreIdentity } from "@/lib/store-identity";

import { handleActivate } from "./route";

const identity: StoreIdentity = {
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
  process.env.DATABASE_URL = "postgres://test.invalid/uyao";
  process.env.STORE_OS_SESSION_SECRET = "test-session-secret-that-is-long-enough";
});

function request(body: unknown) {
  return new NextRequest("http://localhost/api/store/auth/activate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/store/auth/activate", () => {
  it("rejects a malformed invite before activation", async () => {
    let called = false;
    const response = await handleActivate(request({
      token: "short",
      displayName: "王藥師",
      password: "correct horse battery staple",
    }), async () => {
      called = true;
      return identity;
    });
    expect(response.status).toBe(422);
    expect(called).toBe(false);
  });

  it("activates once and sets a tenant-bound HttpOnly session", async () => {
    const response = await handleActivate(request({
      token: "a".repeat(43),
      displayName: "王藥師",
      password: "correct horse battery staple",
    }), async () => identity);
    expect(response.status).toBe(201);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("uyao_store_session=");
    expect(cookie).toContain("HttpOnly");
  });
});

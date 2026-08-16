import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { handleCreateInvite } from "./route";

beforeEach(() => {
  process.env.DATABASE_URL = "postgres://test.invalid/uyao";
  process.env.STORE_OS_ADMIN_SECRET = "test-admin-secret-that-is-long-enough";
  process.env.STORE_OS_PUBLIC_URL = "https://store.uyaohealth.com/";
});

function request(secret = "test-admin-secret-that-is-long-enough") {
  return new NextRequest("http://localhost/api/store/admin/invites", {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      storeSlug: "A 藥局",
      pharmacyName: "A 藥局",
      email: "owner@example.com",
      role: "owner",
    }),
  });
}

describe("POST /api/store/admin/invites", () => {
  it("rejects a wrong admin secret before touching the database", async () => {
    let called = false;
    const response = await handleCreateInvite(request("wrong-secret"), async () => {
      called = true;
      return { token: "x".repeat(43), expiresAt: new Date().toISOString() };
    });
    expect(response.status).toBe(401);
    expect(called).toBe(false);
  });

  it("returns a one-time activation URL for an authorized request", async () => {
    const response = await handleCreateInvite(request(), async () => ({
      token: "a".repeat(43),
      expiresAt: "2026-08-18T00:00:00.000Z",
    }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      activationUrl: `https://store.uyaohealth.com/#invite=${"a".repeat(43)}`,
      expiresAt: "2026-08-18T00:00:00.000Z",
    });
  });
});

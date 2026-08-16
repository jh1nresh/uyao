import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { __resetForTests } from "@/lib/kv";
import { newToken, saveReservation, type StoredReservation } from "@/lib/reservations-store";
import { createStoreSessionToken, hashStorePassword, type StoreUser } from "@/lib/store-auth";

import { GET } from "./route";

const user: StoreUser = {
  id: "owner-a",
  username: "owner@example.com",
  displayName: "王藥師",
  storeSlug: "A 藥局",
};

function reservation(storeSlug: string, code: string, contact: string): StoredReservation {
  return {
    token: newToken(),
    code,
    drugSlug: "sample",
    drugName: "測試品項",
    drugSpec: "30 粒",
    storeSlug,
    storeName: storeSlug,
    storeAddress: "測試地址",
    storeMapsUrl: "#",
    storeHours: "09:00–21:00",
    storePhone: "02-0000-0000",
    priceTwd: 100,
    contactKind: "phone",
    contact,
    status: "pending_store_confirm",
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    holdHours: 4,
  };
}

beforeEach(async () => {
  __resetForTests();
  process.env.STORE_OS_SESSION_SECRET = "test-session-secret-that-is-long-enough";
  process.env.STORE_OS_USERS_JSON = JSON.stringify([{
    ...user,
    passwordHash: await hashStorePassword("correct horse battery staple", Buffer.alloc(16, 4)),
  }]);
});

function requestWithSession(token?: string) {
  return new NextRequest("http://localhost/api/store/reservations", {
    headers: token ? { cookie: `uyao_store_session=${token}` } : undefined,
  });
}

describe("GET /api/store/reservations", () => {
  it("rejects an unauthenticated request", async () => {
    expect((await GET(requestWithSession())).status).toBe(401);
  });

  it("returns only the signed-in pharmacy's orders and masks the phone", async () => {
    await saveReservation(reservation("A 藥局", "A-111", "0911222333"));
    await saveReservation(reservation("B 藥局", "B-222", "0999888777"));
    const response = await GET(requestWithSession(createStoreSessionToken(user)));
    const body = await response.json() as { reservations: Record<string, unknown>[] };

    expect(response.status).toBe(200);
    expect(body.reservations).toHaveLength(1);
    expect(body.reservations[0]).toMatchObject({ code: "A-111", contactTail: "333" });
    expect(body.reservations[0]).not.toHaveProperty("contact");
    expect(body.reservations[0]).not.toHaveProperty("token");
  });

  it("rejects a tampered tenant session", async () => {
    const token = createStoreSessionToken(user);
    expect((await GET(requestWithSession(`${token.slice(0, -1)}x`))).status).toBe(401);
  });
});

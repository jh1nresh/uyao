import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";

import { __resetForTests } from "@/lib/kv";
import { newToken, saveReservation, type StoredReservation } from "@/lib/reservations-store";
import {
  createStoreSessionToken,
  readStoreSessionToken,
  storeSessionCookieName,
  type StoreSession,
  type StoreUser,
} from "@/lib/store-auth";

import { handleGetReservations } from "./route";

const user: StoreUser = {
  userId: "user-a",
  membershipId: "membership-a",
  pharmacyId: "pharmacy-a",
  email: "owner@example.com",
  displayName: "王藥師",
  storeSlug: "A 藥局",
  role: "owner",
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

beforeEach(() => {
  __resetForTests();
  process.env.STORE_OS_SESSION_SECRET = "test-session-secret-that-is-long-enough";
});

function requestWithSession(token?: string) {
  return new NextRequest("http://localhost/api/store/reservations", {
    headers: token ? { cookie: `uyao_store_session=${token}` } : undefined,
  });
}

async function activeSession(request: NextRequest): Promise<StoreSession | null> {
  return readStoreSessionToken(request.cookies.get(storeSessionCookieName())?.value);
}

describe("GET /api/store/reservations", () => {
  it("rejects an unauthenticated request", async () => {
    expect((await handleGetReservations(requestWithSession(), activeSession)).status).toBe(401);
  });

  it("returns only the signed-in pharmacy's orders and masks the phone", async () => {
    await saveReservation(reservation("A 藥局", "A-111", "0911222333"));
    await saveReservation(reservation("B 藥局", "B-222", "0999888777"));
    const response = await handleGetReservations(
      requestWithSession(createStoreSessionToken(user)),
      activeSession,
    );
    const body = await response.json() as { reservations: Record<string, unknown>[] };

    expect(response.status).toBe(200);
    expect(body.reservations).toHaveLength(1);
    expect(body.reservations[0]).toMatchObject({ code: "A-111", contactTail: "333" });
    expect(body.reservations[0]).not.toHaveProperty("contact");
    expect(body.reservations[0]).not.toHaveProperty("token");
  });

  it("returns preview orders only to the signed-in uyao-demo sandbox", async () => {
    await saveReservation({
      ...reservation("A 藥局", "D-333", "0911222555"),
      demo: true,
    });
    const demoUser = { ...user, storeSlug: "uyao-demo" };
    const response = await handleGetReservations(
      requestWithSession(createStoreSessionToken(demoUser)),
      activeSession,
    );
    const body = await response.json() as { reservations: Record<string, unknown>[] };

    expect(response.status).toBe(200);
    expect(body.reservations).toEqual([
      expect.objectContaining({
        code: "D-333",
        demo: true,
        sourceStoreName: "A 藥局",
        contactTail: "555",
      }),
    ]);
  });

  it("rejects a tampered tenant session", async () => {
    const token = createStoreSessionToken(user);
    const [payload, signature] = token.split(".");
    const tampered = `${payload}.${signature.startsWith("a") ? "b" : "a"}${signature.slice(1)}`;
    expect((await handleGetReservations(
      requestWithSession(tampered),
      activeSession,
    )).status).toBe(401);
  });

  it("fails closed with unavailable when membership validation cannot reach the database", async () => {
    const response = await handleGetReservations(
      requestWithSession(createStoreSessionToken(user)),
      async () => { throw new Error("database down"); },
    );
    expect(response.status).toBe(503);
  });
});

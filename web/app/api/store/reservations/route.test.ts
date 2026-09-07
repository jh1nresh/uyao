import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as kv from "@/lib/kv";
import { newToken, saveReservation, type StoredReservation } from "@/lib/reservations-store";
import {
  createStoreSessionToken,
  readStoreSessionToken,
  storeSessionCookieName,
  type StoreSession,
  type StoreUser,
} from "@/lib/store-auth";

import { handleGetReservations, handleUpdateReservation } from "./route";

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
  vi.restoreAllMocks();
  kv.__resetForTests();
  process.env.STORE_OS_SESSION_SECRET = "test-session-secret-that-is-long-enough";
});

function requestWithSession(token?: string, search = "") {
  return new NextRequest(`http://localhost/api/store/reservations${search}`, {
    headers: token ? { cookie: `uyao_store_session=${token}` } : undefined,
  });
}

function actionRequest(token: string | undefined, body: object) {
  return new NextRequest("http://localhost/api/store/reservations", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(token ? { cookie: `uyao_store_session=${token}` } : {}),
    },
    body: JSON.stringify(body),
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
    await saveReservation({
      ...reservation("A 藥局", "A-111", "0911222333"),
      intake: {
        source: "shop_search",
        allergyStatus: "has_allergies",
        allergens: "青黴素",
        searchQuery: "睡不好",
        note: "最近三天比較明顯",
        consentedAt: "2026-08-16T00:00:00.000Z",
      },
    });
    await saveReservation(reservation("B 藥局", "B-222", "0999888777"));
    const response = await handleGetReservations(
      requestWithSession(createStoreSessionToken(user)),
      activeSession,
    );
    const body = await response.json() as { reservations: Record<string, unknown>[] };

    expect(response.status).toBe(200);
    expect(body.reservations).toHaveLength(1);
    expect(body.reservations[0]).toMatchObject({
      code: "A-111",
      contactTail: "333",
      intake: {
        source: "shop_search",
        allergyStatus: "has_allergies",
        allergens: "青黴素",
        searchQuery: "睡不好",
        note: "最近三天比較明顯",
      },
    });
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

  it("rejects an invalid history cursor without exposing another store's rows", async () => {
    await saveReservation({ ...reservation("B 藥局", "B-999", "0999888777"), status: "picked_up" });
    const response = await handleGetReservations(
      requestWithSession(createStoreSessionToken(user), "?historyCursor=not-a-cursor"),
      activeSession,
    );
    expect(response.status).toBe(400);
  });
});

describe("PATCH /api/store/reservations", () => {
  const dependencies = {
    readSession: activeSession,
    findByCode: async (code: string) => (await import("@/lib/reservations-store")).getByCode(code),
    transition: async (
      code: string,
      status: StoredReservation["status"],
      expectedStatus?: StoredReservation["status"],
    ) => (await import("@/lib/reservations-store")).updateStatus(code, status, expectedStatus),
    record: vi.fn(async () => undefined),
  };

  it("rejects an unauthenticated action", async () => {
    const response = await handleUpdateReservation(
      actionRequest(undefined, { code: "A-111", action: "confirm" }),
      dependencies,
    );
    expect(response.status).toBe(401);
  });

  it("rejects malformed actions before reading any reservation", async () => {
    const response = await handleUpdateReservation(
      actionRequest(createStoreSessionToken(user), { code: "../../A-111", action: "confirm" }),
      dependencies,
    );
    expect(response.status).toBe(400);
  });

  it("confirms and completes only the signed-in pharmacy's order", async () => {
    await saveReservation(reservation("A 藥局", "A-111", "0911222333"));
    const token = createStoreSessionToken(user);

    const confirmed = await handleUpdateReservation(
      actionRequest(token, { code: "A-111", action: "confirm" }),
      dependencies,
    );
    expect(confirmed.status).toBe(200);
    expect(await confirmed.json()).toMatchObject({
      reservation: { code: "A-111", status: "confirmed", contactTail: "333", holdExpiresAt: expect.any(String) },
    });

    const pickedUp = await handleUpdateReservation(
      actionRequest(token, { code: "A-111", action: "pickup" }),
      dependencies,
    );
    expect(pickedUp.status).toBe(200);
    expect(await pickedUp.json()).toMatchObject({
      reservation: { code: "A-111", status: "picked_up" },
    });
  });

  it("returns the persisted update without an inbox reread dependency", async () => {
    await saveReservation({
      ...reservation("A 藥局", "A-121", "0911222333"),
      intake: {
        source: "shop_search",
        allergyStatus: "none",
        consentedAt: "2026-09-08T00:00:00.000Z",
      },
    });
    const response = await handleUpdateReservation(
      actionRequest(createStoreSessionToken(user), { code: "A-121", action: "confirm" }),
      dependencies,
    );
    expect(response.status).toBe(200);
    const body = await response.json() as { reservation: Record<string, unknown> };
    expect(body).toMatchObject({
      reservation: { code: "A-121", status: "confirmed", contactTail: "333" },
    });
    expect(body.reservation).not.toHaveProperty("contact");
    expect(body.reservation).not.toHaveProperty("token");
    expect(body.reservation.intake).not.toHaveProperty("consentedAt");
  });

  it("does not commit a terminal transition when its atomic record/history write fails", async () => {
    await saveReservation(reservation("A 藥局", "A-131", "0911222333"));
    vi.spyOn(kv, "setAndUpdateHistory").mockRejectedValueOnce(new Error("history unavailable"));

    const response = await handleUpdateReservation(
      actionRequest(createStoreSessionToken(user), { code: "A-131", action: "reject" }),
      dependencies,
    );
    expect(response.status).toBe(409);
    await expect((await import("@/lib/reservations-store")).getByCode("A-131")).resolves.toMatchObject({
      status: "pending_store_confirm",
    });
  });

  it("returns the committed terminal summary when active-index cleanup fails", async () => {
    await saveReservation(reservation("A 藥局", "A-141", "0911222333"));
    vi.spyOn(kv, "removeFromList").mockRejectedValueOnce(new Error("cleanup unavailable"));

    const response = await handleUpdateReservation(
      actionRequest(createStoreSessionToken(user), { code: "A-141", action: "reject" }),
      dependencies,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      reservation: { code: "A-141", status: "rejected_no_stock", contactTail: "333" },
    });
  });

  it("does not reveal or mutate another pharmacy's order", async () => {
    await saveReservation(reservation("B 藥局", "B-222", "0999888777"));
    const response = await handleUpdateReservation(
      actionRequest(createStoreSessionToken(user), { code: "B-222", action: "confirm" }),
      dependencies,
    );
    expect(response.status).toBe(404);
    expect((await import("@/lib/reservations-store")).getByCode("B-222")).resolves.toMatchObject({
      status: "pending_store_confirm",
    });
  });

  it("rejects an invalid status transition", async () => {
    await saveReservation({
      ...reservation("A 藥局", "A-333", "0911222333"),
      status: "rejected_no_stock",
    });
    const response = await handleUpdateReservation(
      actionRequest(createStoreSessionToken(user), { code: "A-333", action: "confirm" }),
      dependencies,
    );
    expect(response.status).toBe(409);
  });

  it("lets the demo account update demo orders without crossing into real inboxes", async () => {
    await saveReservation({
      ...reservation("uyao-demo", "D-444", "0911222444"),
      demo: true,
    });
    const demoUser = { ...user, storeSlug: "uyao-demo" };
    const response = await handleUpdateReservation(
      actionRequest(createStoreSessionToken(demoUser), { code: "D-444", action: "reject" }),
      dependencies,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      reservation: { code: "D-444", status: "rejected_no_stock", demo: true },
    });
  });

  it("does not let the demo account mutate a real pharmacy order", async () => {
    await saveReservation(reservation("A 藥局", "A-555", "0911222555"));
    const demoUser = { ...user, storeSlug: "uyao-demo" };
    const response = await handleUpdateReservation(
      actionRequest(createStoreSessionToken(demoUser), { code: "A-555", action: "confirm" }),
      dependencies,
    );
    expect(response.status).toBe(404);
    expect((await import("@/lib/reservations-store")).getByCode("A-555")).resolves.toMatchObject({
      status: "pending_store_confirm",
    });
  });
});

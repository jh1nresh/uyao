import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  active: [] as Array<Record<string, unknown>>,
  bumpNoShow: vi.fn(async () => 1),
  logConsole: vi.fn(),
  sendStorePush: vi.fn(async () => ({ status: "sent", sent: 1, failed: 0, removed: 0 })),
  save: vi.fn(async () => undefined),
}));

vi.mock("@/lib/box", () => ({ logConsole: mocks.logConsole }));
vi.mock("@/lib/store-push", () => ({ sendStorePush: mocks.sendStorePush }));
vi.mock("@/lib/reservations-store", () => ({
  EXPIRE_UNANSWERED_AFTER_HOURS: 12,
  REMIND_STORE_AFTER_MIN: 15,
  allActive: vi.fn(async () => mocks.active),
  bumpNoShow: mocks.bumpNoShow,
  isExpired: vi.fn((reservation: { code: string }) => reservation.code.startsWith("E-")),
  minutesSince: vi.fn(() => 20),
  save: mocks.save,
}));

import { GET } from "./route";

function reservation(code: string, demo: boolean) {
  return {
    token: `token-${code}`,
    code,
    drugSlug: "test-drug",
    drugName: "測試商品",
    drugSpec: "30 錠",
    storeSlug: "建利西藥房",
    storeName: "建利西藥房",
    storeAddress: "測試地址",
    storeMapsUrl: "https://maps.example.com",
    storeHours: "09:00–21:00",
    storePhone: "02-0000-0000",
    priceTwd: 100,
    contactKind: "phone" as const,
    contact: "0912345678",
    status: "pending_store_confirm" as const,
    createdAt: "2026-08-15T00:00:00.000Z",
    confirmedAt: null,
    holdHours: 4,
    ...(demo ? { demo: true as const } : {}),
  };
}

function cronRequest() {
  return new Request("http://localhost/api/cron/reminders", {
    headers: { "x-vercel-cron": "1" },
  });
}

beforeEach(() => {
  mocks.active = [];
  vi.clearAllMocks();
});

describe("reservation reminder cron Store OS delivery", () => {
  it("updates sandbox expiry and keeps the notification inside the demo store", async () => {
    mocks.active = [reservation("P-001", true), reservation("E-002", true)];

    const response = await GET(cronRequest());

    expect(response.status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      code: "E-002",
      demo: true,
      status: "expired",
    }));
    expect(mocks.sendStorePush).toHaveBeenCalledWith(
      "uyao-demo",
      expect.objectContaining({ tag: "reservation-E-002" }),
    );
    expect(mocks.bumpNoShow).not.toHaveBeenCalled();
  });

  it("sends one Web Push reminder for a real reservation and records the receipt", async () => {
    mocks.active = [reservation("P-003", false)];

    const response = await GET(cronRequest());

    expect(response.status).toBe(200);
    expect(mocks.sendStorePush).toHaveBeenCalledWith(
      "建利西藥房",
      expect.objectContaining({ tag: "reservation-P-003" }),
    );
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      code: "P-003",
      remindedAt: expect.any(String),
    }));
  });

  it("does not mark a reminder delivered when the store has no subscribed device", async () => {
    mocks.active = [reservation("P-004", false)];
    mocks.sendStorePush.mockResolvedValueOnce({ status: "no_subscriptions", sent: 0, failed: 0, removed: 0 });

    const response = await GET(cronRequest());

    expect(response.status).toBe(200);
    expect(mocks.save).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ unsubscribed: 1, reminded: 0 });
  });
});

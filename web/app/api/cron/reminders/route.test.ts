import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  active: [] as Array<Record<string, unknown>>,
  bumpNoShow: vi.fn(async () => 1),
  logConsole: vi.fn(),
  push: vi.fn(async () => undefined),
  save: vi.fn(async () => undefined),
  userForStore: vi.fn(async () => "line-user"),
}));

vi.mock("@/lib/bindings", () => ({ userForStore: mocks.userForStore }));
vi.mock("@/lib/box", () => ({ logConsole: mocks.logConsole }));
vi.mock("@/lib/line", () => ({
  isConfigured: () => true,
  push: mocks.push,
  text: vi.fn((value: string) => ({ type: "text", text: value })),
}));
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

describe("reservation reminder cron demo isolation", () => {
  it("updates sandbox expiry without resolving a pharmacy binding or sending LINE", async () => {
    mocks.active = [reservation("P-001", true), reservation("E-002", true)];

    const response = await GET(cronRequest());

    expect(response.status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      code: "E-002",
      demo: true,
      status: "expired",
    }));
    expect(mocks.userForStore).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.bumpNoShow).not.toHaveBeenCalled();
  });

  it("keeps the existing reminder path for a real reservation", async () => {
    mocks.active = [reservation("P-003", false)];

    const response = await GET(cronRequest());

    expect(response.status).toBe(200);
    expect(mocks.userForStore).toHaveBeenCalledWith("建利西藥房");
    expect(mocks.push).toHaveBeenCalledOnce();
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({
      code: "P-003",
      remindedAt: expect.any(String),
    }));
  });
});

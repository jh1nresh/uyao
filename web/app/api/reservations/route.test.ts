import { beforeEach, describe, expect, it, vi } from "vitest";

import * as data from "@/lib/data";
import { allDrugs, allStores, getStore, previewOffers } from "@/lib/data";
import { PARTNER_PHARMACIES, partnersForProduct } from "@/lib/partners";
import { __resetForTests } from "@/lib/kv";
import * as reservationStore from "@/lib/reservations-store";
import { stockBadge } from "@/lib/stock";
import { STORE_DEMO_STORE } from "@/lib/store-demo";

const mocks = vi.hoisted(() => ({
  // 帶上簽章，否則 mock.calls 推成 []，測試裡取不到寫進去的那筆紀錄。
  appendRecord: vi.fn(async (_kind: string, _record: Record<string, unknown>) => undefined),
  logConsole: vi.fn(),
  sendStorePush: vi.fn(async () => ({ status: "sent", sent: 1, failed: 0, removed: 0 })),
}));

vi.mock("@/lib/record", () => ({ appendRecord: mocks.appendRecord }));
vi.mock("@/lib/box", () => ({ logConsole: mocks.logConsole }));
vi.mock("@/lib/store-push", () => ({ sendStorePush: mocks.sendStorePush }));

import { DELETE, POST } from "./route";

beforeEach(() => {
  __resetForTests();
  vi.clearAllMocks();
});

describe("Store OS reservation delivery", () => {
  it("routes a preview reservation to uyao-demo without touching a real pharmacy inbox", async () => {
    const store = STORE_DEMO_STORE;
    const offer = previewOffers(store.slug)[0];

    const response = await POST(new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.20",
      },
      body: JSON.stringify({
        drugSlug: offer.drugSlug,
        storeSlug: store.slug,
        contact: "0912345678",
        demo: true,
        intake: {
          searchQuery: "睡不好",
          note: "最近三天比較明顯，希望藥師協助判斷",
          consent: true,
        },
      }),
    }));
    const body = await response.json() as { code: string; token: string };

    expect(response.status).toBe(200);
    expect(mocks.sendStorePush).toHaveBeenCalledWith(
      "uyao-demo",
      expect.objectContaining({ tag: `reservation-${body.code}` }),
    );

    const sandbox = await reservationStore.listStoreReservations("uyao-demo");
    expect(sandbox).toEqual([
      expect.objectContaining({
        code: body.code,
        demo: true,
        sourceStoreName: store.name,
        contactTail: "678",
        intake: {
          source: "shop_search",
          searchQuery: "睡不好",
          note: "最近三天比較明顯，希望藥師協助判斷",
        },
      }),
    ]);
    expect(mocks.appendRecord).toHaveBeenCalledWith(
      "reservations",
      expect.not.objectContaining({ intake: expect.anything() }),
    );
    expect(await reservationStore.getByToken(body.token)).toMatchObject({
      intake: {
        source: "shop_search",
        searchQuery: "睡不好",
        note: "最近三天比較明顯，希望藥師協助判斷",
      },
    });
    expect(await reservationStore.listStoreReservations(allStores()[0].slug)).toEqual([]);

    const cancelled = await DELETE(new Request("http://localhost/api/reservations", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: body.token }),
    }));
    expect(cancelled.status).toBe(200);
    expect(mocks.sendStorePush).toHaveBeenCalledWith(
      "uyao-demo",
      expect.objectContaining({ title: expect.stringContaining("取消") }),
    );
  });

  it("fails closed when the sandbox cannot persist the demo order", async () => {
    const store = STORE_DEMO_STORE;
    const offer = previewOffers(store.slug)[0];
    vi.spyOn(reservationStore, "saveReservation").mockRejectedValueOnce(new Error("KV down"));

    const response = await POST(new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.21",
      },
      body: JSON.stringify({
        drugSlug: offer.drugSlug,
        storeSlug: store.slug,
        contact: "0912345678",
        demo: true,
      }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "示範預留未送達，請再試一次" });
    expect(mocks.sendStorePush).not.toHaveBeenCalled();
    expect(mocks.appendRecord).not.toHaveBeenCalled();
  });

  it("fails closed when a real pharmacy reservation cannot reach Store OS", async () => {
    const store = allStores()[0];
    const offer = previewOffers(store.slug)[0];
    vi.spyOn(data, "storesForDrug").mockReturnValueOnce([{
      store,
      priceTwd: offer.priceTwd,
      daysSinceScan: offer.daysSinceScan,
      badge: stockBadge(offer.daysSinceScan),
    }]);
    vi.spyOn(reservationStore, "saveReservation").mockRejectedValueOnce(new Error("KV down"));

    const response = await POST(new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.24",
      },
      body: JSON.stringify({
        drugSlug: offer.drugSlug,
        storeSlug: store.slug,
        contact: "0912345678",
      }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "預留未送達藥局，請再試一次" });
    expect(mocks.sendStorePush).not.toHaveBeenCalled();
    expect(mocks.appendRecord).not.toHaveBeenCalled();
  });

  // 沒有任何一家藥局裝盒子，所以 OFFERS 是空的。合作藥局自己確認販售的品項
  // 必須收得下預留，否則整站一筆都送不出去 —— 但那是一次請求，不是有貨保證，
  // 所以價格留 null、庫存標示是 unknown。
  it("accepts a reservation for a partner-confirmed item with no scan offer", async () => {
    const partner = PARTNER_PHARMACIES.建利西藥房;
    const store = getStore(partner.storeSlug)!;
    const confirmed: readonly string[] = partner.confirmedProducts;
    const drug = allDrugs().find((d) =>
      confirmed.includes(d.spec === "規格待確認" ? d.name : `${d.name} ${d.spec}`),
    )!;
    // 這一支刻意不 mock storesForDrug：真實情況就是查不到任何 offer。
    expect(data.storesForDrug(drug.slug)).toEqual([]);

    const response = await POST(new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.31",
      },
      body: JSON.stringify({
        drugSlug: drug.slug,
        storeSlug: store.slug,
        contact: "0912345678",
      }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ priceTwd: null });
    expect(mocks.sendStorePush).toHaveBeenCalledTimes(1);
    const [, record] = mocks.appendRecord.mock.calls[0]!;
    expect(record).toMatchObject({ priceTwd: null, stockTier: "unknown", storeSlug: store.slug });
  });

  it("still rejects a pharmacy that never confirmed carrying the item", async () => {
    const partner = PARTNER_PHARMACIES.建利西藥房;
    const confirmed: readonly string[] = partner.confirmedProducts;
    const drug = allDrugs().find((d) =>
      confirmed.includes(d.spec === "規格待確認" ? d.name : `${d.name} ${d.spec}`),
    )!;
    // 同一區、但沒有把這支列進 confirmedProducts 的店。
    const outsider = allStores().find(
      (s) => !partnersForProduct(
        drug.spec === "規格待確認" ? drug.name : `${drug.name} ${drug.spec}`,
      ).some((p) => p.storeSlug === s.slug),
    )!;

    const response = await POST(new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.32",
      },
      body: JSON.stringify({
        drugSlug: drug.slug,
        storeSlug: outsider.slug,
        contact: "0912345678",
      }),
    }));

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: "這家藥局沒有這個品項" });
    expect(mocks.sendStorePush).not.toHaveBeenCalled();
  });

  it("rejects health context without explicit consent before creating an order", async () => {
    const store = STORE_DEMO_STORE;
    const offer = previewOffers(store.slug)[0];
    const response = await POST(new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.23",
      },
      body: JSON.stringify({
        drugSlug: offer.drugSlug,
        storeSlug: store.slug,
        contact: "0912345678",
        demo: true,
        intake: { searchQuery: "睡不好" },
      }),
    }));

    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining("同意") });
    expect(await reservationStore.listStoreReservations("uyao-demo")).toEqual([]);
    expect(mocks.appendRecord).not.toHaveBeenCalled();
  });

  it("rejects demo mode for a real pharmacy identity", async () => {
    const realStore = allStores()[0];
    const offer = previewOffers(realStore.slug)[0];

    const response = await POST(new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.22",
      },
      body: JSON.stringify({
        drugSlug: offer.drugSlug,
        storeSlug: realStore.slug,
        contact: "0912345678",
        demo: true,
      }),
    }));

    expect(response.status).toBe(404);
    expect(await reservationStore.listStoreReservations("uyao-demo")).toEqual([]);
    expect(mocks.sendStorePush).not.toHaveBeenCalled();
  });
});

describe("預留的廣告歸因", () => {
  function reserve(source: unknown, ip: string) {
    const store = STORE_DEMO_STORE;
    const offer = previewOffers(store.slug)[0];
    return POST(new Request("http://localhost/api/reservations", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({
        drugSlug: offer.drugSlug,
        storeSlug: store.slug,
        contact: "0912345678",
        demo: true,
        ...(source === undefined ? {} : { source }),
      }),
    }));
  }

  it("預留紀錄記得住是哪則廣告帶來的", async () => {
    const response = await reserve(
      { utm_source: "ig", utm_medium: "paid_social", utm_campaign: "datong_w3", fbclid: "FB1" },
      "127.0.2.1",
    );

    expect(response.status).toBe(200);
    const [, record] = mocks.appendRecord.mock.calls[0];
    expect(record.source).toEqual({
      utm_source: "ig",
      utm_medium: "paid_social",
      utm_campaign: "datong_w3",
      fbclid: "FB1",
    });
  });

  it("歸因不進 Store OS —— 藥師不需要知道客人是哪則廣告來的", async () => {
    await reserve({ utm_source: "ig", utm_campaign: "datong_w3" }, "127.0.2.2");

    const stored = await reservationStore.listStoreReservations("uyao-demo");
    expect(stored).toHaveLength(1);
    expect(stored[0]).not.toHaveProperty("source");
  });

  it("白名單之外的欄位不准跟著預留落地", async () => {
    await reserve({ utm_source: "ig", contact: "0900000000", intake: "偷渡的症狀描述" }, "127.0.2.3");

    const [, record] = mocks.appendRecord.mock.calls[0];
    expect(record.source).toEqual({ utm_source: "ig" });
    expect(record.contact).toBe("0912345678");
  });

  it("沒有歸因時不留空欄位", async () => {
    await reserve(undefined, "127.0.2.4");

    const [, record] = mocks.appendRecord.mock.calls[0];
    expect(record).not.toHaveProperty("source");
  });
});

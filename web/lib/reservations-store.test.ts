import { beforeEach, describe, expect, it } from "vitest";

import { __resetForTests } from "./kv";
import {
  EXPIRE_UNANSWERED_AFTER_HOURS,
  NO_SHOW_LIMIT,
  type StoredReservation,
  bumpNoShow,
  contactTail,
  getByCode,
  getByToken,
  isExpired,
  listStoreReservations,
  newToken,
  noShowCount,
  reserveUniqueCode,
  saveReservation,
  updateStatus,
} from "./reservations-store";

const H = 3600_000;

function make(over: Partial<StoredReservation> = {}): StoredReservation {
  return {
    token: newToken(),
    code: "A-001",
    drugSlug: "hugu-gaishu-100",
    drugName: "護谷鈣素",
    drugSpec: "100粒",
    storeSlug: "中山藥局",
    storeName: "中山藥局",
    storeAddress: "林森北路128號",
    storeMapsUrl: "#",
    storeHours: "10:00–23:00",
    storePhone: "02-2523-6979",
    priceTwd: 65,
    contactKind: "phone",
    contact: "0912345678",
    status: "pending_store_confirm",
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    holdHours: 4,
    ...over,
  };
}

beforeEach(() => __resetForTests());

describe("取貨憑證的鍵", () => {
  it("token 夠長到不能猜 —— 取貨碼只有 26,000 組，不能拿來當網址", () => {
    expect(newToken().length).toBeGreaterThanOrEqual(16);
    expect(new Set(Array.from({ length: 200 }, newToken)).size).toBe(200);
  });

  it("取貨碼撞到就重抽，絕不覆寫別人的索引", async () => {
    await saveReservation(make({ code: "Z-999" }));
    expect(await reserveUniqueCode(() => "Z-999")).toBeNull();
    expect(await reserveUniqueCode(() => "Q-123")).toBe("Q-123");
  });

  it("token 與取貨碼查到的是同一筆", async () => {
    const r = make({ code: "B-222" });
    await saveReservation(r);
    expect((await getByToken(r.token))?.code).toBe("B-222");
    expect((await getByCode("B-222"))?.token).toBe(r.token);
  });

  it("到店只給尾三碼，頁面上不重印完整號碼", () => {
    expect(contactTail({ contact: "0912345678" })).toBe("678");
  });

  it("門市 inbox 只回自己的單，而且不洩漏完整手機或 consumer token", async () => {
    await saveReservation(make({
      code: "A-111",
      storeSlug: "A 藥局",
      contact: "0911222333",
      intake: {
        source: "shop_search",
        searchQuery: "睡不好",
        note: "請藥師協助判斷",
        consentedAt: "2026-08-16T00:00:00.000Z",
      },
    }));
    await saveReservation(make({ code: "B-222", storeSlug: "B 藥局", contact: "0999888777" }));
    const rows = await listStoreReservations("A 藥局");

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      code: "A-111",
      contactTail: "333",
      intake: {
        source: "shop_search",
        searchQuery: "睡不好",
        note: "請藥師協助判斷",
      },
    });
    expect(rows[0]).not.toHaveProperty("contact");
    expect(rows[0]).not.toHaveProperty("token");
    expect(rows[0].intake).not.toHaveProperty("consentedAt");
  });

  it("正式 inbox 不混入 preview demo 單", async () => {
    await saveReservation(make({ code: "D-111", storeSlug: "A 藥局", demo: true }));
    expect(await listStoreReservations("A 藥局")).toEqual([]);
  });

  it("preview demo 單只進 uyao-demo sandbox，並保留來源店但不洩漏聯絡資料", async () => {
    await saveReservation(make({
      code: "D-222",
      storeSlug: "A 藥局",
      storeName: "A 藥局",
      contact: "0911222444",
      demo: true,
      intake: {
        source: "reservation_note",
        note: "希望現場詢問藥師",
        consentedAt: "2026-08-16T00:00:00.000Z",
      },
    }));
    await saveReservation(make({ code: "R-333", storeSlug: "uyao-demo" }));

    const rows = await listStoreReservations("uyao-demo");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      code: "D-222",
      contactTail: "444",
      demo: true,
      sourceStoreName: "A 藥局",
      intake: {
        source: "reservation_note",
        note: "希望現場詢問藥師",
      },
    });
    expect(rows[0]).not.toHaveProperty("contact");
    expect(rows[0]).not.toHaveProperty("token");
  });
});

describe("逾期：兩種情況責任不同", () => {
  it("已確認超過保留時數 → 逾期（商品真的從架上拿下來過）", () => {
    const t = new Date(Date.now() - 5 * H).toISOString();
    expect(isExpired(make({ status: "confirmed", confirmedAt: t, createdAt: t }))).toBe(true);
  });

  it("已確認但還在保留時數內 → 不逾期", () => {
    const t = new Date(Date.now() - 2 * H).toISOString();
    expect(isExpired(make({ status: "confirmed", confirmedAt: t, createdAt: t }))).toBe(false);
  });

  it("藥局從沒回覆的窗口比保留時數寬 —— 他可能隔天早上才看到", () => {
    const short = new Date(Date.now() - 5 * H).toISOString();
    const long = new Date(Date.now() - (EXPIRE_UNANSWERED_AFTER_HOURS + 1) * H).toISOString();
    expect(isExpired(make({ createdAt: short }))).toBe(false);
    expect(isExpired(make({ createdAt: long }))).toBe(true);
  });

  it("終態不會再被判逾期", () => {
    for (const status of ["cancelled_by_user", "rejected_no_stock", "expired"] as const) {
      expect(isExpired(make({ status, createdAt: new Date(0).toISOString() }))).toBe(false);
    }
  });
});

describe("放鳥計數", () => {
  it("累積到上限就該擋下新預留", async () => {
    const phone = "0955000111";
    expect(await noShowCount(phone)).toBe(0);
    for (let i = 0; i < NO_SHOW_LIMIT; i += 1) await bumpNoShow(phone);
    expect(await noShowCount(phone)).toBeGreaterThanOrEqual(NO_SHOW_LIMIT);
  });

  it("不同號碼互不影響", async () => {
    await bumpNoShow("0900000001");
    expect(await noShowCount("0900000002")).toBe(0);
  });
});

describe("狀態流轉", () => {
  it("確認時記下時間，其他狀態不動它", async () => {
    const r = make({ code: "C-001" });
    await saveReservation(r);
    expect((await updateStatus("C-001", "confirmed"))?.confirmedAt).toBeTruthy();
    expect((await updateStatus("C-001", "cancelled_by_user"))?.confirmedAt).toBeTruthy();
  });

  it("查不到的取貨碼回 null，不要憑空造一筆", async () => {
    expect(await updateStatus("X-000", "confirmed")).toBeNull();
  });

  it("狀態已被別人更新時不覆寫新狀態", async () => {
    const r = make({ code: "C-002", status: "confirmed" });
    await saveReservation(r);
    expect(await updateStatus("C-002", "rejected_no_stock", "pending_store_confirm")).toBeNull();
    expect(await getByCode("C-002")).toMatchObject({ status: "confirmed" });
  });
});

describe("已交付", () => {
  it("成功取貨的單不會被判逾期 —— 少了這條，每一筆成功交易都會推假的逾期通知", () => {
    const old = new Date(Date.now() - 99 * H).toISOString();
    expect(
      isExpired(make({ status: "picked_up", confirmedAt: old, createdAt: old })),
    ).toBe(false);
  });

  it("記下交付時間，而且不動原本的確認時間", async () => {
    const r = make({ code: "P-001" });
    await saveReservation(r);
    await updateStatus("P-001", "confirmed");
    const done = await updateStatus("P-001", "picked_up");
    expect(done?.pickedUpAt).toBeTruthy();
    expect(done?.confirmedAt).toBeTruthy();
    expect(done?.status).toBe("picked_up");
  });
});

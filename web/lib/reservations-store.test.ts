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
    drugSlug: "green-oil",
    drugName: "綠油精",
    drugSpec: "10ml",
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
});

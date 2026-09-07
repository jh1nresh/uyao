import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as kv from "./kv";
import {
  EXPIRE_UNANSWERED_AFTER_HOURS,
  InvalidHistoryCursorError,
  NO_SHOW_LIMIT,
  TRANSITION_LOCK_TTL_SECONDS,
  type StoredReservation,
  bumpNoShow,
  contactTail,
  getByCode,
  getByToken,
  isExpired,
  listStoreReservationPage,
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

function legacyHistoryKey(storeSlug: string): string {
  return `store-reservations:${Buffer.from(storeSlug, "utf8").toString("base64url")}`;
}

async function seedLegacyReservation(r: StoredReservation, historyKey = legacyHistoryKey(r.storeSlug)): Promise<void> {
  await kv.set(`r:${r.token}`, JSON.stringify(r));
  await kv.set(`c:${r.code}`, r.token);
  await kv.append(historyKey, r.token, 500);
}

beforeEach(() => kv.__resetForTests());
afterEach(() => vi.restoreAllMocks());

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
        allergyStatus: "has_allergies",
        allergens: "青黴素",
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
        allergyStatus: "has_allergies",
        allergens: "青黴素",
        searchQuery: "睡不好",
        note: "請藥師協助判斷",
      },
    });
    expect(rows[0]).not.toHaveProperty("contact");
    expect(rows[0]).not.toHaveProperty("token");
    expect(rows[0].intake).not.toHaveProperty("consentedAt");
  });

  it("門市 inbox 把最新建立的預留放在最上面", async () => {
    await saveReservation(make({ code: "A-101", storeSlug: "A 藥局" }));
    await saveReservation(make({ code: "A-202", storeSlug: "A 藥局" }));

    const rows = await listStoreReservations("A 藥局");
    expect(rows.map((row) => row.code)).toEqual(["A-202", "A-101"]);
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
        allergyStatus: "none",
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
        allergyStatus: "none",
        note: "希望現場詢問藥師",
      },
    });
    expect(rows[0]).not.toHaveProperty("contact");
    expect(rows[0]).not.toHaveProperty("token");
  });

  it("active 單不會被 500 筆歷史截斷，歷史以固定 50 筆分頁", async () => {
    for (let index = 0; index < 501; index += 1) {
      await saveReservation(make({ code: `P-${String(index).padStart(3, "0")}` }));
    }
    for (let index = 0; index < 550; index += 1) {
      await saveReservation(make({
        code: `H-${String(index).padStart(3, "0")}`,
        status: "picked_up",
      }));
    }

    const first = await listStoreReservationPage("中山藥局");
    expect(first.reservations).toHaveLength(551);
    expect(first.reservations.filter((row) => row.status === "pending_store_confirm")).toHaveLength(501);
    expect(first.reservations).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "P-000" }),
      expect.objectContaining({ code: "P-500" }),
      expect.objectContaining({ code: "H-549" }),
      expect.objectContaining({ code: "H-500" }),
    ]));
    expect(first.nextHistoryCursor).toBeTruthy();

    const second = await listStoreReservationPage("中山藥局", first.nextHistoryCursor);
    expect(second.reservations).toHaveLength(50);
    expect(second.reservations).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "H-499" }),
      expect.objectContaining({ code: "H-450" }),
    ]));
    expect(second.reservations.some((row) => row.status === "pending_store_confirm")).toBe(false);
  });

  it("history cursor anchors after its last row when newer entries trim the retained window", async () => {
    for (let index = 0; index < 510; index += 1) {
      await saveReservation(make({ code: `H-${String(index).padStart(3, "0")}`, status: "picked_up" }));
    }
    const first = await listStoreReservationPage("中山藥局");
    await saveReservation(make({ code: "H-510", status: "picked_up" }));

    const second = await listStoreReservationPage("中山藥局", first.nextHistoryCursor);
    expect(second.reservations).toHaveLength(50);
    expect(second.reservations[0]).toMatchObject({ code: "H-459" });
    expect(second.reservations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "H-510" }),
    ]));
  });

  it("keeps an in-flight active token indexed but invisible until creation commits", async () => {
    const originalAppend = kv.append;
    const cleanup = vi.spyOn(kv, "removeFromList");
    let duringSetup: Awaited<ReturnType<typeof listStoreReservationPage>> | undefined;
    vi.spyOn(kv, "append").mockImplementation(async (key, value, keepLast) => {
      await originalAppend(key, value, keepLast);
      if (keepLast === null) duringSetup = await listStoreReservationPage("中山藥局");
    });

    await saveReservation(make({ code: "P-010" }));
    expect(duringSetup?.reservations).toEqual([]);
    expect(cleanup).not.toHaveBeenCalled();

    for (let index = 0; index < 550; index += 1) {
      await saveReservation(make({ code: `H-${String(index).padStart(3, "0")}`, status: "picked_up" }));
    }
    const rows = await listStoreReservations("中山藥局");
    expect(rows).toEqual(expect.arrayContaining([expect.objectContaining({ code: "P-010" })]));
  });

  it("keeps a failed reservation creation invisible to API readers", async () => {
    const originalAppend = kv.append;
    const r = make({ code: "P-020" });
    vi.spyOn(kv, "append").mockImplementation(async (key, value, keepLast) => {
      if (keepLast === null) throw new Error("active index unavailable");
      await originalAppend(key, value, keepLast);
    });

    await expect(saveReservation(r)).rejects.toThrow("active index unavailable");
    await expect(getByToken(r.token)).resolves.toBeNull();
    await expect(listStoreReservations("中山藥局")).resolves.toEqual([]);
  });

  it("propagates a batch-read failure without treating active tokens as stale", async () => {
    await saveReservation(make({ code: "P-001" }));
    const cleanup = vi.spyOn(kv, "removeFromList");
    vi.spyOn(kv, "getMany").mockRejectedValueOnce(new Error("KV MGET returned an invalid result"));

    await expect(listStoreReservationPage("中山藥局")).rejects.toThrow("KV MGET returned an invalid result");
    expect(cleanup).not.toHaveBeenCalled();
  });

  it("promotes an observed legacy active record before history eviction", async () => {
    const r = make({ code: "P-030" });
    const historyKey = `store-reservations:${Buffer.from(r.storeSlug, "utf8").toString("base64url")}`;
    await kv.set(`r:${r.token}`, JSON.stringify(r));
    await kv.set(`c:${r.code}`, r.token);
    await kv.append(historyKey, r.token, 500);

    await expect(listStoreReservations(r.storeSlug)).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: r.code }),
    ]));
    await expect(kv.listAll(`${historyKey}:active`)).resolves.toEqual([r.token]);

    for (let index = 0; index < 550; index += 1) {
      await saveReservation(make({ code: `H-${String(index).padStart(3, "0")}`, status: "picked_up" }));
    }
    await expect(listStoreReservations(r.storeSlug)).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: r.code, status: "pending_store_confirm" }),
    ]));
  });

  it("bootstraps a full legacy history before the first new row can evict its oldest active record", async () => {
    const legacy = make({ code: "P-050" });
    const historyKey = legacyHistoryKey(legacy.storeSlug);
    await seedLegacyReservation(legacy, historyKey);
    for (let index = 0; index < 499; index += 1) {
      await seedLegacyReservation(make({ code: `H-${String(index).padStart(3, "0")}`, status: "picked_up" }), historyKey);
    }

    await saveReservation(make({ code: "N-050", status: "picked_up" }));
    await expect(listStoreReservations(legacy.storeSlug)).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: legacy.code, status: "pending_store_confirm" }),
    ]));
  });

  it("fails bootstrap before trimming history or creating a visible reservation", async () => {
    const legacy = make({ code: "P-060" });
    const historyKey = legacyHistoryKey(legacy.storeSlug);
    await seedLegacyReservation(legacy, historyKey);
    for (let index = 0; index < 499; index += 1) {
      await seedLegacyReservation(make({ code: `H-${String(index).padStart(3, "0")}`, status: "picked_up" }), historyKey);
    }
    const before = await kv.lastN(historyKey, 500);
    const created = make({ code: "N-060" });
    vi.spyOn(kv, "append").mockRejectedValueOnce(new Error("bootstrap promotion unavailable"));

    await expect(saveReservation(created)).rejects.toThrow("bootstrap promotion unavailable");
    await expect(kv.lastN(historyKey, 500)).resolves.toEqual(before);
    await expect(getByToken(created.token)).resolves.toBeNull();
  });

  it("denies a concurrent first writer until bootstrap finishes, without trimming ahead", async () => {
    const legacy = make({ code: "P-070" });
    const historyKey = legacyHistoryKey(legacy.storeSlug);
    const activeKey = `${historyKey}:active`;
    await seedLegacyReservation(legacy, historyKey);
    for (let index = 0; index < 499; index += 1) {
      await seedLegacyReservation(make({ code: `H-${String(index).padStart(3, "0")}`, status: "picked_up" }), historyKey);
    }
    const before = await kv.lastN(historyKey, 500);
    let enteredPromotion!: () => void;
    let releasePromotion!: () => void;
    const promotionEntered = new Promise<void>((resolve) => { enteredPromotion = resolve; });
    const release = new Promise<void>((resolve) => { releasePromotion = resolve; });
    const originalAppend = kv.append;
    vi.spyOn(kv, "append").mockImplementation(async (key, value, keepLast) => {
      if (key === activeKey && value === legacy.token && keepLast === null) {
        enteredPromotion();
        await release;
      }
      await originalAppend(key, value, keepLast);
    });

    const first = saveReservation(make({ code: "N-070", status: "picked_up" }));
    await promotionEntered;
    await expect(saveReservation(make({ code: "N-071", status: "picked_up" }))).rejects.toThrow(
      "active index bootstrap in progress",
    );
    await expect(kv.lastN(historyKey, 500)).resolves.toEqual(before);
    releasePromotion();
    await first;
  });

  it("bootstraps only ready active records for the current store, excluding other tenants and demo", async () => {
    const store = "中山藥局";
    const historyKey = legacyHistoryKey(store);
    const current = make({ code: "P-080", storeSlug: store });
    const otherStore = make({ code: "P-081", storeSlug: "另一間藥局" });
    const demo = make({ code: "P-082", storeSlug: store, demo: true });
    await seedLegacyReservation(current, historyKey);
    await seedLegacyReservation(otherStore, historyKey);
    await seedLegacyReservation(demo, historyKey);

    await saveReservation(make({ code: "N-080", storeSlug: store, status: "picked_up" }));
    await expect(kv.listAll(`${historyKey}:active`)).resolves.toEqual([current.token]);
  });

  it("fails the page when a legacy active pointer cannot be promoted", async () => {
    const r = make({ code: "P-040" });
    const historyKey = `store-reservations:${Buffer.from(r.storeSlug, "utf8").toString("base64url")}`;
    await kv.set(`r:${r.token}`, JSON.stringify(r));
    await kv.append(historyKey, r.token, 500);
    vi.spyOn(kv, "append").mockRejectedValueOnce(new Error("active index unavailable"));

    await expect(listStoreReservations(r.storeSlug)).rejects.toThrow("active index unavailable");
  });

  it("an active order pushed past retained history reappears once after completion", async () => {
    await saveReservation(make({ code: "P-000" }));
    for (let index = 0; index < 550; index += 1) {
      await saveReservation(make({ code: `H-${String(index).padStart(3, "0")}`, status: "picked_up" }));
    }
    await updateStatus("P-000", "confirmed", "pending_store_confirm");
    await updateStatus("P-000", "picked_up", "confirmed");

    const rows = await listStoreReservations("中山藥局");
    expect(rows.filter((row) => row.code === "P-000")).toEqual([
      expect.objectContaining({ status: "picked_up" }),
    ]);
  });

  it("rejects malformed or expired history cursors", async () => {
    await saveReservation(make({ code: "H-001", status: "picked_up" }));
    await expect(listStoreReservationPage("中山藥局", "not-a-cursor")).rejects.toBeInstanceOf(InvalidHistoryCursorError);

    for (let index = 0; index < 51; index += 1) {
      await saveReservation(make({ code: `J-${String(index).padStart(3, "0")}`, status: "picked_up" }));
    }
    const first = await listStoreReservationPage("中山藥局");
    await expect(listStoreReservationPage("另一間藥局", first.nextHistoryCursor!)).rejects.toBeInstanceOf(
      InvalidHistoryCursorError,
    );
  });

  it("confirmed reservation exposes a deadline only when its inputs are valid", async () => {
    const confirmedAt = "2026-09-08T00:00:00.000Z";
    await saveReservation(make({ code: "C-111", status: "confirmed", confirmedAt, holdHours: 4 }));
    await saveReservation(make({ code: "C-222", status: "confirmed", confirmedAt: "not-a-date" }));
    await saveReservation(make({ code: "C-333", status: "confirmed", confirmedAt, holdHours: Number.MAX_VALUE }));

    const rows = await listStoreReservations("中山藥局");
    expect(rows.find((row) => row.code === "C-111")).toMatchObject({
      holdExpiresAt: "2026-09-08T04:00:00.000Z",
    });
    expect(rows.find((row) => row.code === "C-222")).not.toHaveProperty("holdExpiresAt");
    expect(rows.find((row) => row.code === "C-333")).not.toHaveProperty("holdExpiresAt");
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
  it("bootstraps terminal history before claiming the bounded transition lock", async () => {
    const r = make({ code: "C-009" });
    await seedLegacyReservation(r);
    const claims: string[] = [];
    const originalClaim = kv.setIfAbsent;
    vi.spyOn(kv, "setIfAbsent").mockImplementation(async (...args) => {
      claims.push(args[0]);
      return originalClaim(...args);
    });

    await updateStatus(r.code, "rejected_no_stock", "pending_store_confirm");
    expect(claims).toEqual([
      `${legacyHistoryKey(r.storeSlug)}:active-bootstrap-lock`,
      `reservation-transition:${r.code}`,
    ]);
  });

  it("holds the transition lock for the bounded KV transport budget", async () => {
    const r = make({ code: "C-000" });
    await saveReservation(r);
    const originalClaim = kv.setIfAbsent;
    const claim = vi.spyOn(kv, "setIfAbsent").mockImplementation(async (...args) => originalClaim(...args));

    await updateStatus(r.code, "confirmed", "pending_store_confirm");
    expect(claim).toHaveBeenCalledWith(
      `reservation-transition:${r.code}`,
      "1",
      TRANSITION_LOCK_TTL_SECONDS,
    );
    expect(TRANSITION_LOCK_TTL_SECONDS).toBe(45);
  });

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

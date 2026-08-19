import { describe, expect, it } from "vitest";

import { PARTNER_PHARMACIES } from "./partners";
import { allStores } from "./data";
import { STORE_OS_LIVE_STORES, isStoreOsLive } from "./store-os-live";

describe("Store OS 上線名單", () => {
  it("只認名單上的店，其他一律收不到預留", () => {
    for (const store of allStores()) {
      expect(isStoreOsLive(store.slug)).toBe(STORE_OS_LIVE_STORES.includes(store.slug));
    }
    expect(isStoreOsLive("不存在的藥局")).toBe(false);
  });

  // 確認販售這支 ≠ 收得到預留。把 partner 名單當成履約能力，正是這次要擋的錯。
  it("不從合作藥局名單推論上線狀態", () => {
    for (const partner of Object.values(PARTNER_PHARMACIES)) {
      if (!STORE_OS_LIVE_STORES.includes(partner.storeSlug)) {
        expect(isStoreOsLive(partner.storeSlug)).toBe(false);
      }
    }
  });

  // 上線名單只放真的存在的店 —— 打錯字會靜靜地讓一家店永遠開不了預留。
  it("名單上的 slug 都對得到真實店家", () => {
    const known = new Set(allStores().map((store) => store.slug));
    for (const slug of STORE_OS_LIVE_STORES) {
      expect(known.has(slug)).toBe(true);
    }
  });
});

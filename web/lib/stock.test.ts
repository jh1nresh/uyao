import { describe, expect, it } from "vitest";

import { compareByFreshness, stockBadge } from "./stock";

/**
 * 庫存徽章是產品的差異化核心，也是唯一一套「我們對消費者的承諾」。
 * 分級寫錯會直接讓人白跑一趟，所以每一級都要有回歸測試。
 */
describe("庫存徽章分級", () => {
  it("24 小時內的掃描是實心綠 —— 全站唯一的『放心去』訊號", () => {
    expect(stockBadge(0)).toMatchObject({ tier: "fresh", char: "●" });
    expect(stockBadge(0.9)).toMatchObject({ tier: "fresh" });
  });

  it("1–7 天是空心，而且要標出實際天數", () => {
    expect(stockBadge(3)).toMatchObject({ tier: "stale", char: "○", text: "3 天前確認" });
    expect(stockBadge(7)).toMatchObject({ tier: "stale" });
  });

  it("超過 7 天或沒有紀錄一律不假裝有貨", () => {
    expect(stockBadge(8)).toMatchObject({ tier: "unknown", char: "？" });
    expect(stockBadge(null)).toMatchObject({ tier: "unknown", text: "請預留確認" });
  });

  it("永遠不顯示數量 —— 那是估計值", () => {
    for (const d of [0, 3, null]) {
      expect(JSON.stringify(stockBadge(d))).not.toMatch(/\d+\s*(個|盒|件)/);
    }
  });
});

describe("排序：新鮮度 → 距離 → 價格", () => {
  const row = (days: number | null, distanceM: number | null, priceTwd: number) => ({
    badge: stockBadge(days),
    daysSinceScan: days,
    priceTwd,
    store: { distanceM },
  });

  it("新鮮度優先於距離 —— 買貼布的人要現在拿到，不是省 5 塊", () => {
    const near_stale = row(3, 100, 100);
    const far_fresh = row(0, 5000, 999);
    expect([near_stale, far_fresh].sort(compareByFreshness)[0]).toBe(far_fresh);
  });

  it("同新鮮度時比距離", () => {
    const far = row(0, 900, 50);
    const near = row(0, 100, 500);
    expect([far, near].sort(compareByFreshness)[0]).toBe(near);
  });

  it("沒有座標的排最後，不能因為 null 就跑到前面", () => {
    const noCoord = row(0, null, 10);
    const far = row(0, 9000, 900);
    expect([noCoord, far].sort(compareByFreshness)[0]).toBe(far);
  });
});

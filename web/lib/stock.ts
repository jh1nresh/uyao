import type { StockBadgeSpec, StockTier } from "./types";

/**
 * 庫存徽章 — 產品的差異化核心，全站唯一一套視覺語言。
 * 誠實分級：只講掃描新鮮度，永遠不顯示確切數量（那是估計值）。
 */
export function stockBadge(daysSinceScan: number | null): StockBadgeSpec {
  if (daysSinceScan === null || daysSinceScan > 7) {
    return { tier: "unknown", char: "？", text: "請預留確認", shortText: "待確認" };
  }
  if (daysSinceScan < 1) {
    return { tier: "fresh", char: "●", text: "今日掃描確認", shortText: "今日" };
  }
  const d = Math.round(daysSinceScan);
  return { tier: "stale", char: "○", text: `${d} 天前確認`, shortText: `${d} 天前` };
}

/** 徽章顏色只用墨色與同一個綠 — 不引入紅/黃警示色。 */
export const BADGE_COLOR: Record<StockTier, string> = {
  fresh: "text-green",
  stale: "text-stale",
  unknown: "text-muted-2",
};

const TIER_RANK: Record<StockTier, number> = { fresh: 0, stale: 1, unknown: 2 };

/**
 * 排序規則跟 GoodRx 相反：庫存新鮮度 → 距離 → 價格。
 * 買貼布的人要「現在拿到」，不是省 5 塊。
 */
export interface Sortable {
  badge: StockBadgeSpec;
  daysSinceScan: number | null;
  priceTwd: number;
  /** 還沒補座標的藥局距離是 null，排序時當成最遠 */
  store: { distanceM: number | null };
}

export function compareByFreshness(a: Sortable, b: Sortable): number {
  const tier = TIER_RANK[a.badge.tier] - TIER_RANK[b.badge.tier];
  if (tier !== 0) return tier;

  const days = (a.daysSinceScan ?? Infinity) - (b.daysSinceScan ?? Infinity);
  if (days !== 0) return days;

  const da = a.store.distanceM ?? Infinity;
  const db = b.store.distanceM ?? Infinity;
  if (da !== db) return da - db;
  return a.priceTwd - b.priceTwd;
}

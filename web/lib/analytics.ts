/**
 * 廣告轉換事件。
 *
 * specs/ads-launch-v1.md §8 定的三個事件，是投錢前的硬前置：
 *
 *   demand_recorded    落空搜尋被記錄（被動，使用者不用做任何事）
 *   notify_signup      到貨通知登記（留了聯絡方式）
 *   concierge_request  發起代問（「DM 我，我打電話幫你問」）
 *
 * 沒有這一層，Meta 只能優化點擊，會精準找到一群愛點但不留聯絡方式的人。
 *
 * 設計原則：**沒設 ID 就完全不存在。** GA4 與 Pixel 都靠 NEXT_PUBLIC_* 開關，
 * 沒設定時 `track()` 是純 no-op，站上不會多出任何第三方網域。
 */

/** 站上唯一承認的轉換事件。新增前先想清楚它對應哪個真實的人類動作。 */
export type AdEvent = "demand_recorded" | "notify_signup" | "concierge_request";

export type EventParams = Record<string, string | number | boolean | undefined>;

/**
 * 自訂事件對到 Meta 標準事件。
 *
 * 為什麼要兩套：Meta 的自動出價只認得標準事件，`trackCustom` 的自訂名稱
 * 拿不到同等的優化訊號。所以留下訊號的動作額外送一發標準事件——
 * 這是兩筆不同的事件，不是重複計數。
 *
 * demand_recorded 刻意不映射：它是被動記錄，不是使用者意圖，
 * 拿它當優化目標會買到一群只會落空的流量。
 */
const META_STANDARD: Partial<Record<AdEvent, string>> = {
  notify_signup: "Lead",
  concierge_request: "Contact",
};

interface Gtag {
  (command: "event", event: string, params?: EventParams): void;
}

interface Fbq {
  (command: "track" | "trackCustom", event: string, params?: EventParams): void;
}

declare global {
  interface Window {
    gtag?: Gtag;
    fbq?: Fbq;
  }
}

export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID ?? "";
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

/** 有沒有任何一個量測端設定好了。沒有的話整層都不掛。 */
export function analyticsEnabled(): boolean {
  return Boolean(GA4_ID || META_PIXEL_ID);
}

/** 丟掉 undefined，順便擋掉不小心塞進來的物件。 */
function compact(params?: EventParams): EventParams {
  if (!params) return {};
  const out: EventParams = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    if (typeof value === "object") continue;
    out[key] = value;
  }
  return out;
}

/**
 * 送一個轉換事件。
 *
 * 任何一端沒載入就跳過那一端；整個函式在 server 與沒設 ID 的情況下都是 no-op，
 * 呼叫端不需要先檢查。量測失敗永遠不該影響使用者流程，所以全部吞掉例外。
 */
export function track(event: AdEvent, params?: EventParams): void {
  if (typeof window === "undefined") return;
  const payload = compact(params);

  try {
    window.gtag?.("event", event, payload);
  } catch {
    /* 量測不該讓畫面壞掉 */
  }

  try {
    window.fbq?.("trackCustom", event, payload);
    const standard = META_STANDARD[event];
    if (standard) window.fbq?.("track", standard, payload);
  } catch {
    /* 同上 */
  }
}

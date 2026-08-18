"use client";

import { type AdSource, isPaidClick, parseAdSource, sameCampaign } from "./attribution";

/**
 * 歸因的瀏覽器那一半。
 *
 * 存 sessionStorage 而不是 cookie：cookie 會跟著每個請求送出、會跨分頁存活、
 * 也踩到 specs/demand-capture.md「不放 cookie」的承諾。sessionStorage 關掉
 * 分頁就沒了，剛好對應「這一次造訪是哪則廣告帶來的」這個問題的生命週期。
 *
 * 歸因模型：session 內的 last non-direct click。使用者中途點了另一則廣告
 * 進來，後面的行為要算給新的那則；沒有新的廣告參數就沿用原本那筆
 * （站內導覽不該把歸因洗成 direct）。
 */
const KEY = "uyao.adsource.v1";

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    // Safari 無痕、或使用者關掉儲存空間存取。歸因不值得為此丟例外。
    return null;
  }
}

export function readAdSource(): AdSource | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    return raw ? (JSON.parse(raw) as AdSource) : null;
  } catch {
    return null;
  }
}

/**
 * 記下這次造訪的歸因，回傳最終生效的那一筆。
 *
 * 回傳值讓呼叫端知道「這次是不是新的廣告點擊」，避免重複判斷。
 */
export function captureAdSource(): AdSource | null {
  if (typeof window === "undefined") return null;

  const incoming = parseAdSource(window.location.href, document.referrer);
  const existing = readAdSource();

  // 沒有新的廣告參數就不動既有歸因——站內每一次導覽都會經過這裡。
  if (!isPaidClick(incoming) && existing) return existing;
  if (!incoming) return existing;
  if (existing && sameCampaign(incoming, existing)) return existing;

  const store = storage();
  try {
    store?.setItem(KEY, JSON.stringify(incoming));
  } catch {
    /* 存不下就只用這一次，不影響流程 */
  }
  return incoming;
}

/**
 * 哪幾家藥局真的在 Store OS 上接單。
 *
 * 預留不需要掃描盒子 —— `api/reservations` 只要合作藥局確認販售就放行。
 * 但它需要**另一端有人按確認**：Store OS 是唯一的店務入口，沒有裝的店，
 * 單子只會躺在沒人開的收件匣裡。畫面上「藥局按下確認後為你保留 4 小時」
 * 那句話會沒有人執行，消費者要等到 25 分鐘的退路才被叫去打電話 ——
 * 那段等待是我們造成的，不是藥局慢。
 *
 * 所以這份名單講的是**履約能力**，跟 `PARTNER_PHARMACIES`（確認販售什麼）
 * 是兩件事，不能互相推論：確認有這支 ≠ 收得到預留。
 *
 * 現在是空的，那就是真話 —— 一家都還沒裝，所以全站不出現預留鈕，品項頁
 * 與 API 一律改推電話（電話本來就在頁面上，而且真的有人接）。
 * 有藥局裝好、也確認會在 Store OS 上接單，才把 slug 加一行進來。
 *
 * 跟 `lib/store-os.ts` 無關：那是 Store OS 產品頁的示範資料。
 */
export const STORE_OS_LIVE_STORES: readonly string[] = [];

/** 這家藥局收得到預留嗎？收不到就不要給預留鈕。 */
export function isStoreOsLive(storeSlug: string): boolean {
  return STORE_OS_LIVE_STORES.includes(storeSlug);
}

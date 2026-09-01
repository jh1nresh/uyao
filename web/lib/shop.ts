/**
 * 消費者服務已併入公開主站。保留 SHOP_URL 這個名稱，避免所有目錄、搜尋、
 * 預留與結構化資料的呼叫端同時改名；它現在代表 consumer-first 的公開網址，
 * 不再代表獨立子網域。
 */
export const SHOP_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://uyaohealth.com"
).replace(/\/$/, "");

/** 舊 Shop host 只負責把既有書籤與搜尋流量永久導回主站。 */
export const LEGACY_SHOP_HOST = "shop.uyaohealth.com";

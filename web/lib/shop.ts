/**
 * 消費者 app 的對外網址。landing（/zh-tw 與 /en）上的「附近找藥／See the
 * consumer product」一律指到 shop canonical，不留在主網域的 /app。
 * 本機開發或換網域時用 NEXT_PUBLIC_SHOP_URL 覆蓋。
 */
export const SHOP_URL = process.env.NEXT_PUBLIC_SHOP_URL ?? "https://shop.uyaohealth.com";

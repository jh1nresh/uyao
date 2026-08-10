import { NextRequest, NextResponse } from "next/server";

/**
 * Host-based routing：同一份部署掛兩個網域。
 *
 *   uyao.vercel.app        → `/` 是公司 landing（維持原樣）
 *   shop-uyao.vercel.app   → `/` 直接呈現消費者 app（rewrite 到 /app）
 *
 * 為什麼是 shop-uyao 不是 shop.uyao.vercel.app：*.vercel.app 的 wildcard
 * 憑證只涵蓋一層子網域，兩層（shop.uyao.）掛不上去。之後有自訂網域
 * （如 shop.uyao.tw）時，`shop.` 開頭的 host 也會被這裡認出來，不用改 code。
 *
 * 只攔 `/`：其他路徑（/drug、/store、/search…）兩個網域共用，不用動。
 */
export const config = { matcher: ["/"] };

const SHOP_HOSTS = new Set(
  ["shop-uyao.vercel.app", process.env.SHOP_HOST ?? ""].filter(Boolean),
);

export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const isShop = SHOP_HOSTS.has(host) || host.startsWith("shop.");
  if (isShop) {
    return NextResponse.rewrite(new URL("/app", req.url));
  }
  return NextResponse.next();
}

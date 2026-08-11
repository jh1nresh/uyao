import { NextRequest, NextResponse } from "next/server";

/**
 * Host-based routing：同一份部署掛兩個網域。
 *
 *   uyao.vercel.app        → `/` 導向 `/zh-tw` 公司 landing
 *   shop-uyao.vercel.app   → `/` 導向 `/zh-tw/app` 消費者 app
 *
 * 為什麼是 shop-uyao 不是 shop.uyao.vercel.app：*.vercel.app 的 wildcard
 * 憑證只涵蓋一層子網域，兩層（shop.uyao.）掛不上去。之後有自訂網域
 * （如 shop.uyao.tw）時，`shop.` 開頭的 host 也會被這裡認出來，不用改 code。
 *
 * 公開網址一律明示 `/zh-tw` 或 `/en`；舊的無語系路徑永久導向中文版。
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

const SHOP_HOSTS = new Set(
  ["shop-uyao.vercel.app", process.env.SHOP_HOST ?? ""].filter(Boolean),
);

export function proxy(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  const pathname = req.nextUrl.pathname;
  const english = pathname === "/en" || pathname.startsWith("/en/");
  requestHeaders.set("x-uyao-locale", english ? "en" : "zh");

  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const isShop = SHOP_HOSTS.has(host) || host.startsWith("shop.");

  // `/en` has its own editorial landing. Every nested English path reuses the
  // canonical product route so business logic, reservation state, and tests
  // never fork into two implementations.
  if (pathname === "/en") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  if (pathname.startsWith("/en/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // Chinese uses the same explicit locale prefix as English. The root page
  // remains the implementation route; `/zh-tw` is the public canonical URL.
  if (pathname === "/zh-tw" || pathname.startsWith("/zh-tw/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(6) || "/";
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // Keep old unprefixed links working, but make locale explicit in the URL.
  const url = req.nextUrl.clone();
  url.pathname = isShop && pathname === "/" ? "/zh-tw/app" : `/zh-tw${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url, 308);
}

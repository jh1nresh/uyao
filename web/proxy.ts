import { NextRequest, NextResponse } from "next/server";

import {
  PAGE_TYPES,
  appendVaryAccept,
  htmlHeaders,
  isRscRequest,
  markdownHeaders,
  preferredType,
} from "@/lib/accept";
import {
  applyPublicCache,
  isKnownBarePath,
  needsLocalePrefixRedirect,
  notFoundHtml,
  notFoundMarkdown,
  pageMarkdown,
  shopHomepageMarkdown,
} from "@/lib/agent-public";
import { SITE_URL, STORE_CANONICAL_HOST, STORE_URL } from "@/lib/seo";
import { LEGACY_SHOP_HOST } from "@/lib/shop";
import { storeHomepageMarkdown } from "@/lib/store-public";

/**
 * Host-based routing：同一份部署掛公開主站、舊 Shop alias 與 Store OS。
 *
 *   uyaohealth.com         → Consumer-first 公開站＋公司資訊頁
 *   shop.uyaohealth.com    → 永久導向主站同一路徑
 *   store.uyaohealth.com   → `/` 顯示 Store OS（唯一 canonical）
 *   store.uyao.com         → 永久導向 canonical
 *
 * 為什麼是 shop-uyao 不是 shop.uyao.vercel.app：*.vercel.app 的 wildcard
 * 憑證只涵蓋一層子網域，兩層（shop.uyao.）掛不上去。之後有自訂網域
 * （如 shop.uyaohealth.com）時，`shop.` 開頭的 host 也會被這裡認出來。
 *
 * 公開網址一律明示 `/zh-tw` 或 `/en`；舊的無語系路徑永久導向中文版。
 * `/about` `/contact` `/privacy` 308 到 `/zh-tw/...`，跟 evidence 同一套。
 * `/docs` 留在短路徑，給 agent 用。
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

const LEGACY_SHOP_HOSTS = new Set(
  [LEGACY_SHOP_HOST, "shop-uyao.vercel.app", process.env.SHOP_HOST ?? ""].filter(Boolean),
);
const STORE_ALIASES = new Set(
  ["store.uyao.com", process.env.STORE_HOST ?? ""]
    .filter((host) => Boolean(host) && host !== STORE_CANONICAL_HOST),
);

const COMPANY_HOST = new URL(SITE_URL).host;
const PUBLIC_CACHE_PATHS = new Set([
  "/",
  "/zh-tw",
  "/en",
  "/about",
  "/contact",
  "/privacy",
  "/docs",
  "/zh-tw/about",
  "/zh-tw/contact",
  "/zh-tw/privacy",
  "/en/about",
  "/en/contact",
  "/en/privacy",
]);

function publicPath(pathname: string): {
  barePath: string;
  locale: "en" | "zh";
  localized: boolean;
} {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return { barePath: pathname.slice(3) || "/", locale: "en", localized: true };
  }
  if (pathname === "/zh-tw" || pathname.startsWith("/zh-tw/")) {
    return { barePath: pathname.slice(6) || "/", locale: "zh", localized: true };
  }
  return { barePath: pathname, locale: "zh", localized: false };
}

function localizedPath(pathname: string, locale: "en" | "zh"): string {
  const prefix = locale === "en" ? "/en" : "/zh-tw";
  return pathname === "/" ? prefix : `${prefix}${pathname}`;
}

function redirectTo(req: NextRequest, baseUrl: string, pathname: string) {
  const url = new URL(baseUrl);
  url.pathname = pathname;
  url.search = req.nextUrl.search;
  return NextResponse.redirect(url, 308);
}

function decoratePublic(response: NextResponse, cache: boolean): NextResponse {
  appendVaryAccept(response.headers);
  if (cache) applyPublicCache(response.headers);
  return response;
}

function negotiateNotFound(req: NextRequest): Response {
  if (!isRscRequest(req.headers) && preferredType(req.headers.get("accept"), PAGE_TYPES) === "text/markdown") {
    const headers = markdownHeaders();
    applyPublicCache(headers);
    return new Response(notFoundMarkdown(), { status: 404, headers });
  }
  const headers = htmlHeaders();
  applyPublicCache(headers);
  return new Response(notFoundHtml(), { status: 404, headers });
}

function negotiatedMarkdown(req: NextRequest, body: string | undefined): Response | null {
  if (req.method !== "GET" && req.method !== "HEAD") return null;
  if (isRscRequest(req.headers)) return null;
  const chosen = preferredType(req.headers.get("accept"), PAGE_TYPES);
  if (chosen !== "text/markdown") {
    if (chosen === null && req.headers.get("accept")) {
      return new Response("Not Acceptable\n\nAvailable: text/html, text/markdown\n", {
        status: 406,
        headers: { "content-type": "text/plain; charset=utf-8", vary: "Accept" },
      });
    }
    return null;
  }
  if (!body) return null;
  const headers = markdownHeaders();
  applyPublicCache(headers);
  return new Response(req.method === "HEAD" ? null : body, { status: 200, headers });
}

export function proxy(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  const pathname = req.nextUrl.pathname;
  const route = publicPath(pathname);
  requestHeaders.set("x-uyao-locale", route.locale);

  const host = (req.headers.get("host") ?? req.nextUrl.hostname).toLowerCase().split(":")[0];
  // Branch preview hosts are treated like the unified public site. Only the
  // exact former Shop aliases redirect to production, so a frontend PR remains
  // reviewable on its own Vercel URL.
  const isLegacyShop = LEGACY_SHOP_HOSTS.has(host) || host.startsWith("shop.");
  const isStore = host === STORE_CANONICAL_HOST
    || (process.env.NODE_ENV !== "production" && host === "store.localhost");
  const isStoreAlias = STORE_ALIASES.has(host);

  // Store OS 只存在一個公開網址。舊 company/shop 路徑與短網域 alias
  // 都直接收斂到 store.uyaohealth.com 根目錄，不再留下重複頁面。
  if (!isStore && route.barePath === "/store-os") {
    return redirectTo(req, STORE_URL, "/");
  }

  if (isStoreAlias) {
    if (route.barePath === "/") return redirectTo(req, STORE_URL, "/");
    return redirectTo(req, SITE_URL, localizedPath(route.barePath, route.locale));
  }

  if (isStore) {
    const isStoreHome = route.barePath === "/" || route.barePath === "/store-os";

    if (!isStoreHome) {
      return redirectTo(req, SITE_URL, localizedPath(route.barePath, route.locale));
    }

    if (pathname !== "/") {
      return redirectTo(req, STORE_URL, "/");
    }

    const markdown = negotiatedMarkdown(req, storeHomepageMarkdown());
    if (markdown) return markdown;

    const url = req.nextUrl.clone();
    url.pathname = "/store-os";
    const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    appendVaryAccept(response.headers);
    response.headers.set("cache-control", "private, no-cache, no-store, max-age=0, must-revalidate");
    response.headers.set("cdn-cache-control", "no-store");
    return response;
  }

  if (!isLegacyShop && host === `www.${COMPANY_HOST}`) {
    return redirectTo(req, SITE_URL, pathname);
  }

  // Shop 與公司站已合併。舊 host 不再維護第二份 canonical namespace；所有
  // 書籤、廣告與搜尋結果保留 query，永久搬到主站相同的公開路徑。
  if (isLegacyShop) {
    const targetPath = route.barePath === "/app"
      ? localizedPath("/", route.locale)
      : route.localized
        ? pathname
        : localizedPath(route.barePath, route.locale);
    return redirectTo(req, SITE_URL, targetPath);
  }

  // `/app` remains an internal implementation route. Public links collapse to
  // the locale homepage on both the canonical host and branch previews.
  if (route.barePath === "/app") {
    const url = req.nextUrl.clone();
    url.pathname = localizedPath("/", route.locale);
    return NextResponse.redirect(url, 308);
  }

  const markdown = negotiatedMarkdown(
    req,
    route.barePath === "/" ? shopHomepageMarkdown(route.locale) : pageMarkdown(pathname),
  );
  if (markdown) return markdown;

  if (!isKnownBarePath(route.barePath)) {
    return negotiateNotFound(req);
  }

  const cacheThis = PUBLIC_CACHE_PATHS.has(pathname) || PUBLIC_CACHE_PATHS.has(route.barePath);

  // Locale homepages are now the consumer product. Company information remains
  // under /about, /pharmacy, /evidence, /guides and /compare on the same host.
  if (pathname === "/en") {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    return decoratePublic(NextResponse.rewrite(url, { request: { headers: requestHeaders } }), cacheThis);
  }
  if (pathname.startsWith("/en/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return decoratePublic(
      NextResponse.rewrite(url, { request: { headers: requestHeaders } }),
      cacheThis,
    );
  }

  if (pathname === "/zh-tw") {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    return decoratePublic(NextResponse.rewrite(url, { request: { headers: requestHeaders } }), cacheThis);
  }
  if (pathname.startsWith("/zh-tw/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(6) || "/";
    return decoratePublic(
      NextResponse.rewrite(url, { request: { headers: requestHeaders } }),
      cacheThis,
    );
  }

  // Root stays HTML/Markdown-addressable for agents, but renders the same
  // consumer-first homepage as /zh-tw. Predictable trust URLs such as /docs
  // remain unprefixed; company pages still receive an explicit locale.
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/app";
    return decoratePublic(NextResponse.rewrite(url, { request: { headers: requestHeaders } }), cacheThis);
  }
  if (!needsLocalePrefixRedirect(pathname)) {
    return decoratePublic(
      NextResponse.next({ request: { headers: requestHeaders } }),
      cacheThis,
    );
  }

  // Keep old unprefixed product links working, but make locale explicit.
  const url = req.nextUrl.clone();
  url.pathname = `/zh-tw${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url, 308);
}

export { negotiateNotFound };

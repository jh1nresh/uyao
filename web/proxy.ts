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
} from "@/lib/agent-public";
import { SITE_URL } from "@/lib/seo";
import { SHOP_URL } from "@/lib/shop";

/**
 * Host-based routing：同一份部署掛兩個網域。
 *
 *   uyaohealth.com         → `/` 公司 landing（SSR，不再 308 走掉）
 *   shop.uyaohealth.com    → `/` 導向 `/zh-tw` Consumer Web
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

const SHOP_HOSTS = new Set(
  ["shop-uyao.vercel.app", process.env.SHOP_HOST ?? ""].filter(Boolean),
);
const STORE_URL = "https://store.uyaohealth.com";
const STORE_HOST = new URL(STORE_URL).host;
const STORE_ALIASES = new Set(
  ["store.uyao.com", process.env.STORE_HOST ?? ""]
    .filter((host) => Boolean(host) && host !== STORE_HOST),
);

const COMPANY_HOST = new URL(SITE_URL).host;
const COMPANY_ONLY_ROUTES = [
  "/pharmacy",
  "/evidence",
  "/guides",
  "/compare",
  "/store-os",
  "/about",
  "/contact",
  "/privacy",
  "/docs",
];
const CONSUMER_ROUTES = ["/app", "/demo", "/drug", "/store", "/search", "/category", "/r", "/stock-badges"];
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

function routeStartsWith(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

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

function companyMarkdown(req: NextRequest, pathname: string): Response | null {
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
  const body = pageMarkdown(pathname);
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
  const isShop = SHOP_HOSTS.has(host) || host.startsWith("shop.");
  const isStore = host === STORE_HOST
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

    const url = req.nextUrl.clone();
    url.pathname = "/store-os";
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  if (!isShop && host === `www.${COMPANY_HOST}`) {
    return redirectTo(req, SITE_URL, pathname);
  }

  if (isShop) {
    if (routeStartsWith(route.barePath, COMPANY_ONLY_ROUTES)) {
      return redirectTo(req, SITE_URL, localizedPath(route.barePath, route.locale));
    }

    // `/app` was the internal implementation path. The shop host owns the
    // clean public namespace, so every locale alias permanently collapses to
    // the locale homepage while retaining meaningful query state.
    if (route.barePath === "/app") {
      return redirectTo(req, SHOP_URL, localizedPath("/", route.locale));
    }

    if (!isKnownBarePath(route.barePath)) {
      return negotiateNotFound(req);
    }

    if (!route.localized) {
      const url = req.nextUrl.clone();
      url.pathname = localizedPath(route.barePath, route.locale);
      return NextResponse.redirect(url, 308);
    }

    const url = req.nextUrl.clone();
    url.pathname = route.barePath === "/" ? "/app" : route.barePath;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  // Consumer content has one canonical host. Old company-host links redirect
  // instead of serving a duplicate copy.
  if (routeStartsWith(route.barePath, CONSUMER_ROUTES)) {
    const consumerPath = route.barePath === "/app" ? "/" : route.barePath;
    return redirectTo(req, SHOP_URL, localizedPath(consumerPath, route.locale));
  }

  const markdown = companyMarkdown(req, pathname);
  if (markdown) return markdown;

  if (!isKnownBarePath(route.barePath)) {
    return negotiateNotFound(req);
  }

  const cacheThis = PUBLIC_CACHE_PATHS.has(pathname) || PUBLIC_CACHE_PATHS.has(route.barePath);

  // `/en` has its own editorial landing. Every nested English path reuses the
  // canonical product route so business logic, reservation state, and tests
  // never fork into two implementations.
  if (pathname === "/en") {
    return decoratePublic(
      NextResponse.next({ request: { headers: requestHeaders } }),
      cacheThis,
    );
  }
  if (pathname.startsWith("/en/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return decoratePublic(
      NextResponse.rewrite(url, { request: { headers: requestHeaders } }),
      cacheThis,
    );
  }

  // Chinese uses the same explicit locale prefix as English. The root page
  // remains the implementation route; `/zh-tw` is the public canonical URL.
  if (pathname === "/zh-tw" || pathname.startsWith("/zh-tw/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(6) || "/";
    return decoratePublic(
      NextResponse.rewrite(url, { request: { headers: requestHeaders } }),
      cacheThis,
    );
  }

  // Agent trust pages and the homepage stay on the unprefixed URL so a
  // crawler that fetches `/` or `/about` gets HTML, not a 308.
  if (pathname === "/" || !needsLocalePrefixRedirect(pathname)) {
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

import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { sitemapLastModified } from "@/lib/aeo";
import { INDEXABLE_PATHS, SHOP_CANONICAL_HOST, SITE_URL } from "@/lib/seo";
import { SHOP_URL } from "@/lib/shop";
import { shopSitemapEntries } from "@/lib/shop-index";

/**
 * 依 request host 回傳單一 canonical namespace：company sitemap 只列公司
 * 白名單，shop sitemap 列雙語首頁、品類頁與通過 admission gate 的品項頁。
 * search、store 與預留收據等 route 一律不進 sitemap（見 lib/shop-index.ts）。
 *
 * 兩份都一定要有 `lastmod` —— 沒有的話 Google 不知道該重爬哪幾頁，
 * 只能整份重掃或乾脆不動。`lib/sitemap.test.ts` 會擋住漏標的路徑。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = ((await headers()).get("host") ?? "").toLowerCase().split(":")[0];

  if (host === SHOP_CANONICAL_HOST) {
    return shopSitemapEntries().map((entry) => ({
      url: `${SHOP_URL}${entry.path}`,
      changeFrequency: "monthly",
      lastModified: entry.lastModified,
    }));
  }

  return INDEXABLE_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "monthly",
    lastModified: sitemapLastModified(path),
  }));
}

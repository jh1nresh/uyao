import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { sitemapLastModified } from "@/lib/aeo";
import {
  INDEXABLE_PATHS,
  SITE_URL,
  STORE_CANONICAL_HOST,
  STORE_URL,
} from "@/lib/seo";
import { shopSitemapEntries } from "@/lib/shop-index";

/**
 * 主站 sitemap 同時列公司資訊與 consumer 首頁、品類、品項、藥局頁。
 * Store OS 仍是獨立 canonical host，只列自己的公開根目錄。
 * search 與預留收據不進 sitemap；公開藥局記錄依 admission gate 收錄。
 *
 * 兩份都一定要有 `lastmod` —— 沒有的話 Google 不知道該重爬哪幾頁，
 * 只能整份重掃或乾脆不動。`lib/sitemap.test.ts` 會擋住漏標的路徑。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = ((await headers()).get("host") ?? "").toLowerCase().split(":")[0];

  if (host === STORE_CANONICAL_HOST) {
    return [{
      url: `${STORE_URL}/`,
      changeFrequency: "monthly",
      lastModified: "2026-08-24",
    }];
  }

  const entries = new Map<string, string>();
  for (const path of INDEXABLE_PATHS) {
    const lastModified = sitemapLastModified(path);
    if (!lastModified) throw new Error(`Missing sitemap lastModified for ${path}`);
    entries.set(path, lastModified);
  }
  for (const entry of shopSitemapEntries()) {
    const current = entries.get(entry.path);
    entries.set(entry.path, current && current > entry.lastModified ? current : entry.lastModified);
  }

  return [...entries].map(([path, lastModified]) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "monthly",
    lastModified,
  }));
}

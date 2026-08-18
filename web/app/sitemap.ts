import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { sitemapLastModified } from "@/lib/aeo";
import { INDEXABLE_PATHS, SHOP_CANONICAL_HOST, SITE_URL } from "@/lib/seo";
import { SHOP_URL } from "@/lib/shop";
import { shopIndexablePaths } from "@/lib/shop-index";

/**
 * 依 request host 回傳單一 canonical namespace：company sitemap 只列公司
 * 白名單，shop sitemap 列雙語首頁、品類頁與通過 admission gate 的品項頁。
 * search、store 與預留收據等 route 一律不進 sitemap（見 lib/shop-index.ts）。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = ((await headers()).get("host") ?? "").toLowerCase().split(":")[0];
  const isShop = host === SHOP_CANONICAL_HOST;
  const baseUrl = isShop ? SHOP_URL : SITE_URL;
  const paths: readonly string[] = isShop ? shopIndexablePaths() : INDEXABLE_PATHS;

  return paths.map((path) => {
    const lastModified = isShop ? undefined : sitemapLastModified(path);

    return {
      url: `${baseUrl}${path}`,
      changeFrequency: "monthly",
      ...(lastModified ? { lastModified } : {}),
    };
  });
}

import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import {
  CANONICAL_HOST,
  SHOP_CANONICAL_HOST,
  SITE_URL,
} from "@/lib/seo";
import { SHOP_URL } from "@/lib/shop";

/**
 * robots.txt（spec §2）。production 開放爬取讓 crawler 讀得到各頁的
 * robots meta（noindex 頁必須可爬才看得到 noindex）；非 production
 * deployment 直接全站 Disallow。/api 與 /console 沒有搜尋價值，不給爬。
 * 注意 proxy matcher 排除含「.」的路徑，robots.txt 不經 locale rewrite。
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = ((await headers()).get("host") ?? "").toLowerCase().split(":")[0];
  const canonicalBase = host === SHOP_CANONICAL_HOST ? SHOP_URL : SITE_URL;
  const canonicalHost = host === CANONICAL_HOST || host === SHOP_CANONICAL_HOST;

  if (process.env.VERCEL_ENV !== "production" || !canonicalHost) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/console"] },
    sitemap: `${canonicalBase}/sitemap.xml`,
  };
}

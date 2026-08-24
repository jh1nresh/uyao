import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import {
  CANONICAL_HOST,
  SHOP_CANONICAL_HOST,
  SITE_URL,
  STORE_CANONICAL_HOST,
  STORE_URL,
} from "@/lib/seo";
import { SHOP_URL } from "@/lib/shop";

/**
 * robots.txt（spec §2）。production 開放爬取讓 crawler 讀得到各頁的
 * robots meta（noindex 頁必須可爬才看得到 noindex）；非 production
 * deployment 直接全站 Disallow。/api、/console 與 /store-os 沒有搜尋價值，不給爬。
 * 注意 proxy matcher 排除含「.」的路徑，robots.txt 不經 locale rewrite。
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = ((await headers()).get("host") ?? "").toLowerCase().split(":")[0];
  const canonicalBase = host === SHOP_CANONICAL_HOST
    ? SHOP_URL
    : host === STORE_CANONICAL_HOST
      ? STORE_URL
      : SITE_URL;
  const canonicalHost = host === CANONICAL_HOST
    || host === SHOP_CANONICAL_HOST
    || host === STORE_CANONICAL_HOST;

  if (process.env.VERCEL_ENV !== "production" || !canonicalHost) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      // /api/ 整段不給爬，但兩條公開唯讀端點要開 —— openapi.json 對外宣告
      // 它們可用，robots 又擋著的話，守規矩的 agent 會拒絕抓，等於發了一份
      // 自己擋住自己的規格。Allow 比 Disallow 更精確，優先生效。
      allow: ["/", "/api/catalog", "/api/pharmacies"],
      disallow: ["/api/", "/console", "/store-os", "/zh-tw/store-os", "/en/store-os"],
    },
    sitemap: `${canonicalBase}/sitemap.xml`,
  };
}

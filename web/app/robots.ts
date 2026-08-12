import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt（spec §2）。production 開放爬取讓 crawler 讀得到各頁的
 * robots meta（noindex 頁必須可爬才看得到 noindex）；非 production
 * deployment 直接全站 Disallow。/api 與 /console 沒有搜尋價值，不給爬。
 * 注意 proxy matcher 排除含「.」的路徑，robots.txt 不經 locale rewrite。
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/console"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

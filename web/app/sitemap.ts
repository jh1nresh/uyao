import type { MetadataRoute } from "next";

import { INDEXABLE_PATHS, SITE_URL } from "@/lib/seo";

/**
 * Sitemap 只列 canonical、允許 index 的 URL（spec §2）：噪音 route
 * （search、console、consumer demo 頁）一律不進來。preview deployment
 * 的 sitemap 內容無害 —— robots.txt 已全站 Disallow 且各頁 noindex。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "monthly",
  }));
}

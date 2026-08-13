import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { aeoLastModified } from "@/lib/aeo";
import {
  INDEXABLE_PATHS,
  SHOP_CANONICAL_HOST,
  SHOP_INDEXABLE_PATHS,
  SITE_URL,
} from "@/lib/seo";
import { SHOP_URL } from "@/lib/shop";

/**
 * 依 request host 回傳單一 canonical namespace：company sitemap 只列公司
 * 白名單，shop sitemap v1 只列 Consumer 雙語首頁。drug/store/search 等
 * 尚未通過 admission gate 的 route 一律不進 sitemap。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = ((await headers()).get("host") ?? "").toLowerCase().split(":")[0];
  const isShop = host === SHOP_CANONICAL_HOST;
  const baseUrl = isShop ? SHOP_URL : SITE_URL;
  const paths = isShop ? SHOP_INDEXABLE_PATHS : INDEXABLE_PATHS;

  return paths.map((path) => {
    const lastModified = isShop ? undefined : aeoLastModified(path);

    return {
      url: `${baseUrl}${path}`,
      changeFrequency: "monthly",
      ...(lastModified ? { lastModified } : {}),
    };
  });
}

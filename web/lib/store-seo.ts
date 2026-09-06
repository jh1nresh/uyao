import type { Metadata } from "next";

import { getArea } from "./data";
import type { Locale } from "./i18n";
import { SHOP_URL } from "./shop";
import { isIndexableStorePage } from "./shop-index";
import type { Store } from "./types";

const EN_PUBLIC_RECORD_TITLE = "public pharmacy record";

/**
 * Search title for a pharmacy record.
 *
 * Chinese puts the pharmacy and `getArea(store.area).name` before contact
 * intent so the snippet identifies a real place. English keeps the current
 * public-record title; store names stay Chinese and are not invented.
 *
 * Layout already applies one brand suffix (`%s · uYao 有藥` / `%s · uYao`).
 * This string is the `%s` only — do not add a second brand.
 */
export function storeSearchTitle(
  store: Pick<Store, "name" | "area" | "phone">,
  locale: Locale,
): string {
  if (locale === "en") {
    return `${store.name} — ${EN_PUBLIC_RECORD_TITLE}`;
  }
  const areaName = getArea(store.area).name;
  const intent = store.phone ? "地址與電話" : "地址與地圖";
  return `${store.name}｜${areaName}${intent}`;
}

function storeDescription(store: Store, locale: Locale): string {
  return locale === "en"
    ? `${store.name}, ${store.address}. This public listing does not mean a uYao partnership or live inventory; call the pharmacy to confirm before visiting.`
    : `${store.name}，${store.address}。公開收錄不代表 uYao 合作或已有即時庫存；前往門市前請先向藥局確認。`;
}

/**
 * Metadata object `generateMetadata` on `/store/[slug]` returns.
 * Admission robots come from the host/env gate; locale still decides
 * whether a store URL may be indexed at all.
 */
export function storePageMetadata(
  store: Store | undefined,
  locale: Locale,
  admissionRobots: NonNullable<Metadata["robots"]>,
): Metadata {
  if (!store) {
    return {
      title: locale === "en" ? "Pharmacy not found" : "找不到這家藥局",
      robots: { index: false, follow: false },
    };
  }

  const canonicalUrl = `${SHOP_URL}/zh-tw/store/${store.slug}`;
  return {
    title: storeSearchTitle(store, locale),
    description: storeDescription(store, locale),
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "zh-TW": canonicalUrl,
        "x-default": canonicalUrl,
      },
    },
    robots: isIndexableStorePage(locale)
      ? admissionRobots
      : { index: false, follow: true },
  };
}

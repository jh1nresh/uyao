import { CATEGORIES, allDrugs } from "./data";
import type { Locale } from "./i18n";
import type { Drug, IsoDate } from "./types";

/**
 * Consumer admission gate, in code.
 *
 * The consumer host used to index only its two homepages. Catalog pages are now
 * admitted too, but one item at a time: an item page is worth indexing only
 * when it can show something a search result should land on — either a cited
 * product-data source or uYao's own packshot. The remaining catalog rows are
 * placeholder records whose details are still unverified, so they stay
 * `noindex, follow` and are reachable through the category page instead.
 *
 * Not admitted at all, on purpose:
 *   /search      no stable content, one URL per query
 *   /store/*     shows supply that no pharmacy has confirmed yet
 *   /r/*         private reservation receipts
 */
export function isIndexableCatalogItem(drug: Drug, locale: Locale = "zh"): boolean {
  const hasEvidence = Boolean(drug.source) || Boolean(drug.image);
  // An English URL is only worth indexing when its title is actually English.
  // `drugCopy` falls back to the Chinese name when `nameEn` is missing, which
  // would put a Chinese-titled page into the English index as a near-duplicate
  // of the zh-tw one. Fill in `nameEn` and the page is admitted automatically.
  return locale === "en" ? hasEvidence && Boolean(drug.nameEn) : hasEvidence;
}

export function indexableCatalogItems(locale: Locale = "zh"): Drug[] {
  return allDrugs().filter((drug) => isIndexableCatalogItem(drug, locale));
}

export function isIndexableCatalogItemSlug(slug: string, locale: Locale = "zh"): boolean {
  const drug = allDrugs().find((item) => item.slug === slug);
  return drug ? isIndexableCatalogItem(drug, locale) : false;
}

const LOCALES = ["zh", "en"] as const;
const LOCALE_PREFIX: Record<Locale, string> = { zh: "/zh-tw", en: "/en" };

/**
 * 消費端首頁自己的文案更新日。品項改動會經由下面的 `latest()` 帶進來，
 * 這個常數只負責首頁上不是目錄的那些字。改文案才動它。
 */
const SHOP_HOME_COPY_UPDATED: IsoDate = "2026-08-18";

export type ShopSitemapEntry = { path: string; lastModified: IsoDate };

/** ISO 日期字串比大小就是時序比大小，不用 Date（render 期不碰時鐘）。 */
function latest(dates: IsoDate[], fallback: IsoDate): IsoDate {
  return dates.reduce((newest, date) => (date > newest ? date : newest), fallback);
}

/**
 * Every consumer URL the shop sitemap publishes, each with real freshness:
 * both localized homepages, both locales of each category, and each admitted
 * item in the locales whose copy actually exists.
 *
 * `lastmod` 的重點是「哪幾頁變了」。品項頁用自己的 `updatedOn`；品類頁與
 * 首頁取底下品項的最新日期，因為它們的內容就是那些品項。整批同一天不是
 * 問題 —— 那是事實；一旦只改一筆，就只有那一頁的日期會動。
 */
export function shopSitemapEntries(): ShopSitemapEntry[] {
  return LOCALES.flatMap((locale) => {
    const prefix = LOCALE_PREFIX[locale];
    const items = indexableCatalogItems(locale);
    const itemDates = items.map((drug) => drug.updatedOn);
    const catalogUpdated = latest(itemDates, SHOP_HOME_COPY_UPDATED);

    return [
      { path: prefix, lastModified: latest([catalogUpdated], SHOP_HOME_COPY_UPDATED) },
      ...CATEGORIES.map((category) => ({
        path: `${prefix}/category/${category.slug}`,
        lastModified: catalogUpdated,
      })),
      ...items.map((drug) => ({
        path: `${prefix}/drug/${drug.slug}`,
        lastModified: drug.updatedOn,
      })),
    ];
  });
}

/** 只要路徑的呼叫端用這個。順序與 `shopSitemapEntries()` 一致。 */
export function shopIndexablePaths(): string[] {
  return shopSitemapEntries().map((entry) => entry.path);
}

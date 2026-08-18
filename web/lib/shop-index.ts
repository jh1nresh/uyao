import { CATEGORIES, allDrugs } from "./data";
import type { Locale } from "./i18n";
import type { Drug } from "./types";
import { SHOP_INDEXABLE_PATHS } from "./seo";

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
 * Every consumer URL the shop sitemap publishes: both localized homepages,
 * both locales of each category, and each admitted item in the locales whose
 * copy actually exists.
 */
export function shopIndexablePaths(): string[] {
  return [
    ...SHOP_INDEXABLE_PATHS,
    ...LOCALES.flatMap((locale) => {
      const prefix = LOCALE_PREFIX[locale];
      return [
        ...CATEGORIES.map((category) => `${prefix}/category/${category.slug}`),
        ...indexableCatalogItems(locale).map((drug) => `${prefix}/drug/${drug.slug}`),
      ];
    }),
  ];
}

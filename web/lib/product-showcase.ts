import type { Drug } from "./types";

export interface ShowcaseItem {
  drug: Drug;
}

/** 只收有獨立商品照、能站上輪播舞台的精選品項。 */
const PRODUCT_SHOWCASE_SLUGS = new Set([
  "greenplus-elgucare",
  "huamao-progifted-lp28",
  "tianxia-chan-c-80",
  "chungchi-ganmeijia-coral-ca",
  "gaoyouzhi-vitamin-b-60",
  "chungchi-yiyuansu-gastrodia-100",
  "yuanding-puregps-defense-450",
  "aob-vitality-beauty-45",
]);

export function productShowcaseItems(drugs: readonly Drug[]): ShowcaseItem[] {
  return drugs.flatMap((drug) => {
    return drug.image?.kind === "packshot" && PRODUCT_SHOWCASE_SLUGS.has(drug.slug)
      ? [{ drug }]
      : [];
  });
}

import type { Drug } from "./types";

export interface ShowcaseItem {
  drug: Drug;
}

/**
 * 首頁精選八項。只用去背包裝照做滑動放大貨架，不再鋪整幅櫃景或木板底板。
 */
const PRODUCT_SHOWCASE_SLUGS = [
  "greenplus-elgucare",
  "huamao-progifted-lp28",
  "tianxia-chan-c-80",
  "chungchi-ganmeijia-coral-ca",
  "gaoyouzhi-vitamin-b-60",
  "chungchi-yiyuansu-gastrodia-100",
  "yuanding-puregps-defense-450",
  "aob-vitality-beauty-45",
] as const;

export function productShowcaseItems(drugs: readonly Drug[]): ShowcaseItem[] {
  const bySlug = new Map(drugs.map((drug) => [drug.slug, drug]));
  return PRODUCT_SHOWCASE_SLUGS.flatMap((slug) => {
    const drug = bySlug.get(slug);
    return drug?.image?.kind === "packshot" ? [{ drug }] : [];
  });
}

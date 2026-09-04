import type { Drug } from "./types";

export interface ShowcaseItem {
  drug: Drug;
}

/**
 * 首頁精選八項。舞台用固定空櫃底板 + 去背包裝照，不要再換整張櫃景 ——
 * 整幅櫃景互切會變成「一張圖接一張圖」，木紋與鄰格都會跳。
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

/** 空櫃底板：木紋與櫃格永遠不動，只有包裝照在架上換位。 */
export const PRODUCT_SHOWCASE_PLATE = "/brand/uyao-product-cabinet-reference-v3.webp";

export function productShowcaseItems(drugs: readonly Drug[]): ShowcaseItem[] {
  const bySlug = new Map(drugs.map((drug) => [drug.slug, drug]));
  return PRODUCT_SHOWCASE_SLUGS.flatMap((slug) => {
    const drug = bySlug.get(slug);
    return drug?.image?.kind === "packshot" ? [{ drug }] : [];
  });
}

import type { Drug } from "./types";

export interface ShowcaseItem {
  drug: Drug;
  sceneSrc: string;
}

/** 只收有獨立商品照、能站上輪播舞台的精選品項。 */
const PRODUCT_SHOWCASE_SCENES = new Map([
  ["greenplus-elgucare", "/brand/uyao-product-cabinet-composite-v1.webp"],
  ["huamao-progifted-lp28", "/products/cabinet/huamao-progifted-lp28.webp"],
  ["tianxia-chan-c-80", "/products/cabinet/tianxia-chan-c-80.webp"],
  ["chungchi-ganmeijia-coral-ca", "/products/cabinet/chungchi-ganmeijia-coral-ca.webp"],
  ["gaoyouzhi-vitamin-b-60", "/products/cabinet/gaoyouzhi-vitamin-b-60.webp"],
  ["chungchi-yiyuansu-gastrodia-100", "/products/cabinet/chungchi-yiyuansu-gastrodia-100.webp"],
  ["yuanding-puregps-defense-450", "/products/cabinet/yuanding-puregps-defense-450.webp"],
  ["aob-vitality-beauty-45", "/products/cabinet/aob-vitality-beauty-45.webp"],
]);

export function productShowcaseItems(drugs: readonly Drug[]): ShowcaseItem[] {
  return drugs.flatMap((drug) => {
    const sceneSrc = PRODUCT_SHOWCASE_SCENES.get(drug.slug);
    return drug.image?.kind === "packshot" && sceneSrc ? [{ drug, sceneSrc }] : [];
  });
}

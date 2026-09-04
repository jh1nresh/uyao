import type { Drug } from "./types";

export interface ShowcaseCutout {
  src: string;
  width: number;
  height: number;
}

export interface ShowcaseItem {
  drug: Drug;
  /** Hero／櫃景風格的獨立去背商品圖；不含木板。 */
  cutout: ShowcaseCutout;
}

/**
 * 首頁精選八項。
 * 用接近 hero 藥櫃光影的去背商品圖做滑動放大貨架，
 * 不再鋪整幅櫃景，也不把商品貼回木板。
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

/** 去背圖尺寸（統一高度 1000，寬依商品比例）。 */
const SHOWCASE_CUTOUT_SIZE: Record<(typeof PRODUCT_SHOWCASE_SLUGS)[number], ShowcaseCutout> = {
  "greenplus-elgucare": {
    src: "/products/showcase-cutouts/greenplus-elgucare.webp",
    width: 987,
    height: 1000,
  },
  "huamao-progifted-lp28": {
    src: "/products/showcase-cutouts/huamao-progifted-lp28.webp",
    width: 1080,
    height: 1000,
  },
  "tianxia-chan-c-80": {
    src: "/products/showcase-cutouts/tianxia-chan-c-80.webp",
    width: 945,
    height: 1000,
  },
  "chungchi-ganmeijia-coral-ca": {
    src: "/products/showcase-cutouts/chungchi-ganmeijia-coral-ca.webp",
    width: 1311,
    height: 1000,
  },
  "gaoyouzhi-vitamin-b-60": {
    src: "/products/showcase-cutouts/gaoyouzhi-vitamin-b-60.webp",
    width: 1362,
    height: 1000,
  },
  "chungchi-yiyuansu-gastrodia-100": {
    src: "/products/showcase-cutouts/chungchi-yiyuansu-gastrodia-100.webp",
    width: 912,
    height: 1000,
  },
  "yuanding-puregps-defense-450": {
    src: "/products/showcase-cutouts/yuanding-puregps-defense-450.webp",
    width: 756,
    height: 1000,
  },
  "aob-vitality-beauty-45": {
    src: "/products/showcase-cutouts/aob-vitality-beauty-45.webp",
    width: 1117,
    height: 1000,
  },
};

export function productShowcaseItems(drugs: readonly Drug[]): ShowcaseItem[] {
  const bySlug = new Map(drugs.map((drug) => [drug.slug, drug]));
  return PRODUCT_SHOWCASE_SLUGS.flatMap((slug) => {
    const drug = bySlug.get(slug);
    const cutout = SHOWCASE_CUTOUT_SIZE[slug];
    // 仍要求目錄裡有去背包裝照，確保精選品項是真實商品資料。
    return drug?.image?.kind === "packshot" ? [{ drug, cutout }] : [];
  });
}

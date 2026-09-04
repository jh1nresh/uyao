import type { Drug } from "./types";

export interface ShowcaseCutout {
  src: string;
  width: number;
  height: number;
}

export interface ShowcaseItem {
  drug: Drug;
  /** 從原本櫃景獨立抠出的去背圖；不含木板。 */
  cutout: ShowcaseCutout;
}

/**
 * 首頁精選八項。
 * 用「原本畫好的櫃景」裡独立抠出的商品去背圖做滑動放大，
 * 不再鋪整幅櫃景，也不再把商品貼回木板底板。
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

/** 柜景抠出圖尺寸（產生時統一高度 1000，寬依商品比例）。 */
const SHOWCASE_CUTOUT_SIZE: Record<(typeof PRODUCT_SHOWCASE_SLUGS)[number], ShowcaseCutout> = {
  "greenplus-elgucare": {
    src: "/products/showcase-cutouts/greenplus-elgucare.webp",
    width: 867,
    height: 1000,
  },
  "huamao-progifted-lp28": {
    src: "/products/showcase-cutouts/huamao-progifted-lp28.webp",
    width: 1080,
    height: 1000,
  },
  "tianxia-chan-c-80": {
    src: "/products/showcase-cutouts/tianxia-chan-c-80.webp",
    width: 946,
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
    width: 888,
    height: 1000,
  },
  "yuanding-puregps-defense-450": {
    src: "/products/showcase-cutouts/yuanding-puregps-defense-450.webp",
    width: 1574,
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

import type { Drug } from "./types";

export interface ShowcaseCutout {
  src: string;
  width: number;
  height: number;
}

export interface ShowcaseItem {
  drug: Drug;
  /**
   * 貨架上的商品圖。必須是完整入鏡的包裝實拍，不能用藥櫃抠圖：
   * 那些圖貼邊裁切，盒子還被木格擋住一半。
   */
  cutout: ShowcaseCutout;
}

/**
 * 首頁精選八項。
 * 用完整包裝實拍做滑動放大貨架，不要整幅櫃景、也不貼回木板。
 * 藥櫃抠圖看起來像貨架，但盒子不完整，不能拿來當商品圖。
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
    const image = drug?.image;
    // 目錄必須有真實包裝照；精選貨架直接用那張，不要再換成不完整的櫃景抠圖。
    if (!drug || image?.kind !== "packshot") return [];
    return [
      {
        drug,
        cutout: { src: image.src, width: image.width, height: image.height },
      },
    ];
  });
}

import type { Drug } from "./types";

export interface ShowcaseItem {
  drug: Drug;
  /** Product, contact shadows and shelf share one composition. */
  scene: { src: string; width: number; height: number };
}

// Reference order: B group on the left, Elgucare in the center, AOB on the right.
const PRODUCT_SHOWCASE_SLUGS = [
  "greenplus-elgucare",
  "aob-vitality-beauty-45",
  "chungchi-yiyuansu-gastrodia-100",
  "yuanding-puregps-defense-450",
  "chungchi-ganmeijia-coral-ca",
  "tianxia-chan-c-80",
  "huamao-progifted-lp28",
  "gaoyouzhi-vitamin-b-60",
] as const;

export function productShowcaseScene(slug: string): ShowcaseItem["scene"] | null {
  if (!PRODUCT_SHOWCASE_SLUGS.some((item) => item === slug)) return null;
  return { src: `/products/shelf-scenes-v2/${slug}.webp`, width: 1200, height: 800 };
}

export function productShowcaseItems(drugs: readonly Drug[]): ShowcaseItem[] {
  const bySlug = new Map(drugs.map((drug) => [drug.slug, drug]));
  return PRODUCT_SHOWCASE_SLUGS.flatMap((slug) => {
    const drug = bySlug.get(slug);
    if (drug?.image?.kind !== "packshot") return [];
    const scene = productShowcaseScene(slug);
    return scene ? [{ drug, scene }] : [];
  });
}

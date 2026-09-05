import type { Drug } from "./types";

export interface ShowcaseCutout {
  src: string;
  width: number;
  height: number;
}

export interface ShowcaseItem {
  drug: Drug;
  cutout: ShowcaseCutout;
  bay: "wide" | "plain" | "sunlit";
  /** Physical package height relative to the shelf, independent of selection. */
  shelfHeight: number;
}

// Homepage illustrations only; catalog/detail pages retain the original packshots.
// Reference order: B group on the left, Elgucare in the wide bay, AOB on the right.
const PRODUCT_SHOWCASE_SLUGS = [
  ["greenplus-elgucare", "wide", 88, 876, 900],
  ["aob-vitality-beauty-45", "sunlit", 62, 705, 900],
  ["chungchi-yiyuansu-gastrodia-100", "plain", 62, 900, 765],
  ["yuanding-puregps-defense-450", "plain", 68, 900, 824],
  ["chungchi-ganmeijia-coral-ca", "sunlit", 62, 586, 900],
  ["tianxia-chan-c-80", "plain", 62, 673, 900],
  ["huamao-progifted-lp28", "plain", 66, 821, 900],
  ["gaoyouzhi-vitamin-b-60", "plain", 72, 900, 821],
] as const;

export function productShowcaseItems(drugs: readonly Drug[]): ShowcaseItem[] {
  const bySlug = new Map(drugs.map((drug) => [drug.slug, drug]));
  return PRODUCT_SHOWCASE_SLUGS.flatMap(([slug, bay, shelfHeight, width, height]) => {
    const drug = bySlug.get(slug);
    if (drug?.image?.kind !== "packshot") return [];
    const src = `/products/shelf-renders-v1/${slug}.webp`;
    return [{ drug, cutout: { src, width, height }, bay, shelfHeight }];
  });
}

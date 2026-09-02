import type { Drug } from "./types";

export interface ShowcaseItem {
  drug: Drug;
  /** 背景色塊；同一支品項每次都同色，不隨機。 */
  wedge: string;
}

/** 從包裝主色取色，只收有獨立商品照、能站上輪播舞台的品項。 */
const PRODUCT_WEDGES: Readonly<Record<string, string>> = {
  "greenplus-elgucare": "#c9dcc2",
  "huamao-progifted-lp28": "#bcd9c4",
  "tianxia-chan-c-80": "#f0c94f",
  "chungchi-ganmeijia-coral-ca": "#f0b8a8",
  "gaoyouzhi-vitamin-b-60": "#e3a0a0",
  "chungchi-yiyuansu-gastrodia-100": "#e8c98a",
  "yuanding-puregps-defense-450": "#a9c6e0",
  "aob-vitality-beauty-45": "#cfe0b6",
};

export function productShowcaseItems(drugs: readonly Drug[]): ShowcaseItem[] {
  return drugs.flatMap((drug) => {
    const wedge = PRODUCT_WEDGES[drug.slug];
    return drug.image?.kind === "packshot" && wedge ? [{ drug, wedge }] : [];
  });
}

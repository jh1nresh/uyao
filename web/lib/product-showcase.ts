import type { Drug } from "./types";
import { drugCopy, type Locale } from "./i18n";

type ShowcaseCopy = Pick<ReturnType<typeof drugCopy>, "name" | "spec" | "drugClass" | "nutritionFocus">;

export interface ShowcaseItem {
  slug: string;
  copy: Record<Locale, ShowcaseCopy>;
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

const ADDITIONAL_SHELF_SLUGS: readonly string[] = [
  "cm-jinguguanjian-sr",
  "likuo-fish-oil-30",
  "tianxia-yangshen-jingqu",
  "hongren-riqingsheng-lm",
  "cm-guer-gan-150mg",
  "gude-yishengning-p",
  "jingcui-huxinan",
  "toyo-cukang-b",
  "icheng-meileshi",
  "icheng-siyunmeng",
  "bio-stand-calcium-softgel",
  "rending-gujieyou",
  "ouye-jingyong",
  "greenplus-vasopower",
  "greenplus-discpower",
  "puda-grape-seed",
  "puda-green-tea-compound",
  "yingkai-guguanjian-ucii",
  "youquan-super-magnesium",
  "chung-jih-youweining",
  "luhsin-l-glutamine",
];

export function productShowcaseScene(slug: string): ShowcaseItem["scene"] | null {
  if (ADDITIONAL_SHELF_SLUGS.includes(slug)) return { src: `/products/shelf-scenes-v3/${slug}.webp`, width: 1200, height: 800 };
  if (!PRODUCT_SHOWCASE_SLUGS.some((item) => item === slug)) return null;
  return { src: `/products/shelf-scenes-v2/${slug}.webp`, width: 1200, height: 800 };
}

export function productShowcaseItems(drugs: readonly Drug[]): ShowcaseItem[] {
  const bySlug = new Map(drugs.map((drug) => [drug.slug, drug]));
  return PRODUCT_SHOWCASE_SLUGS.flatMap((slug) => {
    const drug = bySlug.get(slug);
    if (drug?.image?.kind !== "packshot") return [];
    const scene = productShowcaseScene(slug);
    if (!scene) return [];
    // Only ship the fields the carousel renders, not full packaging/source data.
    const display = (locale: Locale): ShowcaseCopy => {
      const { name, spec, drugClass, nutritionFocus } = drugCopy(drug, locale);
      return { name, spec, drugClass, nutritionFocus };
    };
    return [{ slug, copy: { zh: display("zh"), en: display("en") }, scene }];
  });
}

import type { Drug } from "@/lib/types";

export type CatalogGroupSlug =
  | "all"
  | "joint"
  | "fish-vision"
  | "vitamins-minerals"
  | "probiotics-digestion"
  | "botanical-blends"
  | "other";

export interface CatalogGroup {
  slug: CatalogGroupSlug;
  name: string;
  nameEn: string;
}

export const CATALOG_GROUPS: CatalogGroup[] = [
  { slug: "all", name: "全部", nameEn: "All" },
  { slug: "joint", name: "關節營養", nameEn: "Joint nutrition" },
  { slug: "fish-vision", name: "魚油與視力", nameEn: "Fish oil & vision" },
  { slug: "vitamins-minerals", name: "維生素與礦物質", nameEn: "Vitamins & minerals" },
  { slug: "probiotics-digestion", name: "益生菌與消化", nameEn: "Probiotics & digestion" },
  { slug: "botanical-blends", name: "植物與複方", nameEn: "Botanical blends" },
  { slug: "other", name: "其他品項", nameEn: "Other items" },
];

export const CATALOG_PAGE_SIZE = 12;

const GROUP_BY_DRUG_SLUG: Record<string, Exclude<CatalogGroupSlug, "all">> = {
  // Notion 僅有品名，不能從名稱推定成分或保養用途。
  "deligan": "other",
  "jinxin-sutongning": "other",
  "hulishun": "other",
  "xielining": "other",
  "hugu-gaishu-100": "joint",
  "guanlihu-60": "joint",
  "cm-jinguguanjian-sr": "joint",
  "rending-gujieyou": "joint",
  "greenplus-discpower": "joint",
  "greenplus-elgucare": "joint",
  "yingkai-guguanjian-ucii": "joint",
  "top-fish-oil-60": "fish-vision",
  "shuwei-600-fish-oil-60": "fish-vision",
  "baiyi-capsule-60": "fish-vision",
  "wewell-vision-softgel": "fish-vision",
  "likuo-fish-oil-30": "fish-vision",
  "jixiang-jishukang": "fish-vision",
  "bio-stand-calcium-softgel": "vitamins-minerals",
  "youquan-super-magnesium": "vitamins-minerals",
  "chungchi-ganmeijia-coral-ca": "vitamins-minerals",
  "tianxia-chan-c-80": "vitamins-minerals",
  "gaoyouzhi-vitamin-b-60": "vitamins-minerals",
  "jingcui-huxinan": "vitamins-minerals",
  "toyo-cukang-b": "vitamins-minerals",
  "jinjiweichang-60": "probiotics-digestion",
  "hongren-riqingsheng-lm": "probiotics-digestion",
  "chung-jih-youweining": "probiotics-digestion",
  "luhsin-l-glutamine": "probiotics-digestion",
  "huamao-progifted-lp28": "probiotics-digestion",
  "shengkangning-150": "botanical-blends",
  "entineng-230": "botanical-blends",
  "keqiqing-capsule": "botanical-blends",
  "huzhikang-60": "botanical-blends",
  "huzhikang-150": "botanical-blends",
  "kimura-tiancheng-60": "botanical-blends",
  "cm-sheliwei-softgel": "botanical-blends",
  "tianxia-yangshen-jingqu": "botanical-blends",
  "cm-guer-gan-150mg": "botanical-blends",
  "gude-yishengning-p": "botanical-blends",
  "icheng-meileshi": "botanical-blends",
  "icheng-siyunmeng": "botanical-blends",
  "ouye-jingyong": "botanical-blends",
  "greenplus-vasopower": "botanical-blends",
  "puda-grape-seed": "botanical-blends",
  "puda-green-tea-compound": "botanical-blends",
  // 成分未知的品項沿用複方桶 —— 護智慷 60 粒也在這裡。這一格是「複方／其他」
  // 的實際用途，不是在宣稱 AOB 是植物萃取。
  "aob-vitality-beauty-45": "botanical-blends",
  "chungchi-yiyuansu-gastrodia-100": "botanical-blends",
  // 酵母來源的葡聚多醣體不是植物萃取，但複方分類是目前唯一放得下的瀏覽群。
  "yuanding-puregps-defense-450": "botanical-blends",
};

const FEATURED_CATALOG_SLUGS = [
  "hugu-gaishu-100",
  "top-fish-oil-60",
  "bio-stand-calcium-softgel",
  "hongren-riqingsheng-lm",
  "cm-sheliwei-softgel",
  "chung-jih-youweining",
  "wewell-vision-softgel",
  "yingkai-guguanjian-ucii",
] as const;

function normalizeCatalogText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, "");
}

export function isCatalogGroupSlug(value: string | undefined): value is CatalogGroupSlug {
  return CATALOG_GROUPS.some((group) => group.slug === value);
}

export function catalogGroupForDrug(drug: Drug): Exclude<CatalogGroupSlug, "all"> | undefined {
  return GROUP_BY_DRUG_SLUG[drug.slug];
}

export function featuredCatalogDrugs(drugs: Drug[]): Drug[] {
  const bySlug = new Map(drugs.map((drug) => [drug.slug, drug]));
  return FEATURED_CATALOG_SLUGS.flatMap((slug) => {
    const drug = bySlug.get(slug);
    return drug ? [drug] : [];
  });
}

export function filterCatalogDrugs(
  drugs: Drug[],
  { query = "", group = "all" }: { query?: string; group?: CatalogGroupSlug },
): Drug[] {
  const normalizedQuery = normalizeCatalogText(query.trim());

  return drugs.filter((drug) => {
    if (group !== "all" && catalogGroupForDrug(drug) !== group) return false;
    if (!normalizedQuery) return true;

    const searchable = [
      drug.name,
      ...drug.aliases,
      ...drug.ingredients,
      drug.nutritionFocus,
      ...drug.searchTerms,
      drug.manufacturer ?? "",
      drug.origin ?? "",
    ];
    return searchable.some((value) => normalizeCatalogText(value).includes(normalizedQuery));
  });
}

export function paginateCatalogDrugs(
  drugs: Drug[],
  rawPage: string | undefined,
  pageSize = CATALOG_PAGE_SIZE,
): { drugs: Drug[]; page: number; pageCount: number } {
  const parsedPage = Number.parseInt(rawPage ?? "", 10);
  const pageCount = Math.max(1, Math.ceil(drugs.length / pageSize));
  const page = Number.isFinite(parsedPage)
    ? Math.min(Math.max(parsedPage, 1), pageCount)
    : 1;
  const start = (page - 1) * pageSize;

  return {
    drugs: drugs.slice(start, start + pageSize),
    page,
    pageCount,
  };
}

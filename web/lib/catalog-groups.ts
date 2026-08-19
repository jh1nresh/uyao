import type { Drug } from "@/lib/types";

export type CatalogGroupSlug =
  | "all"
  | "joint"
  | "fish-vision"
  | "vitamins-minerals"
  | "probiotics-digestion"
  | "botanical-blends";

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
];

export const CATALOG_PAGE_SIZE = 12;

// 只列目前公開目錄裡的品項。分類清單本身保持完整（品項回來時分得回去），
// 但這張對照表跟著目錄走 —— 留著已下架品項的分類會讓「每項都有分類」這條
// 檢查對著不存在的 slug 空轉。
const GROUP_BY_DRUG_SLUG: Record<string, Exclude<CatalogGroupSlug, "all">> = {
  "hugu-gaishu-100": "joint",
  "top-fish-oil-60": "fish-vision",
  "shuwei-600-fish-oil-60": "fish-vision",
  "baiyi-capsule-60": "fish-vision",
  "jinjiweichang-60": "probiotics-digestion",
  "shengkangning-150": "botanical-blends",
  "entineng-230": "botanical-blends",
  "keqiqing-capsule": "botanical-blends",
  "huzhikang-150": "botanical-blends",
};

const FEATURED_CATALOG_SLUGS = [
  "hugu-gaishu-100",
  "top-fish-oil-60",
  "shuwei-600-fish-oil-60",
  "baiyi-capsule-60",
  "jinjiweichang-60",
  "shengkangning-150",
  "entineng-230",
  "keqiqing-capsule",
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

/**
 * 導覽只列現在真的有品項的分類。分類清單是固定的分類法，但空分類點進去
 * 是一頁零結果 —— 品項下架期間不該還掛著那個入口。
 */
export function nonEmptyCatalogGroups(drugs: Drug[]): CatalogGroup[] {
  const populated = new Set(drugs.map((drug) => catalogGroupForDrug(drug)));
  return CATALOG_GROUPS.filter((group) => group.slug === "all" || populated.has(group.slug));
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

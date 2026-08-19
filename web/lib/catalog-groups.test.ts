import { describe, expect, it } from "vitest";

import {
  CATALOG_GROUPS,
  catalogGroupForDrug,
  featuredCatalogDrugs,
  filterCatalogDrugs,
  nonEmptyCatalogGroups,
  paginateCatalogDrugs,
} from "./catalog-groups";
import { allDrugs } from "./data";

describe("合作藥局品項瀏覽", () => {
  it("每一項都有且只有一個固定瀏覽分類", () => {
    const drugs = allDrugs();
    expect(drugs).toHaveLength(9);
    expect(drugs.filter((drug) => catalogGroupForDrug(drug) === undefined)).toEqual([]);

    const groupedCount = CATALOG_GROUPS.filter((group) => group.slug !== "all")
      .map((group) => filterCatalogDrugs(drugs, { group: group.slug }).length)
      .reduce((sum, count) => sum + count, 0);
    expect(groupedCount).toBe(drugs.length);
  });

  it("首頁固定顯示八項，且每一項都還在目錄裡", () => {
    const drugs = allDrugs();
    const featured = featuredCatalogDrugs(drugs);
    const catalogSlugs = new Set(drugs.map((drug) => drug.slug));

    expect(featured).toHaveLength(8);
    for (const drug of featured) expect(catalogSlugs.has(drug.slug)).toBe(true);
  });

  /**
   * 分類法是固定的，目錄卻會變動。導覽只列得出還有品項的分類 —— 空分類點進去
   * 是一頁零結果，等於替下架的品項留一個死入口。
   */
  it("導覽不列出目前沒有品項的分類", () => {
    const drugs = allDrugs();
    const shown = nonEmptyCatalogGroups(drugs);

    expect(shown[0]?.slug).toBe("all");
    for (const group of shown.slice(1)) {
      expect(filterCatalogDrugs(drugs, { group: group.slug }).length).toBeGreaterThan(0);
    }
    expect(shown.length).toBeLessThan(CATALOG_GROUPS.length);
    expect(shown.map((group) => group.slug)).not.toContain("vitamins-minerals");
  });

  it("可依分類與產品資料做確定性篩選", () => {
    expect(filterCatalogDrugs(allDrugs(), { group: "fish-vision", query: "EPA" }))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ slug: "shuwei-600-fish-oil-60" }),
      ]));
    expect(filterCatalogDrugs(allDrugs(), { query: "南瓜子油" }))
      .toEqual(expect.arrayContaining([expect.objectContaining({ slug: "shengkangning-150" })]));
  });

  it("完整目錄每頁最多十二項，超出範圍時落在有效頁", () => {
    const drugs = allDrugs();
    const firstPage = paginateCatalogDrugs(drugs, undefined);
    const lastPage = paginateCatalogDrugs(drugs, "99");

    expect(firstPage).toMatchObject({ page: 1, pageCount: 1 });
    expect(firstPage.drugs).toHaveLength(9);
    expect(lastPage).toMatchObject({ page: 1, pageCount: 1 });
    expect(paginateCatalogDrugs(drugs, undefined, 4)).toMatchObject({ page: 1, pageCount: 3 });
    expect(paginateCatalogDrugs(drugs, "99", 4)).toMatchObject({ page: 3, pageCount: 3 });
  });
});

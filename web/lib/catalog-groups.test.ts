import { describe, expect, it } from "vitest";

import {
  CATALOG_GROUPS,
  catalogGroupForDrug,
  featuredCatalogDrugs,
  filterCatalogDrugs,
  paginateCatalogDrugs,
} from "./catalog-groups";
import { allDrugs } from "./data";

describe("合作藥局品項瀏覽", () => {
  it("每一項都有且只有一個固定瀏覽分類", () => {
    const drugs = allDrugs();
    expect(drugs).toHaveLength(40);
    expect(drugs.filter((drug) => catalogGroupForDrug(drug) === undefined)).toEqual([]);

    const groupedCount = CATALOG_GROUPS.filter((group) => group.slug !== "all")
      .map((group) => filterCatalogDrugs(drugs, { group: group.slug }).length)
      .reduce((sum, count) => sum + count, 0);
    expect(groupedCount).toBe(drugs.length);
  });

  it("首頁固定顯示八項，涵蓋五個瀏覽分類", () => {
    const featured = featuredCatalogDrugs(allDrugs());
    expect(featured).toHaveLength(8);
    expect(new Set(featured.map((drug) => catalogGroupForDrug(drug))).size).toBe(5);
  });

  it("可依分類與產品資料做確定性篩選", () => {
    expect(filterCatalogDrugs(allDrugs(), { group: "fish-vision", query: "EPA" }))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ slug: "shuwei-600-fish-oil-60" }),
        expect.objectContaining({ slug: "likuo-fish-oil-30" }),
      ]));
    expect(filterCatalogDrugs(allDrugs(), { query: "中美醫藥" }))
      .toEqual(expect.arrayContaining([expect.objectContaining({ slug: "cm-sheliwei-softgel" })]));
  });

  it("完整目錄每頁最多十二項，超出範圍時落在有效頁", () => {
    const drugs = allDrugs();
    const firstPage = paginateCatalogDrugs(drugs, undefined);
    const lastPage = paginateCatalogDrugs(drugs, "99");

    expect(firstPage).toMatchObject({ page: 1, pageCount: 4 });
    expect(firstPage.drugs).toHaveLength(12);
    expect(lastPage).toMatchObject({ page: 4, pageCount: 4 });
    expect(lastPage.drugs).toHaveLength(4);
  });
});

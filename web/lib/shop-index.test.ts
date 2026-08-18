import { describe, expect, it } from "vitest";

import { allDrugs } from "./data";
import { SHOP_INDEXABLE_PATHS } from "./seo";
import {
  indexableCatalogItems,
  isIndexableCatalogItem,
  isIndexableCatalogItemSlug,
  shopIndexablePaths,
} from "./shop-index";

describe("consumer admission gate", () => {
  it("admits only items that carry a cited source or an own packshot", () => {
    for (const drug of allDrugs()) {
      expect(isIndexableCatalogItem(drug, "zh")).toBe(Boolean(drug.source) || Boolean(drug.image));
    }
  });

  it("never admits an English URL whose title would still be Chinese", () => {
    for (const drug of allDrugs()) {
      if (isIndexableCatalogItem(drug, "en")) {
        expect(drug.nameEn, drug.slug).toBeTruthy();
        expect(isIndexableCatalogItem(drug, "zh")).toBe(true);
      }
    }
    for (const drug of indexableCatalogItems("en")) {
      expect(shopIndexablePaths()).toContain(`/en/drug/${drug.slug}`);
    }
  });

  it("leaves placeholder catalog rows out", () => {
    const admitted = indexableCatalogItems();
    const rejected = allDrugs().filter((drug) => !isIndexableCatalogItem(drug, "zh"));

    expect(admitted.length).toBeGreaterThan(0);
    expect(rejected.length).toBeGreaterThan(0);
    for (const drug of rejected) {
      expect(isIndexableCatalogItemSlug(drug.slug, "zh")).toBe(false);
      expect(isIndexableCatalogItemSlug(drug.slug, "en")).toBe(false);
    }
  });

  it("publishes every admitted item in the locales whose copy exists", () => {
    const paths = shopIndexablePaths();

    for (const entry of SHOP_INDEXABLE_PATHS) {
      expect(paths).toContain(entry);
    }
    for (const drug of indexableCatalogItems("zh")) {
      expect(paths).toContain(`/zh-tw/drug/${drug.slug}`);
      expect(paths.includes(`/en/drug/${drug.slug}`)).toBe(Boolean(drug.nameEn));
    }
    expect(paths).toContain("/zh-tw/category/partner-item");
    expect(paths).toContain("/en/category/partner-item");
  });

  it("never publishes search, store, or reservation-receipt routes", () => {
    for (const path of shopIndexablePaths()) {
      expect(path).not.toMatch(/\/(search|store|r)(\/|$)/);
    }
  });

  it("emits no duplicate URLs", () => {
    const paths = shopIndexablePaths();
    expect(new Set(paths).size).toBe(paths.length);
  });
});

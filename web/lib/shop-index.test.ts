import { describe, expect, it } from "vitest";

import { allDrugs } from "./data";
import {
  indexableCatalogItems,
  shopSitemapEntries,
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

    for (const home of ["/zh-tw", "/en"]) {
      expect(paths).toContain(home);
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

  it("dates every catalog item with a real, non-future ISO day", () => {
    // Seeded from `git log -- lib/data.ts`; from here it is hand-maintained
    // per item, so a new product without a date is a bug, not a default.
    const today = process.env.UYAO_TEST_TODAY ?? "2026-08-18";

    for (const drug of allDrugs()) {
      expect(drug.updatedOn, drug.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(drug.updatedOn <= today, `${drug.slug} is dated in the future`).toBe(true);
    }
  });

  it("keeps every sitemap entry's freshness tied to a path it actually publishes", () => {
    const entries = shopSitemapEntries();
    expect(entries.map((entry) => entry.path)).toEqual(shopIndexablePaths());
    expect(entries.every((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.lastModified))).toBe(true);
  });
});

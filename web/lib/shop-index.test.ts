import { describe, expect, it } from "vitest";

import { allDrugs, allStores } from "./data";
import {
  indexableCatalogItems,
  shopSitemapEntries,
  isIndexableCatalogItem,
  isIndexableCatalogItemSlug,
  shopIndexablePaths,
  sitemapEntriesFor,
} from "./shop-index";
import type { CategorySlug, Drug, IsoDate } from "./types";

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

  it("never publishes search or reservation-receipt routes", () => {
    for (const path of shopIndexablePaths()) {
      expect(path).not.toMatch(/\/(search|r)(\/|$)/);
    }
  });

  // 藥局頁只有公開藥局資料，不列品項也不講供應，所以收錄。但只收中文：
  // 藥局名是中文，英文版標題跟中文版一模一樣，收了就是近似重複頁。
  it("publishes every pharmacy in Chinese only", () => {
    const paths = shopIndexablePaths();

    for (const store of allStores()) {
      expect(paths).toContain(`/zh-tw/store/${store.slug}`);
      expect(paths).not.toContain(`/en/store/${store.slug}`);
    }
  });

  // 藥局是整批的開放資料快照，沒有逐筆 updatedOn —— 但 lastmod 仍然要是
  // 一個真實、不隨每次 build 前進的日期，否則 Google 會停止相信這個訊號。
  it("dates pharmacy pages with a real, non-future ISO day", () => {
    const today = process.env.UYAO_TEST_TODAY ?? "2026-08-19";
    const storeEntries = shopSitemapEntries().filter((entry) =>
      entry.path.includes("/store/"),
    );

    expect(storeEntries.length).toBe(allStores().length);
    for (const entry of storeEntries) {
      expect(entry.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.lastModified <= today).toBe(true);
    }
  });

  it("emits no duplicate URLs", () => {
    const paths = shopIndexablePaths();
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("dates every catalog item with a real, non-future ISO day", () => {
    // Seeded from `git log -- lib/data.ts`; from here it is hand-maintained
    // per item, so a new product without a date is a bug, not a default.
    const today = process.env.UYAO_TEST_TODAY ?? "2026-09-05";

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

/**
 * 真實目錄只有 `partner-item` 一個品類，所以它自己的資料永遠證明不了
 * 「改 A 品類不會推掉 B 品類的 lastmod」—— 兩種算法在單一品類下結果相同。
 * 這組合成資料是唯一擋得住那個回歸的方式：加第二個品類之前它就先失敗。
 */
describe("category freshness across more than one category", () => {
  const base = allDrugs().find((drug) => isIndexableCatalogItem(drug, "zh"))!;

  // `category` 用 cast 是刻意的：`CategorySlug` 現在只有一個值，第二個品類
  // 是為了測試而合成的，不該為了測試去擴張產品型別。
  const item = (slug: string, category: string, updatedOn: IsoDate): Drug => ({
    ...base,
    slug,
    category: category as CategorySlug,
    updatedOn,
  });

  const CATEGORIES = [{ slug: "partner-item" }, { slug: "seasonal" }] as const;
  const DRUGS: Drug[] = [
    item("partner-old", "partner-item", "2026-01-02"),
    item("partner-new", "partner-item", "2026-03-04"),
    item("seasonal-only", "seasonal", "2026-02-03"),
  ];

  const dates = (drugs: Drug[]) =>
    new Map(sitemapEntriesFor(CATEGORIES, drugs).map((entry) => [entry.path, entry.lastModified]));

  it("dates a category page from the items in that category alone", () => {
    const byPath = dates(DRUGS);

    expect(byPath.get("/zh-tw/category/partner-item")).toBe("2026-03-04");
    expect(byPath.get("/zh-tw/category/seasonal")).toBe("2026-02-03");
  });

  it("moves only the touched category when one item's copy changes", () => {
    const before = dates(DRUGS);
    const after = dates(
      DRUGS.map((drug) =>
        drug.slug === "partner-new" ? { ...drug, updatedOn: "2026-05-06" as IsoDate } : drug,
      ),
    );

    expect(after.get("/zh-tw/category/partner-item")).toBe("2026-05-06");
    expect(after.get("/zh-tw/category/seasonal")).toBe(
      before.get("/zh-tw/category/seasonal"),
    );
    expect(after.get("/zh-tw/drug/seasonal-only")).toBe(
      before.get("/zh-tw/drug/seasonal-only"),
    );
  });

  it("still summarises the whole catalog on the homepage", () => {
    // 首頁列的是整份目錄，所以它跟著任何一個品類動 —— 這正是它和品類頁的差別。
    expect(dates(DRUGS).get("/zh-tw")! >= "2026-03-04").toBe(true);
  });

  it("falls back to a real date for a category with no admitted items", () => {
    const byPath = dates(DRUGS.filter((drug) => drug.slug !== "seasonal-only"));

    expect(byPath.get("/zh-tw/category/seasonal")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

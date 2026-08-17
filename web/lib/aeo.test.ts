import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { AEO_ANSWER_PAGES, AEO_PAGES, sitemapLastModified } from "./aeo";
import { INDEXABLE_PATHS } from "./seo";

const PAGE_SOURCE = {
  evidence: new URL("../app/evidence/page.tsx", import.meta.url),
  aiToolsPharmacyInventory: new URL(
    "../app/guides/ai-tools-pharmacy-inventory/page.tsx",
    import.meta.url,
  ),
  pharmacyExpiryManagement: new URL(
    "../app/guides/pharmacy-expiry-management/page.tsx",
    import.meta.url,
  ),
  pharmacyReturnWindow: new URL(
    "../app/guides/pharmacy-return-window/page.tsx",
    import.meta.url,
  ),
  findMedicineNearby: new URL(
    "../app/guides/find-medicine-nearby/page.tsx",
    import.meta.url,
  ),
  medicineOutOfStock: new URL(
    "../app/guides/medicine-out-of-stock/page.tsx",
    import.meta.url,
  ),
  joinUyao: new URL("../app/guides/join-uyao/page.tsx", import.meta.url),
  uyaoVsPos: new URL("../app/compare/uyao-vs-pos/page.tsx", import.meta.url),
} satisfies Record<keyof typeof AEO_PAGES, URL>;

describe("AEO answer contract", () => {
  it("registers every indexable evidence, guide, and comparison page", () => {
    const expected = INDEXABLE_PATHS.filter((path) =>
      /^\/zh-tw\/(evidence|guides\/|compare\/)/.test(path),
    ).sort();
    const registered = AEO_ANSWER_PAGES.map((page) => page.path).sort();

    expect(registered).toEqual(expected);
    expect(new Set(registered).size).toBe(registered.length);
  });

  it("keeps concise direct answers and distinct benchmark questions", () => {
    const queries = AEO_ANSWER_PAGES.flatMap((page) => page.benchmarkQueries);

    expect(new Set(queries).size).toBe(queries.length);
    for (const page of AEO_ANSWER_PAGES) {
      expect(page.question).toMatch(/[？?]$/);
      expect(page.directAnswer.length).toBeGreaterThanOrEqual(30);
      expect(page.directAnswer.length).toBeLessThanOrEqual(240);
      expect(page.benchmarkQueries).toContain(page.question);
      expect(page.benchmarkQueries.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("publishes accurate ISO freshness for answer-page sitemap entries", () => {
    for (const page of AEO_ANSWER_PAGES) {
      expect(page.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(page.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(page.dateModified >= page.datePublished).toBe(true);
      expect(sitemapLastModified(page.path)).toBe(page.dateModified);
    }
    expect(sitemapLastModified("/en/evidence")).toBe(AEO_PAGES.evidence.dateModified);
  });

  it("sitemap-lastmod covers every indexable path", () => {
    for (const path of INDEXABLE_PATHS) {
      expect(sitemapLastModified(path), `missing lastmod for ${path}`).toMatch(
        /^\d{4}-\d{2}-\d{2}$/,
      );
    }
  });

  it("reports no freshness for paths that are not indexable", () => {
    expect(sitemapLastModified("/zh-tw/search")).toBeUndefined();
    expect(sitemapLastModified("/store-os")).toBeUndefined();
  });

  it("makes registry copy the visible answer and metadata source on every page", () => {
    for (const [key, file] of Object.entries(PAGE_SOURCE)) {
      const source = readFileSync(file, "utf8");

      expect(source).toContain(`AEO_PAGES.${key}`);
      expect(source).toContain("question: TITLE");
      expect(source).toContain("directAnswer: DESCRIPTION");
      expect(source).toContain("canonical: PAGE.path");
      expect(source).toContain("path: PAGE.path");
      if (key === "evidence") {
        expect(source).toContain("title: TITLE");
        expect(source).toContain("description: DESCRIPTION");
      } else {
        expect(source).toContain("{TITLE}");
        expect(source).toContain("{DESCRIPTION}");
      }
    }
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  AEO_ANSWER_PAGES,
  AEO_PAGES,
  aeoLanguages,
  aeoPath,
  sitemapLastModified,
} from "./aeo";
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

const LOCALES = ["zh", "en"] as const;

const KNOWLEDGE_PATH = /^\/(zh-tw|en)\/(evidence|guides\/|compare\/)/;

describe("AEO answer contract", () => {
  it("registers every indexable evidence, guide, and comparison page in both locales", () => {
    const expected = INDEXABLE_PATHS.filter(
      (path) => KNOWLEDGE_PATH.test(path) && path !== "/zh-tw/guides" && path !== "/en/guides",
    ).sort();
    const registered = AEO_ANSWER_PAGES.flatMap((page) => [page.path, page.enPath]).sort();

    expect(registered).toEqual(expected);
    expect(new Set(registered).size).toBe(registered.length);
  });

  it("gives every answer page a canonical URL in each locale that points at the other", () => {
    for (const page of AEO_ANSWER_PAGES) {
      expect(aeoPath(page, "zh")).toBe(page.path);
      expect(aeoPath(page, "en")).toBe(page.enPath);
      expect(page.enPath).toBe(page.path.replace(/^\/zh-tw/, "/en"));
      expect(aeoLanguages(page)).toEqual({
        "zh-TW": page.path,
        en: page.enPath,
        "x-default": page.path,
      });
    }
  });

  it("keeps concise direct answers and distinct benchmark questions in both locales", () => {
    const queries = AEO_ANSWER_PAGES.flatMap((page) =>
      LOCALES.flatMap((locale) => page[locale].benchmarkQueries),
    );

    expect(new Set(queries).size).toBe(queries.length);
    for (const page of AEO_ANSWER_PAGES) {
      for (const locale of LOCALES) {
        const copy = page[locale];
        expect(copy.question, `${page.path} ${locale}`).toMatch(/[？?]$/);
        expect(copy.directAnswer.length).toBeGreaterThanOrEqual(30);
        // English needs more characters to say the same thing as Chinese.
        expect(copy.directAnswer.length).toBeLessThanOrEqual(locale === "en" ? 400 : 240);
        expect(copy.benchmarkQueries).toContain(copy.question);
        expect(copy.benchmarkQueries.length).toBeGreaterThanOrEqual(2);
      }
      // A translation is not a second answer: the two locales must not share text.
      expect(page.en.question).not.toBe(page.zh.question);
      expect(page.en.directAnswer).not.toBe(page.zh.directAnswer);
    }
  });

  it("publishes accurate ISO freshness for both locales of an answer page", () => {
    for (const page of AEO_ANSWER_PAGES) {
      expect(page.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(page.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(page.dateModified >= page.datePublished).toBe(true);
      expect(sitemapLastModified(page.path)).toBe(page.dateModified);
      expect(sitemapLastModified(page.enPath)).toBe(page.dateModified);
    }
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

      expect(source, key).toContain(`AEO_PAGES.${key}`);
      // Metadata (title, description, canonical, hreflang, robots) comes from
      // one helper so a new locale cannot silently skip a page.
      expect(source, key).toContain("aeoPageMetadata(PAGE");

      if (key === "evidence") {
        expect(source).toContain("title: PAGE.zh.question");
        expect(source).toContain("description: PAGE.zh.directAnswer");
        expect(source).toContain("title: PAGE.en.question");
        expect(source).toContain("description: PAGE.en.directAnswer");
        expect(source).toContain("aeoPath(PAGE, locale)");
      } else {
        expect(source, key).toContain("const copy = PAGE[locale];");
        expect(source, key).toContain("{copy.question}");
        expect(source, key).toContain("{copy.directAnswer}");
        expect(source, key).toContain("aeoPath(PAGE, locale)");
        // The comparison page is a WebPage, every guide is an Article, but both
        // must build their schema from the same registry copy they render.
        const schemaHeadline = key === "uyaoVsPos" ? "name: copy.question" : "headline: copy.question";
        expect(source, key).toContain(schemaHeadline);
        expect(source, key).toContain("description: copy.directAnswer");
      }
    }
  });

  it("keeps the compare page on webPageJsonLd rather than an article", () => {
    const source = readFileSync(PAGE_SOURCE.uyaoVsPos, "utf8");
    expect(source).toContain("webPageJsonLd");
    expect(source).not.toContain("articleJsonLd");
  });
});

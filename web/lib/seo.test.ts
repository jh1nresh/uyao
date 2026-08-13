import { describe, expect, it } from "vitest";

import {
  CANONICAL_HOST,
  CONSUMER_DESCRIPTION,
  ENTITY_DESCRIPTION,
  INDEXABLE_PATHS,
  SHOP_CANONICAL_HOST,
  SHOP_INDEXABLE_PATHS,
  SITE_URL,
  X_URL,
  articleJsonLd,
  breadcrumbJsonLd,
  consumerIndexingAllowed,
  consumerWebPageJsonLd,
  consumerWebSiteJsonLd,
  faqPageJsonLd,
  indexingAllowed,
  jsonLdGraph,
  organizationJsonLd,
  softwareApplicationJsonLd,
  webPageJsonLd,
} from "./seo";

describe("indexingAllowed", () => {
  it("allows only the canonical host on production", () => {
    expect(indexingAllowed(CANONICAL_HOST, "production")).toBe(true);
    expect(indexingAllowed(`${CANONICAL_HOST}:443`, "production")).toBe(true);
  });

  it("rejects preview and development deployments even on the canonical host", () => {
    expect(indexingAllowed(CANONICAL_HOST, "preview")).toBe(false);
    expect(indexingAllowed(CANONICAL_HOST, "development")).toBe(false);
    expect(indexingAllowed(CANONICAL_HOST, undefined)).toBe(false);
  });

  it("rejects non-canonical hosts on production", () => {
    expect(indexingAllowed("uyao-abc123.vercel.app", "production")).toBe(false);
    expect(indexingAllowed("shop-uyao.vercel.app", "production")).toBe(false);
    expect(indexingAllowed(null, "production")).toBe(false);
  });
});

describe("consumerIndexingAllowed", () => {
  it("allows only the owned shop host on production", () => {
    expect(consumerIndexingAllowed(SHOP_CANONICAL_HOST, "production")).toBe(true);
    expect(consumerIndexingAllowed(`${SHOP_CANONICAL_HOST}:443`, "production")).toBe(true);
    expect(consumerIndexingAllowed(CANONICAL_HOST, "production")).toBe(false);
    expect(consumerIndexingAllowed("shop-uyao.vercel.app", "production")).toBe(false);
    expect(consumerIndexingAllowed(SHOP_CANONICAL_HOST, "preview")).toBe(false);
  });
});

describe("indexable paths", () => {
  it("includes the GEO/AEO benchmark answer pages", () => {
    expect(INDEXABLE_PATHS).toEqual(
      expect.arrayContaining([
        "/zh-tw/guides/ai-tools-pharmacy-inventory",
        "/zh-tw/guides/find-medicine-nearby",
        "/zh-tw/guides/medicine-out-of-stock",
        "/zh-tw/guides/join-uyao",
        "/zh-tw/guides/pharmacy-expiry-management",
        "/zh-tw/guides/pharmacy-return-window",
        "/zh-tw/evidence",
        "/en/evidence",
        "/zh-tw/compare/uyao-vs-pos",
      ]),
    );
  });

  it("only contains locale-prefixed canonical routes", () => {
    for (const path of INDEXABLE_PATHS) {
      expect(path).toMatch(/^\/(zh-tw|en)(\/|$)/);
    }
  });

  it("never lists consumer, console, search, or api routes", () => {
    for (const path of INDEXABLE_PATHS) {
      expect(path).not.toMatch(/\/(app|console|search|api|r)\b/);
    }
  });

  it("admits only the two localized Consumer homepages", () => {
    expect(SHOP_INDEXABLE_PATHS).toEqual(["/zh-tw", "/en"]);
  });
});

describe("json-ld", () => {
  it("keeps the organization out of medical categories and free of invented metrics", () => {
    const org = JSON.stringify(organizationJsonLd());
    const app = JSON.stringify(softwareApplicationJsonLd("zh"));
    for (const banned of ["Pharmacy", "MedicalOrganization", "aggregateRating", "review", "offers", "price"]) {
      expect(org).not.toContain(banned);
      expect(app).not.toContain(banned);
    }
  });

  it("uses the stable entity description", () => {
    expect(JSON.stringify(softwareApplicationJsonLd("zh"))).toContain(
      ENTITY_DESCRIPTION.zh.slice(0, 20),
    );
  });

  it("links the organization to the official uYao X account", () => {
    expect(organizationJsonLd()).toMatchObject({ sameAs: [X_URL] });
  });

  it("labels English evidence schema with the correct language", () => {
    expect(
      webPageJsonLd({
        name: "Evidence",
        description: "Verified product evidence",
        path: "/en/evidence",
        dateModified: "2026-08-12",
        inLanguage: "en",
      }),
    ).toMatchObject({ inLanguage: "en" });
  });

  it("builds absolute breadcrumb urls on the canonical site", () => {
    const crumb = breadcrumbJsonLd([{ name: "首頁", path: "/zh-tw" }]);
    expect(JSON.stringify(crumb)).toContain(`${SITE_URL}/zh-tw`);
  });

  it("keeps article dates and graph wrapper intact", () => {
    const article = articleJsonLd({
      headline: "t",
      description: "d",
      path: "/zh-tw/guides/x",
      datePublished: "2026-08-12",
      dateModified: "2026-08-12",
    });
    const graph = JSON.parse(jsonLdGraph([article]));
    expect(graph["@context"]).toBe("https://schema.org");
    expect(graph["@graph"][0].datePublished).toBe("2026-08-12");
  });

  it("keeps Consumer schema on the shop host and within the product boundary", () => {
    const graph = JSON.stringify([
      consumerWebSiteJsonLd("zh"),
      consumerWebPageJsonLd("zh"),
    ]);
    expect(graph).toContain(SHOP_CANONICAL_HOST);
    expect(graph).toContain(CONSUMER_DESCRIPTION.zh.slice(0, 20));
    for (const banned of ["Offer", "availability", "price", "MedicalOrganization"]) {
      expect(graph).not.toContain(banned);
    }
  });

  it("builds FAQ answers from visible question and answer copy", () => {
    expect(faqPageJsonLd([{ question: "怎麼找藥？", answer: "先搜尋，再由藥局確認。" }])).toMatchObject({
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "怎麼找藥？",
          acceptedAnswer: { "@type": "Answer", text: "先搜尋，再由藥局確認。" },
        },
      ],
    });
  });
});

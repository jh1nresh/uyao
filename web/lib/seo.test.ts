import { describe, expect, it } from "vitest";

import {
  BRAND_ALTERNATE_NAMES,
  BRAND_NAME,
  CANONICAL_HOST,
  CONSUMER_DESCRIPTION,
  ENTITY_DESCRIPTION,
  INDEXABLE_PATHS,
  ORGANIZATION_LOGO_URL,
  SHOP_CANONICAL_HOST,
  SITE_URL,
  SOCIAL_PREVIEW_IMAGES,
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
  socialPreviewAudience,
  socialPreviewImages,
  softwareApplicationJsonLd,
  webSiteJsonLd,
  webPageJsonLd,
} from "./seo";

describe("social preview metadata", () => {
  it("uses versioned locale images on the correct audience host", () => {
    for (const locale of ["zh", "en"] as const) {
      expect(SOCIAL_PREVIEW_IMAGES.company[locale].url).toBe(
        `${SITE_URL}/brand/social/uyao-company-${locale}-v1.png`,
      );
      expect(SOCIAL_PREVIEW_IMAGES.shop[locale].url).toBe(
        `https://${SHOP_CANONICAL_HOST}/brand/social/uyao-shop-${locale}-v1.png`,
      );
      expect(SOCIAL_PREVIEW_IMAGES.company[locale].url).not.toBe(
        SOCIAL_PREVIEW_IMAGES.shop[locale].url,
      );
    }
  });

  it("publishes complete Open Graph descriptors and matching Twitter images", () => {
    for (const audience of ["company", "shop"] as const) {
      for (const locale of ["zh", "en"] as const) {
        const image = SOCIAL_PREVIEW_IMAGES[audience][locale];
        const metadata = socialPreviewImages(audience, locale);
        expect(image).toMatchObject({
          width: 1200,
          height: 630,
          type: "image/png",
        });
        expect(image.alt).not.toBe("");
        expect(metadata.openGraph).toEqual([image]);
        expect(metadata.twitter).toEqual([{ url: image.url, alt: image.alt }]);
        expect(JSON.stringify(metadata)).not.toContain("opengraph-image.png");
      }
    }
  });
});

describe("socialPreviewAudience", () => {
  it("gives the shop host the consumer card", () => {
    expect(socialPreviewAudience(SHOP_CANONICAL_HOST)).toBe("shop");
    expect(socialPreviewAudience(`${SHOP_CANONICAL_HOST}:443`)).toBe("shop");
    expect(socialPreviewAudience(SHOP_CANONICAL_HOST.toUpperCase())).toBe("shop");
  });

  it("falls back to the company card so no page shares without an image", () => {
    expect(socialPreviewAudience(CANONICAL_HOST)).toBe("company");
    expect(socialPreviewAudience("uyao-abc123.vercel.app")).toBe("company");
    expect(socialPreviewAudience(null)).toBe("company");
    expect(socialPreviewAudience(undefined)).toBe("company");
  });
});

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

  it("publishes the guides pillar page that keeps the cluster one hop from home", () => {
    expect(INDEXABLE_PATHS).toEqual(expect.arrayContaining(["/zh-tw/guides", "/en/guides"]));
  });

  it("carries every knowledge page in both locales", () => {
    const knowledge = INDEXABLE_PATHS.filter((path) =>
      /^\/(zh-tw|en)\/(evidence|guides|compare)/.test(path),
    );
    const zh = knowledge.filter((path) => path.startsWith("/zh-tw/"));
    const en = knowledge.filter((path) => path.startsWith("/en/"));

    expect(zh.length).toBeGreaterThan(0);
    expect(en.map((path) => path.replace(/^\/en/, "/zh-tw")).sort()).toEqual(zh.slice().sort());
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

  it("publishes one canonical organization identity with an owned logo", () => {
    expect(organizationJsonLd()).toMatchObject({
      name: BRAND_NAME,
      alternateName: BRAND_ALTERNATE_NAMES,
      url: `${SITE_URL}/`,
      logo: ORGANIZATION_LOGO_URL,
    });
  });

  it("keeps the website name and aliases stable across locales", () => {
    for (const locale of ["zh", "en"] as const) {
      expect(webSiteJsonLd(locale)).toMatchObject({
        name: BRAND_NAME,
        alternateName: [...BRAND_ALTERNATE_NAMES, CANONICAL_HOST],
        url: `${SITE_URL}/`,
      });
    }
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

  it("gives every article an absolute rich-result image", () => {
    const base = {
      headline: "t",
      description: "d",
      path: "/zh-tw/guides/x",
      datePublished: "2026-08-12",
      dateModified: "2026-08-12",
    };
    expect(articleJsonLd(base).image).toBe(SOCIAL_PREVIEW_IMAGES.company.zh.url);
    expect(articleJsonLd(base).image).toMatch(/^https:\/\//);
    expect(articleJsonLd({ ...base, image: `${SITE_URL}/brand/own.png` }).image).toBe(
      `${SITE_URL}/brand/own.png`,
    );
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

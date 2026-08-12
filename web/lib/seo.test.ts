import { describe, expect, it } from "vitest";

import {
  CANONICAL_HOST,
  ENTITY_DESCRIPTION,
  INDEXABLE_PATHS,
  SITE_URL,
  articleJsonLd,
  breadcrumbJsonLd,
  indexingAllowed,
  jsonLdGraph,
  organizationJsonLd,
  softwareApplicationJsonLd,
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

describe("indexable paths", () => {
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
});

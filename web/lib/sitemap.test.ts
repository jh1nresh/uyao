import { beforeEach, describe, expect, it, vi } from "vitest";

let host = "";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host }),
}));

const sitemap = (await import("../app/sitemap")).default;

const { INDEXABLE_PATHS, SHOP_CANONICAL_HOST, CANONICAL_HOST, SITE_URL, STORE_CANONICAL_HOST, STORE_URL } =
  await import("./seo");
const { SHOP_URL } = await import("./shop");
const { shopIndexablePaths, indexableCatalogItems } = await import("./shop-index");

describe("sitemap host routing", () => {
  beforeEach(() => {
    host = "";
  });

  it("serves the company namespace on the company host", async () => {
    host = CANONICAL_HOST;
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toEqual(INDEXABLE_PATHS.map((path) => `${SITE_URL}${path}`));
    for (const url of urls) {
      expect(url.startsWith(SITE_URL)).toBe(true);
    }
  });

  it("serves the consumer namespace on the shop host", async () => {
    host = SHOP_CANONICAL_HOST;
    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toEqual(shopIndexablePaths().map((path) => `${SHOP_URL}${path}`));
    expect(urls.length).toBeGreaterThan(INDEXABLE_PATHS.length);
    for (const url of urls) {
      expect(url.startsWith(SHOP_URL)).toBe(true);
    }
  });

  it("serves only the canonical public root on the Store OS host", async () => {
    host = STORE_CANONICAL_HOST;
    expect(await sitemap()).toEqual([expect.objectContaining({
      url: `${STORE_URL}/`,
      lastModified: "2026-08-24",
    })]);
  });

  it("ignores the port when matching the host", async () => {
    host = `${SHOP_CANONICAL_HOST}:443`;
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls[0].startsWith(SHOP_URL)).toBe(true);
  });

  it("publishes freshness on every URL of both sitemaps", async () => {
    for (const canonical of [CANONICAL_HOST, SHOP_CANONICAL_HOST, STORE_CANONICAL_HOST]) {
      host = canonical;
      const entries = await sitemap();
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry.lastModified, `${entry.url} has no lastmod`).toMatch(
          /^\d{4}-\d{2}-\d{2}$/,
        );
      }
    }
  });

  it("gives each consumer item its own freshness rather than one blanket date", async () => {
    host = SHOP_CANONICAL_HOST;
    const byUrl = new Map(
      (await sitemap()).map((entry) => [entry.url, String(entry.lastModified)]),
    );

    for (const drug of indexableCatalogItems("zh")) {
      expect(byUrl.get(`${SHOP_URL}/zh-tw/drug/${drug.slug}`), drug.slug).toBe(drug.updatedOn);
    }

    // A category and the homepage summarise the items below them, so they can
    // never look staler than the freshest thing they list.
    const newestItem = indexableCatalogItems("zh")
      .map((drug) => drug.updatedOn)
      .reduce((a, b) => (b > a ? b : a));
    expect(byUrl.get(`${SHOP_URL}/zh-tw/category/partner-item`)).toBe(newestItem);
    expect(byUrl.get(`${SHOP_URL}/zh-tw`)! >= newestItem).toBe(true);
  });
});

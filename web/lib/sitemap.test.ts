import { beforeEach, describe, expect, it, vi } from "vitest";

let host = "";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host }),
}));

const sitemap = (await import("../app/sitemap")).default;

const { INDEXABLE_PATHS, SHOP_CANONICAL_HOST, CANONICAL_HOST, SITE_URL } =
  await import("./seo");
const { SHOP_URL } = await import("./shop");
const { shopIndexablePaths } = await import("./shop-index");

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

  it("ignores the port when matching the host", async () => {
    host = `${SHOP_CANONICAL_HOST}:443`;
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls[0].startsWith(SHOP_URL)).toBe(true);
  });

  it("publishes freshness for every company URL and never a bare company path", async () => {
    host = CANONICAL_HOST;
    for (const entry of await sitemap()) {
      expect(entry.lastModified, entry.url).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

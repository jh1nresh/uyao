import { describe, expect, it } from "vitest";

import { AEO_ANSWER_PAGES } from "./aeo";
import { companyLlmsTxt, nonCanonicalLlmsTxt, shopLlmsTxt } from "./llms";
import { SITE_URL } from "./seo";
import { SHOP_URL } from "./shop";
import { indexableCatalogItems } from "./shop-index";

describe("llms.txt", () => {
  const company = companyLlmsTxt();
  const shop = shopLlmsTxt();

  it("lists every registered answer in both locales with an absolute URL", () => {
    for (const page of AEO_ANSWER_PAGES) {
      expect(company).toContain(`${SITE_URL}${page.path}`);
      expect(company).toContain(`${SITE_URL}${page.enPath}`);
      expect(company).toContain(page.zh.question);
      expect(company).toContain(page.en.question);
    }
  });

  it("points agents at the guides pillar page", () => {
    expect(company).toContain(`${SITE_URL}/en/guides`);
  });

  it("tells agents when not to treat the site as live inventory or diagnosis", () => {
    expect(company).toMatch(/When to use this site/);
    expect(company).toMatch(/Do not use uYao when you need live stock/);
    expect(company).toContain(`${SITE_URL}/about`);
    expect(company).toContain(`${SITE_URL}/contact`);
    expect(company).toContain(`${SITE_URL}/privacy`);
    expect(company).toContain(`${SITE_URL}/docs`);
  });

  it("points agents at the OpenAPI document from both hosts", () => {
    expect(company).toContain(`${SITE_URL}/openapi.json`);
    expect(shop).toContain(`${SHOP_URL}/openapi.json`);
    expect(shop).toContain(`${SHOP_URL}/api/catalog`);
    // The write endpoints must never be advertised as a usable surface here.
    expect(company).toMatch(/x-internal/);
  });

  it("lists only catalog items that passed the admission gate, on a URL that exists", () => {
    const admitted = indexableCatalogItems("zh");
    expect(admitted.length).toBeGreaterThan(0);
    for (const drug of admitted) {
      // English URLs only exist for items that have English copy.
      const locale = drug.nameEn ? "/en" : "/zh-tw";
      expect(shop).toContain(`${SHOP_URL}${locale}/drug/${drug.slug}`);
    }
  });

  it("states the product boundaries an agent must not summarize away", () => {
    expect(company).toMatch(/not an online pharmacy/i);
    expect(company).toMatch(/does not replace a pharmacy POS/i);
    expect(company).toMatch(/simulated/i);
    expect(company).toMatch(/not been reviewed by\s+a licensed pharmacist/i);
    expect(shop).toMatch(/not an online pharmacy/i);
    expect(shop).toMatch(/not live\s+inventory/i);
  });

  it("never claims a price, stock level, or medical recommendation", () => {
    for (const document of [company, shop]) {
      expect(document).not.toMatch(/\bin stock\b/i);
      expect(document).not.toMatch(/\bbuy now\b/i);
      expect(document).not.toMatch(/NT\$|\$\d/);
    }
  });

  it("keeps the two hosts on their own canonical namespace", () => {
    expect(company.split("\n")[0]).toContain("uYao");
    expect(shop.split("\n")[0]).toContain("Medicine Finder");
    expect(nonCanonicalLlmsTxt()).toContain(SITE_URL);
  });

  it("emits valid llms.txt structure: one H1, a blockquote, and linked sections", () => {
    for (const document of [company, shop]) {
      const h1 = document.split("\n").filter((l) => l.startsWith("# "));
      expect(h1).toHaveLength(1);
      expect(document).toMatch(/\n> /);
      expect(document).toMatch(/\n## /);
      for (const link of document.match(/^- \[.+?\]\(.+?\): .+$/gm) ?? []) {
        expect(link).toMatch(/\((https?:|mailto:)/);
      }
    }
  });
});

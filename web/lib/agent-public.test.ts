import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CONTACT_EMAIL, organizationJsonLd } from "./seo";
import {
  HOMEPAGE_H1,
  HOMEPAGE_LIMITS,
  HOMEPAGE_PROSE,
  PUBLIC_CACHE_CONTROL,
  PUBLIC_PAGE_PATHS,
  TRUST_PAGES,
  homepageMarkdown,
  homepageVisibleText,
  isKnownBarePath,
  needsLocalePrefixRedirect,
  notFoundHtml,
  notFoundMarkdown,
  pageMarkdown,
  trustPageVisibleText,
  visibleTextLength,
} from "./agent-public";

describe("homepage SSR copy", () => {
  it("puts a real H1 and at least 500 characters in the homepage document", () => {
    const markdown = homepageMarkdown();
    const text = homepageVisibleText();

    expect(markdown.startsWith(`# ${HOMEPAGE_H1}`)).toBe(true);
    expect(visibleTextLength(text)).toBeGreaterThanOrEqual(500);
    expect(text).toMatch(/prototype/i);
    expect(text).toMatch(/not live inventory|does not sell medicine/i);
    expect(text).not.toMatch(/diagnos(e|is)s? you/i);
  });

  it("links about, contact, and privacy from the company footer on locale routes", () => {
    const footer = readFileSync(new URL("../components/landing/CompanyFooter.tsx", import.meta.url), "utf8");
    expect(footer).toContain("${companyPrefix}/about");
    expect(footer).toContain("${companyPrefix}/contact");
    expect(footer).toContain("${companyPrefix}/privacy");
    expect(footer).toContain('href="/docs"');
    expect(footer).toContain('href="/llms.txt"');
  });

  it("keeps one visual hero H1 and serves the long agent copy outside the homepage", () => {
    const landing = readFileSync(new URL("../components/landing/AgentLandingExperience.tsx", import.meta.url), "utf8");
    const zh = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    const en = readFileSync(new URL("../app/en/page.tsx", import.meta.url), "utf8");

    expect(landing).toContain("<h1");
    expect(zh).not.toContain("CompanyHomeHonesty");
    expect(en).not.toContain("CompanyHomeHonesty");
    expect(TRUST_PAGES["/docs"].body).toContain(HOMEPAGE_PROSE);
    for (const limit of HOMEPAGE_LIMITS) {
      expect(TRUST_PAGES["/docs"].body).toContain(limit);
    }
  });
});

describe("trust pages", () => {
  it("keeps the copy packet on the locale-prefixed company routes", () => {
    expect(TRUST_PAGES["/about"].canonicalPath).toBe("/zh-tw/about");
    expect(TRUST_PAGES["/contact"].canonicalPath).toBe("/zh-tw/contact");
    expect(TRUST_PAGES["/privacy"].canonicalPath).toBe("/zh-tw/privacy");
    expect(TRUST_PAGES["/about"].title).toBe("關於 uYao 有藥");
    expect(TRUST_PAGES["/contact"].title).toBe("聯絡 uYao");
    expect(TRUST_PAGES["/privacy"].title).toBe("隱私說明");
  });

  it("gives about, contact, privacy, and docs enough honest copy", () => {
    for (const path of PUBLIC_PAGE_PATHS) {
      const page = TRUST_PAGES[path];
      expect(visibleTextLength(trustPageVisibleText(path)), path).toBeGreaterThanOrEqual(
        path === "/docs" ? 500 : 280,
      );
      expect(page.body).not.toMatch(/09\d{8}/);
      expect(page.body).not.toMatch(/\d{3}.*路|\d+ Main Street/i);
    }
    expect(TRUST_PAGES["/about"].body).toMatch(/即時庫存/);
    expect(TRUST_PAGES["/about"].body).toMatch(/不能當診斷/);
    expect(TRUST_PAGES["/about"].body).toMatch(/prototype/);
    expect(TRUST_PAGES["/contact"].body).toMatch(/不在信裡做診斷/);
    expect(TRUST_PAGES["/contact"].body).toMatch(/prototype/);
    expect(TRUST_PAGES["/privacy"].body).toMatch(/不是即時庫存/);
    expect(TRUST_PAGES["/privacy"].body).toMatch(/不蒐集病歷/);
    expect(TRUST_PAGES["/docs"].body).toMatch(/not live inventory/i);
    expect(TRUST_PAGES["/docs"].body).toMatch(/prototype/i);
    expect(TRUST_PAGES["/docs"].title).toMatch(/uYao Developer Resources/);
    expect(TRUST_PAGES["/docs"].body).toMatch(/application\/problem\+json/);
    expect(TRUST_PAGES["/docs"].body).toMatch(/RateLimit-Policy.*RateLimit/);
    expect(TRUST_PAGES["/docs"].body).toMatch(/Retry-After/);
    expect(TRUST_PAGES["/docs"].body).toMatch(/X-uYao-API-Version/);
    expect(TRUST_PAGES["/docs"].body).toMatch(/Deprecation header.*Sunset date/i);
  });

  it("keeps contact on the AgentMail inbox and refuses a public phone or address", () => {
    expect(TRUST_PAGES["/contact"].body).toContain(CONTACT_EMAIL);
    expect(TRUST_PAGES["/contact"].body).toContain("我們不公佈電話與門市地址");
    expect(TRUST_PAGES["/about"].body).toContain("不是 POS");
    expect(TRUST_PAGES["/about"].body).toContain("不能當診斷");
    expect(TRUST_PAGES["/about"].body).toContain("示範數字是示範");
    expect(TRUST_PAGES["/about"].body).not.toContain("簡範");
    expect(TRUST_PAGES["/privacy"].body).toContain("不蒐集病歷");
    expect(TRUST_PAGES["/privacy"].body).not.toContain("搜集");
  });
});

describe("cache and 404", () => {
  it("uses a public cache directive without private or no-store", () => {
    expect(PUBLIC_CACHE_CONTROL).toMatch(/\bpublic\b/);
    expect(PUBLIC_CACHE_CONTROL).not.toMatch(/\bprivate\b/);
    expect(PUBLIC_CACHE_CONTROL).not.toMatch(/\bno-store\b/);
  });

  it("returns a short HTML 404 body and a markdown twin", () => {
    expect(notFoundHtml()).toContain("<h1>Page not found</h1>");
    expect(notFoundHtml()).toContain("/llms.txt");
    expect(notFoundMarkdown()).toContain("# Page not found");
    expect(pageMarkdown("/zh-tw/about")?.startsWith("# 關於 uYao 有藥")).toBe(true);
  });
});

describe("known routes", () => {
  it("locale-prefixes the packet pages like the rest of the company site", () => {
    expect(needsLocalePrefixRedirect("/about")).toBe(true);
    expect(needsLocalePrefixRedirect("/contact")).toBe(true);
    expect(needsLocalePrefixRedirect("/privacy")).toBe(true);
    expect(needsLocalePrefixRedirect("/")).toBe(false);
    expect(needsLocalePrefixRedirect("/docs")).toBe(false);
    expect(needsLocalePrefixRedirect("/pharmacy")).toBe(true);
    expect(isKnownBarePath("/docs")).toBe(true);
    expect(isKnownBarePath("/this-is-not-a-uyao-page")).toBe(false);
  });
});

describe("organization JSON-LD", () => {
  it("publishes contactPoint email only and no invented NAP", () => {
    const org = organizationJsonLd();
    expect(org.email).toBe("uyao@agentmail.to");
    expect(org.contactPoint).toEqual({
      "@type": "ContactPoint",
      email: "uyao@agentmail.to",
    });
    expect(org).not.toHaveProperty("address");
    expect(org).not.toHaveProperty("telephone");
    expect(JSON.stringify(org)).not.toContain("streetAddress");
    expect(JSON.stringify(org.contactPoint)).not.toContain("telephone");
  });
});

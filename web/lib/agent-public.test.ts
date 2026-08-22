import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { CONTACT_EMAIL, organizationJsonLd } from "./seo";
import {
  HOMEPAGE_H1,
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

  it("links about, contact, privacy, docs, and llms.txt from the company footer", () => {
    const footer = readFileSync(new URL("../components/landing/CompanyFooter.tsx", import.meta.url), "utf8");
    for (const href of ["/about", "/contact", "/privacy", "/docs", "/llms.txt"]) {
      expect(footer).toContain(`href="${href}"`);
    }
  });

  it("renders that H1 from a server component on both locale homepages", () => {
    const honesty = readFileSync(new URL("../components/landing/CompanyHomeHonesty.tsx", import.meta.url), "utf8");
    const zh = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    const en = readFileSync(new URL("../app/en/page.tsx", import.meta.url), "utf8");

    expect(honesty).toContain("<h1");
    expect(honesty).toContain("HOMEPAGE_H1");
    expect(zh).toContain("CompanyHomeHonesty");
    expect(en).toContain("CompanyHomeHonesty");
  });
});

describe("trust pages", () => {
  it("gives about, contact, privacy, and docs enough honest copy", () => {
    for (const path of PUBLIC_PAGE_PATHS) {
      const page = TRUST_PAGES[path];
      expect(visibleTextLength(trustPageVisibleText(path))).toBeGreaterThanOrEqual(500);
      expect(page.body).toMatch(/live stock|live inventory/i);
      expect(page.body).toMatch(/diagnos/i);
      expect(page.body).toMatch(/prototype/i);
      expect(page.body).not.toMatch(/09\d{8}/);
      expect(page.body).not.toMatch(/\d{3}.*路|\d+ Main Street/i);
    }
  });

  it("keeps contact on the AgentMail inbox only", () => {
    expect(TRUST_PAGES["/contact"].body).toContain(CONTACT_EMAIL);
    expect(TRUST_PAGES["/contact"].body).toMatch(/no public street address/i);
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
    expect(pageMarkdown("/about")?.startsWith("# About uYao")).toBe(true);
  });
});

describe("known routes", () => {
  it("does not locale-prefix the new agent pages", () => {
    expect(needsLocalePrefixRedirect("/about")).toBe(false);
    expect(needsLocalePrefixRedirect("/")).toBe(false);
    expect(needsLocalePrefixRedirect("/pharmacy")).toBe(true);
    expect(isKnownBarePath("/docs")).toBe(true);
    expect(isKnownBarePath("/this-is-not-a-uyao-page")).toBe(false);
  });
});

describe("organization JSON-LD", () => {
  it("publishes the AgentMail inbox and no invented NAP", () => {
    const org = organizationJsonLd();
    expect(org.email).toBe("uyao@agentmail.to");
    expect(org).not.toHaveProperty("address");
    expect(org).not.toHaveProperty("telephone");
    expect(org).not.toHaveProperty("contactPoint");
    expect(JSON.stringify(org)).not.toContain("streetAddress");
  });
});

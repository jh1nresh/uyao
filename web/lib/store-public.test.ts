import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StoreOsLogin } from "@/components/StoreOsLogin";
import { StoreOsPublicContext } from "@/components/StoreOsPublicContext";
import {
  STORE_HOMEPAGE_H1,
  storeHomepageMarkdown,
  storeHomepageVisibleText,
} from "./store-public";

describe("Store OS public agent surface", () => {
  it("server-renders a branded H1 and more than 500 characters without JavaScript", () => {
    const html = renderToStaticMarkup(createElement("div", null,
      createElement(StoreOsLogin, { configured: true }),
      createElement(StoreOsPublicContext),
    ));
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    expect(html).toMatch(new RegExp(`<h1[^>]*>${STORE_HOMEPAGE_H1}</h1>`));
    expect(storeHomepageVisibleText().length).toBeGreaterThanOrEqual(500);
    expect(text.length).toBeGreaterThanOrEqual(500);
    expect(html).toContain("/openapi.json");
    expect(html).toContain("/llms.txt");
    expect(text).toMatch(/不是即時庫存/);
  });

  it("publishes the same boundaries and developer links as Markdown", () => {
    const markdown = storeHomepageMarkdown();

    expect(markdown).toMatch(/^# uYao Store OS/m);
    expect(markdown).toContain("## When to use");
    expect(markdown).toContain("## When not to use");
    expect(markdown).toContain("https://store.uyaohealth.com/openapi.json");
    expect(markdown).toMatch(/not live inventory|不是即時庫存/i);
  });

  it("declares canonical, brand metadata, and structured data on the Store page", () => {
    const source = readFileSync(new URL("../app/store-os/page.tsx", import.meta.url), "utf8");

    expect(source).toContain("canonical: `${STORE_URL}/`");
    expect(source).toContain('types: { "text/markdown": `${STORE_URL}/` }');
    expect(source).toContain("organizationJsonLd()");
    expect(source).toContain("storeOsSoftwareApplicationJsonLd()");
    expect(source).toContain("storeIndexablePageRobots()");
  });
});

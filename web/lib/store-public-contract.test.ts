import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JsonLd } from "@/components/JsonLd";
import { StoreOsLogin } from "@/components/StoreOsLogin";
import { StoreOsPublicContext } from "@/components/StoreOsPublicContext";
import { storeLlmsTxt } from "./llms";
import {
  openApiDocument,
  openApiDocumentForHost,
  publicReadOpenApiDocument,
} from "./openapi";
import { proxy } from "../proxy";
import {
  CANONICAL_HOST,
  CONTACT_EMAIL,
  organizationJsonLd,
  SHOP_CANONICAL_HOST,
  STORE_CANONICAL_HOST,
  storeOsSoftwareApplicationJsonLd,
} from "./seo";
import { storeHomepageMarkdown } from "./store-public";
import { storePublicLeaks } from "./store-public-leaks";

let host = STORE_CANONICAL_HOST;

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host }),
}));

const { GET: openApiGet } = await import("../app/openapi.json/route");

function storePublicHtml(): string {
  return renderToStaticMarkup(createElement("div", null,
    createElement(JsonLd, {
      nodes: [organizationJsonLd(), storeOsSoftwareApplicationJsonLd()],
    }),
    createElement(StoreOsLogin, { configured: true }),
    createElement(StoreOsPublicContext),
  ));
}

describe("Store public surface leak contract", () => {
  beforeEach(() => {
    host = STORE_CANONICAL_HOST;
  });

  afterEach(() => {
    host = STORE_CANONICAL_HOST;
  });

  it("detects the full spec leaks so a store-host regression fails CI", () => {
    expect(storePublicLeaks(JSON.stringify(openApiDocument()))).toEqual(
      expect.arrayContaining([
        "intake",
        "allergens",
        "phone/09 regex",
        "agentKey",
        "reservation write path",
        "demand write path",
        "pilot write path",
      ]),
    );
  });

  it("keeps store public HTML free of intake, allergens, phone regex, token, inbox, agentKey, and write paths", () => {
    const html = storePublicHtml();
    expect(storePublicLeaks(html)).toEqual([]);
    expect(html).toContain(CONTACT_EMAIL);
    expect(html).not.toMatch(/streetAddress|telephone/i);
  });

  it("keeps Markdown Accept on the store host free of the same leaks", async () => {
    const response = proxy(new NextRequest("https://store.uyaohealth.com/", {
      headers: { accept: "text/markdown, text/html;q=0.8" },
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/markdown/);
    const markdown = await response.text();
    expect(markdown).toBe(storeHomepageMarkdown());
    expect(storePublicLeaks(markdown)).toEqual([]);
    expect(markdown).toContain(CONTACT_EMAIL);
    expect(markdown).toContain("https://store.uyaohealth.com/openapi.json");
  });

  it("keeps store llms.txt free of the same leaks", () => {
    const llms = storeLlmsTxt();
    expect(storePublicLeaks(llms)).toEqual([]);
    expect(llms).toContain(`Contact: ${CONTACT_EMAIL}`);
    expect(llms).toContain("https://store.uyaohealth.com/openapi.json");
    expect(llms).toContain("https://store.uyaohealth.com/api/catalog");
    expect(llms).toContain("https://store.uyaohealth.com/api/pharmacies");
  });

  it("serves catalog+pharmacies only from store-host /openapi.json", async () => {
    host = STORE_CANONICAL_HOST;
    const response = await openApiGet();
    const body = await response.json() as Record<string, unknown>;
    const served = openApiDocumentForHost(STORE_CANONICAL_HOST);
    const publicRead = publicReadOpenApiDocument();

    expect(response.headers.get("vary")).toMatch(/Host/i);
    expect(body).toEqual(served);
    expect(body).toEqual(publicRead);
    expect(Object.keys(body.paths as object).sort()).toEqual([
      "/api/catalog",
      "/api/pharmacies",
    ]);
    expect(storePublicLeaks(JSON.stringify(body))).toEqual([]);
    expect(JSON.stringify(body)).toMatch(/no live inventory|has no live inventory/i);
    expect(JSON.stringify(body)).toContain(CONTACT_EMAIL);
    expect(JSON.stringify(body)).toContain("https://store.uyaohealth.com");
  });

  it("keeps the full spec on company and shop hosts", async () => {
    host = CANONICAL_HOST;
    const company = await (await openApiGet()).json() as Record<string, unknown>;
    expect(Object.keys(company.paths as object)).toContain("/api/reservations");
    expect(storePublicLeaks(JSON.stringify(company)).length).toBeGreaterThan(0);

    host = SHOP_CANONICAL_HOST;
    const shop = await (await openApiGet()).json() as Record<string, unknown>;
    expect(shop).toEqual(openApiDocument());
    expect(openApiDocumentForHost(`${STORE_CANONICAL_HOST}:443`)).toEqual(
      publicReadOpenApiDocument(),
    );
  });
});

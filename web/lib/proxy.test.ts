import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "../proxy";
import { SITE_URL } from "./seo";
import { SHOP_URL } from "./shop";
import { storePublicLeaks } from "./store-public-leaks";

function request(url: string, headers?: HeadersInit) {
  return proxy(new NextRequest(url, { headers }));
}

describe("canonical host routing", () => {
  it("serves Store OS at the clean store domain root", () => {
    const response = request("https://store.uyaohealth.com/?work=WI-2031");
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://store.uyaohealth.com/store-os?work=WI-2031",
    );
    expect(response.headers.get("vary")).toMatch(/Accept/i);
    expect(response.headers.get("cache-control")).toMatch(/private.*no-store/);
    expect(response.headers.get("cdn-cache-control")).toBe("no-store");
  });

  it("serves Store OS Markdown with cache-safe negotiation headers", async () => {
    const response = request("https://store.uyaohealth.com/", {
      accept: "text/markdown, text/html;q=0.8",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/markdown/);
    expect(response.headers.get("vary")).toMatch(/Accept/i);
    expect(response.headers.get("vary")).toMatch(/Accept-Encoding/i);
    const markdown = await response.text();
    expect(markdown).toMatch(/^# uYao Store OS/m);
    expect(storePublicLeaks(markdown)).toEqual([]);
  });

  it("returns 406 when the Store OS homepage cannot satisfy Accept", () => {
    const response = request("https://store.uyaohealth.com/", {
      accept: "application/xml",
    });

    expect(response.status).toBe(406);
    expect(response.headers.get("vary")).toMatch(/Accept/i);
  });

  it("collapses localized Store OS paths to the store domain root", () => {
    const response = request("https://store.uyaohealth.com/zh-tw/store-os?work=WI-2031");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://store.uyaohealth.com/?work=WI-2031",
    );
  });

  it("removes the company-host Store OS copy", () => {
    const response = request("https://uyaohealth.com/zh-tw/store-os?work=WI-2031");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://store.uyaohealth.com/?work=WI-2031",
    );
  });

  it("redirects the short store alias to the canonical store host", () => {
    const response = request("https://store.uyao.com/?work=WI-2031");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://store.uyaohealth.com/?work=WI-2031",
    );
  });

  it("keeps unrelated company routes on the company domain", () => {
    const response = request("https://store.uyaohealth.com/zh-tw/evidence");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`${SITE_URL}/zh-tw/evidence`);
  });

  it("permanently redirects the old localized Shop URL to the unified public host", () => {
    const response = request("https://shop.uyaohealth.com/zh-tw?area=datong");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      `${SITE_URL}/zh-tw?area=datong`,
    );
  });

  it("serves structured consumer markdown on the unified root and locale URLs", async () => {
    for (const [path, heading] of [
      ["/", "# uYao 找藥"],
      ["/zh-tw", "# uYao 找藥"],
      ["/en", "# uYao Medicine Finder"],
    ] as const) {
      const response = proxy(new NextRequest(`${SITE_URL}${path}`, {
        headers: { accept: "text/markdown" },
      }));

      expect(response.status, path).toBe(200);
      expect(response.headers.get("content-type"), path).toMatch(/text\/markdown/);
      expect(response.headers.get("vary"), path).toMatch(/Accept/i);
      expect(response.headers.get("vary"), path).toMatch(/Accept-Encoding/i);
      await expect(response.text(), path).resolves.toContain(heading);
    }
  });

  it("keeps Vercel preview hosts on the branch shop instead of production", () => {
    const response = request(
      "https://uyao-git-codex-shop-pearl-stage-jhinreshs-projects.vercel.app/zh-tw",
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://uyao-git-codex-shop-pearl-stage-jhinreshs-projects.vercel.app/app",
    );
  });

  it("permanently removes the old app segment on the shop host", () => {
    const response = request("https://shop.uyaohealth.com/zh-tw/app?area=datong");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`${SHOP_URL}/zh-tw?area=datong`);
  });

  it("serves localized consumer routes on the unified public host", () => {
    const response = request("https://uyaohealth.com/zh-tw/drug/example?area=datong");
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      `${SITE_URL}/drug/example?area=datong`,
    );
  });

  it("keeps the demo sandbox on the unified public host", () => {
    const response = request("https://uyaohealth.com/zh-tw/demo/uyao-demo");
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      `${SITE_URL}/demo/uyao-demo`,
    );
  });

  it("redirects company content requested on the shop host", () => {
    const response = request("https://shop.uyaohealth.com/en/pharmacy");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`${SITE_URL}/en/pharmacy`);
  });

  it("serves the consumer-first homepage at / instead of redirecting", () => {
    const response = request("https://uyaohealth.com/");
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(`${SITE_URL}/app`);
    expect(response.headers.get("cache-control")).toMatch(/\bpublic\b/);
    expect(response.headers.get("cache-control")).not.toMatch(/\bprivate\b|\bno-store\b/);
    expect(response.headers.get("vary")).toMatch(/Accept/i);
  });

  it("returns a real 404 with a short HTML body for unknown routes", async () => {
    const response = request("https://uyaohealth.com/this-is-not-a-uyao-page");
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toMatch(/text\/html/);
    await expect(response.text()).resolves.toContain("<h1>Page not found</h1>");
  });

  it("serves markdown for Accept: text/markdown on public pages", async () => {
    const response = proxy(
      new NextRequest("https://uyaohealth.com/", {
        headers: { accept: "text/markdown" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/markdown/);
    expect(response.headers.get("vary")).toMatch(/Accept/i);
    await expect(response.text()).resolves.toContain("# uYao 找藥");
  });

  it("serves markdown 404s when Accept prefers markdown", async () => {
    const response = proxy(
      new NextRequest("https://uyaohealth.com/this-is-not-a-uyao-page", {
        headers: { accept: "text/markdown" },
      }),
    );
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toMatch(/text\/markdown/);
    await expect(response.text()).resolves.toContain("# Page not found");
  });

  it("keeps locale-prefixed product routes on their canonical URLs", () => {
    const response = request("https://uyaohealth.com/pharmacy");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`${SITE_URL}/zh-tw/pharmacy`);
  });

  it("sends the packet pages to /zh-tw like the rest of the company site", () => {
    const about = request("https://uyaohealth.com/about");
    expect(about.status).toBe(308);
    expect(about.headers.get("location")).toBe(`${SITE_URL}/zh-tw/about`);
  });

  it("keeps Store OS off the consumer shop host", () => {
    const response = request("https://shop.uyaohealth.com/zh-tw/store-os");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://store.uyaohealth.com/");
  });

  it("redirects www to the company canonical host", () => {
    const response = request("https://www.uyaohealth.com/zh-tw/evidence");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`${SITE_URL}/zh-tw/evidence`);
  });
});

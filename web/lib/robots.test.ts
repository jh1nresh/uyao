import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let host = "";
let vercelEnv: string | undefined;

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host }),
}));

const robots = (await import("../app/robots")).default;
const { CANONICAL_HOST, SITE_URL, STORE_CANONICAL_HOST, STORE_URL } = await import("./seo");

function rules(result: Awaited<ReturnType<typeof robots>>) {
  return result.rules as { allow?: string | string[]; disallow?: string | string[] };
}

describe("robots policy", () => {
  beforeEach(() => {
    vercelEnv = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "production";
    host = CANONICAL_HOST;
  });

  afterEach(() => {
    if (vercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = vercelEnv;
  });

  it("allows the two public read endpoints while /api/ stays disallowed", async () => {
    const { allow, disallow } = rules(await robots());

    // Publishing openapi.json for endpoints that robots blocks would make a
    // well-behaved agent refuse to fetch them.
    expect(allow).toContain("/api/catalog");
    expect(allow).toContain("/api/pharmacies");
    expect(disallow).toContain("/api/");
  });

  it("keeps the console and Store OS out in every locale", async () => {
    const { disallow } = rules(await robots());
    for (const path of ["/console", "/store-os", "/zh-tw/store-os", "/en/store-os"]) {
      expect(disallow).toContain(path);
    }
  });

  it("points the unified public host and Store OS at their own sitemap", async () => {
    expect((await robots()).sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    host = STORE_CANONICAL_HOST;
    expect((await robots()).sitemap).toBe(`${STORE_URL}/sitemap.xml`);
    expect(rules(await robots()).allow).toContain("/");
  });

  it("disallows everything on a non-canonical host or a preview deployment", async () => {
    host = "uyao-abc123.vercel.app";
    expect(rules(await robots()).disallow).toBe("/");

    host = CANONICAL_HOST;
    process.env.VERCEL_ENV = "preview";
    expect(rules(await robots()).disallow).toBe("/");
  });
});

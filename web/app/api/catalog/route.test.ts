import { beforeEach, describe, expect, it } from "vitest";

import { __resetForTests } from "@/lib/kv";
import { PUBLIC_READ_LIMIT } from "@/lib/rate-limit";

import { GET } from "./route";

beforeEach(() => {
  __resetForTests();
});

function request(path = "/api/catalog", headers?: HeadersInit) {
  return new Request(`http://localhost${path}`, { headers });
}

describe("GET /api/catalog", () => {
  it("returns JSON with RateLimit headers and Vary: Accept", async () => {
    const response = await GET(request());
    const body = await response.json() as { disclaimer: string; items: unknown[] };

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/application\/json/);
    expect(response.headers.get("vary")).toMatch(/Accept/i);
    expect(response.headers.get("ratelimit-limit")).toBe(String(PUBLIC_READ_LIMIT));
    expect(Number(response.headers.get("ratelimit-remaining"))).toBeLessThan(PUBLIC_READ_LIMIT);
    expect(body.disclaimer).toMatch(/not live inventory/i);
    expect(JSON.stringify(body)).not.toMatch(/inStock|priceTwd|availability/);
  });

  it("serves markdown when Accept prefers it", async () => {
    const response = await GET(request("/api/catalog", { accept: "text/markdown" }));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/text\/markdown/);
    expect(response.headers.get("vary")).toMatch(/Accept/i);
    expect(body).toContain("# uYao catalog");
    expect(body).toMatch(/not live inventory/i);
  });

  it("returns JSON 429 with RateLimit headers after the public read quota", async () => {
    let last = new Response();
    for (let i = 0; i <= PUBLIC_READ_LIMIT; i += 1) {
      last = await GET(request("/api/catalog", { "x-forwarded-for": "203.0.113.9" }));
    }
    const body = await last.json() as { error: string };

    expect(last.status).toBe(429);
    expect(last.headers.get("content-type")).toMatch(/application\/json/);
    expect(last.headers.get("ratelimit-remaining")).toBe("0");
    expect(body.error).toBe("rate_limited");
  });
});

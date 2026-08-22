import { beforeEach, describe, expect, it } from "vitest";

import { __resetForTests } from "@/lib/kv";
import { PUBLIC_READ_LIMIT } from "@/lib/rate-limit";

import { GET } from "./route";

beforeEach(() => {
  __resetForTests();
});

function request(path = "/api/pharmacies", headers?: HeadersInit) {
  return new Request(`http://localhost${path}`, { headers });
}

describe("GET /api/pharmacies", () => {
  it("returns JSON with RateLimit headers and Vary: Accept", async () => {
    const response = await GET(request());
    const body = await response.json() as { disclaimer: string };

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toMatch(/application\/json/);
    expect(response.headers.get("vary")).toMatch(/Accept/i);
    expect(response.headers.get("ratelimit-limit")).toBe(String(PUBLIC_READ_LIMIT));
    expect(body.disclaimer).toMatch(/not mean a uYao partnership|available stock/i);
    expect(JSON.stringify(body)).not.toMatch(/inStock|priceTwd/);
  });

  it("returns a JSON error body for an unknown area", async () => {
    const response = await GET(request("/api/pharmacies?area=not-a-real-area"));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toMatch(/application\/json/);
    expect(response.headers.get("vary")).toMatch(/Accept/i);
    expect(body.error).toBe("unknown_area");
    expect(typeof body.error).toBe("string");
  });

  it("returns JSON 429 with RateLimit headers after the public read quota", async () => {
    let last = new Response();
    for (let i = 0; i <= PUBLIC_READ_LIMIT; i += 1) {
      last = await GET(request("/api/pharmacies", { "x-forwarded-for": "203.0.113.10" }));
    }
    const body = await last.json() as { error: string };

    expect(last.status).toBe(429);
    expect(last.headers.get("content-type")).toMatch(/application\/json/);
    expect(last.headers.get("ratelimit-limit")).toBe(String(PUBLIC_READ_LIMIT));
    expect(body.error).toBe("rate_limited");
  });
});

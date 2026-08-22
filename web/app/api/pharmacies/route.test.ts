import { beforeEach, describe, expect, it } from "vitest";

import { __resetForTests } from "@/lib/kv";
import { PUBLIC_API_VERSION } from "@/lib/public-api";
import { PUBLIC_API_VERSION_HEADER } from "@/lib/public-read-route";
import {
  PUBLIC_READ_LIMIT,
  PUBLIC_READ_POLICY,
  PUBLIC_READ_WINDOW_SEC,
} from "@/lib/rate-limit";

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
    expect(response.headers.get("ratelimit-policy")).toBe(
      `"${PUBLIC_READ_POLICY}";q=${PUBLIC_READ_LIMIT};w=${PUBLIC_READ_WINDOW_SEC}`,
    );
    expect(response.headers.get("ratelimit")).toMatch(
      new RegExp(`^"${PUBLIC_READ_POLICY}";r=\\d+;t=${PUBLIC_READ_WINDOW_SEC}$`),
    );
    expect(response.headers.get(PUBLIC_API_VERSION_HEADER)).toBe(PUBLIC_API_VERSION);
    expect(body.disclaimer).toMatch(/not mean a uYao partnership|available stock/i);
    expect(JSON.stringify(body)).not.toMatch(/inStock|priceTwd/);
  });

  it("returns a JSON error body for an unknown area", async () => {
    const response = await GET(request("/api/pharmacies?area=not-a-real-area"));
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toMatch(/application\/problem\+json/);
    expect(response.headers.get("vary")).toMatch(/Accept/i);
    expect(body).toMatchObject({
      status: 400,
      error: "unknown_area",
      code: "unknown_area",
      message: "Unknown pharmacy area",
    });
    expect(String(body.resolution)).toMatch(/known|omit/i);
  });

  it("returns JSON 429 with RateLimit headers after the public read quota", async () => {
    let last = new Response();
    for (let i = 0; i <= PUBLIC_READ_LIMIT; i += 1) {
      last = await GET(request("/api/pharmacies", { "x-forwarded-for": "203.0.113.10" }));
    }
    const body = await last.json() as Record<string, unknown>;

    expect(last.status).toBe(429);
    expect(last.headers.get("content-type")).toMatch(/application\/problem\+json/);
    expect(last.headers.get("ratelimit-limit")).toBe(String(PUBLIC_READ_LIMIT));
    expect(last.headers.get("retry-after")).toBe(String(PUBLIC_READ_WINDOW_SEC));
    expect(body.error).toBe("rate_limited");
    expect(body.code).toBe("rate_limited");
    expect(body.resolution).toBeTruthy();
  });
});

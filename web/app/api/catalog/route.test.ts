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
    expect(response.headers.get("ratelimit-policy")).toBe(
      `"${PUBLIC_READ_POLICY}";q=${PUBLIC_READ_LIMIT};w=${PUBLIC_READ_WINDOW_SEC}`,
    );
    expect(response.headers.get("ratelimit")).toMatch(
      new RegExp(`^"${PUBLIC_READ_POLICY}";r=\\d+;t=${PUBLIC_READ_WINDOW_SEC}$`),
    );
    expect(response.headers.get(PUBLIC_API_VERSION_HEADER)).toBe(PUBLIC_API_VERSION);
    expect(response.headers.get("link")).toMatch(/rel="deprecation"/);
    expect(Number(response.headers.get("ratelimit-remaining"))).toBeLessThan(PUBLIC_READ_LIMIT);
    expect(body.disclaimer).toMatch(/not live inventory/i);
    expect(JSON.stringify(body)).not.toMatch(/inStock|priceTwd|availability/);
  });

  it("rejects an unsupported version with a structured JSON resolution", async () => {
    const response = await GET(request("/api/catalog", {
      [PUBLIC_API_VERSION_HEADER]: "0.9.0",
    }));
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toMatch(/application\/problem\+json/);
    expect(body).toMatchObject({
      status: 400,
      error: "unsupported_api_version",
      code: "unsupported_api_version",
      requestedVersion: "0.9.0",
      supportedVersions: [PUBLIC_API_VERSION],
    });
    expect(String(body.resolution)).toContain(PUBLIC_API_VERSION_HEADER);
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
    const body = await last.json() as Record<string, unknown>;

    expect(last.status).toBe(429);
    expect(last.headers.get("content-type")).toMatch(/application\/problem\+json/);
    expect(last.headers.get("ratelimit-remaining")).toBe("0");
    expect(last.headers.get("retry-after")).toBe(String(PUBLIC_READ_WINDOW_SEC));
    expect(body).toMatchObject({
      status: 429,
      error: "rate_limited",
      code: "rate_limited",
      message: "Public read quota exceeded",
    });
    expect(String(body.resolution)).toMatch(/Retry-After/i);
  });
});

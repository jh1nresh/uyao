import { beforeEach, describe, expect, it } from "vitest";

import { __resetForTests } from "@/lib/kv";
import { catalogPayload, PUBLIC_API_VERSION } from "@/lib/public-api";
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

function request(slug: string, headers?: HeadersInit) {
  return GET(
    new Request(`http://localhost/api/catalog/${slug}`, { headers }),
    { params: Promise.resolve({ slug }) },
  );
}

describe("GET /api/catalog/{slug}", () => {
  it("returns version and RateLimit headers on success", async () => {
    const slug = catalogPayload("zh")[0]?.slug;
    expect(slug).toBeTruthy();
    const response = await request(slug!);

    expect(response.status).toBe(200);
    expect(response.headers.get(PUBLIC_API_VERSION_HEADER)).toBe(PUBLIC_API_VERSION);
    expect(response.headers.get("link")).toMatch(/rel="deprecation"/);
    expect(response.headers.get("ratelimit-policy")).toBe(
      `"${PUBLIC_READ_POLICY}";q=${PUBLIC_READ_LIMIT};w=${PUBLIC_READ_WINDOW_SEC}`,
    );
    expect(response.headers.get("ratelimit")).toMatch(
      new RegExp(`^"${PUBLIC_READ_POLICY}";r=\\d+;t=${PUBLIC_READ_WINDOW_SEC}$`),
    );
  });

  it("returns a structured JSON problem for a missing slug", async () => {
    const response = await request("not-a-real-item");
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toMatch(/application\/problem\+json/);
    expect(response.headers.get("ratelimit-policy")).toBeTruthy();
    expect(body).toMatchObject({
      status: 404,
      error: "catalog_item_not_found",
      code: "catalog_item_not_found",
      slug: "not-a-real-item",
    });
    expect(body.resolution).toBeTruthy();
  });

  it("returns a structured 429 with RateLimit and Retry-After headers", async () => {
    const slug = catalogPayload("zh")[0]?.slug;
    expect(slug).toBeTruthy();

    let last = new Response();
    for (let i = 0; i <= PUBLIC_READ_LIMIT; i += 1) {
      last = await request(slug!, { "x-forwarded-for": "203.0.113.11" });
    }
    const body = await last.json() as Record<string, unknown>;

    expect(last.status).toBe(429);
    expect(last.headers.get("content-type")).toMatch(/application\/problem\+json/);
    expect(last.headers.get("ratelimit-remaining")).toBe("0");
    expect(last.headers.get("retry-after")).toBe(String(PUBLIC_READ_WINDOW_SEC));
    expect(body).toMatchObject({ status: 429, code: "rate_limited" });
  });
});

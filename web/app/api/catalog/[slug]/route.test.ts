import { describe, expect, it } from "vitest";

import { catalogPayload, PUBLIC_API_VERSION } from "@/lib/public-api";
import { PUBLIC_API_VERSION_HEADER } from "@/lib/public-read-route";

import { GET } from "./route";

function request(slug: string, headers?: HeadersInit) {
  return GET(
    new Request(`http://localhost/api/catalog/${slug}`, { headers }),
    { params: Promise.resolve({ slug }) },
  );
}

describe("GET /api/catalog/{slug}", () => {
  it("returns the current version header on success", async () => {
    const slug = catalogPayload("zh")[0]?.slug;
    expect(slug).toBeTruthy();
    const response = await request(slug!);

    expect(response.status).toBe(200);
    expect(response.headers.get(PUBLIC_API_VERSION_HEADER)).toBe(PUBLIC_API_VERSION);
    expect(response.headers.get("link")).toMatch(/rel="deprecation"/);
  });

  it("returns a structured JSON problem for a missing slug", async () => {
    const response = await request("not-a-real-item");
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toMatch(/application\/problem\+json/);
    expect(body).toMatchObject({
      status: 404,
      error: "catalog_item_not_found",
      code: "catalog_item_not_found",
      slug: "not-a-real-item",
    });
    expect(body.resolution).toBeTruthy();
  });
});

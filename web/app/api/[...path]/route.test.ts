import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("unknown API routes", () => {
  it("return RFC 9457 JSON with a resolution hint", async () => {
    const response = GET();
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toMatch(/application\/problem\+json/);
    expect(body).toMatchObject({
      title: "Unknown API endpoint",
      status: 404,
      error: "unknown_endpoint",
      code: "unknown_endpoint",
      message: "Unknown API endpoint",
    });
    expect(body.type).toBe("https://uyaohealth.com/docs#api-errors");
    expect(String(body.resolution)).toMatch(/\/docs|openapi\.json/);
  });
});

import { describe, expect, it } from "vitest";

import { openApiDocument } from "./openapi";
import { SITE_URL } from "./seo";
import { SHOP_URL } from "./shop";

const doc = openApiDocument();
const paths = doc.paths as Record<string, Record<string, Record<string, unknown>>>;

const READ_PATHS = ["/api/catalog", "/api/catalog/{slug}", "/api/pharmacies"];
const WRITE_PATHS = ["/api/demand", "/api/pilot", "/api/reservations"];

describe("openapi document", () => {
  it("declares OpenAPI 3.1 and both canonical hosts", () => {
    expect(doc.openapi).toBe("3.1.0");
    const servers = (doc.servers as { url: string }[]).map((s) => s.url);
    expect(servers).toContain(SHOP_URL);
    expect(servers).toContain(SITE_URL);
  });

  it("documents every read endpoint as a public GET", () => {
    for (const path of READ_PATHS) {
      expect(paths[path], path).toBeDefined();
      expect(paths[path].get, path).toBeDefined();
      expect(paths[path].get["x-internal"], path).toBeUndefined();
    }
  });

  it("marks every write operation x-internal and says so in prose", () => {
    for (const path of WRITE_PATHS) {
      expect(paths[path], path).toBeDefined();
      for (const [method, operation] of Object.entries(paths[path])) {
        expect(method, `${path} should not expose a public read`).not.toBe("get");
        expect(operation["x-internal"], `${path}.${method}`).toBe(true);
        expect(
          String(operation.description),
          `${path}.${method} must say it is not a public contract`,
        ).toMatch(/not a public contract/i);
      }
    }
  });

  it("has no operation that is neither a documented read nor a marked write", () => {
    for (const [path, methods] of Object.entries(paths)) {
      expect([...READ_PATHS, ...WRITE_PATHS], `undocumented path ${path}`).toContain(path);
      for (const [method, operation] of Object.entries(methods)) {
        if (method === "get") {
          expect(operation["x-internal"]).toBeUndefined();
        } else {
          expect(operation["x-internal"], `${path}.${method}`).toBe(true);
        }
      }
    }
  });

  it("states the no-inventory and no-online-sale boundaries up front", () => {
    const description = String((doc.info as Record<string, unknown>).description);
    expect(description).toMatch(/no live inventory|has no live inventory/i);
    expect(description).toMatch(/not an online pharmacy/i);
    expect(description).toMatch(/medical or medication advice/i);
    expect(description).toMatch(/prescription medicine is out of scope/i);
  });

  it("never describes a price, stock, or availability field", () => {
    const json = JSON.stringify(doc);
    for (const banned of ["priceTwd", "daysSinceScan", "inStock"]) {
      expect(json, banned).not.toContain(banned);
    }
  });

  it("flags the reservation endpoint's real-world side effect", () => {
    const reservation = String(paths["/api/reservations"].post.description);
    expect(reservation).toMatch(/mobile number/i);
    expect(reservation).toMatch(/Store OS/);
    expect(reservation).toMatch(/push notification/i);
    expect(reservation).toMatch(/rate limited/i);
  });

  it("warns that nhi hours are not opening hours", () => {
    const schemas = (doc.components as Record<string, Record<string, Record<string, unknown>>>).schemas;
    const hoursSource = (schemas.Pharmacy.properties as Record<string, { description: string }>)
      .hoursSource;
    expect(hoursSource.description).toMatch(/not store opening hours/i);
  });

  it("resolves every internal $ref", () => {
    const schemas = Object.keys(
      ((doc.components as Record<string, unknown>).schemas as Record<string, unknown>),
    );
    for (const ref of JSON.stringify(doc).match(/"#\/components\/schemas\/(\w+)"/g) ?? []) {
      const name = ref.replace(/"|#\/components\/schemas\//g, "");
      expect(schemas, `dangling $ref ${name}`).toContain(name);
    }
  });
});

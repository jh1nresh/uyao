import { describe, expect, it } from "vitest";

import { openApiDocument, publicReadOpenApiDocument } from "./openapi";
import { SITE_URL } from "./seo";
import { SHOP_URL } from "./shop";

const doc = openApiDocument();
const paths = doc.paths as Record<string, Record<string, Record<string, unknown>>>;

const READ_PATHS = ["/api/catalog", "/api/catalog/{slug}", "/api/pharmacies"];
const WRITE_PATHS = ["/api/demand", "/api/pilot", "/api/reservations"];

/**
 * 唯一一個刻意開放給程式呼叫的寫入端點。
 *
 * 其餘寫入端點（需求訊號、試點申請）仍然只服務本站表單 —— 它們沒有節流以外
 * 的身分概念，也沒有人在另一端等著處理。預留不一樣：LINE agent 幫使用者留藥
 * 是產品本身，不是有人在濫用 API，所以它有金鑰、有自己的額度、要在文件上
 * 講清楚契約。
 */
const AGENT_CALLABLE: Record<string, string[]> = { "/api/reservations": ["post"] };

function agentCallable(path: string, method: string): boolean {
  return AGENT_CALLABLE[path]?.includes(method) ?? false;
}

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

  it("publishes a compatible header version and deprecation policy", () => {
    for (const path of READ_PATHS) {
      const parameters = paths[path].get.parameters as Array<Record<string, unknown>>;
      expect(parameters).toEqual(expect.arrayContaining([
        expect.objectContaining({
          name: "X-uYao-API-Version",
          in: "header",
          required: false,
        }),
      ]));
      expect(JSON.stringify(paths[path].get.responses)).toContain("X-uYao-API-Version");
    }

    const description = String((doc.info as Record<string, unknown>).description);
    expect(description).toMatch(/Deprecation and Sunset response headers/);
    expect((doc.externalDocs as Record<string, unknown>).url).toBe(`${SITE_URL}/docs`);
  });

  it("documents current RateLimit draft fields, legacy fields, and Retry-After", () => {
    for (const path of READ_PATHS) {
      const responses = paths[path].get.responses as Record<string, Record<string, unknown>>;
      const okHeaders = responses["200"].headers as Record<string, unknown>;
      const limitedHeaders = responses["429"].headers as Record<string, unknown>;

      expect(okHeaders["RateLimit-Policy"], path).toBeDefined();
      expect(okHeaders.RateLimit, path).toBeDefined();
      expect(okHeaders["RateLimit-Limit"], path).toBeDefined();
      expect(okHeaders["RateLimit-Remaining"], path).toBeDefined();
      expect(okHeaders["RateLimit-Reset"], path).toBeDefined();
      expect(limitedHeaders["Retry-After"], path).toBeDefined();
      expect(
        ((okHeaders["RateLimit-Policy"] as Record<string, Record<string, unknown>>).schema).example,
        path,
      ).toBe('"public-read";q=120;w=3600');
      expect(
        ((okHeaders.RateLimit as Record<string, Record<string, unknown>>).schema).example,
        path,
      ).toBe('"public-read";r=119;t=3600');
    }
  });

  it("marks every write operation x-internal and says so in prose", () => {
    for (const path of WRITE_PATHS) {
      expect(paths[path], path).toBeDefined();
      for (const [method, operation] of Object.entries(paths[path])) {
        expect(method, `${path} should not expose a public read`).not.toBe("get");
        if (agentCallable(path, method)) {
          // 開放給 agent 的那一個必須說得出契約：怎麼帶金鑰、額度多少、
          // 以及這不是現貨保證。少了任何一條，接的人就會把它當成有貨查詢。
          expect(operation["x-internal"], `${path}.${method} 開放後不該再標 x-internal`).toBeUndefined();
          expect(operation.security, `${path}.${method} 必須宣告 agentKey`).toBeDefined();
          expect(JSON.stringify(operation.security)).toContain("agentKey");
          const desc = String(operation.description);
          expect(desc, `${path}.${method} 必須說明不是現貨保證`).toMatch(/not a stock guarantee/i);
          expect(desc, `${path}.${method} 必須說明額度`).toMatch(/per hour/i);
          continue;
        }
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
        if (method === "get" || agentCallable(path, method)) {
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

  it("documents catalog freshness as content metadata, never inventory freshness", () => {
    const schemas = (doc.components as Record<string, Record<string, Record<string, unknown>>>).schemas;
    const catalog = schemas.CatalogItem;
    const properties = catalog.properties as Record<string, Record<string, unknown>>;
    const freshness = properties.catalogRecordUpdatedOn;

    expect((doc.info as Record<string, unknown>).version).toBe("1.1.0");
    expect(freshness.type).toBe("string");
    expect(freshness.format).toBe("date");
    expect(String(freshness.description)).toMatch(/catalog record.*content/i);
    expect(String(freshness.description)).toMatch(/not an inventory scan timestamp/i);
    expect(catalog.required as string[]).toContain("catalogRecordUpdatedOn");
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

  it("keeps the /docs OpenAPI limited to the two public GETs", () => {
    const docs = publicReadOpenApiDocument();
    expect(Object.keys(docs.paths as object).sort()).toEqual(["/api/catalog", "/api/pharmacies"]);
    expect(JSON.stringify(docs)).toMatch(/no live inventory|has no live inventory/i);
    expect(JSON.stringify(docs)).not.toContain("/api/demand");
    expect(JSON.stringify(docs)).not.toContain("/api/reservations");
    expect(JSON.stringify(docs)).toContain("X-uYao-API-Version");
    expect(JSON.stringify(docs)).toContain("application/problem+json");
  });

  it("defines machine-actionable RFC 9457 error responses", () => {
    const schemas = (doc.components as Record<string, Record<string, Record<string, unknown>>>).schemas;
    const error = schemas.Error;
    expect(error.required).toEqual(expect.arrayContaining([
      "type",
      "title",
      "status",
      "detail",
      "code",
      "message",
      "resolution",
    ]));
    expect(JSON.stringify(doc)).toContain("application/problem+json");
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

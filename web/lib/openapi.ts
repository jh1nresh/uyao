import { AREAS } from "./data";
import { CONTACT_EMAIL, SITE_URL } from "./seo";
import { SHOP_URL } from "./shop";
import { PUBLIC_API_VERSION } from "./public-api";

/**
 * `/openapi.json` —— OpenAPI 3.1 描述。
 *
 * 兩種端點刻意分開對待：
 *
 *   GET  公開契約。回傳的都是頁面上已經公開的資料，可以被 agent 直接用。
 *   POST 寫入端點標 `x-internal: true`。它們是網站自己的表單出口，會收
 *        手機號碼、在真實藥局的 Store OS 建工作並觸發推播。列出來是為了
 *        誠實描述這個網域上存在什麼，不是邀請自動化呼叫；`x-internal`
 *        與每個 operation 的 description 都寫明這件事。
 *
 * 標記擋不住惡意呼叫 —— 真正的防線是 route 內的 rate limit、白名單驗證
 * 與 no-show 阻擋，那些本來就在。
 */

const READ_HEADERS_NOTE =
  "Cached at the edge for one hour and CORS-open. No authentication and no cookies. Rate-limited per client IP; successful and quota-checked error responses carry RateLimit-Policy and RateLimit using the current IETF HTTPAPI draft syntax, plus legacy compatibility fields. A 429 also carries Retry-After. The response contains only data these pages already render publicly.";

const NO_INVENTORY_NOTE =
  "uYao has no live inventory for any pharmacy. This API never returns price, stock, or availability, and no response may be presented as confirmed stock.";

const VERSION_POLICY_NOTE =
  `Clients may send X-uYao-API-Version: ${PUBLIC_API_VERSION}. Omitting the header selects the current version for backward compatibility. Every response returns the selected version. Before a version is retired, uYao will publish the migration path at /docs and signal it with the Deprecation and Sunset response headers.`;

const PUBLIC_RATE_LIMIT_HEADERS = {
  "RateLimit-Policy": {
    schema: { type: "string", example: '"public-read";q=120;w=3600' },
    description:
      "Stable public-read quota policy using the current IETF HTTPAPI RateLimit draft syntax.",
  },
  RateLimit: {
    schema: { type: "string", example: '"public-read";r=119;t=3600' },
    description:
      "Remaining public-read quota and effective window using the current IETF HTTPAPI RateLimit draft syntax.",
  },
  "RateLimit-Limit": {
    schema: { type: "integer", example: 120 },
    description: "Legacy compatibility field: request quota for the window.",
  },
  "RateLimit-Remaining": {
    schema: { type: "integer", example: 119 },
    description: "Legacy compatibility field: requests remaining in the window.",
  },
  "RateLimit-Reset": {
    schema: { type: "integer", example: 3600 },
    description: "Legacy compatibility field: seconds until the quota window resets.",
  },
};

const PUBLIC_RESPONSE_HEADERS = {
  "X-uYao-API-Version": {
    schema: { type: "string", enum: [PUBLIC_API_VERSION] },
    description: "The API contract version used for this response.",
  },
  Link: {
    schema: { type: "string" },
    description: "Link to the versioning and deprecation policy. This link alone does not mean the endpoint is deprecated.",
  },
  ...PUBLIC_RATE_LIMIT_HEADERS,
};

const PUBLIC_RATE_LIMITED_RESPONSE_HEADERS = {
  ...PUBLIC_RESPONSE_HEADERS,
  "Retry-After": {
    schema: { type: "integer", example: 3600 },
    description: "Seconds the client should wait before retrying after a 429 response.",
  },
};

function localeParam() {
  return {
    name: "locale",
    in: "query",
    required: false,
    description: "Response language. Anything other than `en` returns Traditional Chinese.",
    schema: { type: "string", enum: ["zh", "en"], default: "zh" },
  };
}

function apiVersionParam() {
  return {
    name: "X-uYao-API-Version",
    in: "header",
    required: false,
    description:
      `Optional API contract version. Omit it to use the current ${PUBLIC_API_VERSION} contract. Unsupported values return an RFC 9457 JSON problem.`,
    schema: { type: "string", enum: [PUBLIC_API_VERSION], default: PUBLIC_API_VERSION },
  };
}

export function openApiDocument(): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: "uYao public API",
      version: PUBLIC_API_VERSION,
      summary: "Read-only access to the uYao catalog and public pharmacy records.",
      description: [
        "uYao is an AI operating system for independent pharmacies in Taiwan, currently a pilot prototype.",
        "",
        "Boundaries that apply to every response:",
        "",
        `- ${NO_INVENTORY_NOTE}`,
        "- uYao is not an online pharmacy. Nothing here is purchasable and no endpoint accepts an order.",
        "- Nothing here is medical or medication advice. Substitution, dosage, and suitability are answered by a pharmacist.",
        "- Listed items are supplements and over-the-counter products. Prescription medicine is out of scope.",
        "- Pharmacy records come from Taiwan government open data. A listing is not a uYao partnership.",
        "",
        "The `GET` endpoints are a public contract. The `POST` endpoints are marked `x-internal` and exist for this site's own forms: they accept personal contact details and create work in a real pharmacy's console. They are documented for completeness, not for automated use.",
        "",
        VERSION_POLICY_NOTE,
        "",
        `Developer resources: ${SITE_URL}/docs and ${SITE_URL}/openapi.json.`,
        "",
        `See also ${SITE_URL}/llms.txt for the page-level index.`,
      ].join("\n"),
      contact: { email: CONTACT_EMAIL, url: `${SITE_URL}/en` },
      license: {
        name: "Catalog and pharmacy data are published for reference; attribute uYao when reused.",
        url: `${SITE_URL}/en/evidence`,
      },
    },
    servers: [
      { url: SHOP_URL, description: "Consumer host. Serves the catalog and pharmacy endpoints." },
      { url: SITE_URL, description: "Company host. Same API surface." },
    ],
    externalDocs: { url: `${SITE_URL}/docs`, description: "uYao developer resources, errors, versioning, and deprecation policy" },
    tags: [
      { name: "catalog", description: "Partner-listed catalog items. Read-only." },
      { name: "pharmacies", description: "Public pharmacy records. Read-only." },
      {
        name: "intake",
        description:
          "Write endpoints backing this site's own forms. Not a public contract; see x-internal.",
      },
    ],
    paths: {
      "/api/catalog": {
        get: {
          tags: ["catalog"],
          operationId: "listCatalog",
          summary: "List every catalog item",
          description: `Returns the catalog records partner pharmacies provided. ${NO_INVENTORY_NOTE} ${READ_HEADERS_NOTE}`,
          parameters: [apiVersionParam(), localeParam()],
          responses: {
            "200": {
              description: "The full catalog. Not live inventory.",
              headers: {
                ...PUBLIC_RESPONSE_HEADERS,
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CatalogList" },
                },
                "text/markdown": { schema: { type: "string" } },
              },
            },
            "400": {
              description: "Unsupported API version. RFC 9457 JSON problem.",
              content: {
                "application/problem+json": { schema: { $ref: "#/components/schemas/Error" } },
              },
            },
            "429": {
              description: "Rate limited. JSON error body plus RateLimit headers.",
              headers: PUBLIC_RATE_LIMITED_RESPONSE_HEADERS,
              content: {
                "application/problem+json": { schema: { $ref: "#/components/schemas/Error" } },
              },
            },
          },
        },
      },
      "/api/catalog/{slug}": {
        get: {
          tags: ["catalog"],
          operationId: "getCatalogItem",
          summary: "Get one catalog item",
          description: `Adds dosage, cautions, and label highlights to the list fields. Label highlights are reproduced from the packaging and are the manufacturer's wording, not uYao's assessment. ${READ_HEADERS_NOTE}`,
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              description: "Item slug, as returned by `listCatalog`.",
              schema: { type: "string" },
            },
            apiVersionParam(),
            localeParam(),
          ],
          responses: {
            "200": {
              description: "One catalog item.",
              headers: PUBLIC_RESPONSE_HEADERS,
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/CatalogItemDetailResponse" },
                },
              },
            },
            "400": {
              description: "Unsupported API version. RFC 9457 JSON problem.",
              content: {
                "application/problem+json": { schema: { $ref: "#/components/schemas/Error" } },
              },
            },
            "404": {
              description: "No item with that slug.",
              headers: PUBLIC_RESPONSE_HEADERS,
              content: {
                "application/problem+json": { schema: { $ref: "#/components/schemas/Error" } },
              },
            },
            "429": {
              description: "Rate limited. JSON error body plus RateLimit and Retry-After headers.",
              headers: PUBLIC_RATE_LIMITED_RESPONSE_HEADERS,
              content: {
                "application/problem+json": { schema: { $ref: "#/components/schemas/Error" } },
              },
            },
          },
        },
      },
      "/api/pharmacies": {
        get: {
          tags: ["pharmacies"],
          operationId: "listPharmacies",
          summary: "List public pharmacy records",
          description: `Pharmacy records assembled from Taiwan government open data. The pharmacist-in-charge name is deliberately not exposed. When \`hoursSource\` is \`nhi\`, hours are National Health Insurance dispensing hours and are not store opening hours. ${READ_HEADERS_NOTE}`,
          parameters: [
            {
              name: "area",
              in: "query",
              required: false,
              description: "Restrict to one service area.",
              schema: { type: "string", enum: AREAS.map((area) => area.slug) },
            },
            apiVersionParam(),
            localeParam(),
          ],
          responses: {
            "200": {
              description: "Matching pharmacy records.",
              headers: {
                ...PUBLIC_RESPONSE_HEADERS,
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/PharmacyList" },
                },
              },
            },
            "400": {
              description: "Unknown area slug. JSON error body.",
              content: {
                "application/problem+json": { schema: { $ref: "#/components/schemas/Error" } },
              },
            },
            "429": {
              description: "Rate limited. JSON error body plus RateLimit headers.",
              headers: PUBLIC_RATE_LIMITED_RESPONSE_HEADERS,
              content: {
                "application/problem+json": { schema: { $ref: "#/components/schemas/Error" } },
              },
            },
          },
        },
      },
      "/api/demand": {
        post: {
          tags: ["intake"],
          operationId: "recordDemandSignal",
          summary: "Record a failed search (site form only)",
          "x-internal": true,
          description:
            "Backs the consumer search form. Records that a search found nothing, optionally with a contact string the person typed. Rate limited per client. Documented for completeness; this is not a public contract and automated submission is not supported.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DemandSignal" },
              },
            },
          },
          responses: {
            "200": { description: "Recorded." },
            "400": { description: "Malformed JSON." },
            "404": { description: "Unknown item slug for an inventory miss." },
            "422": { description: "Invalid kind, or a catalog miss with no query." },
            "429": { description: "Rate limited. Retry after the `retry-after` header." },
          },
        },
      },
      "/api/pilot": {
        post: {
          tags: ["intake"],
          operationId: "submitPilotApplication",
          summary: "Submit a pharmacy pilot application (site form only)",
          "x-internal": true,
          description:
            "Backs the pilot application form and emails the uYao team. Accepts a pharmacy name and a contact route. Rate limited per client. Documented for completeness; this is not a public contract and automated submission is not supported.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PilotApplication" },
              },
            },
          },
          responses: {
            "200": { description: "Submitted." },
            "400": { description: "Malformed JSON." },
            "422": { description: "Missing or invalid fields." },
            "429": { description: "Rate limited. Retry after the `retry-after` header." },
          },
        },
      },
      "/api/reservations": {
        post: {
          tags: ["intake"],
          operationId: "createReservation",
          summary: "Create a pickup reservation",
          description:
            "Creates work in a real pharmacy's Store OS and can trigger a push notification on that pharmacy's devices. Accepts a Taiwanese mobile number, which must belong to the person collecting the item. `storeSlug` must be a pharmacy that lists this item — see `availableAt` on the catalog item. Online reservation is additionally limited to pharmacies already working in Store OS; every other pharmacy returns 409 and must be reached by phone, so tell the person to call the number on the pharmacy record rather than retrying. No pharmacy is onboarded yet, so 409 is currently the expected response for every real pharmacy. Every reservation is a request, not a stock guarantee: the pharmacy confirms availability and price in store. Rate limited to 5 per contact number per hour, and numbers with repeated no-shows are blocked. Browser traffic is additionally limited to 20 per IP per hour; assistants and other server-side callers should send an agent key (see `agentKey`) to get their own quota instead of sharing one.",
          security: [{ agentKey: [] }, {}],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Reservation" },
              },
            },
          },
          responses: {
            "200": { description: "Reserved. Returns a pickup code." },
            "400": { description: "Malformed JSON." },
            "403": { description: "Blocked for repeated no-shows." },
            "404": { description: "Unknown item, pharmacy, or no such listing at that pharmacy." },
            "409": {
              description:
                "This pharmacy does not take online reservations yet. `error` carries its phone number; relay it instead of retrying.",
            },
            "422": { description: "Invalid contact number or intake fields." },
            "429": { description: "Rate limited. Retry after the `retry-after` header." },
          },
        },
        delete: {
          tags: ["intake"],
          operationId: "cancelReservation",
          summary: "Cancel a reservation (site form only)",
          "x-internal": true,
          description:
            "Backs the cancel button on a reservation receipt page. Documented for completeness; this is not a public contract and automated submission is not supported.",
          responses: {
            "200": { description: "Cancelled." },
            "404": { description: "Unknown reservation." },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        agentKey: {
          type: "apiKey",
          in: "header",
          name: "x-uyao-agent-key",
          description:
            "Issued per assistant so that server-side callers get their own hourly quota instead of sharing the browser IP limit. It does not bypass the per-contact-number limit, and it does not grant access to anything a browser cannot already do. Ask uYao for a key.",
        },
      },
      schemas: {
        Error: {
          type: "object",
          description: "RFC 9457 problem details with stable uYao compatibility fields and a machine-actionable resolution hint.",
          properties: {
            type: { type: "string", format: "uri-reference" },
            title: { type: "string" },
            status: { type: "integer", minimum: 400, maximum: 599 },
            detail: { type: "string" },
            error: { type: "string", description: "Backward-compatible stable error code." },
            code: { type: "string", description: "Stable machine-readable error code." },
            message: { type: "string", description: "Short human-readable error summary." },
            resolution: { type: "string", description: "Action the caller can take to resolve the error." },
          },
          required: ["type", "title", "status", "detail", "error", "code", "message", "resolution"],
        },
        ResponseEnvelope: {
          type: "object",
          properties: {
            version: { type: "string", description: "Payload shape version." },
            locale: { type: "string", enum: ["zh", "en"] },
            disclaimer: {
              type: "string",
              description:
                "Boundary text that must survive any summary of this response. Present on every read response.",
            },
          },
          required: ["version", "locale", "disclaimer"],
        },
        CatalogList: {
          allOf: [
            { $ref: "#/components/schemas/ResponseEnvelope" },
            {
              type: "object",
              properties: {
                count: { type: "integer" },
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/CatalogItem" },
                },
              },
              required: ["count", "items"],
            },
          ],
        },
        CatalogItemDetailResponse: {
          allOf: [
            { $ref: "#/components/schemas/ResponseEnvelope" },
            {
              type: "object",
              properties: { item: { $ref: "#/components/schemas/CatalogItemDetail" } },
              required: ["item"],
            },
          ],
        },
        CatalogItem: {
          type: "object",
          description:
            "A catalog record. Carries no price, stock, or availability, by design.",
          properties: {
            slug: { type: "string" },
            url: { type: "string", format: "uri", description: "Canonical page for this item." },
            name: { type: "string" },
            catalogRecordUpdatedOn: {
              type: "string",
              format: "date",
              description:
                "Date when this catalog record's public product content last changed. This is not an inventory scan timestamp, stock freshness signal, or availability confirmation.",
            },
            nameEn: {
              type: "string",
              description: "Present only when a real English product name exists.",
            },
            form: { type: "string" },
            spec: { type: "string" },
            drugClass: {
              type: "string",
              description:
                "Regulatory class. `待確認` / `Classification pending` means public data cannot determine it; it is never guessed.",
            },
            category: { type: "string" },
            ingredients: { type: "array", items: { type: "string" } },
            nutritionFocus: {
              type: "string",
              description:
                "Everyday nutrition positioning. Not an approved indication and not a treatment claim.",
            },
            manufacturer: { type: "string" },
            origin: { type: "string" },
            licenseNo: {
              type: "string",
              description:
                "Ministry of Health and Welfare licence number. Omitted rather than guessed when unknown.",
            },
            image: {
              type: "object",
              properties: {
                url: { type: "string", format: "uri" },
                kind: {
                  type: "string",
                  enum: ["illustration", "packshot"],
                  description:
                    "`illustration` is a generated image and does not depict real packaging. `packshot` is a real photograph.",
                },
                alt: { type: "string" },
              },
              required: ["url", "kind", "alt"],
            },
            source: {
              type: "object",
              description: "Where the product details came from.",
              properties: {
                label: { type: "string" },
                url: { type: "string", format: "uri" },
                kind: { type: "string", enum: ["public", "partner"] },
              },
              required: ["label"],
            },
          },
          required: [
            "slug",
            "url",
            "name",
            "catalogRecordUpdatedOn",
            "form",
            "spec",
            "drugClass",
            "category",
            "ingredients",
            "nutritionFocus",
          ],
        },
        CatalogItemDetail: {
          allOf: [
            { $ref: "#/components/schemas/CatalogItem" },
            {
              type: "object",
              properties: {
                availableAt: {
                  type: "array",
                  description:
                    "Pharmacies that list this item. This is not live inventory and not a stock guarantee — it means the pharmacy told us it carries the product. Use `slug` here as `storeSlug` when creating a reservation.",
                  items: { $ref: "#/components/schemas/Pharmacy" },
                },
                dosage: { type: "string", description: "As printed on the packaging." },
                cautions: {
                  type: "string",
                  description: "Cautions and allergens, as printed on the packaging.",
                },
                labelHighlights: {
                  type: "array",
                  description:
                    "Product features copied from the manufacturer's label. The manufacturer's wording, not uYao's assessment or endorsement.",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      body: { type: "string" },
                    },
                    required: ["title", "body"],
                  },
                },
              },
            },
          ],
        },
        PharmacyList: {
          allOf: [
            { $ref: "#/components/schemas/ResponseEnvelope" },
            {
              type: "object",
              properties: {
                count: { type: "integer" },
                pharmacies: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Pharmacy" },
                },
              },
              required: ["count", "pharmacies"],
            },
          ],
        },
        Pharmacy: {
          type: "object",
          description:
            "A public pharmacy record. The pharmacist-in-charge name is deliberately not exposed.",
          properties: {
            slug: { type: "string" },
            url: { type: "string", format: "uri" },
            name: { type: "string" },
            area: { type: "string", enum: AREAS.map((area) => area.slug) },
            district: { type: "string" },
            address: { type: "string" },
            phone: { type: "string" },
            nhiCode: {
              type: ["string", "null"],
              description: "National Health Insurance institution code. Stable across renames.",
            },
            nhiContracted: { type: "boolean" },
            businessStatus: {
              type: ["string", "null"],
              description: "Google business status. Anything other than `OPERATIONAL` needs care.",
            },
            hoursSource: {
              type: "string",
              enum: ["google", "nhi", "partner", "none"],
              description:
                "`nhi` means National Health Insurance dispensing hours, which are not store opening hours. Never present them as a guarantee that the pharmacy is open.",
            },
            hours: {
              type: "array",
              items: {
                type: "object",
                properties: { label: { type: "string" }, hours: { type: "string" } },
                required: ["label", "hours"],
              },
            },
            mapsUrl: { type: "string", format: "uri" },
            location: {
              type: ["object", "null"],
              properties: {
                lat: { type: "number" },
                lng: { type: "number" },
              },
              required: ["lat", "lng"],
            },
          },
          required: [
            "slug",
            "url",
            "name",
            "area",
            "district",
            "address",
            "nhiCode",
            "nhiContracted",
            "businessStatus",
            "hoursSource",
            "hours",
            "mapsUrl",
            "location",
          ],
        },
        DemandSignal: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["catalog_miss", "inventory_miss"] },
            query: { type: "string", maxLength: 100 },
            drugSlug: { type: "string", maxLength: 80 },
            area: { type: "string", enum: AREAS.map((area) => area.slug) },
            contact: {
              type: "string",
              maxLength: 80,
              description: "Optional, and only when the person actively left it.",
            },
          },
          required: ["kind"],
        },
        PilotApplication: {
          type: "object",
          properties: {
            name: { type: "string", description: "Pharmacy name." },
            area: { type: "string" },
            contact: { type: "string", description: "Personal contact detail." },
            problems: { type: "array", items: { type: "string" } },
          },
          required: ["name", "contact"],
        },
        Reservation: {
          type: "object",
          properties: {
            drugSlug: { type: "string" },
            storeSlug: { type: "string" },
            contact: {
              type: "string",
              pattern: "^09\\d{8}$",
              description: "Taiwanese mobile number. Personal data.",
            },
            demo: { type: "boolean", description: "Sandbox reservation; never mixed with real ones." },
          },
          required: ["drugSlug", "storeSlug", "contact"],
        },
      },
    },
  };
}

/**
 * Agent-facing /docs contract: only the two public GETs.
 * The full /openapi.json still lists site-form writes as x-internal.
 */
export function publicReadOpenApiDocument(): Record<string, unknown> {
  const full = openApiDocument();
  const paths = full.paths as Record<string, unknown>;
  const components = full.components as { schemas?: Record<string, unknown> };
  const keepSchemas = [
    "Error",
    "ResponseEnvelope",
    "CatalogList",
    "CatalogItem",
    "PharmacyList",
    "Pharmacy",
  ];
  const schemas = Object.fromEntries(
    keepSchemas
      .map((name) => [name, components.schemas?.[name]] as const)
      .filter((entry) => entry[1] !== undefined),
  );

  return {
    openapi: full.openapi,
    info: {
      ...(full.info as Record<string, unknown>),
      title: "uYao public read API",
      summary: "GET /api/catalog and GET /api/pharmacies only. Not live inventory.",
      description: [
        "Public read contract for agents. Two GET endpoints.",
        "",
        `- ${NO_INVENTORY_NOTE}`,
        "- These responses repeat fields the catalog and pharmacy pages already render.",
        "- They are not a diagnosis API and not a Store OS control plane. Store OS is a prototype.",
        "- Site-form POST endpoints exist on this host for humans; they are not part of this document.",
        `- ${VERSION_POLICY_NOTE}`,
      ].join("\n"),
    },
    servers: full.servers,
    externalDocs: { url: `${SITE_URL}/docs`, description: "Human-readable notes for these two GETs" },
    tags: [
      { name: "catalog", description: "Partner-listed catalog items. Read-only. Not live inventory." },
      { name: "pharmacies", description: "Public pharmacy records. Read-only. Not live inventory." },
    ],
    paths: {
      "/api/catalog": paths["/api/catalog"],
      "/api/pharmacies": paths["/api/pharmacies"],
    },
    components: { schemas },
  };
}

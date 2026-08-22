import { API_TYPES, jsonHeaders, markdownHeaders, prefersMarkdown } from "./accept";
import { PUBLIC_CACHE_CONTROL } from "./agent-public";
import { catalogPayload, pharmaciesPayload, PUBLIC_API_VERSION } from "./public-api";
import { checkPublicRead, rateLimitHeaders, type CountedRateLimit } from "./rate-limit";
import { SITE_URL } from "./seo";

const CORS = { "access-control-allow-origin": "*" } as const;
export const PUBLIC_API_VERSION_HEADER = "X-uYao-API-Version";

const DEPRECATION_POLICY_URL = `${SITE_URL}/docs#versioning-and-deprecation`;

const PROBLEMS: Record<string, { title: string; detail: string; resolution: string }> = {
  rate_limited: {
    title: "Public read quota exceeded",
    detail: "This client has exceeded the public read request limit.",
    resolution: "Wait for the Retry-After interval before trying again.",
  },
  unknown_area: {
    title: "Unknown pharmacy area",
    detail: "The requested area is not in the published pharmacy area list.",
    resolution: "Use one of the values in known, or omit the area parameter.",
  },
  unsupported_api_version: {
    title: "Unsupported API version",
    detail: `The requested API version is not supported. The current version is ${PUBLIC_API_VERSION}.`,
    resolution: `Omit ${PUBLIC_API_VERSION_HEADER} or send ${PUBLIC_API_VERSION_HEADER}: ${PUBLIC_API_VERSION}.`,
  },
  catalog_unavailable: {
    title: "Catalog temporarily unavailable",
    detail: "The public catalog could not be generated.",
    resolution: "Retry later. Do not infer stock or availability from this error.",
  },
  pharmacies_unavailable: {
    title: "Pharmacy records temporarily unavailable",
    detail: "The public pharmacy record list could not be generated.",
    resolution: "Retry later. Do not infer stock or opening hours from this error.",
  },
  catalog_item_not_found: {
    title: "Catalog item not found",
    detail: "No public catalog item matches the requested slug.",
    resolution: "Fetch /api/catalog and use a slug returned in its items array.",
  },
  unknown_endpoint: {
    title: "Unknown API endpoint",
    detail: "This path is not part of the uYao API.",
    resolution: "Read /docs or /openapi.json and use a documented endpoint.",
  },
};

export function publicApiHeaders(): Record<string, string> {
  return {
    [PUBLIC_API_VERSION_HEADER]: PUBLIC_API_VERSION,
    Link: `<${DEPRECATION_POLICY_URL}>; rel="deprecation"; type="text/html"`,
    Vary: PUBLIC_API_VERSION_HEADER,
  };
}

export function publicReadHeaders(result: CountedRateLimit): Record<string, string> {
  return {
    "cache-control": PUBLIC_CACHE_CONTROL,
    ...CORS,
    ...publicApiHeaders(),
    ...rateLimitHeaders(result),
  };
}

export function jsonError(
  error: string,
  status: number,
  extra: Record<string, unknown> = {},
  rate?: CountedRateLimit,
): Response {
  const headers = jsonHeaders({
    "cache-control": status === 429 ? "no-store" : PUBLIC_CACHE_CONTROL,
    ...CORS,
    ...publicApiHeaders(),
    ...(rate ? rateLimitHeaders(rate) : {}),
    ...(status === 429 && rate ? { "retry-after": String(rate.retryAfterSec) } : {}),
  });
  headers.set("content-type", "application/problem+json; charset=utf-8");
  const problem = PROBLEMS[error] ?? {
    title: "API request failed",
    detail: "The API could not complete this request.",
    resolution: "Read /docs and retry with a documented request.",
  };
  return new Response(JSON.stringify({
    type: `${SITE_URL}/docs#api-errors`,
    title: problem.title,
    status,
    detail: problem.detail,
    error,
    code: error,
    message: problem.title,
    resolution: problem.resolution,
    ...extra,
  }), { status, headers });
}

export function publicApiVersionGate(request: Request): Response | null {
  const requested = request.headers.get(PUBLIC_API_VERSION_HEADER);
  if (!requested || requested === PUBLIC_API_VERSION) return null;
  return jsonError("unsupported_api_version", 400, {
    requestedVersion: requested,
    supportedVersions: [PUBLIC_API_VERSION],
  });
}

export async function publicReadGate(request: Request): Promise<
  { ok: true; rate: CountedRateLimit } | { ok: false; response: Response }
> {
  const versionError = publicApiVersionGate(request);
  if (versionError) return { ok: false, response: versionError };
  const rate = await checkPublicRead(request);
  if (!rate.ok) {
    return { ok: false, response: jsonError("rate_limited", 429, {}, rate) };
  }
  return { ok: true, rate };
}

export function catalogMarkdown(locale: "zh" | "en"): string {
  const items = catalogPayload(locale);
  const lines = [
    "# uYao catalog",
    "",
    "> Partner-listed catalog records. Not live inventory, not a price, not a diagnosis, and not purchasable online. A pharmacist confirms supply.",
    "",
    `count: ${items.length}`,
    "",
    ...items.map((item) => `- ${item.name} (${item.slug})`),
    "",
  ];
  return lines.join("\n");
}

export function pharmaciesMarkdown(locale: "zh" | "en", area?: string): string {
  const pharmacies = pharmaciesPayload(locale, area);
  const lines = [
    "# uYao public pharmacy records",
    "",
    "> Public pharmacy records from Taiwan open data. A listing is not a uYao partnership and not available stock. When hoursSource is nhi, hours are National Health Insurance dispensing hours, not store opening hours.",
    "",
    `count: ${pharmacies.length}`,
    "",
    ...pharmacies.map((store) => `- ${store.name} (${store.slug}, ${store.area})`),
    "",
  ];
  return lines.join("\n");
}

export function negotiatePublicRead(input: {
  request: Request;
  rate: CountedRateLimit;
  jsonBody: unknown;
  markdownBody: string;
}): Response {
  const accept = input.request.headers.get("accept");
  const chosen = prefersMarkdown(accept, API_TYPES);
  if (chosen) {
    return new Response(input.markdownBody, {
      headers: markdownHeaders(publicReadHeaders(input.rate)),
    });
  }
  return new Response(JSON.stringify(input.jsonBody), {
    headers: jsonHeaders(publicReadHeaders(input.rate)),
  });
}

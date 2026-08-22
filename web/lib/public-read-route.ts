import { API_TYPES, jsonHeaders, markdownHeaders, prefersMarkdown } from "./accept";
import { PUBLIC_CACHE_CONTROL } from "./agent-public";
import { catalogPayload, pharmaciesPayload } from "./public-api";
import { checkPublicRead, rateLimitHeaders, type CountedRateLimit } from "./rate-limit";

const CORS = { "access-control-allow-origin": "*" } as const;

function baseHeaders(result: CountedRateLimit): Record<string, string> {
  return {
    "cache-control": PUBLIC_CACHE_CONTROL,
    ...CORS,
    ...rateLimitHeaders(result),
  };
}

function jsonError(
  error: string,
  status: number,
  extra: Record<string, unknown> = {},
  rate?: CountedRateLimit,
): Response {
  const headers = jsonHeaders({
    "cache-control": status === 429 ? "no-store" : PUBLIC_CACHE_CONTROL,
    ...CORS,
    ...(rate ? rateLimitHeaders(rate) : {}),
    ...(status === 429 && rate ? { "retry-after": String(rate.retryAfterSec) } : {}),
  });
  return new Response(JSON.stringify({ error, ...extra }), { status, headers });
}

export async function publicReadGate(request: Request): Promise<
  { ok: true; rate: CountedRateLimit } | { ok: false; response: Response }
> {
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
      headers: markdownHeaders(baseHeaders(input.rate)),
    });
  }
  return new Response(JSON.stringify(input.jsonBody), {
    headers: jsonHeaders(baseHeaders(input.rate)),
  });
}

export { jsonError };

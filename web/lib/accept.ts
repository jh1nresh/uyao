/**
 * Accept negotiation for HTML, Markdown, and JSON.
 *
 * Follows acceptmarkdown.com / RFC 9110 §12.5.1: most specific range wins
 * over q, then highest q, then client order. A missing Accept header keeps
 * the caller-supplied default (HTML for pages, JSON for the two public GETs).
 */

export type AcceptableType = "text/html" | "text/markdown" | "application/json";

type AcceptEntry = { type: string; q: number; specificity: number };

export const PAGE_TYPES = ["text/html", "text/markdown"] as const satisfies readonly AcceptableType[];
export const API_TYPES = ["application/json", "text/markdown"] as const satisfies readonly AcceptableType[];

const RSC_HEADERS = [
  "rsc",
  "next-router-state-tree",
  "next-router-prefetch",
  "next-url",
];

export function isRscRequest(headers: Headers): boolean {
  return RSC_HEADERS.some((name) => headers.has(name));
}

function parseAccept(header: string): AcceptEntry[] {
  return header.split(",").map((raw) => {
    const parts = raw.trim().split(";").map((part) => part.trim());
    const type = (parts[0] ?? "").toLowerCase();
    let q = 1;
    for (const param of parts.slice(1)) {
      const [name, value] = param.split("=").map((item) => item.trim());
      if (name === "q") {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) q = Math.max(0, Math.min(1, parsed));
      }
    }
    const specificity = type === "*/*" ? 0 : type.endsWith("/*") ? 1 : 2;
    return { type, q, specificity };
  });
}

function matches(entry: AcceptEntry, candidate: string): boolean {
  if (entry.type === "*/*") return true;
  if (entry.type.endsWith("/*")) return candidate.startsWith(entry.type.slice(0, -1));
  return entry.type === candidate;
}

export function preferredType(
  header: string | null,
  produces: readonly AcceptableType[],
): AcceptableType | null {
  if (!header) return produces[0] ?? null;
  const entries = parseAccept(header);
  if (entries.length === 0) return produces[0] ?? null;

  let bestType: AcceptableType | null = null;
  let bestQ = -1;
  let bestPosition = Infinity;

  for (const candidate of produces) {
    let matched: AcceptEntry | null = null;
    let matchedPosition = Infinity;
    for (let idx = 0; idx < entries.length; idx += 1) {
      const entry = entries[idx];
      if (!entry || !matches(entry, candidate)) continue;
      if (
        matched === null
        || entry.specificity > matched.specificity
        || (entry.specificity === matched.specificity && idx < matchedPosition)
      ) {
        matched = entry;
        matchedPosition = idx;
      }
    }
    if (matched === null || matched.q <= 0) continue;
    if (matched.q > bestQ || (matched.q === bestQ && matchedPosition < bestPosition)) {
      bestQ = matched.q;
      bestPosition = matchedPosition;
      bestType = candidate;
    }
  }

  return bestType;
}

export function prefersMarkdown(
  header: string | null,
  produces: readonly AcceptableType[] = PAGE_TYPES,
): boolean {
  return preferredType(header, produces) === "text/markdown";
}

export function appendVaryAccept(headers: Headers): void {
  const existing = headers.get("vary");
  if (!existing) {
    headers.set("vary", "Accept");
    return;
  }
  const tokens = existing.split(",").map((token) => token.trim().toLowerCase());
  if (!tokens.includes("accept")) {
    headers.set("vary", `${existing}, Accept`);
  }
}

export function markdownHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("content-type", "text/markdown; charset=utf-8");
  appendVaryAccept(headers);
  return headers;
}

export function jsonHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("content-type", "application/json; charset=utf-8");
  appendVaryAccept(headers);
  return headers;
}

export function htmlHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set("content-type", "text/html; charset=utf-8");
  appendVaryAccept(headers);
  return headers;
}

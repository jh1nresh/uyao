import { CONTACT_EMAIL } from "./seo";

/**
 * Machine-readable public pages for agents.
 *
 * Honesty only: no live stock, no diagnosis, Store OS is a prototype.
 * No street address, phone, or clinic hours. The public inbox is
 * uyao@agentmail.to. These strings are the HTML, markdown, and test source
 * so a crawler that never runs JS still sees the same claims.
 */

export const PUBLIC_CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

export const PUBLIC_PAGE_PATHS = ["/about", "/contact", "/privacy", "/docs"] as const;

export type PublicPagePath = (typeof PUBLIC_PAGE_PATHS)[number] | "/";

export const HOMEPAGE_H1 = "uYao is a pilot prototype for independent pharmacies";

export const HOMEPAGE_PROSE = [
  "uYao helps independent pharmacies in Taiwan turn shelf scans, expiry dates, and nearby medicine requests into work a pharmacist can approve. Store OS is a prototype, not a shipped replacement for a pharmacy counter, a POS, or the national insurance claim system.",
  "This site does not sell medicine online. Catalog records are partner-listed product details, not live inventory, not a price, and not a promise that a pharmacy has the item today. A pharmacist confirms supply, substitution, pickup, and any medication question.",
  "Nothing here is a diagnosis or medication advice. Dosage, suitability, and what to take stay with a licensed pharmacist. Prescription medicine is out of scope.",
  "Public contact is email only: uyao@agentmail.to. There is no public street address or phone number on this site, and this page does not invent one.",
].join("\n\n");

export const HOMEPAGE_LIMITS_HEADING = "What this site will not claim";

export const HOMEPAGE_LIMITS = [
  "No live stock, availability, or shelf count for any pharmacy.",
  "No diagnosis, prescription, or dosage recommendation.",
  "Store OS is a prototype. Treat demo work items as demonstration data.",
  "GET /api/catalog and GET /api/pharmacies repeat public page fields only.",
];

type TrustPage = {
  path: PublicPagePath;
  title: string;
  kicker: string;
  description: string;
  body: string;
};

export const TRUST_PAGES: Record<Exclude<PublicPagePath, "/">, TrustPage> = {
  "/about": {
    path: "/about",
    title: "About uYao",
    kicker: "About",
    description:
      "uYao is a pilot prototype for independent pharmacies. It does not sell medicine online, does not diagnose, and does not publish live stock.",
    body: [
      "uYao is building an AI operating system for independent pharmacies in Taiwan. The public site explains the pilot, lists partner catalog records, and collects pharmacy applications. Store OS is a prototype console for draft work such as returns, reorders, and pickup requests. A pharmacist still approves any high-impact action.",
      "uYao is not an online pharmacy and not a marketplace. Nothing on this site is purchasable. Catalog entries are records a partner pharmacy provided. They are not live inventory and not a recommendation for a symptom.",
      "uYao does not diagnose illness or advise on medication. Substitution, dose, and whether a product is appropriate are answered in the pharmacy, not by this website or its APIs.",
      "Store OS is a prototype. Screens, demo work items, and interactive previews use demonstration data. They are not a live feed of a pharmacy's shelves.",
      `Corrections go to ${CONTACT_EMAIL}. This page does not publish a street address or phone number.`,
    ].join("\n\n"),
  },
  "/contact": {
    path: "/contact",
    title: "Contact uYao",
    kicker: "Contact",
    description:
      "Email uyao@agentmail.to. uYao does not publish a public street address or phone number.",
    body: [
      `The public inbox is ${CONTACT_EMAIL}. Use it for corrections, pilot questions, and catalog mistakes. There is no public street address and no public phone number. This page does not invent clinic hours, a walk-in desk, or a fax line.`,
      "Pharmacy operators who want to join the pilot can also use the application form on the pharmacy page. That form emails the uYao team. It is not an order desk and it does not reserve stock.",
      "Agents reading this site should not call a pharmacy on uYao's behalf unless the user already has that pharmacy's own public number from a pharmacy record. uYao's organization contact is email only.",
      "This site does not diagnose, does not publish live stock, and does not sell medicine. Store OS is a prototype. If a person needs a product today, they still talk to a pharmacist.",
    ].join("\n\n"),
  },
  "/privacy": {
    path: "/privacy",
    title: "Privacy",
    kicker: "Privacy",
    description:
      "What uYao collects on the public site, and what this prototype does not do with inventory or diagnosis.",
    body: [
      "The public site stores what a person types into a form they submit: a pharmacy pilot application, a medicine request, or a reservation contact number. Those writes are for this site's own forms. They are not a public write API for agents.",
      "GET /api/catalog and GET /api/pharmacies are read-only. They return fields the corresponding pages already show. They do not return live stock, price, or availability, and they do not accept personal data.",
      "Reservation requests can include a Taiwanese mobile number so a pharmacy can complete pickup. That is personal data. Automated submission is not a supported public contract.",
      "uYao does not sell medicine online and does not diagnose. Public catalog reads are not advice about what a person should take. Store OS is a prototype. Demo inventory on preview screens is simulated and must not be treated as a real shelf count.",
      `Privacy questions go to ${CONTACT_EMAIL}. This policy does not list a street address or phone number.`,
    ].join("\n\n"),
  },
  "/docs": {
    path: "/docs",
    title: "uYao public read API",
    kicker: "Docs",
    description:
      "OpenAPI for GET /api/catalog and GET /api/pharmacies. Both are static public records, not live inventory.",
    body: [
      "The public read contract is two GET endpoints. They are documented here and in /openapi.json. Do not treat any other path on this host as a supported agent API.",
      "GET /api/catalog returns partner-listed catalog records. Each response includes a disclaimer. The payload has product copy the catalog pages already render. It does not include price, stock, availability, or an inventory scan timestamp.",
      "GET /api/pharmacies returns public pharmacy records assembled from Taiwan government open data. A listing is not a uYao partnership and not proof of stock. When hoursSource is nhi, those hours are National Health Insurance dispensing hours, not a promise the store is open.",
      "Both endpoints are rate limited per client IP. Successful responses and 429 responses send RateLimit headers. Failures return a JSON object with an error field, never an HTML app shell.",
      "Send Accept: application/json for JSON (the default) or Accept: text/markdown for a markdown rendering of the same records. Responses include Vary: Accept.",
      "These GETs are not live inventory. They cannot diagnose. Store OS remains a prototype, so nothing in the catalog payload means a pharmacist has confirmed a sale.",
    ].join("\n\n"),
  },
};

export function visibleTextLength(text: string): number {
  return text.replace(/\s+/g, " ").trim().length;
}

export function homepageVisibleText(): string {
  return [HOMEPAGE_H1, HOMEPAGE_PROSE, HOMEPAGE_LIMITS_HEADING, ...HOMEPAGE_LIMITS].join(" ");
}

export function trustPageVisibleText(path: Exclude<PublicPagePath, "/">): string {
  const page = TRUST_PAGES[path];
  return [page.title, page.body].join(" ");
}

export function homepageMarkdown(): string {
  return [
    `# ${HOMEPAGE_H1}`,
    "",
    HOMEPAGE_PROSE,
    "",
    `## ${HOMEPAGE_LIMITS_HEADING}`,
    "",
    ...HOMEPAGE_LIMITS.map((line) => `- ${line}`),
    "",
    "## Next",
    "",
    "- [About](/about)",
    "- [Contact](/contact)",
    "- [Privacy](/privacy)",
    "- [Docs](/docs)",
    "- [llms.txt](/llms.txt)",
    `- Email: ${CONTACT_EMAIL}`,
    "",
  ].join("\n");
}

export function trustPageMarkdown(path: Exclude<PublicPagePath, "/">): string {
  const page = TRUST_PAGES[path];
  return [`# ${page.title}`, "", page.body, "", "See also: [/](/), [/llms.txt](/llms.txt)", ""].join(
    "\n",
  );
}

export function notFoundMarkdown(): string {
  return [
    "# Page not found",
    "",
    "This URL is not a uYao page. Try one of these:",
    "",
    "- [Home](/)",
    "- [About](/about)",
    "- [Contact](/contact)",
    "- [Docs](/docs)",
    "- [llms.txt](/llms.txt)",
    "- [Sitemap](/sitemap.xml)",
    "",
    "uYao does not publish live stock and does not diagnose.",
    "",
  ].join("\n");
}

export function notFoundHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Page not found · uYao</title>
</head>
<body>
<h1>Page not found</h1>
<p>This URL is not a uYao page. uYao does not publish live stock and does not diagnose.</p>
<ul>
<li><a href="/">Home</a></li>
<li><a href="/about">About</a></li>
<li><a href="/contact">Contact</a></li>
<li><a href="/docs">Docs</a></li>
<li><a href="/llms.txt">llms.txt</a></li>
<li><a href="/sitemap.xml">Sitemap</a></li>
</ul>
</body>
</html>
`;
}

export function pageMarkdown(pathname: string): string | undefined {
  if (pathname === "/" || pathname === "/zh-tw" || pathname === "/en") {
    return homepageMarkdown();
  }
  const bare = pathname.replace(/^\/(zh-tw|en)(?=\/|$)/, "") || "/";
  if (bare === "/") return homepageMarkdown();
  if (bare === "/about" || bare === "/contact" || bare === "/privacy" || bare === "/docs") {
    return trustPageMarkdown(bare);
  }
  return undefined;
}

export function applyPublicCache(headers: Headers): void {
  headers.set("cache-control", PUBLIC_CACHE_CONTROL);
  headers.set("cdn-cache-control", PUBLIC_CACHE_CONTROL);
}

/** Paths that already have an app route and must not be treated as a 404. */
export const KNOWN_BARE_PREFIXES = [
  "/about",
  "/contact",
  "/privacy",
  "/docs",
  "/pharmacy",
  "/evidence",
  "/guides",
  "/compare",
  "/console",
  "/shop-showcase-preview",
  "/store-os-preview",
  "/store-os",
  "/app",
  "/demo",
  "/drug",
  "/store",
  "/search",
  "/category",
  "/r",
  "/stock-badges",
  "/openapi.json",
  "/llms.txt",
] as const;

export function isKnownBarePath(barePath: string): boolean {
  if (barePath === "/") return true;
  return KNOWN_BARE_PREFIXES.some(
    (prefix) => barePath === prefix || barePath.startsWith(`${prefix}/`),
  );
}

/**
 * Unprefixed company routes that still 308 to /zh-tw/... so existing
 * canonical URLs stay locale-explicit. New agent pages stay at /about etc.
 */
export const LEGACY_LOCALE_PREFIX_ROUTES = [
  "/pharmacy",
  "/evidence",
  "/guides",
  "/compare",
  "/console",
  "/shop-showcase-preview",
  "/store-os-preview",
] as const;

export function needsLocalePrefixRedirect(barePath: string): boolean {
  return LEGACY_LOCALE_PREFIX_ROUTES.some(
    (prefix) => barePath === prefix || barePath.startsWith(`${prefix}/`),
  );
}

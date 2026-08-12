import type { Locale } from "./i18n";
import { SHOP_URL } from "./shop";

/**
 * SEO/GEO v1（spec: company-landing-page-seo-geo-v1.md）。
 *
 * Canonical host 走 env；fallback 也是已驗證的正式 owned domain，避免
 * 本機 build 或漏設 preview env 時重新產生舊 Vercel canonical。
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://uyaohealth.com"
).replace(/\/$/, "");

export const CANONICAL_HOST = new URL(SITE_URL).host;
export const SHOP_CANONICAL_HOST = new URL(SHOP_URL).host;

/**
 * Index 三重閘門：production deployment、canonical host、route 白名單。
 * Vercel preview、deployment URL 與非 company canonical host 一律拿不到 index。
 */
export function indexingAllowed(
  requestHost: string | null | undefined,
  vercelEnv: string | undefined = process.env.VERCEL_ENV,
): boolean {
  if (vercelEnv !== "production") return false;
  const host = (requestHost ?? "").toLowerCase().split(":")[0];
  return host === CANONICAL_HOST;
}

export function consumerIndexingAllowed(
  requestHost: string | null | undefined,
  vercelEnv: string | undefined = process.env.VERCEL_ENV,
): boolean {
  if (vercelEnv !== "production") return false;
  const host = (requestHost ?? "").toLowerCase().split(":")[0];
  return host === SHOP_CANONICAL_HOST;
}

/** 允許 index 的 canonical 公開路徑 —— robots meta 與 sitemap 的唯一來源。 */
export const INDEXABLE_PATHS = [
  "/zh-tw",
  "/en",
  "/zh-tw/pharmacy",
  "/en/pharmacy",
  "/zh-tw/evidence",
  "/zh-tw/guides/pharmacy-expiry-management",
  "/zh-tw/guides/pharmacy-return-window",
  "/zh-tw/guides/find-medicine-nearby",
  "/zh-tw/guides/medicine-out-of-stock",
  "/zh-tw/guides/join-uyao",
  "/zh-tw/compare/uyao-vs-pos",
] as const;

/** Consumer v1 先只開首頁；drug/store/category 仍須逐頁通過 admission gate。 */
export const SHOP_INDEXABLE_PATHS = ["/zh-tw", "/en"] as const;

/** Spec §3 的 stable entity description —— 全站與 schema 共用，不得改寫成 marketplace／POS／電商。 */
export const ENTITY_DESCRIPTION: Record<Locale, string> = {
  zh: "uYao 是台灣獨立藥局的 AI Operating System，將庫存、效期與附近需求轉成退貨、減量、補貨與預留工作，並由藥師批准關鍵決策。",
  en: "uYao is the AI operating system for independent pharmacies. It turns inventory, expiry, and local demand into return, reorder, and reservation workflows, with pharmacists approving critical decisions.",
};

export const CONSUMER_DESCRIPTION: Record<Locale, string> = {
  zh: "uYao 找藥協助使用者搜尋藥品與附近公開藥局資料，並留下找藥需求；實際庫存、預留、領取與用藥問題仍由藥局或藥師確認。",
  en: "uYao Medicine Finder helps people search a trial medicine catalog and nearby public pharmacy records, then leave a medicine request. Pharmacies and pharmacists confirm supply, pickup, and medicine questions.",
};

export const CONTACT_EMAIL = "edwardhsieh0122@gmail.com";
export const X_URL = "https://x.com/uyaohealth";

// ---------------------------------------------------------------------------
// JSON-LD builders。規則（spec §3）：不標 Pharmacy/MedicalOrganization、
// 不放 rating/review/price/customer count，日期與頁面可見內容一致。
// ---------------------------------------------------------------------------

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(): JsonLd {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "uYao",
    alternateName: "有藥",
    url: `${SITE_URL}/zh-tw`,
    email: CONTACT_EMAIL,
    description: ENTITY_DESCRIPTION.zh,
    sameAs: [X_URL],
  };
}

export function webSiteJsonLd(locale: Locale): JsonLd {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: locale === "en" ? "uYao" : "uYao 有藥",
    url: `${SITE_URL}${locale === "en" ? "/en" : "/zh-tw"}`,
    inLanguage: locale === "en" ? "en" : "zh-Hant-TW",
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function softwareApplicationJsonLd(locale: Locale): JsonLd {
  return {
    "@type": "SoftwareApplication",
    name: "uYao",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}${locale === "en" ? "/en" : "/zh-tw"}`,
    description: ENTITY_DESCRIPTION[locale],
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function consumerWebSiteJsonLd(locale: Locale): JsonLd {
  const path = locale === "en" ? "/en" : "/zh-tw";
  return {
    "@type": "WebSite",
    "@id": `${SHOP_URL}/#website`,
    name: locale === "en" ? "uYao Medicine Finder" : "uYao 找藥",
    url: `${SHOP_URL}${path}`,
    inLanguage: locale === "en" ? "en" : "zh-Hant-TW",
    description: CONSUMER_DESCRIPTION[locale],
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function consumerWebPageJsonLd(locale: Locale): JsonLd {
  const path = locale === "en" ? "/en" : "/zh-tw";
  return {
    "@type": "WebPage",
    "@id": `${SHOP_URL}${path}#webpage`,
    name: locale === "en" ? "Find medicine nearby | uYao Medicine Finder" : "附近藥局找藥與到貨通知｜uYao 找藥",
    url: `${SHOP_URL}${path}`,
    inLanguage: locale === "en" ? "en" : "zh-Hant-TW",
    description: CONSUMER_DESCRIPTION[locale],
    isPartOf: { "@id": `${SHOP_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function webPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
  dateModified: string;
}): JsonLd {
  return {
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: `${SITE_URL}${input.path}`,
    inLanguage: "zh-Hant-TW",
    dateModified: input.dateModified,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function articleJsonLd(input: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
}): JsonLd {
  return {
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    url: `${SITE_URL}${input.path}`,
    mainEntityOfPage: `${SITE_URL}${input.path}`,
    inLanguage: "zh-Hant-TW",
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: { "@type": "Organization", name: "uYao 團隊" },
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

export function faqPageJsonLd(items: { question: string; answer: string }[]): JsonLd {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/** 多個 node 併成一份 @graph，頁面只 render 一個 script tag。 */
export function jsonLdGraph(nodes: JsonLd[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes });
}

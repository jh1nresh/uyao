import type { Locale } from "./i18n";
import { SHOP_URL } from "./shop";

/**
 * SEO/GEO foundation with the AEO v1 answer contract in aeo.ts.
 *
 * Canonical host 走 env；fallback 也是已驗證的正式 owned domain，避免
 * 本機 build 或漏設 preview env 時重新產生舊 Vercel canonical。
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://uyaohealth.com"
).replace(/\/$/, "");

export const CANONICAL_HOST = new URL(SITE_URL).host;
export const SHOP_CANONICAL_HOST = new URL(SHOP_URL).host;
export const STORE_URL = "https://store.uyaohealth.com";
export const STORE_CANONICAL_HOST = new URL(STORE_URL).host;

/** Canonical public identity. Keep these values aligned with visible homepage copy. */
export const BRAND_NAME = "uYao 有藥";
export const BRAND_SHORT_NAME = "uYao";
export const BRAND_ALTERNATE_NAMES = [BRAND_SHORT_NAME, "有藥"] as const;
export const ORGANIZATION_LOGO_URL = `${SITE_URL}/brand/uyao-logo-640x640.png`;

export type SocialPreviewAudience = "company" | "shop";

export type SocialPreviewLocale = "zh" | "en";

type SocialPreviewImage = {
  url: string;
  width: 1200;
  height: 630;
  type: "image/png";
  alt: string;
};

export const SOCIAL_PREVIEW_IMAGES = {
  company: {
    zh: {
      url: `${SITE_URL}/brand/social/uyao-company-zh-v1.png`,
      width: 1200,
      height: 630,
      type: "image/png",
      alt: "uYao 有藥，台灣獨立藥局的 AI Operating System",
    },
    en: {
      url: `${SITE_URL}/brand/social/uyao-company-en-v1.png`,
      width: 1200,
      height: 630,
      type: "image/png",
      alt: "uYao, the AI operating system for independent pharmacies",
    },
  },
  shop: {
    zh: {
      url: `${SHOP_URL}/brand/social/uyao-shop-zh-v1.png`,
      width: 1200,
      height: 630,
      type: "image/png",
      alt: "uYao 找藥，搜尋附近公開藥局資料並留下找藥需求",
    },
    en: {
      url: `${SHOP_URL}/brand/social/uyao-shop-en-v1.png`,
      width: 1200,
      height: 630,
      type: "image/png",
      alt: "uYao Medicine Finder, search nearby public pharmacy records and leave a medicine request",
    },
  },
} as const satisfies Record<
  SocialPreviewAudience,
  Record<SocialPreviewLocale, SocialPreviewImage>
>;

/**
 * Which brand card a host shares. The shop host owns the consumer card; every
 * other host (company, preview, deployment URL) falls back to the company one
 * so no page can end up with no card at all.
 */
export function socialPreviewAudience(
  requestHost: string | null | undefined,
): SocialPreviewAudience {
  const host = (requestHost ?? "").toLowerCase().split(":")[0];
  return host === SHOP_CANONICAL_HOST ? "shop" : "company";
}

export function socialPreviewImages(
  audience: SocialPreviewAudience,
  locale: SocialPreviewLocale,
) {
  const image = SOCIAL_PREVIEW_IMAGES[audience][locale];
  return {
    openGraph: [image],
    twitter: [{ url: image.url, alt: image.alt }],
  };
}

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

export function storeIndexingAllowed(
  requestHost: string | null | undefined,
  vercelEnv: string | undefined = process.env.VERCEL_ENV,
): boolean {
  if (vercelEnv !== "production") return false;
  const host = (requestHost ?? "").toLowerCase().split(":")[0];
  return host === STORE_CANONICAL_HOST;
}

/**
 * 允許 index 的 canonical 公開路徑 —— robots meta 與 sitemap 的唯一來源。
 * 每個知識頁都有 zh-tw 與 en 兩個 canonical，彼此以 hreflang 互指
 * （來源見 lib/aeo.ts 的雙語 registry）。
 */
export const INDEXABLE_PATHS = [
  "/zh-tw",
  "/en",
  "/zh-tw/about",
  "/zh-tw/contact",
  "/zh-tw/privacy",
  "/docs",
  "/zh-tw/pharmacy",
  "/en/pharmacy",
  "/zh-tw/evidence",
  "/en/evidence",
  "/zh-tw/guides",
  "/en/guides",
  "/zh-tw/guides/ai-tools-pharmacy-inventory",
  "/en/guides/ai-tools-pharmacy-inventory",
  "/zh-tw/guides/pharmacy-expiry-management",
  "/en/guides/pharmacy-expiry-management",
  "/zh-tw/guides/pharmacy-return-window",
  "/en/guides/pharmacy-return-window",
  "/zh-tw/guides/find-medicine-nearby",
  "/en/guides/find-medicine-nearby",
  "/zh-tw/guides/medicine-out-of-stock",
  "/en/guides/medicine-out-of-stock",
  "/zh-tw/guides/join-uyao",
  "/en/guides/join-uyao",
  "/zh-tw/compare/uyao-vs-pos",
  "/en/compare/uyao-vs-pos",
] as const;

export type IndexablePath = (typeof INDEXABLE_PATHS)[number];

/**
 * Consumer 那一側的可收錄路徑不在這裡：品類與品項頁是動態的，整份
 * namespace 由 `lib/shop-index.ts` 依目錄資料與 admission gate 展開，
 * 連同每頁的 `lastmod`。search 與 store 頁維持 noindex（search 沒有穩定
 * 內容，store 頁會顯示尚未確認的供應資訊）。
 */

/** Spec §3 的 stable entity description —— 全站與 schema 共用，不得改寫成 marketplace／POS／電商。 */
export const ENTITY_DESCRIPTION: Record<Locale, string> = {
  zh: "uYao 有藥是台灣獨立藥局的 AI Operating System，將庫存、效期與附近需求轉成退貨、減量、補貨與預留工作，並由藥師批准關鍵決策。",
  en: "uYao is the AI operating system for independent pharmacies. It turns inventory, expiry, and local demand into return, reorder, and reservation workflows, with pharmacists approving critical decisions.",
};

export const CONSUMER_DESCRIPTION: Record<Locale, string> = {
  zh: "uYao 找藥協助使用者搜尋藥品與附近公開藥局資料，並留下找藥需求；實際庫存、預留、領取與用藥問題仍由藥局或藥師確認。",
  en: "uYao Medicine Finder helps people search a trial medicine catalog and nearby public pharmacy records, then leave a medicine request. Pharmacies and pharmacists confirm supply, pickup, and medicine questions.",
};

export const CONTACT_EMAIL = "uyao@agentmail.to";
export const X_URL = "https://x.com/uyaohealth";
export const INSTAGRAM_URL = "https://www.instagram.com/uyaohealth/";

// ---------------------------------------------------------------------------
// JSON-LD builders。規則（spec §3）：不標 Pharmacy/MedicalOrganization、
// 不放 rating/review/price/customer count，日期與頁面可見內容一致。
// ---------------------------------------------------------------------------

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(): JsonLd {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: BRAND_NAME,
    alternateName: BRAND_ALTERNATE_NAMES,
    url: `${SITE_URL}/`,
    logo: ORGANIZATION_LOGO_URL,
    email: CONTACT_EMAIL,
    contactPoint: {
      "@type": "ContactPoint",
      email: CONTACT_EMAIL,
    },
    description: ENTITY_DESCRIPTION.zh,
    sameAs: [X_URL, INSTAGRAM_URL],
  };
}

export function webSiteJsonLd(locale: Locale): JsonLd {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: BRAND_NAME,
    alternateName: [...BRAND_ALTERNATE_NAMES, CANONICAL_HOST],
    url: `${SITE_URL}/`,
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

export function storeOsSoftwareApplicationJsonLd(): JsonLd {
  return {
    "@type": "SoftwareApplication",
    "@id": `${STORE_URL}/#software`,
    name: "uYao Store OS",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${STORE_URL}/`,
    description:
      "A pilot workspace that turns pharmacy supply and local demand signals into pharmacist-authorized work with traceable outcomes.",
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

/** Breadcrumbs for consumer routes, anchored on the shop canonical host. */
export function consumerBreadcrumbJsonLd(items: { name: string; path: string }[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SHOP_URL}${item.path}`,
    })),
  };
}

/**
 * Catalog listing schema. Deliberately carries no `Offer`, price, or
 * availability: the catalog records what a partner pharmacy listed, not what is
 * purchasable or in stock right now.
 */
export function consumerItemListJsonLd(input: {
  name: string;
  description: string;
  path: string;
  inLanguage: "zh-Hant-TW" | "en";
  items: { name: string; path: string }[];
}): JsonLd {
  return {
    "@type": "CollectionPage",
    "@id": `${SHOP_URL}${input.path}#webpage`,
    name: input.name,
    description: input.description,
    url: `${SHOP_URL}${input.path}`,
    inLanguage: input.inLanguage,
    isPartOf: { "@id": `${SHOP_URL}/#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.items.length,
      itemListElement: input.items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        url: `${SHOP_URL}${item.path}`,
      })),
    },
  };
}

/**
 * Catalog item schema. `Product` only — never a medical type, and never an
 * `Offer`: uYao does not sell online and cannot assert live availability.
 */
export function consumerProductJsonLd(input: {
  name: string;
  description: string;
  path: string;
  inLanguage: "zh-Hant-TW" | "en";
  image?: string;
  manufacturer?: string;
  category?: string;
}): JsonLd {
  return {
    "@type": "Product",
    "@id": `${SHOP_URL}${input.path}#product`,
    name: input.name,
    description: input.description,
    url: `${SHOP_URL}${input.path}`,
    inLanguage: input.inLanguage,
    ...(input.image ? { image: `${SHOP_URL}${input.image}` } : {}),
    ...(input.manufacturer
      ? { manufacturer: { "@type": "Organization", name: input.manufacturer } }
      : {}),
    ...(input.category ? { category: input.category } : {}),
    isRelatedTo: { "@id": `${SHOP_URL}/#website` },
  };
}

/**
 * 藥局的公開記錄。
 *
 * `Pharmacy` 是 schema.org 的 MedicalBusiness 子型別，講的是「這是一家藥局」，
 * 不是「這裡買得到什麼」—— 所以這裡沒有 `makesOffer`、沒有 `hasOfferCatalog`、
 * 沒有任何供應或價格欄位。頁面上沒有的東西，結構化資料裡也不能有。
 *
 * 刻意不輸出 `openingHours`：站上的時段是中文自由字串（「星期一至星期日」、
 * 「09:00–12:00、14:00–17:00」、「公休」），而且一部分店的來源是**健保調劑
 * 時段**而非營業時間（`Store.hoursSource`）。轉成 schema.org 格式要一個能對
 * 54 家資料全部驗過的 parser；在那之前寧可不標 —— 標錯的時間會讓人白跑一趟，
 * 比沒有時間更糟。頁面上仍然照實顯示，並標明來源。
 */
export function consumerPharmacyJsonLd(input: {
  name: string;
  description: string;
  path: string;
  address: string;
  district: string;
  inLanguage: "zh-Hant-TW" | "en";
  telephone?: string;
  location?: { lat: number; lng: number } | null;
}): JsonLd {
  return {
    "@type": "Pharmacy",
    "@id": `${SHOP_URL}${input.path}#pharmacy`,
    name: input.name,
    description: input.description,
    url: `${SHOP_URL}${input.path}`,
    inLanguage: input.inLanguage,
    address: {
      "@type": "PostalAddress",
      streetAddress: input.address,
      addressLocality: input.district,
      addressCountry: "TW",
    },
    ...(input.telephone ? { telephone: input.telephone } : {}),
    ...(input.location
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: input.location.lat,
            longitude: input.location.lng,
          },
        }
      : {}),
    isPartOf: { "@id": `${SHOP_URL}/#website` },
  };
}

export function webPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
  dateModified: string;
  inLanguage?: "zh-Hant-TW" | "en";
}): JsonLd {
  return {
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: `${SITE_URL}${input.path}`,
    inLanguage: input.inLanguage ?? "zh-Hant-TW",
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
  image?: string;
  inLanguage?: "zh-Hant-TW" | "en";
}): JsonLd {
  const locale = input.inLanguage ?? "zh-Hant-TW";
  return {
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    url: `${SITE_URL}${input.path}`,
    mainEntityOfPage: `${SITE_URL}${input.path}`,
    // Article rich results need a ≥1200px image. Knowledge pages have no own
    // artwork, so they reuse the same card that gets shared on X/LINE —
    // pass `image` once a page owns a real illustration.
    image: input.image ?? SOCIAL_PREVIEW_IMAGES.company[locale === "en" ? "en" : "zh"].url,
    inLanguage: locale,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: { "@type": "Organization", name: locale === "en" ? "uYao team" : "uYao 團隊" },
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

import { CONSUMER_DESCRIPTION, CONTACT_EMAIL } from "./seo";

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
  canonicalPath: string;
  locale: "zh" | "en";
  title: string;
  kicker: string;
  description: string;
  body: string;
};

export const TRUST_PAGES: Record<Exclude<PublicPagePath, "/">, TrustPage> = {
  "/about": {
    path: "/about",
    canonicalPath: "/zh-tw/about",
    locale: "zh",
    title: "關於 uYao 有藥",
    kicker: "關於",
    description:
      "uYao 是台灣獨立藥局的 AI Operating System。不是線上藥局、不是 POS、不是即時庫存平台，也不是醫療或用藥建議。",
    body: [
      "uYao 是台灣獨立藥局的 AI Operating System。它把店內掃描、效期與附近找藥需求整理成待處理工作，關鍵決定由藥師批准，並留下結果紀錄。",
      "uYao 不是線上藥局，不做線上交易。不是 POS，也不取代健保申報。不是即時庫存平台：網站上的目錄與公開藥局資料，不能當成現貨保證。不是醫療或用藥建議服務；症狀描述只用來縮小搜尋方向，不能當診斷。",
      "消費者端（uyaohealth.com）讓人搜尋品名、成分或日常保養方向，查看附近公開藥局資料，並在找不到時留下找藥需求。出發前仍應由藥局或藥師確認品項、數量與領取安排。",
      "藥局端的 Store OS 目前是 prototype，正在招募試點。目標是訊號 → 核准 → 執行 → receipt，不是再做一塊庫存儀表板。現場退貨閉環、節省金額與即時庫存尚未驗證。示範數字是示範。",
      `公開證據見 /zh-tw/evidence。聯絡：${CONTACT_EMAIL}`,
    ].join("\n\n"),
  },
  "/contact": {
    path: "/contact",
    canonicalPath: "/zh-tw/contact",
    locale: "zh",
    title: "聯絡 uYao",
    kicker: "聯絡",
    description: `找藥需求、藥局試點、產品證據或網站問題，請來信 ${CONTACT_EMAIL}。不公佈電話與門市地址。`,
    body: [
      `找藥需求、藥局試點、產品證據或網站問題，請來信 ${CONTACT_EMAIL}。`,
      "請在信裡寫清楚：你是消費者還是藥局、地區（若找藥）、品項或想驗證的工作流。我們不在信裡做診斷、不保證附近有貨、不代替藥師核准。",
      "消費者：uYao 可以幫你看公開藥局資料或記下找藥需求；供應與用藥問題仍由藥局確認。建議在大同或中山等已收錄地區寫品項+地區。",
      "藥局：試點不要求更換 POS，也不碰病患或處方個資。Store OS 仍是 prototype。",
      "我們不公佈電話與門市地址。請用這封信箱。",
      `uYao 有藥 · ${CONTACT_EMAIL} · https://uyaohealth.com/zh-tw`,
    ].join("\n\n"),
  },
  "/privacy": {
    path: "/privacy",
    canonicalPath: "/zh-tw/privacy",
    locale: "zh",
    title: "隱私說明",
    kicker: "隱私",
    description:
      "uYao 處理找藥需求、藥局試點申請與維運紀錄。不是醫療機構，不蒐集病歷，公開目錄不是即時庫存。",
    body: [
      "uYao 有藥（uyaohealth.com、store.uyaohealth.com）處理的是找藥需求、藥局試點申請，以及網站運作所需的技術紀錄。",
      "我們不是醫療機構，不蒐集病歷，不把找藥需求當成處方。請不要在表單或信件裡傳送身分證字號、完整健保資料或他人處方。",
      "你可能主動提供：電子郵件、地區、品項名稱、藥局名稱、試點意願。這些用來回覆找藥或試點，不賣給第三方廣告網。",
      "網站會留下必要的伺服器日誌（時間、路徑、粗略技術資訊）以便維運與資安。我們使用托管供應商（例如網站與信件服務）時，資料會依其處理者義務處理。",
      "uYao Agent 不要求建立會員或長期健康檔案。啟用 OpenAI 或 Anthropic 模型時，最近最多 8 則對話文字、選擇的服務區與公開品項資料會交由該供應商處理，可能涉及境外處理。請勿在聊天輸入姓名、電話、健保、病歷或他人處方；你自行寫入對話的健康資訊也可能被送出。",
      "過敏第一步表單的回答只暫存於此瀏覽器分頁，30 分鐘後須重新確認，不放入 AI 請求。若繼續到藥局需求表單，可能帶入這份回答供你核對；送出給藥局前另行確認。關閉分頁可清除分頁暫存。",
      "OpenAI 請求設為 store: false，但這不代表零資料保留；供應商仍可能為濫用監控保留紀錄，實際保留依其資料政策及帳號設定。uYao 不將這些對話建立成個人健康檔案。",
      "公開藥局資料來自公開來源與合作藥局提供的品項目錄，不是即時庫存，也不表示我們持有該店的病患資料。",
      `要查詢、更正或刪除你留給我們的聯絡資料，請來信 ${CONTACT_EMAIL}。我們沒有電話客服。`,
      "本頁不是完整個資告知書的替代；若試點合約另有約定，以合約為準。",
    ].join("\n\n"),
  },
  "/docs": {
    path: "/docs",
    canonicalPath: "/docs",
    locale: "en",
    title: "uYao Developer Resources and Public API",
    kicker: "Docs",
    description:
      "OpenAPI for GET /api/catalog and GET /api/pharmacies. Both are static public records, not live inventory.",
    body: [
      HOMEPAGE_PROSE,
      `What this site will not claim: ${HOMEPAGE_LIMITS.join(" ")}`,
      "uYao developer resources live at predictable first-party URLs: /docs, /openapi.json, and /llms.txt. The public read contract is two GET endpoints. Do not treat any other path on this host as a supported agent API.",
      "GET /api/catalog returns partner-listed catalog records. Each response includes a disclaimer. The payload has product copy the catalog pages already render. It does not include price, stock, availability, or an inventory scan timestamp.",
      "GET /api/pharmacies returns public pharmacy records assembled from Taiwan government open data. A listing is not a uYao partnership and not proof of stock. When hoursSource is nhi, those hours are National Health Insurance dispensing hours, not a promise the store is open.",
      "Every public GET is rate limited per client IP. Successful responses and 429 responses send RateLimit-Policy and RateLimit using the current IETF HTTPAPI draft syntax; legacy RateLimit-Limit, RateLimit-Remaining, and RateLimit-Reset fields remain for compatibility. A 429 also sends Retry-After. Failures use RFC 9457 application/problem+json with type, title, status, detail, code, message, and resolution fields; the existing error field remains for compatibility.",
      "API versioning uses the optional X-uYao-API-Version request header. Omit it for the current contract, or send 1.1.0 explicitly. Every response returns X-uYao-API-Version. Unsupported versions return a structured 400 problem.",
      "No endpoint is deprecated today. The Link response header points to this policy without marking an endpoint deprecated. If a contract is retired, uYao will publish a migration path here, then send the standards-based Deprecation header and a Sunset date before removal.",
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
    "- [About](/zh-tw/about)",
    "- [Contact](/zh-tw/contact)",
    "- [Privacy](/zh-tw/privacy)",
    "- [Docs](/docs)",
    "- [llms.txt](/llms.txt)",
    `- Email: ${CONTACT_EMAIL}`,
    "",
  ].join("\n");
}

export function shopHomepageMarkdown(locale: "zh" | "en"): string {
  if (locale === "en") {
    return [
      "# uYao Medicine Finder",
      "",
      `> ${CONSUMER_DESCRIPTION.en}`,
      "",
      "## When to use",
      "",
      "- Search by product name, ingredient, or everyday wellness need.",
      "- Find public pharmacy records near a supported area in Taiwan.",
      "- Leave a request when the trial catalog does not answer the search.",
      "",
      "## Boundaries",
      "",
      "- Catalog records are partner-listed product details, not live inventory, a price, or a supply promise.",
      "- This site does not sell medicine online and does not provide diagnosis, dosage, substitution, or medication advice.",
      "- Recognized symptom language opens safety guidance instead of automatically recommending a product.",
      "- Prescription medicine is out of scope. Contact the pharmacy before travelling.",
      "",
      "## Developer resources",
      "",
      "- [Catalog API](/api/catalog): Public catalog records only; no stock, price, or availability.",
      "- [Pharmacy API](/api/pharmacies): Public pharmacy records; a listing is not a uYao partnership or stock confirmation.",
      "- [OpenAPI](/openapi.json): Machine-readable schemas, errors, versioning, and rate-limit headers.",
      "- [Developer documentation](https://uyaohealth.com/docs): Supported public contract and deprecation policy.",
      "- [Agent index](/llms.txt): When to use this site and what not to infer.",
      "",
    ].join("\n");
  }

  return [
    "# uYao 找藥",
    "",
    `> ${CONSUMER_DESCRIPTION.zh}`,
    "",
    "## 適合使用",
    "",
    "- 依品名、成分或日常保養方向搜尋公開目錄。",
    "- 查看台灣已支援地區的附近公開藥局資料。",
    "- 試營運目錄沒有答案時留下品項與地區需求。",
    "",
    "## 使用邊界",
    "",
    "- 目錄是合作藥局提供的品項資料，不是即時庫存、價格或供應保證。",
    "- 本站不在線上販售藥品，也不提供診斷、劑量、替代品或用藥建議。",
    "- 辨識到症狀文字時，先顯示安全提醒，不會自動推薦商品。",
    "- 處方藥不在範圍內；出發前請先聯絡藥局確認。",
    "",
    "## 開發者資源",
    "",
    "- [目錄 API](/api/catalog)：只回公開目錄欄位，不含庫存、價格或供應狀態。",
    "- [藥局 API](/api/pharmacies)：只回公開藥局資料；列出不代表合作或有貨。",
    "- [OpenAPI](/openapi.json)：機器可讀的 schema、錯誤、版本與 rate-limit headers。",
    "- [開發者文件](https://uyaohealth.com/docs)：支援的公開契約與棄用政策。",
    "- [Agent index](/llms.txt)：何時適合使用，以及不可推論的事項。",
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
    "- [About](/zh-tw/about)",
    "- [Contact](/zh-tw/contact)",
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
<li><a href="/zh-tw/about">About</a></li>
<li><a href="/zh-tw/contact">Contact</a></li>
<li><a href="/docs">Docs</a></li>
<li><a href="/llms.txt">llms.txt</a></li>
<li><a href="/sitemap.xml">Sitemap</a></li>
</ul>
</body>
</html>
`;
}

export function pageMarkdown(pathname: string): string | undefined {
  if (pathname === "/" || pathname === "/zh-tw") {
    return shopHomepageMarkdown("zh");
  }
  if (pathname === "/en") {
    return shopHomepageMarkdown("en");
  }
  const bare = pathname.replace(/^\/(zh-tw|en)(?=\/|$)/, "") || "/";
  if (bare === "/") return shopHomepageMarkdown(pathname.startsWith("/en") ? "en" : "zh");
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
  "/agent",
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
 * Unprefixed company routes that 308 to /zh-tw/... so canonical URLs
 * stay locale-explicit. /docs stays unprefixed for the agent contract.
 */
export const LEGACY_LOCALE_PREFIX_ROUTES = [
  "/about",
  "/contact",
  "/privacy",
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

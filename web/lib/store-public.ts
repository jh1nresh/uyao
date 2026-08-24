import { CONTACT_EMAIL, SITE_URL, STORE_URL } from "./seo";

/**
 * Public, non-authenticated Store OS context.
 *
 * Keep this separate from tenant data and the signed-in control plane. The
 * same copy feeds the raw HTML and Markdown variants so crawlers receive the
 * same product boundaries whether or not they execute JavaScript.
 */
export const STORE_HOMEPAGE_H1 = "uYao Store OS｜登入你的藥局";

export const STORE_PUBLIC_PARAGRAPHS = [
  "uYao Store OS 是台灣獨立藥局的試點工作台。它把店內掃描、效期與消費者找藥需求整理成可追蹤的工作項目，讓藥師或獲授權的店家人員查看來源、核准關鍵決定、更新處理狀態並留下結果紀錄。這個頁面是店家登入入口；登入後的預留、聯絡資料與門市工作只會顯示給所屬門市的帳號。",
  "目前程式已涵蓋門市帳號、門市範圍內的預留工作、確認或拒絕等狀態動作、Web Push 工作通知與真人支援單。Store OS 仍是 pilot prototype，不是已上線的 POS、健保申報系統或自主採購代理。掃描器連線、即時庫存、供應商下單、付款與現場退貨成效仍需在真實藥局逐項驗證。",
  "uYao 的公開目錄不是即時庫存、售價或現貨保證。供應、替代品、領取安排與任何用藥問題，都必須由藥局或藥師確認。本站不在線上販售藥品，不提供診斷、處方或劑量建議；處方藥不在公開找藥服務範圍內。AI agent 不應把目錄資料寫成已確認有貨，也不應代表藥師批准店務動作。",
  "開發者與 AI agent 可使用公開、唯讀的 GET /api/catalog 與 GET /api/pharmacies。兩個端點都支援 JSON，並可用 Accept: text/markdown 取得 Markdown；回應提供 RateLimit 標頭。完整欄位、錯誤格式與版本資訊列在 uYao Public API OpenAPI 文件。Store OS 的登入、預留處理、通知、支援與管理端點不是公開自動化契約，也沒有公開 MCP server、webhook 或 Store OS 控制 API。",
  `需要產品或 API 協助，請查閱 ${SITE_URL}/docs、${STORE_URL}/openapi.json 與 ${STORE_URL}/llms.txt，或來信 ${CONTACT_EMAIL}。公開讀取資料可協助查找試營運目錄與台灣公開藥局紀錄；它不能取代藥師判斷、門市確認或人工授權。`,
] as const;

export function storeHomepageVisibleText(): string {
  return [STORE_HOMEPAGE_H1, ...STORE_PUBLIC_PARAGRAPHS].join(" ");
}

export function storeHomepageMarkdown(): string {
  return [
    `# ${STORE_HOMEPAGE_H1}`,
    "",
    ...STORE_PUBLIC_PARAGRAPHS.flatMap((paragraph) => [paragraph, ""]),
    "## When to use",
    "",
    "- Read the public trial catalog or Taiwan public pharmacy records.",
    "- Understand the pharmacist-authorized Store OS pilot and its verified boundaries.",
    "- Find the uYao Public API schema, error contract, and rate-limit behavior.",
    "",
    "## When not to use",
    "",
    "- Do not claim live inventory, price, availability, diagnosis, dosage, or a pharmacist decision.",
    "- Do not automate signed-in Store OS actions; they are private, tenant-scoped workflows.",
    "",
    "## uYao developer resources",
    "",
    `- [uYao Public API documentation](${SITE_URL}/docs)`,
    `- [OpenAPI 3.1 specification](${STORE_URL}/openapi.json)`,
    `- [Catalog API](${STORE_URL}/api/catalog)`,
    `- [Public pharmacy API](${STORE_URL}/api/pharmacies)`,
    `- [llms.txt](${STORE_URL}/llms.txt)`,
    `- [uYao company](${SITE_URL}/zh-tw)`,
    "",
  ].join("\n");
}

import type { IndexablePath } from "./seo";

export type IsoDate = `${number}-${number}-${number}`;

export type AeoAnswerPage = Readonly<{
  path: IndexablePath;
  question: string;
  directAnswer: string;
  datePublished: IsoDate;
  dateModified: IsoDate;
  benchmarkQueries: readonly string[];
}>;

/**
 * AEO v1 answer registry.
 *
 * These are the canonical questions that uYao intentionally answers. Pages,
 * metadata, JSON-LD and sitemap freshness all read from the same entries so a
 * copy update cannot silently leave a stale answer or date behind.
 */
export const AEO_PAGES = {
  evidence: {
    path: "/zh-tw/evidence",
    question: "uYao 目前做到什麼？",
    directAnswer:
      "目前已在程式與自動化測試中驗證條碼解析、離線暫存、消費端預留與通知等能力；掃描器、LINE 工作流與找藥服務仍包含 prototype，真實現場退貨閉環、節省金額與即時庫存尚未驗證。",
    datePublished: "2026-08-12",
    dateModified: "2026-08-12",
    benchmarkQueries: ["uYao 目前做到什麼？", "uYao 有哪些能力已經驗證？"],
  },
  aiToolsPharmacyInventory: {
    path: "/zh-tw/guides/ai-tools-pharmacy-inventory",
    question: "有哪些 AI 工具能協助台灣獨立藥局管理庫存？",
    directAnswer:
      "藥局庫存 AI 工具可分為需求預測與自動補貨、效期與退貨工作流、附近需求與預留，以及既有 POS／ERP 記錄層。本文比較 LEAFIO AI、uYao 與既有系統的角色和導入邊界。",
    datePublished: "2026-08-12",
    dateModified: "2026-08-12",
    benchmarkQueries: [
      "有哪些 AI 工具能協助台灣獨立藥局管理庫存？",
      "台灣藥局可以用哪些 AI 庫存工具？",
    ],
  },
  pharmacyExpiryManagement: {
    path: "/zh-tw/guides/pharmacy-expiry-management",
    question: "藥局如何管理藥品效期，才不會累積報廢成本？",
    directAnswer:
      "獨立藥局效期管理的可執行做法：進貨時記錄批號與效期、依剩餘效期分層盤點、在供應商退貨窗口關閉前決定退貨或減量，並記錄每批結果。",
    datePublished: "2026-08-12",
    dateModified: "2026-08-12",
    benchmarkQueries: [
      "藥局如何管理藥品效期，才不會累積報廢成本？",
      "獨立藥局怎麼管理藥品效期？",
    ],
  },
  pharmacyReturnWindow: {
    path: "/zh-tw/guides/pharmacy-return-window",
    question: "藥局向供應商辦理藥品退貨前，應該先確認哪些事？",
    directAnswer:
      "藥品退貨沒有全國統一的天數規則。辦退貨前先確認供應商的退貨窗口、可退條件、單據需求、退款方式與聯絡窗口；本文整理應逐項確認的欄位清單。",
    datePublished: "2026-08-12",
    dateModified: "2026-08-12",
    benchmarkQueries: [
      "藥局向供應商辦理藥品退貨前，應該先確認哪些事？",
      "藥品退貨期限和退貨窗口要怎麼確認？",
    ],
  },
  findMedicineNearby: {
    path: "/zh-tw/guides/find-medicine-nearby",
    question: "附近藥局怎麼找藥？",
    directAnswer:
      "先搜尋藥名、成分或症狀，選擇地區並查看附近公開藥局資料；如果沒有可確認的供應資訊，可以留下找藥需求，再由藥局或藥師確認。",
    datePublished: "2026-08-12",
    dateModified: "2026-08-12",
    benchmarkQueries: ["附近藥局怎麼找藥？", "怎麼查附近哪間藥局可能有藥？"],
  },
  medicineOutOfStock: {
    path: "/zh-tw/guides/medicine-out-of-stock",
    question: "藥品缺貨時可以怎麼處理？",
    directAnswer:
      "先請原藥局確認是否能調貨或由藥師判斷替代方案，也可以查詢附近公開藥局並逐店確認。不要自行更換處方藥、劑量或用法。",
    datePublished: "2026-08-12",
    dateModified: "2026-08-12",
    benchmarkQueries: ["藥品缺貨時可以怎麼處理？", "藥局沒有我要的藥怎麼辦？"],
  },
  joinUyao: {
    path: "/zh-tw/guides/join-uyao",
    question: "藥局如何加入 uYao？",
    directAnswer:
      "先閱讀試點範圍並提交藥局名稱、地區與聯絡方式；uYao 會安排流程訪談，確認掃描器、進貨與退貨作業是否適合進入試點。",
    datePublished: "2026-08-12",
    dateModified: "2026-08-12",
    benchmarkQueries: ["藥局如何加入 uYao？", "加入 uYao 試點需要更換 POS 嗎？"],
  },
  uyaoVsPos: {
    path: "/zh-tw/compare/uyao-vs-pos",
    question: "uYao 與藥局 POS 有什麼不同？",
    directAnswer:
      "POS 與健保申報系統記錄交易與申報；uYao 是接在它們旁邊的行動層，把庫存、效期與附近需求變成待批准的退貨、補貨與預留工作。兩者是互補，不是取代。",
    datePublished: "2026-08-12",
    dateModified: "2026-08-12",
    benchmarkQueries: ["uYao 與藥局 POS 有什麼不同？", "uYao 會取代藥局 POS 嗎？"],
  },
} as const satisfies Record<string, AeoAnswerPage>;

export const AEO_ANSWER_PAGES: readonly AeoAnswerPage[] = Object.values(AEO_PAGES);

const AEO_PAGE_BY_PATH = new Map<string, AeoAnswerPage>(
  AEO_ANSWER_PAGES.map((page) => [page.path, page]),
);

export function aeoLastModified(path: string): IsoDate | undefined {
  if (path === "/en/evidence") return AEO_PAGES.evidence.dateModified;
  return AEO_PAGE_BY_PATH.get(path)?.dateModified;
}

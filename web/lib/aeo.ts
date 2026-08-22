import type { Locale } from "./i18n";
import type { IndexablePath } from "./seo";

export type { IsoDate } from "./types";
import type { IsoDate } from "./types";

/** One locale's visible answer. Pages render these exact strings. */
export type AeoAnswerCopy = Readonly<{
  question: string;
  directAnswer: string;
  benchmarkQueries: readonly string[];
}>;

export type AeoAnswerPage = Readonly<{
  path: IndexablePath;
  enPath: IndexablePath;
  datePublished: IsoDate;
  dateModified: IsoDate;
  zh: AeoAnswerCopy;
  en: AeoAnswerCopy;
}>;

/**
 * AEO v1 answer registry.
 *
 * These are the canonical questions that uYao intentionally answers. Pages,
 * metadata, JSON-LD and sitemap freshness all read from the same entries so a
 * copy update cannot silently leave a stale answer or date behind.
 *
 * Both locales are registered together: `/zh-tw/...` and `/en/...` are the same
 * answer in two languages, so they share `datePublished`/`dateModified` and
 * point hreflang at each other. Translating an answer means bumping the shared
 * date, which keeps the two sitemaps from drifting apart.
 */
export const AEO_PAGES = {
  evidence: {
    path: "/zh-tw/evidence",
    enPath: "/en/evidence",
    datePublished: "2026-08-12",
    dateModified: "2026-08-18",
    zh: {
      question: "uYao 目前做到什麼？",
      directAnswer:
        "目前已在程式與自動化測試中驗證條碼解析、離線暫存、消費端預留、Store OS 與 Web Push 等能力；掃描器、Store OS 工作流與找藥服務仍包含 prototype，真實現場退貨閉環、節省金額與即時庫存尚未驗證。",
      benchmarkQueries: ["uYao 目前做到什麼？", "uYao 有哪些能力已經驗證？"],
    },
    en: {
      question: "What has uYao actually built so far?",
      directAnswer:
        "Code and automated tests currently verify barcode parsing, offline buffering, consumer reservations, Store OS, and Web Push. The scanner connector, Store OS workflow, and medicine finder still include prototypes; real pharmacy return outcomes, savings, and live inventory remain unverified.",
      benchmarkQueries: [
        "What has uYao actually built so far?",
        "Which uYao capabilities are already verified?",
      ],
    },
  },
  aiToolsPharmacyInventory: {
    path: "/zh-tw/guides/ai-tools-pharmacy-inventory",
    enPath: "/en/guides/ai-tools-pharmacy-inventory",
    datePublished: "2026-08-12",
    dateModified: "2026-08-18",
    zh: {
      question: "有哪些 AI 工具能協助台灣獨立藥局管理庫存？",
      directAnswer:
        "藥局庫存 AI 工具可分為需求預測與自動補貨、效期與退貨工作流、附近需求與預留，以及既有 POS／ERP 記錄層。本文比較 LEAFIO AI、uYao 與既有系統的角色和導入邊界。",
      benchmarkQueries: [
        "有哪些 AI 工具能協助台灣獨立藥局管理庫存？",
        "台灣藥局可以用哪些 AI 庫存工具？",
      ],
    },
    en: {
      question: "Which AI tools help independent pharmacies manage inventory?",
      directAnswer:
        "Pharmacy inventory AI falls into four roles: demand forecasting and auto-replenishment, expiry and return workflow, nearby demand and reservations, and the existing POS/ERP record layer. This guide compares LEAFIO AI, uYao, and incumbent systems, including where each one stops.",
      benchmarkQueries: [
        "Which AI tools help independent pharmacies manage inventory?",
        "What AI inventory software can a small pharmacy use?",
      ],
    },
  },
  pharmacyExpiryManagement: {
    path: "/zh-tw/guides/pharmacy-expiry-management",
    enPath: "/en/guides/pharmacy-expiry-management",
    datePublished: "2026-08-12",
    dateModified: "2026-08-18",
    zh: {
      question: "藥局如何管理藥品效期，才不會累積報廢成本？",
      directAnswer:
        "獨立藥局效期管理的可執行做法：進貨時記錄批號與效期、依剩餘效期分層盤點、在供應商退貨窗口關閉前決定退貨或減量，並記錄每批結果。",
      benchmarkQueries: [
        "藥局如何管理藥品效期，才不會累積報廢成本？",
        "獨立藥局怎麼管理藥品效期？",
      ],
    },
    en: {
      question: "How should a pharmacy manage expiry dates to avoid write-offs?",
      directAnswer:
        "A workable routine for independent pharmacies: capture lot number and expiry at receiving, review stock in tiers by remaining shelf life, decide return or reduce-reorder before the supplier's return window closes, and record what happened to each lot.",
      benchmarkQueries: [
        "How should a pharmacy manage expiry dates to avoid write-offs?",
        "How do independent pharmacies track drug expiry dates?",
      ],
    },
  },
  pharmacyReturnWindow: {
    path: "/zh-tw/guides/pharmacy-return-window",
    enPath: "/en/guides/pharmacy-return-window",
    datePublished: "2026-08-12",
    dateModified: "2026-08-18",
    zh: {
      question: "藥局向供應商辦理藥品退貨前，應該先確認哪些事？",
      directAnswer:
        "藥品退貨沒有全國統一的天數規則。辦退貨前先確認供應商的退貨窗口、可退條件、單據需求、退款方式與聯絡窗口；本文整理應逐項確認的欄位清單。",
      benchmarkQueries: [
        "藥局向供應商辦理藥品退貨前，應該先確認哪些事？",
        "藥品退貨期限和退貨窗口要怎麼確認？",
      ],
    },
    en: {
      question: "What should a pharmacy confirm before returning stock to a supplier?",
      directAnswer:
        "There is no single nationwide rule for how many days a drug return allows. Before filing one, confirm the supplier's return window, eligible conditions, paperwork, refund method, and contact route. This guide lists the fields to confirm one by one.",
      benchmarkQueries: [
        "What should a pharmacy confirm before returning stock to a supplier?",
        "How do I check a supplier's drug return window and deadline?",
      ],
    },
  },
  findMedicineNearby: {
    path: "/zh-tw/guides/find-medicine-nearby",
    enPath: "/en/guides/find-medicine-nearby",
    datePublished: "2026-08-12",
    dateModified: "2026-08-18",
    zh: {
      question: "附近藥局怎麼找藥？",
      directAnswer:
        "先搜尋藥名、成分或症狀，選擇地區並查看附近公開藥局資料；如果沒有可確認的供應資訊，可以留下找藥需求，再由藥局或藥師確認。",
      benchmarkQueries: [
        "附近藥局怎麼找藥？",
        "怎麼查附近哪間藥局可能有藥？",
        "附近 24 小時藥局怎麼找？",
        "走路範圍內的藥局怎麼找？",
      ],
    },
    en: {
      question: "How do I find a medicine at a pharmacy near me?",
      directAnswer:
        "Search by product name, ingredient, or symptom, pick your district, and review the public pharmacy records nearby. When no confirmed supply information exists, leave a medicine request so a pharmacy or pharmacist can confirm it.",
      benchmarkQueries: [
        "How do I find a medicine at a pharmacy near me?",
        "How can I check which nearby pharmacy might have a medicine?",
        "How do I find a 24-hour pharmacy nearby?",
      ],
    },
  },
  medicineOutOfStock: {
    path: "/zh-tw/guides/medicine-out-of-stock",
    enPath: "/en/guides/medicine-out-of-stock",
    datePublished: "2026-08-12",
    dateModified: "2026-08-18",
    zh: {
      question: "藥品缺貨時可以怎麼處理？",
      directAnswer:
        "先請原藥局確認是否能調貨或由藥師判斷替代方案，也可以查詢附近公開藥局並逐店確認。不要自行更換處方藥、劑量或用法。",
      benchmarkQueries: [
        "藥品缺貨時可以怎麼處理？",
        "藥局沒有我要的藥怎麼辦？",
        "藥品停產或全台缺貨去哪查？",
      ],
    },
    en: {
      question: "What can I do when a medicine is out of stock?",
      directAnswer:
        "Ask your original pharmacy whether they can order it in or whether a pharmacist can assess an alternative, and check nearby public pharmacy records and confirm store by store. Never change a prescription medicine, its dose, or how you take it on your own.",
      benchmarkQueries: [
        "What can I do when a medicine is out of stock?",
        "My pharmacy does not have my medicine, what now?",
        "Where do I check a nationwide drug shortage?",
      ],
    },
  },
  joinUyao: {
    path: "/zh-tw/guides/join-uyao",
    enPath: "/en/guides/join-uyao",
    datePublished: "2026-08-12",
    dateModified: "2026-08-18",
    zh: {
      question: "藥局如何加入 uYao？",
      directAnswer:
        "先閱讀試點範圍並提交藥局名稱、地區與聯絡方式；uYao 會安排流程訪談，確認掃描器、進貨與退貨作業是否適合進入試點。",
      benchmarkQueries: ["藥局如何加入 uYao？", "加入 uYao 試點需要更換 POS 嗎？"],
    },
    en: {
      question: "How does a pharmacy join the uYao pilot?",
      directAnswer:
        "Read the pilot scope, then submit your pharmacy name, district, and contact details. uYao schedules a workflow interview to check whether your scanning, receiving, and return routines fit the pilot.",
      benchmarkQueries: [
        "How does a pharmacy join the uYao pilot?",
        "Does the uYao pilot require replacing my POS?",
      ],
    },
  },
  uyaoVsPos: {
    path: "/zh-tw/compare/uyao-vs-pos",
    enPath: "/en/compare/uyao-vs-pos",
    datePublished: "2026-08-12",
    dateModified: "2026-08-18",
    zh: {
      question: "uYao 與藥局 POS 有什麼不同？",
      directAnswer:
        "POS 與健保申報系統記錄交易與申報；uYao 是接在它們旁邊的行動層，把庫存、效期與附近需求變成待批准的退貨、補貨與預留工作。兩者是互補，不是取代。",
      benchmarkQueries: ["uYao 與藥局 POS 有什麼不同？", "uYao 會取代藥局 POS 嗎？"],
    },
    en: {
      question: "How is uYao different from a pharmacy POS?",
      directAnswer:
        "A POS and the national insurance claim system record transactions and claims. uYao is an action layer beside them that turns inventory, expiry, and nearby demand into return, reorder, and reservation work waiting for pharmacist approval. They are complementary, not replacements.",
      benchmarkQueries: [
        "How is uYao different from a pharmacy POS?",
        "Will uYao replace my pharmacy POS?",
      ],
    },
  },
} as const satisfies Record<string, AeoAnswerPage>;

export type AeoPageKey = keyof typeof AEO_PAGES;

export const AEO_ANSWER_PAGES: readonly AeoAnswerPage[] = Object.values(AEO_PAGES);

/** Canonical path for one locale of an answer page. */
export function aeoPath(page: AeoAnswerPage, locale: Locale): IndexablePath {
  return locale === "en" ? page.enPath : page.path;
}

/** hreflang map shared by every answer page; `x-default` stays Traditional Chinese. */
export function aeoLanguages(page: AeoAnswerPage) {
  return {
    "zh-TW": page.path,
    en: page.enPath,
    "x-default": page.path,
  };
}

const AEO_PAGE_BY_PATH = new Map<string, AeoAnswerPage>(
  AEO_ANSWER_PAGES.flatMap((page) => [
    [page.path, page] as const,
    [page.enPath, page] as const,
  ]),
);

/**
 * Indexable pages that carry no AEO answer still need sitemap freshness.
 * Hand-maintained exactly like AEO_PAGES: bump when the page's visible copy
 * changes, not when styling or motion changes. `sitemap-lastmod covers every
 * indexable path` in aeo.test.ts fails if a new indexable route skips this.
 */
const NON_AEO_LAST_MODIFIED = {
  "/zh-tw": "2026-08-16",
  "/en": "2026-08-16",
  "/zh-tw/about": "2026-08-22",
  "/zh-tw/contact": "2026-08-22",
  "/zh-tw/privacy": "2026-08-22",
  "/docs": "2026-08-22",
  "/zh-tw/pharmacy": "2026-08-16",
  "/en/pharmacy": "2026-08-16",
  "/zh-tw/guides": "2026-08-18",
  "/en/guides": "2026-08-18",
} as const satisfies Partial<Record<IndexablePath, IsoDate>>;

/** Sitemap `lastmod` for any company indexable path, in either locale. */
export function sitemapLastModified(path: string): IsoDate | undefined {
  return (
    AEO_PAGE_BY_PATH.get(path)?.dateModified
    ?? NON_AEO_LAST_MODIFIED[path as keyof typeof NON_AEO_LAST_MODIFIED]
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { KnowledgeShell } from "@/components/landing/KnowledgeShell";
import { AEO_PAGES } from "@/lib/aeo";
import { allStores } from "@/lib/data";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { PARTNER_PHARMACY_COUNT, partnerForStore } from "@/lib/partners";
import { ENTITY_DESCRIPTION, breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo";
import { indexablePageRobots } from "@/lib/seo-server";
import { SHOP_URL } from "@/lib/shop";

/**
 * Official product claims and the GEO/AEO citation entry point. Repository and
 * test proof must stay separate from field validation, partnerships, device
 * installation, and live inventory.
 */

const PAGE = AEO_PAGES.evidence;
const {
  dateModified: EVIDENCE_DATE,
  question: TITLE,
  directAnswer: DESCRIPTION,
} = PAGE;
const EN_PATH = "/en/evidence";
const EN_TITLE = "What has uYao built? Product evidence and pilot status";
const EN_DESCRIPTION =
  "Code and automated tests currently verify barcode parsing, offline buffering, consumer reservations, Store OS, and Web Push. The scanner connector, Store OS workflow, and medicine finder still include prototypes; real pharmacy return outcomes, savings, and live inventory remain unverified.";
const PARTNER_LOCATIONS = allStores().filter((store) => partnerForStore(store.slug));

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const robots = await indexablePageRobots();
  const languages = {
    "zh-TW": PAGE.path,
    en: EN_PATH,
    "x-default": PAGE.path,
  };

  if (locale === "en") {
    return {
      title: { absolute: EN_TITLE },
      description: EN_DESCRIPTION,
      alternates: { canonical: EN_PATH, languages },
      robots,
    };
  }

  return {
    title: { absolute: "uYao 目前做到什麼？產品證據與試點進度" },
    description: DESCRIPTION,
    alternates: { canonical: PAGE.path, languages },
    robots,
  };
}

/** Evidence ladder status labels stay fixed; only the supporting copy changes by locale. */
const CONTENT = {
  zh: {
    title: TITLE,
    description: DESCRIPTION,
    kicker: "產品證據",
    updatedLabel: "證據更新日期",
    aboutHeading: "uYao 是什麼",
    notHeading: "uYao 不是什麼",
    notList: [
      "不是線上藥局或藥品電商：不做線上交易，實際交付由藥師於門市完成",
      "不是 POS 或健保申報系統，也不取代它們",
      "不是醫療或用藥建議服務",
      "不是宣稱即時掌握所有藥局庫存的找藥平台",
    ],
    loopHeading: "產品閉環",
    loopIntro: "uYao 的核心不是 dashboard，而是一條把訊號變成已完成工作的閉環：",
    loopItems: [
      "擷取：從現有掃描流程取得品項、批號、效期；從 Consumer Web 取得附近需求",
      "訊號：整理成退貨窗口、缺貨與積壓等待處理事項",
      "準備行動：對照可驗證規則，準備退貨、減量、補貨或預留建議",
      "藥師批准：關鍵決策由藥師在 Store OS 批准、拒絕或修正",
      "執行與結果：記錄實際結果（outcome receipt），回頭修正下一次建議",
    ],
    ladder: [
      {
        status: "Verified in code/test",
        hot: true,
        items: [
          "GS1 DataMatrix／EAN 條碼解析與批號、效期擷取（自動化測試）",
          "掃描 session 分類與離線暫存（斷線不掉資料）",
          "消費端預留流程、Store OS 與 Web Push（自動化測試）",
          "藥局試點申請表單與通知（自動化測試）",
        ],
      },
      {
        status: "Prototype",
        items: [
          "掃描器 connector box：串在現有條碼掃描器與電腦之間，不改店內流程",
          "Store OS 退貨／補貨核准卡片與 outcome receipt 流程",
          "Consumer Web 找藥、到貨通知與需求訊號彙總",
        ],
      },
      {
        status: "Example data",
        items: ["網站上示範的批號、退貨建議與附近需求數字，皆為示範資料，非真實藥局紀錄"],
      },
      {
        status: "Pending verification",
        items: [
          "真實藥局現場的完整退貨閉環（掃描 → 提醒 → 藥師批准 → 實際退貨結果）",
          "可驗證的金額結果（避免報廢、成功退貨的實際金額）",
        ],
      },
      {
        status: "Not yet supported",
        items: [
          "即時庫存查詢（消費端顯示的庫存非即時，未接掃描器的資料為模擬）",
          "POS／健保申報系統整合或替代",
          "供應商退貨規則資料庫（各家規則仍需個別確認）",
        ],
      },
    ],
    pilotHeading: "目前試點進度",
    pilotIntro: "目前已確認",
    partnerLocationLabel: "個合作藥局據點",
    pilotDisclosure:
      "合作關係與店家提供的品項清單已分開標示；現場設備安裝、即時庫存與完整退貨閉環仍待驗證。",
    limitationsHeading: "限制與未知",
    limitations: [
      "供應商退貨規則因供應商、品項與契約而異，尚未取得可公開的統一規則",
      "尚無真實藥局的金額結果；所有節省或成效數字在取得前不會出現在本站",
      "需求訊號目前來自 prototype 環境，規模與代表性尚待試點驗證",
    ],
    changelog: `移除已公開合作關係一節；本站目前不揭露任何公司層級合作夥伴。合作藥局據點為 ${PARTNER_PHARMACY_COUNT} 個，設備安裝與即時庫存仍未驗證。`,
    companyLink: "公司介紹",
    pilotLink: "藥局試點說明與申請",
    consumerLink: "消費者找藥（Consumer Web）",
    compareLink: "uYao 與 POS 的差異",
  },
  en: {
    title: EN_TITLE,
    description: EN_DESCRIPTION,
    kicker: "Product evidence",
    updatedLabel: "Evidence last updated",
    aboutHeading: "What uYao is",
    notHeading: "What uYao is not",
    notList: [
      "Not an online pharmacy or medicine marketplace: there are no online medicine sales, and pharmacists complete fulfillment in store",
      "Not a POS or National Health Insurance claims system, and does not replace either",
      "Not a medical or medication advice service",
      "Not a claim of live inventory visibility across every pharmacy",
    ],
    loopHeading: "Product loop",
    loopIntro: "uYao is not another dashboard. Its core is a loop that turns signals into completed work:",
    loopItems: [
      "Capture: collect item, lot, and expiry data from existing scans, plus nearby demand from the Consumer Web",
      "Signal: turn the data into return-window, stockout, and overstock work items",
      "Prepare action: apply verifiable rules to draft return, reduction, reorder, or reservation actions",
      "Pharmacist approval: pharmacists approve, reject, or correct critical decisions in Store OS",
      "Execution and outcome: record the actual outcome and use it to improve the next action",
    ],
    ladder: [
      {
        status: "Verified in code/test",
        hot: true,
        items: [
          "GS1 DataMatrix and EAN barcode parsing with lot and expiry extraction (automated tests)",
          "Scan-session classification and offline buffering without dropping data",
          "Consumer reservation flow, Store OS, and Web Push (automated tests)",
          "Pharmacy pilot application and notifications (automated tests)",
        ],
      },
      {
        status: "Prototype",
        items: [
          "Scanner connector box that sits between the existing scanner and computer without changing the store workflow",
          "Store OS return and reorder approval cards with an outcome-receipt flow",
          "Consumer medicine finder, availability notifications, and demand-signal aggregation",
        ],
      },
      {
        status: "Example data",
        items: [
          "Lot numbers, return suggestions, and nearby-demand figures shown on the site are examples, not pharmacy records",
        ],
      },
      {
        status: "Pending verification",
        items: [
          "A complete return workflow in a real pharmacy, from scan to alert, approval, and verified outcome",
          "Verified financial outcomes such as avoided disposal or completed return value",
        ],
      },
      {
        status: "Not yet supported",
        items: [
          "Live inventory lookup; consumer inventory states are not live, and stores without scanner data use simulations",
          "POS or National Health Insurance claims integration or replacement",
          "A supplier return-rules database; each supplier policy still requires confirmation",
        ],
      },
    ],
    pilotHeading: "Current pilot status",
    pilotIntro: "We have confirmed",
    partnerLocationLabel: "partner pharmacy locations",
    pilotDisclosure:
      "Partnership status and store-provided catalog items are labeled separately. Device installation, live inventory, and a complete return workflow remain unverified.",
    limitationsHeading: "Limitations and unknowns",
    limitations: [
      "Supplier return rules vary by supplier, item, and contract; no public unified ruleset has been obtained",
      "No real-pharmacy financial outcome is available; savings or performance figures will not appear until verified",
      "Demand signals currently come from a prototype environment, so their scale and representativeness remain unverified",
    ],
    changelog: `The disclosed-partnerships section was removed; this site currently discloses no company-level partner. Partner pharmacy locations stand at ${PARTNER_PHARMACY_COUNT}, while device installation and live inventory remain unverified.`,
    companyLink: "Company overview",
    pilotLink: "Pharmacy pilot details and application",
    consumerLink: "Consumer medicine finder",
    compareLink: "How uYao differs from a POS",
  },
} as const;

export default async function EvidencePage() {
  const locale = await getRequestLocale();
  const copy = CONTENT[locale];
  const pagePath = locale === "en" ? EN_PATH : PAGE.path;
  const pageSchema = locale === "en"
    ? webPageJsonLd({
        name: EN_TITLE,
        description: EN_DESCRIPTION,
        path: EN_PATH,
        dateModified: EVIDENCE_DATE,
        inLanguage: "en",
      })
    : webPageJsonLd({
        name: TITLE,
        description: DESCRIPTION,
        path: PAGE.path,
        dateModified: EVIDENCE_DATE,
      });

  return (
    <KnowledgeShell kicker={copy.kicker} locale={locale}>
      <JsonLd
        nodes={[
          pageSchema,
          breadcrumbJsonLd([
            { name: "uYao", path: localizedPath("/", locale) },
            { name: copy.kicker, path: pagePath },
          ]),
        ]}
      />

      <h1 className="editorial-display m-0 text-[clamp(32px,4.5vw,44px)] leading-[1.3] [text-wrap:pretty]">
        {copy.title}
      </h1>
      <p className="mt-6 max-w-[40em] border-l-2 border-green pl-5 text-[17px] font-medium leading-[1.9] text-ink">
        {copy.description}
      </p>
      <p className="num mt-3 text-[13px] font-medium text-muted">
        {copy.updatedLabel}: {EVIDENCE_DATE}
      </p>

      <section className="mt-10">
        <h2 className="editorial-display mb-4 mt-0 text-[26px] leading-[1.4]">{copy.aboutHeading}</h2>
        <p className="m-0 max-w-[38em] text-[16px] leading-[1.9] text-ink-2">{ENTITY_DESCRIPTION[locale]}</p>
        <h3 className="mb-3 mt-7 text-[16px] font-bold">{copy.notHeading}</h3>
        <ul className="m-0 grid max-w-[38em] gap-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
          {copy.notList.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="editorial-display mb-4 mt-0 text-[26px] leading-[1.4]">{copy.loopHeading}</h2>
        <p className="mb-5 mt-0 max-w-[38em] text-[15px] leading-[1.8] text-ink-2">{copy.loopIntro}</p>
        <ol className="m-0 grid max-w-[38em] gap-2.5 pl-5 text-[15px] leading-[1.8] text-ink-2">
          {copy.loopItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="editorial-display mb-5 mt-0 text-[26px] leading-[1.4]">Evidence ladder</h2>
        <div className="border border-line bg-paper">
          {copy.ladder.map((tier, i) => (
            <div
              key={tier.status}
              className={`grid sm:grid-cols-[13em,1fr] ${i < copy.ladder.length - 1 ? "border-b border-line" : ""}`}
            >
              <div
                className={`num px-5 pb-1 pt-4 text-[12.5px] font-semibold tracking-[.04em] sm:border-r sm:border-line sm:py-5 ${
                  "hot" in tier && tier.hot ? "text-green" : "text-muted"
                }`}
              >
                {tier.status}
              </div>
              <ul className="m-0 grid gap-1.5 px-5 pb-4 pt-1 pl-9 text-[14.5px] leading-[1.75] text-ink-2 sm:py-5">
                {tier.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 既有的 /evidence#partners 連結（兩個 footer、藥局跑馬燈、消費端）都指到這裡，
          所以錨點留在試點段 —— 現在頁面上唯一還在的合作證據就是這些藥局據點。 */}
      <section id="partners" className="mt-12 scroll-mt-24">
        <h2 className="editorial-display mb-4 mt-0 text-[26px] leading-[1.4]">{copy.pilotHeading}</h2>
        <p className="m-0 max-w-[38em] text-[15px] leading-[1.85] text-ink-2">
          {copy.pilotIntro}{" "}
          <b className="text-ink">{PARTNER_PHARMACY_COUNT} {copy.partnerLocationLabel}</b>:
        </p>
        <ul className="mb-0 mt-3 grid max-w-[42em] gap-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
          {PARTNER_LOCATIONS.map((store) => (
            <li key={store.slug}>{store.name} ({store.address})</li>
          ))}
        </ul>
        <p className="mb-0 mt-3 max-w-[42em] text-[15px] leading-[1.85] text-ink-2">{copy.pilotDisclosure}</p>
      </section>

      <section className="mt-12">
        <h2 className="editorial-display mb-4 mt-0 text-[26px] leading-[1.4]">{copy.limitationsHeading}</h2>
        <ul className="m-0 grid max-w-[38em] gap-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
          {copy.limitations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="editorial-display mb-4 mt-0 text-[26px] leading-[1.4]">Changelog</h2>
        <p className="num m-0 text-[14px] leading-[1.8] text-ink-2">
          {EVIDENCE_DATE}: {copy.changelog}
        </p>
      </section>

      <section className="mt-12 flex flex-wrap gap-x-7 gap-y-3 border-t border-line pt-8 text-[15px]">
        <Link href={localizedPath("/", locale)} className="text-forest underline underline-offset-2 hover:text-green">
          {copy.companyLink}
        </Link>
        <Link href={localizedPath("/pharmacy", locale)} className="text-forest underline underline-offset-2 hover:text-green">
          {copy.pilotLink}
        </Link>
        <a href={`${SHOP_URL.replace(/\/$/, "")}${localizedPath("/", locale)}`} className="text-forest underline underline-offset-2 hover:text-green">
          {copy.consumerLink}
        </a>
        {locale === "zh" && (
          <Link href="/zh-tw/compare/uyao-vs-pos" className="text-forest underline underline-offset-2 hover:text-green">
            {copy.compareLink}
          </Link>
        )}
      </section>
    </KnowledgeShell>
  );
}

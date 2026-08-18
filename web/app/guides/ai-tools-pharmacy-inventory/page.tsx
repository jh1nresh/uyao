import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { KnowledgeCta, KnowledgeShell, ProvenanceBox } from "@/components/landing/KnowledgeShell";
import { AEO_PAGES, aeoPath } from "@/lib/aeo";
import { aeoPageMetadata } from "@/lib/aeo-server";
import { localizedPath, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { PARTNER_PHARMACY_COUNT } from "@/lib/partners";
import { ENTITY_DESCRIPTION, articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";

const PAGE = AEO_PAGES.aiToolsPharmacyInventory;
const { datePublished: PUBLISHED, dateModified: UPDATED } = PAGE;

const TITLES: Record<Locale, string> = {
  zh: "獨立藥局庫存 AI 工具有哪些？選擇與導入指南｜uYao",
  en: "AI inventory tools for independent pharmacies: how to choose and adopt | uYao",
};

export async function generateMetadata(): Promise<Metadata> {
  return aeoPageMetadata(PAGE, await getRequestLocale(), TITLES);
}

type ToolRow = { name: string; category: string; fit: string; boundary: string };

type ToolsCopy = {
  kicker: string;
  breadcrumb: string;
  audienceHeading: string;
  audience: string;
  toolsHeading: string;
  boundaryLabel: string;
  tools: ToolRow[];
  checklistHeading: string;
  checklist: string[];
  roleHeading: string;
  role: React.ReactNode;
  limitsHeading: string;
  limits: string[];
  sourcesHeading: string;
  sources: React.ReactNode[];
  provenance: { label: string; value: React.ReactNode }[];
  ctaTitle: string;
  ctaBody: string;
};

function inline(locale: Locale, path: string, label: string) {
  return (
    <Link
      href={localizedPath(path, locale)}
      className="mx-1 text-forest underline underline-offset-2 hover:text-green"
    >
      {label}
    </Link>
  );
}

const LEAFIO_LINK = (
  <a
    href="https://www.leafio.ai/pharmacy-software/"
    rel="noopener"
    className="ml-1 break-all text-forest underline underline-offset-2 hover:text-green"
  >
    leafio.ai/pharmacy-software
  </a>
);

const CONTENT: Record<Locale, ToolsCopy> = {
  zh: {
    kicker: "藥局營運指南",
    breadcrumb: "藥局庫存 AI 工具",
    audienceHeading: "適用對象與情境",
    audience:
      "本文寫給正在評估庫存工具的台灣獨立藥局經營者與藥師，聚焦缺貨、積壓、效期、退貨窗口與附近需求。這不是採購排名，也不代表列出的產品已通過台灣法規、資安、介接或現場適用性驗證。",
    toolsHeading: "目前可比較的工具與角色",
    boundaryLabel: "驗證邊界：",
    tools: [
      {
        name: "LEAFIO AI",
        category: "需求預測與自動補貨",
        fit: "官方產品頁列出需求預測、自動補貨、慢銷品分析與 POS 整合，並稱服務連鎖與獨立藥局。",
        boundary: "本頁未驗證台灣法規、中文支援、在地供應商資料或導入成本；採購前需直接確認。",
      },
      {
        name: "uYao",
        category: "效期、退貨與附近需求的行動層",
        fit: "為台灣獨立藥局設計，把庫存、效期與附近需求整理成退貨、減量、補貨與預留工作，再交給藥師批准。",
        boundary: `目前是 prototype；已有 ${PARTNER_PHARMACY_COUNT} 個確認合作藥局據點，但尚無設備安裝、真實節省金額或完整現場閉環證據。`,
      },
      {
        name: "既有 POS／ERP／健保申報系統",
        category: "交易、帳務與庫存記錄層",
        fit: "提供銷售、進貨、庫存帳與申報資料，是預測與工作流的重要資料基礎。",
        boundary: "不應只因有報表或規則提醒就稱為 AI；是否能匯出批號、效期與銷售資料需逐家確認。",
      },
    ],
    checklistHeading: "導入前的六項檢查",
    checklist: [
      "先選一個可量測工作：缺貨、過量、效期、退貨窗口或附近需求，不要一次換掉整套系統。",
      "確認輸入資料從哪裡來：POS 匯出、進貨單、條碼掃描、人工盤點或供應商資料。",
      "要求每項建議能說明依據，並讓藥師批准、拒絕或修正，不直接自動執行關鍵決策。",
      "用真實批次跑小規模試點，分開記錄建議、實際執行與最終結果。",
      "確認錯誤資料、缺漏批號與無網路時如何處理；不能把估算庫存顯示成確定有貨。",
      "以避免報廢、成功退貨、降低缺貨或完成預留等結果評估，不只看 dashboard 或預測分數。",
    ],
    roleHeading: "uYao 在這個工具組合裡的角色",
    role: (
      <>
        {ENTITY_DESCRIPTION.zh} 它不取代 POS、健保申報或藥師判斷；目前產品證據與未完成項目列在
        {inline("zh", "/evidence", "產品證據頁")}
        ，與記錄系統的分工見
        {inline("zh", "/compare/uyao-vs-pos", "uYao 與 POS 比較")}
        。效期與退貨的實際做法可再看
        {inline("zh", "/guides/pharmacy-expiry-management", "藥品效期管理指南")}
        。
      </>
    ),
    limitsHeading: "限制與不可直接推論的事",
    limits: [
      "供應商公開功能不等於台灣藥局現場已驗證；需另查介接、法規、資安、語言與服務範圍",
      "需求預測不能補回錯誤或缺漏的庫存資料，也不能代替實際盤點與藥師確認",
      "uYao 的掃描、Store OS action、Web Push 與 Consumer Web 目前包含 prototype；不得當成既有市場成果",
      "本文未經藥師專業審閱，不構成藥事、法規或個別採購建議",
    ],
    sourcesHeading: "原始來源",
    sources: [
      <>LEAFIO AI 官方藥局產品頁（需求預測、自動補貨、慢銷品與 POS 整合）：{LEAFIO_LINK}</>,
      <>
        uYao 官方產品證據與限制：
        <Link href="/zh-tw/evidence" className="ml-1 text-forest underline underline-offset-2 hover:text-green">
          uyaohealth.com/zh-tw/evidence
        </Link>
      </>,
    ],
    provenance: [
      { label: "作者", value: "uYao 團隊" },
      { label: "專業背景", value: "藥局營運工作流研究與軟體產品開發（非藥師）" },
      { label: "醫療專業審閱", value: <b className="text-oxblood">未經藥師專業審閱</b> },
      { label: "發布日期", value: PUBLISHED },
      { label: "最後更新", value: UPDATED },
      { label: "適用範圍", value: "台灣獨立藥局的庫存工具初步評估；不含法規或採購核可" },
    ],
    ctaTitle: "先用一個真實庫存問題測試",
    ctaBody:
      "uYao 正在招募獨立藥局驗證掃描、效期與 Store OS 決策流程。試點不要求更換 POS，也不碰病患或處方個資。",
  },
  en: {
    kicker: "Pharmacy operations guide",
    breadcrumb: "AI inventory tools",
    audienceHeading: "Who this is for",
    audience:
      "This guide is for owners and pharmacists at independent pharmacies in Taiwan who are evaluating inventory tooling for stockouts, overstock, expiry, return windows, and nearby demand. It is not a purchasing ranking, and listing a product does not mean it has been verified against Taiwanese regulation, security requirements, integrations, or on-site fit.",
    toolsHeading: "The tools worth comparing, and what each one is for",
    boundaryLabel: "Verification boundary: ",
    tools: [
      {
        name: "LEAFIO AI",
        category: "Demand forecasting and auto-replenishment",
        fit: "Its official product page lists demand forecasting, automatic replenishment, slow-mover analysis, and POS integration, and states that it serves both chains and independent pharmacies.",
        boundary:
          "This page has not verified Taiwanese regulatory fit, Chinese-language support, local supplier data, or cost of adoption. Confirm those directly before purchasing.",
      },
      {
        name: "uYao",
        category: "Action layer for expiry, returns, and nearby demand",
        fit: "Built for independent pharmacies in Taiwan. It turns inventory, expiry, and nearby demand into return, reduce-reorder, replenish, and reservation work for a pharmacist to approve.",
        boundary: `Currently a prototype. ${PARTNER_PHARMACY_COUNT} partner pharmacy locations are confirmed, but there is no device installation, no measured savings, and no complete on-site loop yet.`,
      },
      {
        name: "Existing POS / ERP / insurance claim systems",
        category: "Transaction, accounting, and inventory record layer",
        fit: "They hold sales, receiving, stock ledger, and claim data, which is the data foundation any forecast or workflow depends on.",
        boundary:
          "Reports and rule-based alerts do not make a system AI. Whether it can export lot numbers, expiry dates, and sales data has to be confirmed vendor by vendor.",
      },
    ],
    checklistHeading: "Six checks before you adopt anything",
    checklist: [
      "Pick one measurable job first — stockouts, overstock, expiry, return windows, or nearby demand. Do not replace a whole system at once.",
      "Confirm where the input data comes from: POS export, receiving notes, barcode scans, manual counts, or supplier data.",
      "Require every suggestion to show its basis, and keep a pharmacist approving, rejecting, or correcting it. Critical decisions should not execute automatically.",
      "Pilot on a small scope with real lots, and record the suggestion, what was actually done, and the final outcome separately.",
      "Confirm what happens with bad data, missing lot numbers, and no network. An estimate must never be displayed as confirmed stock.",
      "Judge it on outcomes — write-offs avoided, returns accepted, stockouts reduced, reservations completed — not on a dashboard or a forecast score.",
    ],
    roleHeading: "Where uYao sits in this mix",
    role: (
      <>
        {ENTITY_DESCRIPTION.en} It does not replace a POS, insurance claims, or a pharmacist&apos;s judgement. What is verified and what is still open is listed on
        {inline("en", "/evidence", "the product evidence page")}
        , and the split against systems of record is in
        {inline("en", "/compare/uyao-vs-pos", "uYao compared with a pharmacy POS")}
        . For the underlying routine, see
        {inline("en", "/guides/pharmacy-expiry-management", "the expiry management guide")}
        .
      </>
    ),
    limitsHeading: "Limits, and what this does not let you conclude",
    limits: [
      "A published feature list is not evidence of on-site validation in a Taiwanese pharmacy. Integrations, regulation, security, language, and service coverage all need separate checks.",
      "Demand forecasting cannot recover wrong or missing inventory data, and it does not replace a physical count or a pharmacist's confirmation.",
      "uYao's scanning, Store OS actions, Web Push, and consumer web still include prototypes and must not be read as delivered market results.",
      "This guide has not been reviewed by a licensed pharmacist and is not pharmaceutical, legal, or individual purchasing advice.",
    ],
    sourcesHeading: "Sources",
    sources: [
      <>
        LEAFIO AI official pharmacy product page (demand forecasting, automatic
        replenishment, slow movers, POS integration):{LEAFIO_LINK}
      </>,
      <>
        uYao&apos;s own product evidence and limits:
        <Link href="/en/evidence" className="ml-1 text-forest underline underline-offset-2 hover:text-green">
          uyaohealth.com/en/evidence
        </Link>
      </>,
    ],
    provenance: [
      { label: "Author", value: "uYao team" },
      {
        label: "Background",
        value: "Pharmacy operations workflow research and software product development (not pharmacists)",
      },
      {
        label: "Clinical review",
        value: <b className="text-oxblood">Not reviewed by a licensed pharmacist</b>,
      },
      { label: "Published", value: PUBLISHED },
      { label: "Updated", value: UPDATED },
      {
        label: "Scope",
        value: "Initial evaluation of inventory tooling for independent pharmacies in Taiwan; not regulatory or purchasing approval",
      },
    ],
    ctaTitle: "Test it against one real inventory problem first",
    ctaBody:
      "uYao is recruiting independent pharmacies to validate scanning, expiry, and the Store OS decision flow. The pilot does not require replacing your POS and does not touch patient or prescription data.",
  },
};

export default async function AiToolsPharmacyInventoryGuidePage() {
  const locale = await getRequestLocale();
  const copy = PAGE[locale];
  const content = CONTENT[locale];
  const path = aeoPath(PAGE, locale);

  return (
    <KnowledgeShell kicker={content.kicker} locale={locale}>
      <JsonLd
        nodes={[
          articleJsonLd({
            headline: copy.question,
            description: copy.directAnswer,
            path,
            datePublished: PUBLISHED,
            dateModified: UPDATED,
            inLanguage: locale === "en" ? "en" : "zh-Hant-TW",
          }),
          breadcrumbJsonLd([
            { name: "uYao", path: locale === "en" ? "/en" : "/zh-tw" },
            { name: content.breadcrumb, path },
          ]),
        ]}
      />

      <article>
        <h1 className="editorial-display m-0 text-[clamp(30px,4.2vw,42px)] leading-[1.32] [text-wrap:pretty]">
          {copy.question}
        </h1>

        <p className="mt-6 max-w-[40em] border-l-2 border-green pl-5 text-[17px] font-medium leading-[1.9] text-ink">
          {copy.directAnswer}
        </p>

        <section className="mt-9">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">
            {content.audienceHeading}
          </h2>
          <p className="m-0 max-w-[40em] text-[15px] leading-[1.85] text-ink-2">
            {content.audience}
          </p>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-5 mt-0 text-[24px] leading-[1.4]">
            {content.toolsHeading}
          </h2>
          <div className="border border-line bg-paper">
            {content.tools.map((tool, index) => (
              <div
                key={tool.name}
                className={`grid gap-2 px-5 py-5 sm:grid-cols-[11em,1fr] sm:gap-x-6 ${
                  index < content.tools.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <div>
                  <h3 className="m-0 text-[16px] font-bold text-ink">{tool.name}</h3>
                  <p className="num mb-0 mt-1 text-[12px] leading-[1.6] text-oxblood">{tool.category}</p>
                </div>
                <div>
                  <p className="m-0 text-[14.5px] leading-[1.8] text-ink-2">{tool.fit}</p>
                  <p className="mb-0 mt-2 text-[13.5px] leading-[1.75] text-muted">
                    <b className="text-ink">{content.boundaryLabel}</b>{tool.boundary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-5 mt-0 text-[24px] leading-[1.4]">
            {content.checklistHeading}
          </h2>
          <ol className="m-0 grid max-w-[42em] gap-4 pl-0">
            {content.checklist.map((item, index) => (
              <li key={item} className="grid list-none grid-cols-[2.4em,1fr] gap-3">
                <span className="num pt-0.5 text-[15px] font-semibold text-oxblood">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="m-0 text-[15px] leading-[1.85] text-ink-2">{item}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">
            {content.roleHeading}
          </h2>
          <p className="m-0 max-w-[40em] text-[15px] leading-[1.85] text-ink-2">{content.role}</p>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">
            {content.limitsHeading}
          </h2>
          <ul className="m-0 grid max-w-[40em] gap-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
            {content.limits.map((limit) => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">
            {content.sourcesHeading}
          </h2>
          <ul className="m-0 grid max-w-[40em] gap-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
            {content.sources.map((source, i) => (
              <li key={i}>{source}</li>
            ))}
          </ul>
        </section>

        <ProvenanceBox fields={content.provenance} locale={locale} />

        <KnowledgeCta title={content.ctaTitle} body={content.ctaBody} locale={locale} />
      </article>
    </KnowledgeShell>
  );
}

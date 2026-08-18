import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { KnowledgeCta, KnowledgeShell, ProvenanceBox } from "@/components/landing/KnowledgeShell";
import { AEO_PAGES, aeoPath } from "@/lib/aeo";
import { aeoPageMetadata } from "@/lib/aeo-server";
import { localizedPath, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";

/**
 * v1 guide（spec §4B）：主要意圖「藥品效期管理」「藥局過期藥品管理」。
 * 內容契約（spec §5）：H1 問題 → 直接答案 → 適用對象 → 步驟 →
 * uYao 角色 → 限制 → 來源 → 出處欄位 → CTA。只談藥局營運，
 * 不碰病患用藥建議（high-trust red line）。
 */

const PAGE = AEO_PAGES.pharmacyExpiryManagement;
const { datePublished: PUBLISHED, dateModified: UPDATED } = PAGE;

const TITLES: Record<Locale, string> = {
  zh: "藥品效期管理：從批號記錄到退貨窗口｜uYao 藥局營運指南",
  en: "Pharmacy expiry management: from lot capture to the return window | uYao",
};

export async function generateMetadata(): Promise<Metadata> {
  return aeoPageMetadata(PAGE, await getRequestLocale(), TITLES);
}

type GuideCopy = {
  kicker: string;
  breadcrumb: string;
  audienceHeading: string;
  audience: React.ReactNode;
  stepsHeading: string;
  steps: { title: string; body: React.ReactNode }[];
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

const LAW_LINK = (
  <a
    href="https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=L0030001"
    rel="noopener"
    className="ml-1 break-all text-forest underline underline-offset-2 hover:text-green"
  >
    全國法規資料庫
  </a>
);

const CONTENT: Record<Locale, GuideCopy> = {
  zh: {
    kicker: "藥局營運指南",
    breadcrumb: "藥品效期管理",
    audienceHeading: "適用對象與情境",
    audience: (
      <>
        本文寫給台灣獨立藥局的經營者與藥師，處理的是「店內庫存的效期與報廢成本」這件營運工作。本文<b className="text-ink">不是</b>病患用藥指導，也不涉及個別藥品的使用建議。
      </>
    ),
    stepsHeading: "實際步驟",
    steps: [
      {
        title: "進貨當下記錄批號與效期",
        body: "效期管理的最小單位是「批號」，不是品項。同一個藥不同批的效期可能差很多；進貨掃描或登錄時就把批號、效期記成清單，之後才有辦法分批處理。",
      },
      {
        title: "用「剩餘效期」而不是「到期日」檢視",
        body: "把庫存依剩餘天數分層（例如 180 天內、90 天內；實際門檻應依各供應商退貨規則調整），每次盤點先看最上層，而不是等到期才發現。",
      },
      {
        title: "對照各供應商的退貨規則與窗口",
        body: (
          <>
            多數供應商對可退貨的剩餘效期有門檻，且各家不同。哪些欄位要先確認，見
            {inline("zh", "/guides/pharmacy-return-window", "藥品退貨前要確認的事")}
            。
          </>
        ),
      },
      {
        title: "在窗口關閉前決定行動",
        body: "對每一批快到期品項做一個明確決定：辦退貨、下次減量進貨、加速流動（調劑優先出這批），或確認只能報廢。不做決定本身就是最貴的決定。",
      },
      {
        title: "記錄每批的實際結果",
        body: "退成了多少、避免了多少報廢、哪些品項反覆出事——這些紀錄會回頭修正進貨量與盤點頻率，讓下一輪更準。",
      },
    ],
    roleHeading: "uYao 怎麼處理這件工作",
    role: (
      <>
        uYao 把一個小盒子串在藥局現有的條碼掃描器上，進貨照掃，批號與效期自動記錄；接近退貨窗口時在 Store OS 建立工作並用 Web Push 提醒，藥師只需批准、拒絕或修正，最後記下每批的實際結果。目前為 prototype 並招募試點中——實際做到哪裡、還沒做到哪裡，見
        {inline("zh", "/evidence", "產品證據頁")}
        。
      </>
    ),
    limitsHeading: "限制與不可做的事",
    limits: [
      "供應商退貨規則沒有公開統一標準，本文不提供任何固定天數；實際規則依供應商、品項與契約而異",
      "本文未經藥師專業審閱，不構成藥事或法規意見",
      "不提供病患用藥、調劑或藥品選用建議",
    ],
    sourcesHeading: "原始來源",
    sources: [
      <>藥事法第 21 條（超過有效期間或保存期限之藥物屬劣藥）：{LAW_LINK}</>,
      <>各供應商退貨規則：依供應商契約與出貨單據為準，尚未取得可公開引用的統一版本</>,
    ],
    provenance: [
      { label: "作者", value: "uYao 團隊" },
      { label: "專業背景", value: "藥局營運工作流研究與軟體產品開發（非藥師）" },
      { label: "醫療專業審閱", value: <b className="text-oxblood">未經藥師專業審閱</b> },
      { label: "發布日期", value: PUBLISHED },
      { label: "最後更新", value: UPDATED },
      { label: "適用範圍", value: "台灣獨立藥局的庫存效期營運；不含病患用藥建議" },
    ],
    ctaTitle: "想在退貨窗口關閉前收到提醒？",
    ctaBody:
      "uYao 正在招募願意一起驗證掃描流程與退貨窗口提醒的獨立藥局。試點不要求更換 POS，也不碰病患或處方個資。",
  },
  en: {
    kicker: "Pharmacy operations guide",
    breadcrumb: "Expiry management",
    audienceHeading: "Who this is for",
    audience: (
      <>
        This guide is for owners and pharmacists at independent pharmacies in Taiwan, and it covers one operational job: expiry and write-off cost on shelf stock. It is <b className="text-ink">not</b> patient medication guidance and says nothing about how to use any specific medicine.
      </>
    ),
    stepsHeading: "The routine",
    steps: [
      {
        title: "Capture lot number and expiry at receiving",
        body: "The unit of expiry management is the lot, not the product. Two lots of the same medicine can expire months apart, so record lot number and expiry while you scan or key in the delivery. Without that, you cannot act on one lot at a time later.",
      },
      {
        title: "Review by remaining shelf life, not by expiry date",
        body: "Group stock into tiers by days remaining — for example within 180 days and within 90 days, with the real thresholds set by each supplier's return rules. Every review starts at the top tier instead of discovering the problem on the expiry date.",
      },
      {
        title: "Check each supplier's return rules and window",
        body: (
          <>
            Most suppliers set a minimum remaining shelf life for a return, and the threshold differs by supplier. For the fields to confirm first, see
            {inline("en", "/guides/pharmacy-return-window", "what to confirm before a return")}
            .
          </>
        ),
      },
      {
        title: "Decide before the window closes",
        body: "Make one explicit decision per near-expiry lot: file the return, cut the next reorder, move it faster by dispensing that lot first, or accept the write-off. Not deciding is itself the most expensive decision.",
      },
      {
        title: "Record what actually happened to each lot",
        body: "How much was returned, how much write-off was avoided, which products keep reappearing — these records feed back into reorder quantity and review frequency, which is what makes the next cycle more accurate.",
      },
    ],
    roleHeading: "Where uYao fits",
    role: (
      <>
        uYao connects a small box to the barcode scanner a pharmacy already uses. Deliveries are scanned as usual, and lot numbers and expiry dates are recorded automatically. As a return window approaches, uYao creates work in Store OS and sends a Web Push reminder; the pharmacist only approves, rejects, or corrects it, and the outcome for each lot is recorded. This is a prototype in pilot recruitment — for what is verified and what is not, see
        {inline("en", "/evidence", "the product evidence page")}
        .
      </>
    ),
    limitsHeading: "Limits and what this guide will not do",
    limits: [
      "There is no public, unified standard for supplier return rules, so this guide gives no fixed number of days. Actual rules vary by supplier, product, and contract.",
      "This guide has not been reviewed by a licensed pharmacist and is not pharmaceutical or legal advice.",
      "It gives no advice on patient medication, dispensing, or product selection.",
    ],
    sourcesHeading: "Sources",
    sources: [
      <>
        Pharmaceutical Affairs Act, Article 21 (a drug past its expiry or storage
        period is classed as an inferior drug), Traditional Chinese only:{LAW_LINK}
      </>,
      <>
        Supplier return rules: governed by each supplier&apos;s contract and shipping
        documents. No publicly citable unified version exists.
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
        value: "Shelf-stock expiry operations at independent pharmacies in Taiwan; excludes patient medication advice",
      },
    ],
    ctaTitle: "Want a reminder before the return window closes?",
    ctaBody:
      "uYao is recruiting independent pharmacies to validate the scanning flow and return-window reminders. The pilot does not require replacing your POS and does not touch patient or prescription data.",
  },
};

export default async function ExpiryGuidePage() {
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

        <p className="mt-6 max-w-[38em] border-l-2 border-green pl-5 text-[17px] font-medium leading-[1.9] text-ink">
          {copy.directAnswer}
        </p>

        <section className="mt-9">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">
            {content.audienceHeading}
          </h2>
          <p className="m-0 max-w-[38em] text-[15px] leading-[1.85] text-ink-2">
            {content.audience}
          </p>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-5 mt-0 text-[24px] leading-[1.4]">
            {content.stepsHeading}
          </h2>
          <ol className="m-0 grid max-w-[40em] gap-6 pl-0">
            {content.steps.map((step, i) => (
              <li key={step.title} className="grid list-none grid-cols-[2.4em,1fr] gap-3">
                <span className="num pt-0.5 text-[15px] font-semibold text-oxblood">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="m-0 text-[16.5px] font-bold">{step.title}</h3>
                  <p className="mb-0 mt-1.5 text-[15px] leading-[1.85] text-ink-2">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">
            {content.roleHeading}
          </h2>
          <p className="m-0 max-w-[38em] text-[15px] leading-[1.85] text-ink-2">{content.role}</p>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">
            {content.limitsHeading}
          </h2>
          <ul className="m-0 grid max-w-[38em] gap-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
            {content.limits.map((limit) => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">
            {content.sourcesHeading}
          </h2>
          <ul className="m-0 grid max-w-[38em] gap-2 pl-5 text-[15px] leading-[1.8] text-ink-2">
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

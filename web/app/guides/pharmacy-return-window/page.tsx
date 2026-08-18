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
 * v1 guide（spec §4C）：主要意圖「藥品退貨管理」「藥品退貨期限」。
 * Answer boundary：只講該確認哪些欄位與流程；供應商規則未取得，
 * 不寫固定天數或通則，全篇明示「依供應商、品項與契約而異」。
 */

const PAGE = AEO_PAGES.pharmacyReturnWindow;
const { datePublished: PUBLISHED, dateModified: UPDATED } = PAGE;

const TITLES: Record<Locale, string> = {
  zh: "藥品退貨前要確認的事：窗口、條件與單據｜uYao 藥局營運指南",
  en: "Before a drug return: window, conditions, and paperwork | uYao",
};

export async function generateMetadata(): Promise<Metadata> {
  return aeoPageMetadata(PAGE, await getRequestLocale(), TITLES);
}

type ReturnCopy = {
  kicker: string;
  breadcrumb: string;
  audienceHeading: string;
  audience: string;
  checklistHeading: string;
  checklist: { title: string; body: string }[];
  caveat: React.ReactNode;
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

const CONTENT: Record<Locale, ReturnCopy> = {
  zh: {
    kicker: "藥局營運指南",
    breadcrumb: "藥品退貨管理",
    audienceHeading: "適用對象與情境",
    audience:
      "本文寫給台灣獨立藥局的經營者與藥師，情境是「這批藥快到供應商退貨門檻了，該怎麼確認與準備」。本文不是法規意見，也不涉及病患用藥。",
    checklistHeading: "退貨前的確認清單",
    checklist: [
      {
        title: "退貨窗口與期限",
        body: "這家供應商接受退貨的條件是什麼？常見做法是以「剩餘效期」設門檻，但門檻多少、從哪天起算，各家不同，必須逐家確認並記下來。",
      },
      {
        title: "可退品項與狀態條件",
        body: "是否限原包裝完整、未拆封？冷藏品、管制藥品、特價進貨是否除外？同一供應商不同品項的條件也可能不同。",
      },
      {
        title: "需要的單據與資料",
        body: "多數退貨需要對得上的進貨單據：發票或出貨單、批號、效期、數量。平時就把批號層級的進貨紀錄留好，退貨當下才不用翻箱倒櫃。",
      },
      {
        title: "退款或折讓方式",
        body: "是退現金、折抵下次進貨，還是換貨？入帳時間多久？這決定退貨的實際價值，也影響要不要退。",
      },
      {
        title: "聯絡窗口與通知方式",
        body: "找業務、打客服，還是走系統單？需不需要事先報備？把每家的聯絡方式與流程記在同一個地方，換人接手也能辦。",
      },
      {
        title: "退貨後的追蹤",
        body: "送出退貨不等於退成。追蹤到貨確認與入帳，把「這批最後退成了沒、金額多少」記下來，才知道效期管理有沒有真的省到錢。",
      },
    ],
    caveat: (
      <>
        <b>實際規則依供應商、品項與契約而異。</b>本文不提供任何固定天數或通用門檻；請以各供應商的正式回覆與契約為準。
      </>
    ),
    roleHeading: "uYao 怎麼處理這件工作",
    role: (
      <>
        uYao 從進貨掃描自動留下批號與效期紀錄，在接近退貨門檻時於 Store OS 建立工作並用 Web Push 提醒，並把單據需要的批號資料整理好交給藥師決定。退貨規則未確認的品項會明確標示「待確認」，不會假造天數。目前為 prototype 並招募試點中，詳見
        {inline("zh", "/evidence", "產品證據頁")}
        。效期分層盤點的做法，見
        {inline("zh", "/guides/pharmacy-expiry-management", "藥品效期管理指南")}
        。
      </>
    ),
    limitsHeading: "限制與不可做的事",
    limits: [
      "本文未經藥師專業審閱，不構成藥事或法規意見",
      "不代表任何供應商的正式退貨政策；引用前請向供應商確認",
      "不提供病患退藥、換藥或用藥建議",
    ],
    sourcesHeading: "原始來源",
    sources: [
      <>各供應商契約、出貨單據與正式回覆（各家不同，尚無可公開引用的統一規則）</>,
      <>藥事法第 21 條（超過有效期間或保存期限之藥物屬劣藥，背景脈絡）：{LAW_LINK}</>,
    ],
    provenance: [
      { label: "作者", value: "uYao 團隊" },
      { label: "專業背景", value: "藥局營運工作流研究與軟體產品開發（非藥師）" },
      { label: "醫療專業審閱", value: <b className="text-oxblood">未經藥師專業審閱</b> },
      { label: "發布日期", value: PUBLISHED },
      { label: "最後更新", value: UPDATED },
      { label: "適用範圍", value: "台灣獨立藥局對供應商的退貨作業；不含病患退換藥" },
    ],
    ctaTitle: "不想再用便利貼追退貨窗口？",
    ctaBody:
      "uYao 正在招募願意一起驗證退貨窗口提醒與 Store OS 決策流程的獨立藥局。試點不要求更換 POS，也不碰病患或處方個資。",
  },
  en: {
    kicker: "Pharmacy operations guide",
    breadcrumb: "Drug returns",
    audienceHeading: "Who this is for",
    audience:
      "This guide is for owners and pharmacists at independent pharmacies in Taiwan, in the situation where a lot is approaching a supplier's return threshold and you need to know what to confirm and prepare. It is not legal advice and says nothing about patient medication.",
    checklistHeading: "What to confirm before filing a return",
    checklist: [
      {
        title: "The return window and deadline",
        body: "What does this supplier actually accept? The common approach is a threshold on remaining shelf life, but how many days it is, and which date it counts from, differ by supplier. Confirm it with each one and write it down.",
      },
      {
        title: "Which products and conditions qualify",
        body: "Must the packaging be intact and unopened? Are cold-chain items, controlled drugs, or discounted purchases excluded? Conditions can differ between products from the same supplier.",
      },
      {
        title: "The paperwork and data required",
        body: "Most returns need matching receiving documents: invoice or delivery note, lot number, expiry, and quantity. Keeping lot-level receiving records as a habit is what saves you from digging through boxes on the day.",
      },
      {
        title: "How the money comes back",
        body: "Cash refund, credit against the next order, or a replacement? How long until it lands? This determines what the return is actually worth and therefore whether it is worth filing.",
      },
      {
        title: "Who to contact and how",
        body: "Your sales rep, a support line, or a ticket in their system? Does it need to be flagged in advance? Keep every supplier's contact route and process in one place so someone else can file it too.",
      },
      {
        title: "Tracking after you file",
        body: "Filing a return is not the same as completing one. Track receipt confirmation and the credit, and record whether each lot was actually accepted and for how much. That record is the only way to know whether expiry management saved real money.",
      },
    ],
    caveat: (
      <>
        <b>The real rules vary by supplier, product, and contract.</b> This guide gives no fixed number of days and no universal threshold. Rely on each supplier&apos;s written answer and your contract.
      </>
    ),
    roleHeading: "Where uYao fits",
    role: (
      <>
        uYao records lot numbers and expiry dates automatically from receiving scans, creates work in Store OS with a Web Push reminder as a return threshold approaches, and assembles the lot data the paperwork needs so the pharmacist can decide. Products whose return rules are not confirmed are labelled &ldquo;to confirm&rdquo; rather than given an invented number of days. This is a prototype in pilot recruitment; details are on
        {inline("en", "/evidence", "the product evidence page")}
        . For the tiered expiry review that feeds this, see
        {inline("en", "/guides/pharmacy-expiry-management", "the expiry management guide")}
        .
      </>
    ),
    limitsHeading: "Limits and what this guide will not do",
    limits: [
      "This guide has not been reviewed by a licensed pharmacist and is not pharmaceutical or legal advice.",
      "It does not represent any supplier's official return policy. Confirm with the supplier before relying on it.",
      "It gives no advice about patients returning, exchanging, or using medicine.",
    ],
    sourcesHeading: "Sources",
    sources: [
      <>
        Each supplier&apos;s contract, shipping documents, and written answers. These
        differ by supplier and no publicly citable unified rule exists.
      </>,
      <>
        Pharmaceutical Affairs Act, Article 21 (a drug past its expiry or storage
        period is classed as an inferior drug), background context, Traditional
        Chinese only:{LAW_LINK}
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
        value: "Supplier returns filed by independent pharmacies in Taiwan; excludes patient returns and exchanges",
      },
    ],
    ctaTitle: "Done tracking return windows on sticky notes?",
    ctaBody:
      "uYao is recruiting independent pharmacies to validate return-window reminders and the Store OS decision flow. The pilot does not require replacing your POS and does not touch patient or prescription data.",
  },
};

export default async function ReturnWindowGuidePage() {
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
            {content.checklistHeading}
          </h2>
          <ol className="m-0 grid max-w-[40em] gap-6 pl-0">
            {content.checklist.map((item, i) => (
              <li key={item.title} className="grid list-none grid-cols-[2.4em,1fr] gap-3">
                <span className="num pt-0.5 text-[15px] font-semibold text-oxblood">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="m-0 text-[16.5px] font-bold">{item.title}</h3>
                  <p className="mb-0 mt-1.5 text-[15px] leading-[1.85] text-ink-2">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mb-0 mt-6 max-w-[38em] border border-oxblood/50 bg-oxblood-tint/30 px-5 py-4 text-[14px] leading-[1.8] text-ink">
            {content.caveat}
          </p>
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

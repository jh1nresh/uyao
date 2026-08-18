import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { KnowledgeShell, ProvenanceBox } from "@/components/landing/KnowledgeShell";
import { AEO_PAGES, aeoPath } from "@/lib/aeo";
import { aeoPageMetadata } from "@/lib/aeo-server";
import { localizedPath, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { articleJsonLd, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo";
import { SHOP_URL } from "@/lib/shop";

const PAGE = AEO_PAGES.medicineOutOfStock;
const { datePublished: PUBLISHED, dateModified: UPDATED } = PAGE;

const TITLES: Record<Locale, string> = {
  zh: "藥品缺貨怎麼辦？調貨、替代與附近找藥｜uYao",
  en: "Medicine out of stock: ordering in, alternatives, and nearby pharmacies | uYao",
};

export async function generateMetadata(): Promise<Metadata> {
  return aeoPageMetadata(PAGE, await getRequestLocale(), TITLES);
}

type OutOfStockCopy = {
  kicker: string;
  stepsHeading: string;
  steps: [string, string][];
  faqHeading: string;
  /** [0] repeats the page answer for FAQPage schema; the visible list starts at [1]. */
  faq: { question: string; answer: string }[];
  ctaHeading: string;
  ctaBody: string;
  ctaLabel: string;
  relatedFind: string;
  relatedEvidence: string;
  provenance: { label: string; value: React.ReactNode }[];
};

const CONTENT: Record<Locale, OutOfStockCopy> = {
  zh: {
    kicker: "找藥指南",
    stepsHeading: "建議處理順序",
    steps: [
      ["先問原藥局", "請藥局確認目前供應狀態、能否調貨，以及預計何時可以回覆。"],
      ["替代方案交由專業人員判斷", "不要只靠商品名稱或成分文字自行換藥；劑型、劑量、用法與個人狀況都需要確認。"],
      ["查詢附近藥局", "可使用 uYao 搜尋公開藥局資料，但網站收錄不等於現貨，仍應逐店確認。"],
      ["留下找藥需求", "如果目前找不到，可留下品項與地區需求，等待後續供應確認。"],
      ["需要立即處理時回到醫療端", "處方藥、療程不能中斷或症狀需要立即處理時，請直接聯絡原藥局、開立處方的醫療院所或適當的醫療服務。"],
    ],
    faqHeading: "常見問題",
    faq: [
      { question: PAGE.zh.question, answer: PAGE.zh.directAnswer },
      {
        question: "可以直接換成同成分或其他品牌嗎？",
        answer:
          "不要自行替換。即使成分名稱相近，劑型、劑量、用法與個人狀況仍可能不同；是否可替代應交由藥師或原開立處方的醫療專業人員判斷。",
      },
      {
        question: "uYao 能保證附近藥局有貨嗎？",
        answer:
          "目前不能。uYao 提供試營運目錄、公開藥局資料與找藥需求紀錄，實際供應、預留時間與領取方式仍須由藥局確認。",
      },
      {
        question: "藥品停產或全台缺貨，去哪裡查公告？",
        answer:
          "可先查詢衛福部食藥署的藥品供應資訊平台，短缺藥品與後續處理方式會在該平台公告。處方藥請回原醫療院所或原藥局討論替代安排，不要自行停藥或換藥。",
      },
    ],
    ctaHeading: "查詢附近公開藥局",
    ctaBody: "uYao 目前不提供即時庫存保證。搜尋或留下需求後，請等待藥局或藥師確認。",
    ctaLabel: "前往 uYao 找藥",
    relatedFind: "附近藥局找藥步驟",
    relatedEvidence: "查看產品證據與限制",
    provenance: [
      { label: "作者", value: "uYao 團隊" },
      { label: "內容性質", value: "一般找藥流程資訊，不是個人用藥建議" },
      { label: "醫療專業審閱", value: <b className="text-oxblood">未經藥師專業審閱</b> },
      { label: "發布日期", value: PUBLISHED },
      { label: "最後更新", value: UPDATED },
      { label: "適用範圍", value: "台灣的一般找藥情境；處方與替代決策須由專業人員確認" },
    ],
  },
  en: {
    kicker: "Medicine finder guide",
    stepsHeading: "What to do, in order",
    steps: [
      [
        "Ask your original pharmacy first",
        "Have them confirm the current supply situation, whether they can order it in, and when they expect to be able to answer.",
      ],
      [
        "Leave any substitution to a professional",
        "Never swap a medicine yourself based on a product name or an ingredient label. Form, dose, how it is taken, and your own situation all need to be checked.",
      ],
      [
        "Check nearby pharmacies",
        "You can search public pharmacy records with uYao, but a listing is not stock on hand — confirm store by store.",
      ],
      [
        "Leave a medicine request",
        "If nothing is available right now, leave the product and district and wait for a supply confirmation.",
      ],
      [
        "Go back to care when it cannot wait",
        "For prescription medicine, a course of treatment that must not be interrupted, or symptoms that need attention now, contact your pharmacy, the clinic that issued the prescription, or an appropriate medical service directly.",
      ],
    ],
    faqHeading: "Common questions",
    faq: [
      { question: PAGE.en.question, answer: PAGE.en.directAnswer },
      {
        question: "Can I just switch to the same ingredient or another brand?",
        answer:
          "Do not switch on your own. Even when ingredient names look alike, the form, dose, instructions, and your own situation can differ. Whether a substitute is appropriate is for a pharmacist or the prescribing clinician to decide.",
      },
      {
        question: "Can uYao guarantee a nearby pharmacy has it?",
        answer:
          "Not today. uYao provides a trial catalog, public pharmacy records, and a record of your request. Actual supply, how long an item is held, and pickup are all confirmed by the pharmacy.",
      },
      {
        question: "Where do I check a discontinuation or a nationwide shortage?",
        answer:
          "Start with the drug supply information platform run by Taiwan's Food and Drug Administration, which publishes shortages and how they are being handled. For prescription medicine, discuss alternatives with the clinic or pharmacy that issued it — do not stop or switch on your own.",
      },
    ],
    ctaHeading: "Search public pharmacy records nearby",
    ctaBody:
      "uYao does not guarantee live stock today. After you search or leave a request, wait for the pharmacy or pharmacist to confirm.",
    ctaLabel: "Open uYao Medicine Finder",
    relatedFind: "How to find medicine nearby",
    relatedEvidence: "See the product evidence and limits",
    provenance: [
      { label: "Author", value: "uYao team" },
      {
        label: "Nature",
        value: "General information about the medicine-finding process, not personal medication advice",
      },
      {
        label: "Clinical review",
        value: <b className="text-oxblood">Not reviewed by a licensed pharmacist</b>,
      },
      { label: "Published", value: PUBLISHED },
      { label: "Updated", value: UPDATED },
      {
        label: "Scope",
        value: "General medicine-finding situations in Taiwan; prescription and substitution decisions must be confirmed by a professional",
      },
    ],
  },
};

export default async function MedicineOutOfStockGuidePage() {
  const locale = await getRequestLocale();
  const copy = PAGE[locale];
  const content = CONTENT[locale];
  const path = aeoPath(PAGE, locale);
  const shopHref = `${SHOP_URL.replace(/\/$/, "")}${locale === "en" ? "/en" : "/zh-tw"}`;

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
          faqPageJsonLd(content.faq),
          breadcrumbJsonLd([
            { name: "uYao", path: locale === "en" ? "/en" : "/zh-tw" },
            { name: copy.question, path },
          ]),
        ]}
      />

      <article>
        <h1 className="editorial-display m-0 text-[clamp(32px,4.5vw,44px)] leading-[1.3] [text-wrap:pretty]">
          {copy.question}
        </h1>
        <p className="mt-6 max-w-[40em] border-l-2 border-green pl-5 text-[17px] font-medium leading-[1.9] text-ink">
          {copy.directAnswer}
        </p>

        <section className="mt-10">
          <h2 className="editorial-display mb-5 mt-0 text-[25px] leading-[1.4]">
            {content.stepsHeading}
          </h2>
          <ol className="m-0 grid max-w-[42em] gap-6 pl-0">
            {content.steps.map(([title, body], index) => (
              <li key={title} className="grid list-none grid-cols-[2.5em,1fr] gap-3">
                <span className="num pt-0.5 text-[15px] font-semibold text-oxblood">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="m-0 text-[16.5px] font-bold text-ink">{title}</h3>
                  <p className="mb-0 mt-1.5 text-[15px] leading-[1.85] text-ink-2">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-11">
          <h2 className="editorial-display mb-4 mt-0 text-[25px] leading-[1.4]">
            {content.faqHeading}
          </h2>
          <dl className="m-0 grid max-w-[42em] gap-6">
            {content.faq.slice(1).map((item) => (
              <div key={item.question}>
                <dt className="text-[16px] font-bold text-ink">{item.question}</dt>
                <dd className="mb-0 ml-0 mt-2 text-[15px] leading-[1.85] text-ink-2">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-11 border border-forest bg-sage p-7">
          <h2 className="editorial-display m-0 text-[24px] leading-[1.4]">{content.ctaHeading}</h2>
          <p className="mb-5 mt-2 max-w-[40em] text-[15px] leading-[1.8] text-ink-2">
            {content.ctaBody}
          </p>
          <a href={shopHref} className="action-primary inline-flex px-7 py-3.5 text-[15px]">
            {content.ctaLabel}
          </a>
        </section>

        <section className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-line pt-8 text-[15px]">
          <Link
            href={localizedPath("/guides/find-medicine-nearby", locale)}
            className="text-forest underline underline-offset-2 hover:text-green"
          >
            {content.relatedFind}
          </Link>
          <Link
            href={localizedPath("/evidence", locale)}
            className="text-forest underline underline-offset-2 hover:text-green"
          >
            {content.relatedEvidence}
          </Link>
        </section>

        <ProvenanceBox fields={content.provenance} locale={locale} />
      </article>
    </KnowledgeShell>
  );
}

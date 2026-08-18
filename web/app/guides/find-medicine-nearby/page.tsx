import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { KnowledgeShell, ProvenanceBox } from "@/components/landing/KnowledgeShell";
import { AEO_PAGES, aeoPath } from "@/lib/aeo";
import { aeoPageMetadata } from "@/lib/aeo-server";
import { SERVICE_AREA_LABEL } from "@/lib/data";
import { localizedPath, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { articleJsonLd, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo";
import { SHOP_URL } from "@/lib/shop";

const PAGE = AEO_PAGES.findMedicineNearby;
const { datePublished: PUBLISHED, dateModified: UPDATED } = PAGE;

const TITLES: Record<Locale, string> = {
  zh: "附近藥局怎麼找藥？搜尋、確認與到店步驟｜uYao",
  en: "How to find medicine at a pharmacy near you: search, confirm, collect | uYao",
};

const SERVICE_AREA_EN = "Taipei, New Taipei, Taichung, Miaoli, and Yilan";

export async function generateMetadata(): Promise<Metadata> {
  return aeoPageMetadata(PAGE, await getRequestLocale(), TITLES);
}

type FindCopy = {
  kicker: string;
  stepsHeading: string;
  steps: [string, string][];
  faqHeading: string;
  /** [0] repeats the page answer for FAQPage schema; the visible list starts at [1]. */
  faq: { question: string; answer: string }[];
  ctaHeading: string;
  ctaBody: string;
  ctaLabel: string;
  relatedOutOfStock: string;
  relatedEvidence: string;
  provenance: { label: string; value: React.ReactNode }[];
};

const CONTENT: Record<Locale, FindCopy> = {
  zh: {
    kicker: "找藥指南",
    stepsHeading: "五個步驟",
    steps: [
      ["輸入你知道的資訊", "可搜尋商品名、主成分或症狀描述。症狀搜尋只協助縮小方向，不是診斷。"],
      ["選擇地區", `目前首波收錄範圍為${SERVICE_AREA_LABEL}；收錄不代表藥局已與 uYao 合作。`],
      ["查看資料狀態", "分清楚公開藥局資料、試營運品項紀錄與需要藥局確認的供應狀態。"],
      ["留下找藥需求", "找不到時可留下品項與地區需求，讓 uYao 記錄這次搜尋落空。"],
      ["等待藥局確認", "前往門市前，確認品項、數量、領取安排與用藥問題；不要把網站收錄當成現貨保證。"],
    ],
    faqHeading: "常見問題",
    faq: [
      { question: PAGE.zh.question, answer: PAGE.zh.directAnswer },
      {
        question: "uYao 顯示的是即時庫存嗎？",
        answer:
          "目前不是。uYao 會分開標示公開藥局資料、試營運目錄與待藥局確認的供應狀態，不會把收錄店家寫成已有現貨。",
      },
      {
        question: "出發去藥局前還需要確認嗎？",
        answer:
          "需要。品項、數量、價格、預留時間與個人是否適合使用，都應由藥局或藥師確認；前往門市前建議先電話聯絡或等待回覆。",
      },
      {
        question: "深夜或想找 24 小時藥局怎麼辦？",
        answer:
          "uYao 顯示的時段多來自健保署特約資料的健保調劑時段，門市實際營業時間通常更長，但不能當成深夜仍營業的保證。深夜買藥前務必先電話確認；若是緊急或不能等的用藥需求，請直接就醫，不要逐家找藥局。",
      },
      {
        question: "怎麼找走路範圍內的藥局？",
        answer:
          "選擇地區後，開啟定位可以看到與每家藥局的實際距離（公尺），依距離排序挑出走路可到的店；未開啟定位時顯示的是距該區中心的參考距離。出發前仍建議先電話確認品項。",
      },
    ],
    ctaHeading: "開始搜尋附近藥局",
    ctaBody: "搜尋結果是下一步線索，不是即時庫存保證。供應與用藥問題仍由藥局或藥師確認。",
    ctaLabel: "前往 uYao 找藥",
    relatedOutOfStock: "藥品缺貨時怎麼處理？",
    relatedEvidence: "查看產品證據與限制",
    provenance: [
      { label: "作者", value: "uYao 團隊" },
      { label: "資料來源", value: "uYao 試營運目錄與公開藥局資料" },
      { label: "醫療專業審閱", value: <b className="text-oxblood">未經藥師專業審閱</b> },
      { label: "發布日期", value: PUBLISHED },
      { label: "最後更新", value: UPDATED },
      { label: "適用範圍", value: "台灣的附近藥局資料搜尋；不代表即時庫存或醫療建議" },
    ],
  },
  en: {
    kicker: "Medicine finder guide",
    stepsHeading: "Five steps",
    steps: [
      [
        "Enter whatever you know",
        "Search by product name, active ingredient, or a description of the symptom. Symptom search only narrows the direction; it is not a diagnosis.",
      ],
      [
        "Pick your district",
        `The first coverage wave is ${SERVICE_AREA_EN}. Being listed does not mean a pharmacy is a uYao partner.`,
      ],
      [
        "Read the status of each record",
        "Keep three things apart: public pharmacy records, trial catalog entries, and supply that still needs the pharmacy to confirm it.",
      ],
      [
        "Leave a medicine request",
        "When nothing matches, leave the product and district so uYao records that this search came up empty.",
      ],
      [
        "Wait for the pharmacy to confirm",
        "Before going to the store, confirm the product, quantity, pickup arrangement, and any medication question. A listing is never a guarantee of stock.",
      ],
    ],
    faqHeading: "Common questions",
    faq: [
      { question: PAGE.en.question, answer: PAGE.en.directAnswer },
      {
        question: "Does uYao show live inventory?",
        answer:
          "Not today. uYao labels public pharmacy records, trial catalog entries, and supply awaiting pharmacy confirmation separately, and never presents a listed store as having stock on hand.",
      },
      {
        question: "Do I still need to confirm before going to the pharmacy?",
        answer:
          "Yes. The product, quantity, price, how long it is held, and whether it suits you personally are all confirmed by the pharmacy or pharmacist. Call ahead or wait for a reply before travelling.",
      },
      {
        question: "What about late at night, or a 24-hour pharmacy?",
        answer:
          "The hours uYao shows mostly come from National Health Insurance contract data and describe insurance dispensing hours. Actual store hours are usually longer, but they are not a guarantee that a pharmacy is open late. Always call before a late-night trip, and for anything urgent, seek medical care directly instead of calling pharmacies one by one.",
      },
      {
        question: "How do I find a pharmacy within walking distance?",
        answer:
          "After choosing a district, turning on location shows the real distance in metres to each pharmacy so you can sort by distance and pick one you can walk to. Without location, the distance shown is measured from the district centre as a rough reference. Call to confirm the product before you set out.",
      },
    ],
    ctaHeading: "Start searching pharmacies near you",
    ctaBody:
      "Search results are a lead for your next step, not a guarantee of live stock. Supply and medication questions are answered by the pharmacy or pharmacist.",
    ctaLabel: "Open uYao Medicine Finder",
    relatedOutOfStock: "What to do when a medicine is out of stock",
    relatedEvidence: "See the product evidence and limits",
    provenance: [
      { label: "Author", value: "uYao team" },
      { label: "Data sources", value: "uYao trial catalog and public pharmacy records" },
      {
        label: "Clinical review",
        value: <b className="text-oxblood">Not reviewed by a licensed pharmacist</b>,
      },
      { label: "Published", value: PUBLISHED },
      { label: "Updated", value: UPDATED },
      {
        label: "Scope",
        value: "Searching nearby pharmacy records in Taiwan; not live inventory and not medical advice",
      },
    ],
  },
};

export default async function FindMedicineNearbyGuidePage() {
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
            href={localizedPath("/guides/medicine-out-of-stock", locale)}
            className="text-forest underline underline-offset-2 hover:text-green"
          >
            {content.relatedOutOfStock}
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

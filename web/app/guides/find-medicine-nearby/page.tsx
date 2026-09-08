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
  zh: "台灣附近藥局怎麼找？查詢與出發前確認步驟｜uYao",
  en: "How to find a pharmacy near you in Taiwan and confirm supply | uYao",
};

const NHI_PHARMACY_LOOKUP = "https://info.nhi.gov.tw/INAE1000/INAE1000S01";
const SOURCE_LINK_CLASS = "text-forest underline underline-offset-2 hover:text-green";

const SERVICE_AREA_EN = "Taipei, New Taipei, Taichung, Miaoli, and Yilan";

export async function generateMetadata(): Promise<Metadata> {
  return aeoPageMetadata(PAGE, await getRequestLocale(), TITLES);
}

type FindCopy = {
  kicker: string;
  stepsHeading: string;
  steps: [string, React.ReactNode][];
  faqHeading: string;
  /** [0] repeats the page answer for FAQPage schema; the visible list starts at [1]. */
  faq: { question: string; answer: string }[];
  ctaHeading: string;
  ctaBody: string;
  ctaLabel: string;
  relatedOutOfStock: string;
  relatedEvidence: string;
  sourceHeading: string;
  sourceBody: string;
  sourceLabel: string;
  provenance: { label: string; value: React.ReactNode }[];
};

const CONTENT: Record<Locale, FindCopy> = {
  zh: {
    kicker: "找藥指南",
    stepsHeading: "五個步驟",
    steps: [
      ["輸入你知道的資訊", "先記下商品名或主成分，再選擇地區查詢。若只有症狀、不知道需要什麼品項，請先向藥師詢問。"],
      ["查詢官方藥局資料", <>開啟<a href={NHI_PHARMACY_LOOKUP} className={SOURCE_LINK_CLASS}>健保署特約醫事機構查詢</a>，選擇縣市、鄉鎮市與藥局類別，查找聯絡資料。此入口適用於健保特約藥局，不代表全台所有藥局。</>],
      ["查 uYao 品項目錄", `uYao 首波收錄地區為${SERVICE_AREA_LABEL}。可用已知品名或成分查目錄；品項收錄與公開藥局資料都不代表即時有貨或合作關係。`],
      ["打電話確認再出發", "可先問：「請問今天幾點營業？我想找［品名與規格］、［數量］，能否供應？如果可以，價格、預留期限與到店領取方式是什麼？」用藥是否適合仍請藥師確認。"],
      ["找不到時留下需求", "可在 uYao 留下品項與地區需求；送出只代表記錄需求，不是預留成功或供應承諾。取得藥局確認後，再依回覆前往。"],
    ],
    faqHeading: "常見問題",
    faq: [
      { question: PAGE.zh.question, answer: PAGE.zh.directAnswer },
      {
        question: "搜尋「附近西藥房」或「藥房附近」時，要確認哪些資訊？",
        answer:
          "先確認藥局所在地區、地址與電話，再向店家確認實際營業時間，以及是否能提供你要找的品項。健保署特約醫事機構查詢可提供特約藥局的聯絡線索；官方收錄不代表與 uYao 合作、目前營業或已有現貨。",
      },
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
          "可先查健保署公開的服務時段，再向藥局確認當天實際營業時間；公開時段不能當成深夜仍營業的保證。深夜買藥前務必先電話確認；若是緊急或不能等的用藥需求，請直接就醫，不要逐家找藥局。",
      },
      {
        question: "怎麼找走路範圍內的藥局？",
        answer:
          "先以藥局地址在地圖確認步行路線、時間與出入口。uYao 若顯示定位距離，是依座標估算的直線距離，不是步行路程；未提供定位時可能顯示距區中心的參考距離。出發前仍須電話確認品項。",
      },
    ],
    ctaHeading: "查品項，準備向藥局確認",
    ctaBody: "搜尋結果是下一步線索，不是即時庫存保證。供應與用藥問題仍由藥局或藥師確認。",
    ctaLabel: "前往 uYao 找藥",
    relatedOutOfStock: "藥品缺貨時怎麼處理？",
    relatedEvidence: "查看產品證據與限制",
    sourceHeading: "官方查詢入口與資料限制",
    sourceBody: "健保署提供健保特約醫事機構的地區、類別與服務時段查詢。可用來查找特約藥局聯絡資料；藥品供應、價格與當天營業情況，仍須向藥局確認。uYao 的試營運目錄是另一份資料，不是健保署庫存資料。",
    sourceLabel: "健保署特約醫事機構查詢（中文介面）",
    provenance: [
      { label: "作者", value: "uYao 團隊" },
      { label: "查詢參考", value: <a href={NHI_PHARMACY_LOOKUP} className={SOURCE_LINK_CLASS}>健保署特約醫事機構查詢</a> },
      { label: "uYao 品項資料", value: "uYao 試營運目錄；不代表即時庫存" },
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
        "Start with the product name or active ingredient, then choose a district. If you only know your symptoms and not which product you need, ask a pharmacist first.",
      ],
      [
        "Look up official pharmacy records",
        <>Open the <a href={NHI_PHARMACY_LOOKUP} className={SOURCE_LINK_CLASS}>NHI contracted institution lookup (Chinese interface)</a> and choose a city, district, and pharmacy category to find contact details. It covers NHI-contracted pharmacies, not every pharmacy in Taiwan.</>,
      ],
      [
        "Search the uYao product catalog",
        `The first coverage wave is ${SERVICE_AREA_EN}. Search by a known product name or ingredient. Catalog entries and public pharmacy records do not establish live stock or a partnership.`,
      ],
      [
        "Call before travelling",
        "Ask: What are today’s opening hours? Can you supply [product and strength or pack size], [quantity]? If so, what is the price, how long can it be held, and how do I collect it? Ask a pharmacist whether it is suitable for you.",
      ],
      [
        "Leave a request if nothing matches",
        "Leave the product and district in uYao. Submission records a request; it does not confirm a reservation or promise supply. Travel only after the pharmacy confirms the arrangement.",
      ],
    ],
    faqHeading: "Common questions",
    faq: [
      { question: PAGE.en.question, answer: PAGE.en.directAnswer },
      {
        question: "What should I check in a pharmacy-nearby search result in Taiwan?",
        answer:
          "Check the district, address, and phone number, then ask the pharmacy about actual opening hours and whether it can supply the product. The NHI lookup provides contact leads for contracted pharmacies; an official listing does not mean a uYao partnership, an open store, or stock on hand.",
      },
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
          "Check the service hours in NHI public records, then ask the pharmacy about its actual hours that day. Published hours are not a guarantee that a pharmacy is open late. Always call before a late-night trip, and for anything urgent, seek medical care directly instead of calling pharmacies one by one.",
      },
      {
        question: "How do I find a pharmacy within walking distance?",
        answer:
          "Use the pharmacy address in a map to check walking directions, travel time, and entrances. When uYao shows a location-based distance, it is a straight-line estimate from coordinates, not a walking route. Without location, it may show a district-centre reference distance. Call to confirm the product before travelling.",
      },
    ],
    ctaHeading: "Look up a product before calling",
    ctaBody:
      "Search results are a lead for your next step, not a guarantee of live stock. Supply and medication questions are answered by the pharmacy or pharmacist.",
    ctaLabel: "Open uYao Medicine Finder",
    relatedOutOfStock: "What to do when a medicine is out of stock",
    relatedEvidence: "See the product evidence and limits",
    sourceHeading: "Official lookup and its limits",
    sourceBody: "The NHI lookup filters contracted institutions by location, category, and service hours. Use it to find pharmacy contact details; confirm supply, price, and today’s opening hours with the pharmacy. The uYao trial catalog is separate and is not NHI inventory data.",
    sourceLabel: "NHI contracted institution lookup (Chinese interface)",
    provenance: [
      { label: "Author", value: "uYao team" },
      { label: "Lookup reference", value: <a href={NHI_PHARMACY_LOOKUP} className={SOURCE_LINK_CLASS}>NHI contracted institution lookup</a> },
      { label: "uYao product data", value: "uYao trial catalog; not live inventory" },
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

        <section className="mt-10 max-w-[42em]">
          <h2 className="editorial-display mb-4 mt-0 text-[25px] leading-[1.4]">
            {content.sourceHeading}
          </h2>
          <p className="text-[15px] leading-[1.85] text-ink-2">{content.sourceBody}</p>
          <a href={NHI_PHARMACY_LOOKUP} className={SOURCE_LINK_CLASS}>
            {content.sourceLabel}
          </a>
        </section>

        <ProvenanceBox fields={content.provenance} locale={locale} />
      </article>
    </KnowledgeShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { KnowledgeCta, KnowledgeShell, ProvenanceBox } from "@/components/landing/KnowledgeShell";
import { AEO_PAGES, aeoPath } from "@/lib/aeo";
import { aeoPageMetadata } from "@/lib/aeo-server";
import { SERVICE_AREA_LABEL } from "@/lib/data";
import { localizedPath, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { articleJsonLd, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo";

const PAGE = AEO_PAGES.joinUyao;
const { datePublished: PUBLISHED, dateModified: UPDATED } = PAGE;

const TITLES: Record<Locale, string> = {
  zh: "藥局如何加入 uYao？試點申請與合作流程",
  en: "How a pharmacy joins uYao: pilot application and onboarding",
};

const SERVICE_AREA_EN = "Taipei, New Taipei, Taichung, Miaoli, and Yilan";

export async function generateMetadata(): Promise<Metadata> {
  return aeoPageMetadata(PAGE, await getRequestLocale(), TITLES);
}

type JoinCopy = {
  kicker: string;
  stepsHeading: string;
  steps: [string, string][];
  scopeHeading: string;
  scope: string;
  faqHeading: string;
  /** [0] repeats the page answer for FAQPage schema; the visible list starts at [1]. */
  faq: { question: string; answer: string }[];
  relatedPilot: string;
  relatedEvidence: string;
  provenance: { label: string; value: React.ReactNode }[];
  ctaTitle: string;
  ctaBody: string;
};

const CONTENT: Record<Locale, JoinCopy> = {
  zh: {
    kicker: "藥局合作",
    stepsHeading: "加入流程",
    steps: [
      ["確認試點方向", "uYao 聚焦批次與效期紀錄、退貨／補貨待辦，以及附近找藥需求；不是 POS、健保申報或線上藥局。"],
      ["提交基本資料", "提供藥局名稱、所在地區與可聯絡方式，並勾選最常遇到的庫存或效期問題。"],
      ["進行流程訪談", "一起確認現有掃描器、進貨掃描、退貨窗口與 Store OS 通知方式，不先假設每家店的流程相同。"],
      ["確認試點條件", "雙方確認資料範圍、設備接法、責任邊界與成功指標後，才決定是否啟動。"],
      ["小範圍驗證", "先驗證掃描到提醒、藥師批准與結果回寫的閉環，再評估是否擴大。"],
    ],
    scopeHeading: "目前試點範圍",
    scope: `首波聚焦${SERVICE_AREA_LABEL}的獨立藥局。區域聚焦不代表已有正式合作、已安裝設備或已有即時庫存；提交申請也不等於自動納入試點。`,
    faqHeading: "常見問題",
    faq: [
      { question: PAGE.zh.question, answer: PAGE.zh.directAnswer },
      {
        question: "加入 uYao 需要更換 POS 嗎？",
        answer:
          "目前試點不要求更換 POS。uYao 的方向是從既有掃描流程取得必要訊號，再把待處理工作送到 Store OS；實際接法仍需在現場訪談後確認。",
      },
      {
        question: "提交申請就代表成為合作藥局嗎？",
        answer:
          "不是。提交表單只代表提出試點意願；是否進入試點、安裝設備或公開為合作藥局，仍需完成流程確認與雙方同意。",
      },
    ],
    relatedPilot: "查看完整試點說明",
    relatedEvidence: "查看產品證據與目前進度",
    provenance: [
      { label: "作者", value: "uYao 團隊" },
      { label: "內容依據", value: "目前公開的試點申請與產品證據" },
      { label: "合作狀態", value: "提交申請不代表正式合作或設備安裝" },
      { label: "發布日期", value: PUBLISHED },
      { label: "最後更新", value: UPDATED },
      { label: "適用範圍", value: "台灣獨立藥局的 uYao 試點申請" },
    ],
    ctaTitle: "想確認你的藥局流程是否適合？",
    ctaBody:
      "提交基本資料後，我們會先聊現有掃描、進貨與退貨流程；在雙方確認前，不會把申請寫成正式合作。",
  },
  en: {
    kicker: "Pharmacy partnership",
    stepsHeading: "How onboarding works",
    steps: [
      [
        "Check what the pilot actually covers",
        "uYao focuses on lot and expiry records, return and reorder work, and nearby medicine demand. It is not a POS, an insurance claim system, or an online pharmacy.",
      ],
      [
        "Submit the basics",
        "Send your pharmacy name, district, and a contact route, and tell us which inventory or expiry problem you hit most often.",
      ],
      [
        "Do a workflow interview",
        "We go through your existing scanner, receiving scans, return windows, and how Store OS should notify you. We do not assume every pharmacy works the same way.",
      ],
      [
        "Agree the pilot terms",
        "Data scope, how the device connects, where responsibility sits, and what success means are all agreed by both sides before anything starts.",
      ],
      [
        "Validate on a small scope",
        "First prove the loop from scan to reminder to pharmacist approval to recorded outcome, then decide whether to widen it.",
      ],
    ],
    scopeHeading: "Current pilot scope",
    scope: `The first wave focuses on independent pharmacies in ${SERVICE_AREA_EN}. Being in a focus area does not mean a partnership exists, a device is installed, or live inventory is available, and submitting an application does not automatically enrol you.`,
    faqHeading: "Common questions",
    faq: [
      { question: PAGE.en.question, answer: PAGE.en.directAnswer },
      {
        question: "Does joining uYao mean replacing my POS?",
        answer:
          "The pilot does not require replacing your POS. The approach is to take the signals uYao needs from your existing scanning flow and push work into Store OS. How it connects in practice is confirmed after the on-site interview.",
      },
      {
        question: "Does applying make my pharmacy a partner?",
        answer:
          "No. Submitting the form only registers interest. Entering the pilot, installing a device, or being listed publicly as a partner all require completing the workflow review and agreement from both sides.",
      },
    ],
    relatedPilot: "Read the full pilot description",
    relatedEvidence: "See the product evidence and current status",
    provenance: [
      { label: "Author", value: "uYao team" },
      { label: "Based on", value: "The currently published pilot application and product evidence" },
      {
        label: "Partnership status",
        value: "Submitting an application is not a partnership or a device installation",
      },
      { label: "Published", value: PUBLISHED },
      { label: "Updated", value: UPDATED },
      { label: "Scope", value: "uYao pilot applications from independent pharmacies in Taiwan" },
    ],
    ctaTitle: "Want to check whether your workflow fits?",
    ctaBody:
      "After you send the basics we start by talking through your current scanning, receiving, and return routines. Nothing is described as a partnership until both sides agree.",
  },
};

export default async function JoinUYaoGuidePage() {
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

        <section className="mt-11 border border-line bg-paper p-6">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">
            {content.scopeHeading}
          </h2>
          <p className="m-0 max-w-[40em] text-[15px] leading-[1.85] text-ink-2">{content.scope}</p>
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

        <section className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t border-line pt-8 text-[15px]">
          <Link
            href={localizedPath("/pharmacy", locale)}
            className="text-forest underline underline-offset-2 hover:text-green"
          >
            {content.relatedPilot}
          </Link>
          <Link
            href={localizedPath("/evidence", locale)}
            className="text-forest underline underline-offset-2 hover:text-green"
          >
            {content.relatedEvidence}
          </Link>
        </section>

        <ProvenanceBox fields={content.provenance} locale={locale} />

        <KnowledgeCta title={content.ctaTitle} body={content.ctaBody} locale={locale} />
      </article>
    </KnowledgeShell>
  );
}

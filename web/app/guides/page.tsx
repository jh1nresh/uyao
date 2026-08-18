import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { KnowledgeCta, KnowledgeShell } from "@/components/landing/KnowledgeShell";
import { AEO_PAGES, aeoPath, type AeoAnswerPage } from "@/lib/aeo";
import type { Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { SITE_URL, breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo";
import { indexablePageRobots } from "@/lib/seo-server";

/**
 * 知識叢集的 pillar 頁。
 *
 * 在這頁出現以前，六篇 guide 與 compare 只有 footer 的兩條連結和 /evidence
 * 內文的一條連結當入口，`pharmacy-return-window` 距首頁四跳。這頁把整個
 * 叢集收在首頁一跳之內，順序照藥局實際遇到的先後排，不是照發布日期。
 */

const PATH = "/zh-tw/guides";
const EN_PATH = "/en/guides";
const UPDATED = "2026-08-18";

type Section = {
  heading: Record<Locale, string>;
  intro: Record<Locale, string>;
  pages: readonly AeoAnswerPage[];
};

const SECTIONS: Section[] = [
  {
    heading: { zh: "藥局營運", en: "Running a pharmacy" },
    intro: {
      zh: "給獨立藥局經營者與藥師：效期、退貨與庫存工具的可執行做法。",
      en: "For independent pharmacy owners and pharmacists: workable routines for expiry, returns, and inventory tooling.",
    },
    pages: [
      AEO_PAGES.pharmacyExpiryManagement,
      AEO_PAGES.pharmacyReturnWindow,
      AEO_PAGES.aiToolsPharmacyInventory,
      AEO_PAGES.uyaoVsPos,
    ],
  },
  {
    heading: { zh: "找藥與缺貨", en: "Finding medicine" },
    intro: {
      zh: "給需要找藥的人：怎麼查附近藥局，以及藥品缺貨時的處理順序。",
      en: "For people looking for a medicine: how to check nearby pharmacies, and what to do when something is out of stock.",
    },
    pages: [AEO_PAGES.findMedicineNearby, AEO_PAGES.medicineOutOfStock],
  },
  {
    heading: { zh: "加入 uYao", en: "Joining uYao" },
    intro: {
      zh: "試點的範圍、流程與目前已驗證的能力。",
      en: "Pilot scope, the process, and what is verified today.",
    },
    pages: [AEO_PAGES.joinUyao, AEO_PAGES.evidence],
  },
];

const ALL_PAGES = SECTIONS.flatMap((section) => section.pages);

const COPY: Record<Locale, {
  title: string;
  kicker: string;
  heading: string;
  lede: string;
  updatedLabel: string;
  disclaimerHeading: string;
  disclaimer: string;
  ctaTitle: string;
  ctaBody: string;
}> = {
  zh: {
    title: "藥局營運與找藥指南｜uYao",
    kicker: "指南總覽",
    heading: "藥局營運與找藥指南",
    lede: "每一篇都回答一個具體問題，並標明哪些是已驗證的、哪些還是 prototype。所有指南由 uYao 團隊撰寫，未經藥師專業審閱，不構成醫療或用藥建議。",
    updatedLabel: "最後更新",
    disclaimerHeading: "這些指南不做什麼",
    disclaimer:
      "不提供病患用藥、劑量或替代藥建議；不代表任何供應商或主管機關的正式政策；引用前請向供應商、藥師或原始法規來源確認。",
    ctaTitle: "想把這些流程變成每天會自己出現的工作？",
    ctaBody: "uYao 正在招募願意一起驗證退貨窗口、效期分層與 Store OS 決策流程的獨立藥局。試點不要求更換 POS，也不碰病患或處方個資。",
  },
  en: {
    title: "Pharmacy operations and medicine-finding guides | uYao",
    kicker: "All guides",
    heading: "Pharmacy operations and medicine-finding guides",
    lede: "Each guide answers one specific question and marks what is verified versus what is still a prototype claim. All guides are written by the uYao team, have not been reviewed by a licensed pharmacist, and are not medical or medication advice.",
    updatedLabel: "Updated",
    disclaimerHeading: "What these guides do not do",
    disclaimer:
      "They do not advise patients on medication, dosage, or substitutes, and they do not represent any supplier's or regulator's official policy. Confirm with the supplier, a pharmacist, or the original regulation before relying on anything here.",
    ctaTitle: "Want these routines to surface as work on their own?",
    ctaBody: "uYao is recruiting independent pharmacies to validate return-window reminders, expiry tiering, and the Store OS decision flow. The pilot does not require replacing your POS and does not touch patient or prescription data.",
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = COPY[locale];
  return {
    title: { absolute: copy.title },
    description: copy.lede,
    alternates: {
      canonical: locale === "en" ? EN_PATH : PATH,
      languages: { "zh-TW": PATH, en: EN_PATH, "x-default": PATH },
    },
    robots: await indexablePageRobots(),
  };
}

export default async function GuidesIndexPage() {
  const locale = await getRequestLocale();
  const copy = COPY[locale];
  const path = locale === "en" ? EN_PATH : PATH;

  return (
    <KnowledgeShell kicker={copy.kicker} locale={locale}>
      <JsonLd
        nodes={[
          webPageJsonLd({
            name: copy.heading,
            description: copy.lede,
            path,
            dateModified: UPDATED,
            inLanguage: locale === "en" ? "en" : "zh-Hant-TW",
          }),
          {
            "@type": "ItemList",
            name: copy.heading,
            numberOfItems: ALL_PAGES.length,
            itemListElement: ALL_PAGES.map((page, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: page[locale].question,
              url: `${SITE_URL}${aeoPath(page, locale)}`,
            })),
          },
          breadcrumbJsonLd([
            { name: "uYao", path: locale === "en" ? "/en" : "/zh-tw" },
            { name: copy.heading, path },
          ]),
        ]}
      />

      <article>
        <h1 className="editorial-display m-0 text-[clamp(30px,4.2vw,42px)] leading-[1.32] [text-wrap:pretty]">
          {copy.heading}
        </h1>

        <p className="mt-6 max-w-[38em] border-l-2 border-green pl-5 text-[17px] font-medium leading-[1.9] text-ink">
          {copy.lede}
        </p>

        {SECTIONS.map((section) => (
          <section key={section.heading.en} className="mt-11">
            <h2 className="editorial-display mb-2 mt-0 text-[24px] leading-[1.4]">
              {section.heading[locale]}
            </h2>
            <p className="m-0 max-w-[38em] text-[15px] leading-[1.85] text-ink-2">
              {section.intro[locale]}
            </p>

            <ul className="m-0 mt-5 grid max-w-[46em] gap-3 pl-0">
              {section.pages.map((page) => (
                <li key={page.path} className="list-none border border-line-strong bg-surface">
                  <Link
                    href={aeoPath(page, locale)}
                    className="block p-5 no-underline transition-colors hover:bg-surface-hover"
                  >
                    <h3 className="m-0 text-[16.5px] font-bold text-forest">
                      {page[locale].question}
                    </h3>
                    <p className="mb-0 mt-2 text-[15px] leading-[1.8] text-ink-2">
                      {page[locale].directAnswer}
                    </p>
                    <p className="num mb-0 mt-3 text-[12px] text-muted">
                      {copy.updatedLabel} {page.dateModified}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-11">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">
            {copy.disclaimerHeading}
          </h2>
          <p className="m-0 max-w-[38em] border border-oxblood/50 bg-oxblood-tint/30 px-5 py-4 text-[14px] leading-[1.8] text-ink">
            {copy.disclaimer}
          </p>
        </section>

        <KnowledgeCta title={copy.ctaTitle} body={copy.ctaBody} locale={locale} />
      </article>
    </KnowledgeShell>
  );
}

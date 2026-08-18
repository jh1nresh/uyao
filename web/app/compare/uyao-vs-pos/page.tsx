import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { KnowledgeCta, KnowledgeShell } from "@/components/landing/KnowledgeShell";
import { AEO_PAGES, aeoPath } from "@/lib/aeo";
import { aeoPageMetadata } from "@/lib/aeo-server";
import { localizedPath, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { breadcrumbJsonLd, webPageJsonLd } from "@/lib/seo";

/**
 * 比較頁（spec §4D）：主要意圖「藥局 POS 庫存差異」「獨立藥局管理系統」
 * 「藥局 AI」。Required distinction：POS 記錄交易與申報；uYao 連接庫存、
 * 效期、附近需求與後續工作；藥師保留批准。不貶低、不宣稱取代 POS。
 */

const PAGE = AEO_PAGES.uyaoVsPos;
const { dateModified: UPDATED } = PAGE;

const TITLES: Record<Locale, string> = {
  zh: PAGE.zh.question,
  en: PAGE.en.question,
};

export async function generateMetadata(): Promise<Metadata> {
  return aeoPageMetadata(PAGE, await getRequestLocale(), TITLES);
}

type Role = { who: string; job: string; detail: string; hot?: boolean };
type DiffRow = { q: string; pos: string; uyao: string };

type CompareCopy = {
  kicker: string;
  breadcrumb: string;
  rolesHeading: string;
  roles: Role[];
  diffHeading: string;
  posColumn: string;
  diffRows: DiffRow[];
  diffNote: React.ReactNode;
  whenHeading: string;
  when: React.ReactNode;
  updatedLabel: string;
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

const CONTENT: Record<Locale, CompareCopy> = {
  zh: {
    kicker: "比較",
    breadcrumb: "uYao 與藥局 POS 的差異",
    rolesHeading: "三個角色的分工",
    roles: [
      {
        who: "POS／健保申報系統",
        job: "記錄交易與申報",
        detail: "銷售、庫存帳、健保申報——這是藥局的記錄與合規層，每天都在用，也應該繼續用。",
      },
      {
        who: "uYao",
        job: "連接訊號與行動",
        detail: "把批號效期、缺貨與附近需求整理成「該退、該減、該補、該預留」的具體工作，主動送到 Store OS，並記錄實際結果。",
        hot: true,
      },
      {
        who: "藥師",
        job: "保留專業與批准",
        detail: "每個關鍵決策——退不退、補不補、留不留——都由藥師批准、拒絕或修正。uYao 不替藥師做專業判斷。",
      },
    ],
    diffHeading: "逐項比較",
    posColumn: "POS／申報系統",
    diffRows: [
      { q: "回答的問題", pos: "昨天賣了什麼、帳對不對", uyao: "接下來該對哪批藥做什麼" },
      { q: "效期資料", pos: "多半是人工維護的欄位", uyao: "從進貨掃描取得批號層級的效期證據" },
      { q: "需求訊號", pos: "已完成的銷售", uyao: "附近搜尋落空、到貨通知與預留（試點驗證中）" },
      { q: "輸出", pos: "報表與帳目", uyao: "待批准的行動與 outcome receipt" },
    ],
    diffNote: (
      <>
        uYao 不取代 POS、健保申報或藥師判斷；試點也不要求更換既有系統。表中 uYao 端能力的驗證狀態（code/test、prototype、pilot）見
        {inline("zh", "/evidence", "產品證據頁")}
        。
      </>
    ),
    whenHeading: "什麼情況適合看 uYao",
    when: (
      <>
        如果你的痛點是帳務或申報，優化 POS 就好。如果痛點是「過期藥變報廢成本」「錯過退貨窗口」「不知道附近的人在找什麼」，那是行動層的問題——可以先從
        {inline("zh", "/guides/pharmacy-expiry-management", "藥品效期管理指南")}
        開始；若正在評估工具，也可先看
        {inline("zh", "/guides/ai-tools-pharmacy-inventory", "藥局庫存 AI 工具選擇指南")}
        ，或直接申請試點。
      </>
    ),
    updatedLabel: "最後更新：",
    ctaTitle: "用一條退貨閉環試試看",
    ctaBody:
      "uYao 正在招募獨立藥局一起驗證第一條現場閉環。不用換 POS，不改掃描流程，也不碰病患或處方個資。",
  },
  en: {
    kicker: "Comparison",
    breadcrumb: "uYao compared with a pharmacy POS",
    rolesHeading: "Three roles, three jobs",
    roles: [
      {
        who: "POS / insurance claim system",
        job: "Records transactions and claims",
        detail:
          "Sales, the stock ledger, insurance claims. This is the pharmacy's record and compliance layer. It is used every day and should stay that way.",
      },
      {
        who: "uYao",
        job: "Connects signals to action",
        detail:
          "Turns lot expiry, stockouts, and nearby demand into concrete work — return this, cut that, reorder, hold one — pushes it into Store OS, and records what actually happened.",
        hot: true,
      },
      {
        who: "The pharmacist",
        job: "Keeps the judgement and the approval",
        detail:
          "Every critical decision — return or not, reorder or not, hold or not — is approved, rejected, or corrected by the pharmacist. uYao does not make professional judgements.",
      },
    ],
    diffHeading: "Side by side",
    posColumn: "POS / claim system",
    diffRows: [
      {
        q: "Question it answers",
        pos: "What sold yesterday, and do the books balance",
        uyao: "What to do next, and to which lot",
      },
      {
        q: "Expiry data",
        pos: "Usually a manually maintained field",
        uyao: "Lot-level expiry evidence captured from receiving scans",
      },
      {
        q: "Demand signal",
        pos: "Completed sales",
        uyao: "Failed nearby searches, restock alerts, and reservations (validating in pilot)",
      },
      { q: "Output", pos: "Reports and ledgers", uyao: "Work awaiting approval, and an outcome receipt" },
    ],
    diffNote: (
      <>
        uYao does not replace a POS, insurance claims, or a pharmacist&apos;s judgement, and the pilot does not require changing your existing systems. For the verification status of each uYao capability in this table (code/test, prototype, pilot), see
        {inline("en", "/evidence", "the product evidence page")}
        .
      </>
    ),
    whenHeading: "When uYao is worth a look",
    when: (
      <>
        If your pain is bookkeeping or claims, improve the POS. If it is expired stock turning into write-offs, missed return windows, or not knowing what people nearby are looking for, that is an action-layer problem — start with
        {inline("en", "/guides/pharmacy-expiry-management", "the expiry management guide")}
        . If you are comparing tools, read
        {inline("en", "/guides/ai-tools-pharmacy-inventory", "the AI inventory tools guide")}
        , or apply to the pilot directly.
      </>
    ),
    updatedLabel: "Updated: ",
    ctaTitle: "Try it on one return loop",
    ctaBody:
      "uYao is recruiting independent pharmacies to validate the first on-site loop. No POS change, no change to how you scan, and no patient or prescription data.",
  },
};

export default async function CompareUyaoVsPosPage() {
  const locale = await getRequestLocale();
  const copy = PAGE[locale];
  const content = CONTENT[locale];
  const path = aeoPath(PAGE, locale);

  return (
    <KnowledgeShell kicker={content.kicker} locale={locale}>
      <JsonLd
        nodes={[
          webPageJsonLd({
            name: copy.question,
            description: copy.directAnswer,
            path,
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

        <section className="mt-10">
          <h2 className="editorial-display mb-5 mt-0 text-[24px] leading-[1.4]">
            {content.rolesHeading}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {content.roles.map((role) => (
              <div
                key={role.who}
                className={`border p-5 ${role.hot ? "border-forest bg-sage" : "border-line bg-paper"}`}
              >
                <div className="num text-[12px] font-semibold tracking-[.06em] text-muted">{role.who}</div>
                <h3 className="mb-2 mt-1.5 text-[17px] font-bold">{role.job}</h3>
                <p className="m-0 text-[14px] leading-[1.8] text-ink-2">{role.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-5 mt-0 text-[24px] leading-[1.4]">
            {content.diffHeading}
          </h2>
          <div className="border border-line bg-paper">
            <div className="hidden border-b border-line sm:grid sm:grid-cols-[9em,1fr,1.15fr]">
              <div className="num border-r border-line bg-surface px-4 py-3 text-[12px] font-medium tracking-[.06em] text-muted" />
              <div className="num border-r border-line bg-surface px-4 py-3 text-[12px] font-medium tracking-[.06em] text-muted">
                {content.posColumn}
              </div>
              <div className="num bg-sage px-4 py-3 text-[12px] font-semibold tracking-[.06em] text-forest">
                uYao
              </div>
            </div>
            {content.diffRows.map((row, i) => (
              <div
                key={row.q}
                className={`grid sm:grid-cols-[9em,1fr,1.15fr] ${i < content.diffRows.length - 1 ? "border-b border-line" : ""}`}
              >
                <div className="bg-surface px-4 pb-1 pt-3.5 text-[13.5px] font-bold text-ink sm:border-r sm:border-line sm:py-4">
                  {row.q}
                </div>
                <div className="px-4 pb-2 pt-1 text-[14.5px] leading-[1.75] text-muted sm:border-r sm:border-line sm:py-4">
                  {row.pos}
                </div>
                <div className="bg-green-tint px-4 pb-3.5 pt-1 text-[14.5px] leading-[1.75] text-ink sm:py-4">
                  {row.uyao}
                </div>
              </div>
            ))}
          </div>
          <p className="mb-0 mt-4 max-w-[40em] text-[14px] leading-[1.8] text-muted">
            {content.diffNote}
          </p>
        </section>

        <section className="mt-10">
          <h2 className="editorial-display mb-3 mt-0 text-[24px] leading-[1.4]">
            {content.whenHeading}
          </h2>
          <p className="m-0 max-w-[38em] text-[15px] leading-[1.85] text-ink-2">{content.when}</p>
        </section>

        <p className="num mt-8 text-[13px] text-muted">
          {content.updatedLabel}
          {UPDATED}
        </p>

        <KnowledgeCta title={content.ctaTitle} body={content.ctaBody} locale={locale} />
      </article>
    </KnowledgeShell>
  );
}

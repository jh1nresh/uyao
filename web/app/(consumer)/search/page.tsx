import type { Metadata } from "next";
import Link from "next/link";

import { AreaSwitch } from "@/components/AreaSwitch";
import { DrugResults } from "@/components/DrugResults";
import { SearchConversationHistory } from "@/components/SearchConversationHistory";
import { SearchInput } from "@/components/SearchInput";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { drugSummary, exactDrugMatches, getArea, searchDrugHits, toAreaSlug } from "@/lib/data";
import { areaCopy, localizedPath, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { RESERVATION_INTAKE_QUERY_MAX } from "@/lib/reservation-intake";
import { matchSymptom } from "@/lib/symptoms";
import type { AreaSlug } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: locale === "en" ? "Search results" : "搜尋結果",
    description: locale === "en"
      ? "Search the uYao Medicine Finder partner-provided trial catalog. Live inventory is not available; confirm supply and medicine questions with a pharmacy or pharmacist."
      : "搜尋 uYao 找藥合作藥局提供的試營運品項目錄；即時庫存尚未啟用，供應狀態與用藥問題請向藥局或藥師確認。",
    robots: { index: false, follow: true },
  };
}

function searchContext(query: string, area: AreaSlug) {
  const exactMatches = exactDrugMatches(query);
  const symptom = exactMatches.length > 0 ? null : matchSymptom(query);
  const results = searchDrugHits(query)
    .map(({ drug, match }) => {
      const summary = drugSummary(drug.slug, area);
      return summary ? { ...summary, match } : null;
    })
    .filter((result): result is NonNullable<typeof result> => result !== null);
  return { symptom, results };
}

function turnSummary(context: ReturnType<typeof searchContext>, locale: Locale): string {
  if (context.symptom?.kind === "refer") {
    return locale === "en"
      ? "This description opened safety guidance instead of product results."
      : "這段描述進入安全分流，沒有直接顯示品項。";
  }
  if (context.results.length === 0) {
    return locale === "en"
      ? "No matching item was found in the current catalog."
      : "目前目錄沒有找到符合的品項。";
  }
  return locale === "en"
    ? `${context.results.length} catalog items were found for confirmation.`
    : `找到 ${context.results.length} 項可進一步確認的目錄資料。`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; area?: string }>;
}) {
  const { q: rawQ, area: rawArea } = await searchParams;
  const locale = await getRequestLocale();
  const q = (rawQ ?? "").trim().slice(0, RESERVATION_INTAKE_QUERY_MAX);
  const area = toAreaSlug(rawArea);
  const current = searchContext(q, area);
  const currentSummary = turnSummary(current, locale);
  const areaName = areaCopy(getArea(area), locale).shortName;

  return (
    <div className="medicine-cabinet-home medicine-cabinet-conversation-page relative">
      <SiteHeader showSearch={false} showTagline area={area} preserveAreaPath locatable tone="cabinet" />

      <main className="medicine-cabinet-conversation-stage min-h-[calc(100svh-5rem)]">
        <section className="shop-shell relative z-10 pb-12 pt-24 sm:pb-16 sm:pt-28" aria-live="polite">
          <div className="mb-4 md:hidden">
            <AreaSwitch area={area} preservePath locatable compact />
          </div>

          <div className="mx-auto max-w-[1040px]">
            {q && <SearchConversationHistory query={q} summary={currentSummary} locale={locale} />}

            {q ? (
              <>
                <header className="medicine-cabinet-user-message ml-auto max-w-[820px] px-5 py-4 sm:px-7 sm:py-5">
                  <p className="m-0 text-[11px] font-bold tracking-[.08em] text-oxblood">{locale === "en" ? "YOU ASKED" : "你問 uYao"}</p>
                  <h1 className="editorial-display mb-0 mt-1.5 text-pretty text-[26px] leading-[1.3] text-ink sm:text-[34px]">{q}</h1>
                </header>

                <article className="medicine-cabinet-answer-panel mt-4 border border-line-strong bg-paper px-5 py-6 sm:px-9 sm:py-9">
                  <p className="shop-kicker m-0">
                    {current.symptom?.kind === "refer"
                      ? locale === "en" ? "Safety route" : "安全分流"
                      : locale === "en" ? `Catalog · ${areaName}` : `目錄資料・${areaName}`}
                  </p>
                  <h2 className="editorial-display mb-0 mt-2 text-[28px] leading-[1.22] sm:text-[38px]">
                    {current.symptom?.kind === "refer"
                      ? locale === "en" ? "Check this before searching products" : "先確認安全，再找品項"
                      : current.results.length === 0
                        ? locale === "en" ? "Nothing matched yet" : "目前還沒有符合的品項"
                        : locale === "en" ? "Here is what the catalog can confirm" : "先從這些可確認的資料開始"}
                  </h2>
                  <p className="mb-0 mt-3 text-[14px] leading-[1.7] text-muted">
                    {locale === "en"
                      ? "This is a catalog lookup, not a diagnosis, personal medicine recommendation, or live-stock promise."
                      : "這是目錄資料查詢，不是診斷、個人用藥推薦或即時庫存保證。"}
                  </p>

                  {current.symptom?.kind === "expand" && (
                    <p className="mt-5 border-l-2 border-forest bg-surface px-4 py-3 text-[14px] leading-[1.7] text-muted">
                      {locale === "en"
                        ? <>“{current.symptom.matched}” is related to the catalog focus <b className="font-bold text-ink">{current.symptom.terms.join(", ")}</b>. These are daily-wellness catalog relationships, not treatment recommendations.</>
                        : <>「{current.symptom.matched}」可搜尋到目錄中與<b className="font-bold text-ink">{current.symptom.terms.join("、")}</b>資料相關的品項。這是日常保養品項的資料關聯，不是治療建議。</>}
                    </p>
                  )}

                  <div className="mt-6">
                    {current.symptom?.kind === "refer" ? (
                      <div className="border-2 border-green bg-green-tint px-4 py-4 sm:px-5">
                        <p className="text-[15px] font-bold text-ink">
                          {locale === "en" ? "Safety guidance before product search" : `「${current.symptom.matched}」先看安全提醒`}
                        </p>
                        <p className="mt-1.5 text-[15px] leading-[1.8] text-ink-2">
                          {locale === "en" ? current.symptom.adviceEn : current.symptom.adviceZh}
                        </p>
                        <p className="mt-2.5 text-[14px] leading-[1.7] text-muted">
                          {locale === "en"
                            ? "Products are intentionally not shown for this symptom query."
                            : "症狀查詢不直接列出商品；這是安全分流，不是目錄查無品項。"}
                        </p>
                        <Link href={`${localizedPath("/", locale)}?area=${area}#pharmacies`} className="action-primary mt-4 text-[14px]">
                          {locale === "en" ? "Find a nearby pharmacist" : "找附近藥師"}
                        </Link>
                      </div>
                    ) : (
                      <DrugResults results={current.results} query={q} area={area} />
                    )}
                  </div>

                  <div className="medicine-cabinet-follow-up mt-8 border-t border-line pt-7 sm:mt-10 sm:pt-8">
                    <p className="shop-kicker m-0">{locale === "en" ? "Continue the conversation" : "繼續對話"}</p>
                    <h2 className="editorial-display mb-0 mt-2 text-[25px] leading-[1.25] sm:text-[30px]">
                      {locale === "en" ? "What else would you like to check?" : "還想確認什麼？"}
                    </h2>
                    <p className="mb-0 mt-2 text-[13px] leading-[1.65] text-muted">
                      {locale === "en"
                        ? "Ask about another product, ingredient, symptom, or wellness need. Recent turns stay visible above."
                        : "可以再問另一個品名、成分、症狀或保養需求；最近幾輪會保留在上方。"}
                    </p>
                    <SearchInput
                      key={q}
                      size="xl"
                      presentation="cabinet"
                      area={area}
                      continueConversation
                      submitLabel={locale === "en" ? "Ask another question" : "繼續問 uYao"}
                      className="medicine-cabinet-input mt-5 w-full shadow-none"
                    />
                  </div>
                </article>
              </>
            ) : (
              <article className="medicine-cabinet-answer-panel border border-line-strong bg-paper px-5 py-7 sm:px-10 sm:py-10">
                <p className="shop-kicker m-0">{locale === "en" ? "Ask uYao" : "問 uYao"}</p>
                <h1 className="editorial-display mb-0 mt-2 text-[32px] leading-[1.18] sm:text-[44px]">
                  {locale === "en" ? "Start with what you know" : "從你知道的線索開始"}
                </h1>
                <p className="mb-0 mt-3 max-w-[680px] text-[14px] leading-[1.75] text-muted">
                  {locale === "en"
                    ? "Enter a product, ingredient, symptom, or daily-wellness need."
                    : "輸入品名、成分、症狀或日常保養需求。"}
                </p>
                <SearchInput
                  size="xl"
                  presentation="cabinet"
                  area={area}
                  submitLabel={locale === "en" ? "Ask uYao" : "問 uYao"}
                  className="medicine-cabinet-input mt-6 w-full shadow-none"
                />
              </article>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

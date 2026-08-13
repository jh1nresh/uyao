import type { Metadata } from "next";
import Link from "next/link";

import { AreaSwitch } from "@/components/AreaSwitch";
import { DrugResults } from "@/components/DrugResults";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { drugSummary, exactDrugMatches, getArea, searchDrugs, toAreaSlug } from "@/lib/data";
import { matchSymptom } from "@/lib/symptoms";
import { areaCopy, localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: locale === "en" ? "Search results" : "搜尋結果",
    description: locale === "en"
      ? "Search the uYao Medicine Finder partner-provided trial catalog. Live inventory is not available; confirm supply and medicine questions with a pharmacy or pharmacist."
      : "搜尋 uYao 找藥合作藥局提供的試營運品項目錄；即時庫存尚未啟用，供應狀態與用藥問題請向藥局或藥師確認。",
    // 搜尋結果頁不做 SEO 入口（那是 /drug/[slug] 的工作），避免內容農場化。
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; area?: string }>;
}) {
  const { q: rawQ, area: rawArea } = await searchParams;
  const locale = await getRequestLocale();
  const q = (rawQ ?? "").trim();
  const area = toAreaSlug(rawArea);
  const exactMatches = exactDrugMatches(q);
  const symptom = exactMatches.length > 0 ? null : matchSymptom(q);
  const wellnessQuery = symptom?.kind === "refer" && symptom.wellness
    ? locale === "en" ? symptom.wellness.queryEn : symptom.wellness.queryZh
    : null;
  const results = (wellnessQuery
    ? searchDrugs(wellnessQuery)
    : exactMatches.length > 0 ? exactMatches : searchDrugs(q))
    .map((d) => drugSummary(d.slug, area))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  return (
    <>
      <SiteHeader query={q} showTagline area={area} preserveAreaPath locatable />

      <main className="min-h-[calc(100svh-11rem)]">
      <section className="shop-shell py-10 sm:py-14">
        <div className="mb-3 md:hidden">
          <AreaSwitch area={area} preservePath locatable compact />
        </div>
        <p className="shop-kicker mb-3">SEARCH RESULTS</p>
        <div className="mb-7 flex flex-wrap items-end gap-3 border-b border-line pb-5">
          <h1 className="editorial-display m-0 text-[30px] leading-[1.25] sm:text-[40px]">
            {q ? (locale === "en" ? `Results for “${q}”` : `「${q}」的結果`) : (locale === "en" ? "Search medicines" : "搜尋藥品")}
          </h1>
          <p className="text-[13px] text-muted-2">
            {!q
              ? locale === "en" ? "Enter a product, ingredient, symptom, or wellness need" : "輸入品名、成分、症狀或保養需求"
              : symptom?.kind === "refer" && !wellnessQuery
                ? locale === "en" ? "Ask a pharmacist first" : "建議先問藥師"
                : `${results.length} ${locale === "en" ? "items" : "項"} · ${areaCopy(getArea(area), locale).shortName}`}
          </p>
          <div className="flex-1" />
          <p className="num text-[11px] tracking-[.04em] text-muted-2">{locale === "en" ? "SORT: FRESHNESS → DISTANCE" : "排序：庫存新鮮度 → 距離"}</p>
        </div>

        {/* 症狀類查詢要交代兩件事：為什麼是這些結果，以及我們不是在給醫療建議 */}
        {q && symptom?.kind === "expand" && (
          <p className="mb-2.5 border border-line-strong bg-surface px-3.5 py-2.5 text-[13px] leading-[1.7] text-muted">
            {locale === "en"
              ? <>“{symptom.matched}” is related to the catalog focus <b className="font-bold text-ink">{symptom.terms.join(", ")}</b>. These are related daily-wellness items, not treatment recommendations. Ask a pharmacist; seek medical care if symptoms persist, worsen, or come with a red flag.</>
              : <>「{symptom.matched}」可搜尋到目錄中與<b className="font-bold text-ink">{symptom.terms.join("、")}</b>資料相關的品項。<br />這是品項資料的關聯搜尋，不是治療或用藥推薦；症狀持續、惡化或合併發燒、胸痛、呼吸困難等警訊時，請就醫。</>}
          </p>
        )}

        {/*
          沒有 wellness 對應的 refer 不進 `DrugResults` —— 除了畫面，也是為了資料乾淨：
          `DrugResults` 在零結果時會掛 `NotifyMe kind="catalog_miss"`，
          而「燙傷」不是目錄缺這支藥，是我們刻意不列。記進去的話，
          demand 報表會反過來叫我們去補燙傷藥。
        */}
        {q && symptom?.kind === "refer" ? (
          <>
            <div className="border-2 border-green bg-green-tint px-4 py-4">
              <p className="text-[15px] font-bold text-ink">
                {wellnessQuery
                  ? locale === "en" ? `“${symptom.matched}”: review the symptom, then compare daily wellness` : `「${symptom.matched}」先留意症狀，也可比較日常保養`
                  : locale === "en" ? "Ask a pharmacist or seek medical care first" : `「${symptom.matched}」建議先問藥師或就醫`}
              </p>
              <p className="mt-1.5 text-[15px] leading-[1.8] text-ink-2">
                {locale === "en" ? symptom.adviceEn : symptom.adviceZh}
              </p>
              <p className="mt-2.5 text-[13px] leading-[1.7] text-muted">
                {wellnessQuery
                  ? locale === "en" ? "Related sourced daily-wellness information is shown below. It is not treatment for the symptom you described." : "下方直接列出有來源的日常保養資料，不代表能治療你描述的症狀。"
                  : locale === "en" ? "No OTC products are listed because self-selection may be inappropriate." : "我們沒有為這個狀況列出成藥 —— 不是查不到，是自行選藥不合適。"}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`${localizedPath("/", locale)}?area=${area}#pharmacies`}
                  className="action-primary text-[14px]"
                >
                  {locale === "en" ? "Find a nearby pharmacist" : "找附近藥師"}
                </Link>
              </div>
            </div>
            {wellnessQuery && (
              <div className="mt-5">
                <p className="shop-kicker mb-2.5">{locale === "en" ? "RELATED DAILY WELLNESS" : "相關日常保養品項"}</p>
                <DrugResults results={results} query={wellnessQuery} area={area} />
              </div>
            )}
          </>
        ) : q ? (
          <DrugResults results={results} query={q} area={area} />
        ) : (
          <div className="border border-line px-4 py-8 text-center text-[15px] text-muted">
            {locale === "en" ? "Enter a product, ingredient, symptom, or wellness need above to start searching." : "上面輸入品名、成分、症狀或保養需求開始搜尋。"}
          </div>
        )}
      </section>
      </main>

      <SiteFooter />
    </>
  );
}

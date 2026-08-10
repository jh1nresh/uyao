import type { Metadata } from "next";

import { AreaSwitch } from "@/components/AreaSwitch";
import { DrugResults } from "@/components/DrugResults";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { drugSummary, getArea, searchDrugs, toAreaSlug } from "@/lib/data";
import { matchSymptom } from "@/lib/symptoms";

export const metadata: Metadata = {
  title: "搜尋結果",
  // 搜尋結果頁不做 SEO 入口（那是 /drug/[slug] 的工作），避免內容農場化。
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; area?: string }>;
}) {
  const { q: rawQ, area: rawArea } = await searchParams;
  const q = (rawQ ?? "").trim();
  const area = toAreaSlug(rawArea);
  const symptom = matchSymptom(q);
  const results = searchDrugs(q)
    .map((d) => drugSummary(d.slug, area))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  return (
    <>
      <SiteHeader query={q} showTagline area={area} preserveAreaPath locatable />

      <section className="px-4 pb-6 pt-6 sm:px-7 xl:px-12 2xl:px-16">
        <div className="mb-3 md:hidden">
          <AreaSwitch area={area} preservePath locatable />
        </div>
        <div className="mb-2.5 flex flex-wrap items-baseline gap-2.5">
          <h1 className="text-lg font-black tracking-[-.01em]">
            {q ? `「${q}」的結果` : "搜尋藥品"}
          </h1>
          <p className="text-[13px] text-muted-2">
            {!q
              ? "輸入藥品名、主成分或症狀"
              : symptom?.kind === "refer"
                ? "建議先問藥師"
                : `${results.length} 項 · ${getArea(area).shortName}`}
          </p>
          <div className="flex-1" />
          <p className="text-[13px] text-muted-2">排序：庫存新鮮度 → 距離 → 價格</p>
        </div>

        {/* 症狀類查詢要交代兩件事：為什麼是這些結果，以及我們不是在給醫療建議 */}
        {q && symptom?.kind === "expand" && (
          <p className="mb-2.5 border border-line-strong bg-surface px-3.5 py-2.5 text-[13px] leading-[1.7] text-muted">
            「{symptom.matched}」對應到<b className="font-bold text-ink">
              {symptom.terms.join("、")}
            </b>，以下是含這些適應症的品項。
            <br />
            這是搜尋結果不是用藥建議 —— 不確定該用哪一種，到店問藥師。
          </p>
        )}

        {/*
          refer 走這條，不進 `DrugResults` —— 除了畫面，也是為了資料乾淨：
          `DrugResults` 在零結果時會掛 `NotifyMe kind="catalog_miss"`，
          而「燙傷」不是目錄缺這支藥，是我們刻意不列。記進去的話，
          demand 報表會反過來叫我們去補燙傷藥。
        */}
        {q && symptom?.kind === "refer" ? (
          <div className="border-2 border-green bg-green-tint px-4 py-4">
            <p className="text-[15px] font-bold text-ink">
              「{symptom.matched}」建議先問藥師或就醫
            </p>
            <p className="mt-1.5 text-[15px] leading-[1.8] text-ink-2">{symptom.advice}</p>
            <p className="mt-2.5 text-[13px] leading-[1.7] text-muted">
              我們沒有為這個狀況列出成藥 —— 不是查不到，是自行選藥不合適。
            </p>
          </div>
        ) : q ? (
          <DrugResults results={results} query={q} area={area} />
        ) : (
          <div className="border border-line px-4 py-8 text-center text-[15px] text-muted">
            上面輸入藥品名或症狀開始搜尋。
          </div>
        )}
      </section>

      <SiteFooter />
    </>
  );
}

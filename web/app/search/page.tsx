import type { Metadata } from "next";

import { DrugResults } from "@/components/DrugResults";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SERVICE_AREA_LABEL, drugSummary, searchDrugs } from "@/lib/data";

export const metadata: Metadata = {
  title: "搜尋結果",
  // 搜尋結果頁不做 SEO 入口（那是 /drug/[slug] 的工作），避免內容農場化。
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();
  const results = searchDrugs(q)
    .map((d) => drugSummary(d.slug))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  return (
    <>
      <SiteHeader query={q} showTagline />

      <section className="px-4 pb-6 pt-6 sm:px-7">
        <div className="mb-2.5 flex flex-wrap items-baseline gap-2.5">
          <h1 className="text-sm font-black">
            {q ? `「${q}」的結果` : "搜尋藥品"}
          </h1>
          <p className="text-[11px] text-muted-2">
            {q ? `${results.length} 項 · ${SERVICE_AREA_LABEL}` : "輸入藥品名、主成分或症狀"}
          </p>
          <div className="flex-1" />
          <p className="text-[11px] text-muted-2">排序：庫存新鮮度 → 距離 → 價格</p>
        </div>

        {q ? (
          <DrugResults results={results} query={q} />
        ) : (
          <div className="border border-line px-4 py-8 text-center text-[13px] text-muted">
            上面輸入藥品名或症狀開始搜尋。
          </div>
        )}
      </section>

      <SiteFooter />
    </>
  );
}

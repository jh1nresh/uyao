import Link from "next/link";

import { NotifyMe } from "./NotifyMe";
import { StockBadge } from "./StockBadge";
import type { DrugSummary } from "@/lib/data";
import { getArea } from "@/lib/data";
import { formatDistance } from "@/lib/format";
import { areaCopy, drugCopy, localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import type { AreaSlug } from "@/lib/types";

/** 搜尋結果 / 品類列表共用的資料密表格。 */
export async function DrugResults({
  results,
  query = "",
  area,
}: {
  results: DrugSummary[];
  /** 原始查詢字串。空結果時要送進需求捕捉，所以不能只傳結果。 */
  query?: string;
  area: AreaSlug;
}) {
  const locale = await getRequestLocale();
  if (results.length === 0) {
    return (
      <>
        <div className="border border-line bg-paper px-4 py-14 text-center text-[15px] text-muted">
          {locale === "en" ? "No matching products nearby." : "附近沒有符合的品項。"}
          <br />
          <span className="text-[13px] text-muted-2">
            {locale === "en" ? "Try an ingredient, symptom, or a different product name." : "試試主成分或症狀（如「痠痛」「止癢」），或換個品名寫法。"}
          </span>
        </div>
        {query ? <NotifyMe kind="catalog_miss" query={query} area={area} /> : null}
      </>
    );
  }

  return (
    <div className="border border-line bg-paper">
      {results.map((r) => {
        const drug = drugCopy(r.drug, locale);
        return (
        <Link
          key={r.drug.slug}
          href={`${localizedPath(`/drug/${r.drug.slug}`, locale)}?area=${area}`}
          className="history-link block border-b border-line-soft no-underline last:border-b-0 hover:bg-surface-hover"
        >
          <div className="hidden min-h-[72px] grid-cols-[1fr_260px_120px_150px] items-center gap-x-4 px-5 py-4 text-[15px] lg:grid">
            <span className="text-[17px] font-bold text-ink">
              {drug.name} {drug.spec}
            </span>
            <span className="text-xs text-muted">
              {r.nearestStore
                ? locale === "en" ? `Nearest: ${r.nearestStore.name} (${areaCopy(getArea(r.nearestStore.area), locale).shortName}) · ` : `最近：${r.nearestStore.name}（${getArea(r.nearestStore.area).shortName}）· `
                : ""}
              {r.nearestStore && (
                <span className="num">{formatDistance(r.nearestStore.distanceM)}</span>
              )}
            </span>
            <span className="text-right text-xs text-muted-2">
              {r.drug.drugClass === "待確認" ? "" : drug.drugClass}
            </span>
            <StockBadge badge={r.bestBadge} className="justify-end text-xs" />
          </div>

          <div className="flex min-h-[72px] flex-col justify-center gap-1 px-4 py-3.5 lg:hidden">
            <div className="flex items-center gap-2">
              <span className="text-[16px] font-bold text-ink">
                {drug.name} {drug.spec}
              </span>
              <div className="flex-1" />
              <span className="text-xs text-muted-2">
                {r.drug.drugClass === "待確認" ? "" : drug.drugClass}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-muted">
              {locale === "en" ? `${r.storeCount} pharmacies` : `${r.storeCount} 家藥局`}
              <div className="flex-1" />
              <StockBadge badge={r.bestBadge} short />
            </div>
          </div>
        </Link>
      );})}
    </div>
  );
}

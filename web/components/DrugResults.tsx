import Link from "next/link";

import { StockBadge } from "./StockBadge";
import type { DrugSummary } from "@/lib/data";
import { getArea } from "@/lib/data";
import { formatDistance, formatFromPrice } from "@/lib/format";

/** 搜尋結果 / 品類列表共用的資料密表格。 */
export function DrugResults({ results }: { results: DrugSummary[] }) {
  if (results.length === 0) {
    return (
      <div className="border border-line px-4 py-8 text-center text-[13px] text-muted">
        附近沒有符合的品項。
        <br />
        <span className="text-[11.5px] text-muted-2">
          試試主成分或症狀（如「痠痛」「止癢」），或換個品名寫法。
        </span>
      </div>
    );
  }

  return (
    <div className="border border-line">
      {results.map((r) => (
        <Link
          key={r.drug.slug}
          href={`/drug/${r.drug.slug}`}
          className="block border-b border-line-soft no-underline last:border-b-0 hover:bg-surface-hover"
        >
          <div className="hidden grid-cols-[1fr_220px_120px_150px] items-center gap-x-3 px-3.5 py-2.5 text-[13px] lg:grid">
            <span className="font-medium text-ink">
              {r.drug.name} {r.drug.spec}
            </span>
            <span className="text-xs text-muted">
              {r.nearestStore
                ? `最近：${r.nearestStore.name}（${getArea(r.nearestStore.area).shortName}）· `
                : ""}
              {r.nearestStore && (
                <span className="num">{formatDistance(r.nearestStore.distanceM)}</span>
              )}
            </span>
            <span className="num text-right text-xs text-ink-2">
              {r.fromPriceTwd === null ? "—" : formatFromPrice(r.fromPriceTwd)}
            </span>
            <StockBadge badge={r.bestBadge} className="justify-end text-xs" />
          </div>

          <div className="flex flex-col gap-0.5 px-4 py-2.5 lg:hidden">
            <div className="flex items-center gap-2">
              <span className="text-[13.5px] font-medium text-ink">
                {r.drug.name} {r.drug.spec}
              </span>
              <div className="flex-1" />
              <span className="num text-xs font-semibold text-ink">
                {r.fromPriceTwd === null ? "—" : formatFromPrice(r.fromPriceTwd)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11.5px] text-muted">
              {r.storeCount} 家藥局
              <div className="flex-1" />
              <StockBadge badge={r.bestBadge} short />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

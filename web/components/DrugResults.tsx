import Link from "next/link";

import { NotifyMe } from "./NotifyMe";
import { StockBadge } from "./StockBadge";
import type { DrugSearchMatch, DrugSummary } from "@/lib/data";
import { getArea } from "@/lib/data";
import { formatDistance } from "@/lib/format";
import { areaCopy, drugCopy, localizedPath } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { partnersForProduct } from "@/lib/partners";
import type { AreaSlug } from "@/lib/types";

export interface DrugResultRow extends DrugSummary {
  match?: DrugSearchMatch;
}

function matchReason(match: DrugSearchMatch, locale: Locale): string {
  const labels = locale === "en"
    ? {
        name: "product name",
        alias: "alternate name",
        ingredient: "ingredient",
        nutritionFocus: "nutrition focus",
        searchTerm: "catalog term",
        details: "product detail",
      }
    : {
        name: "品名",
        alias: "別名",
        ingredient: "成分",
        nutritionFocus: "營養補充方向",
        searchTerm: "目錄詞",
        details: "品項資料",
      };

  return locale === "en"
    ? `Why shown: matched ${labels[match.kind]} “${match.value}”`
    : `為什麼顯示：比對到${labels[match.kind]}「${match.value}」`;
}

function sourceSummary(result: DrugSummary, locale: Locale): string {
  const productLabel = result.drug.spec === "規格待確認"
    ? result.drug.name
    : `${result.drug.name} ${result.drug.spec}`;
  const providerNames = partnersForProduct(productLabel).map((partner) => partner.storeSlug);

  if (providerNames.length > 0) {
    const names = providerNames.join(locale === "en" ? ", " : "、");
    if (result.drug.source?.kind === "partner") {
      return locale === "en"
        ? `Item details provided by ${names} (not live inventory)`
        : `品項資料：由${names}提供（非即時庫存）`;
    }
    if (result.drug.source) {
      return locale === "en"
        ? `Listed from name and package data provided by ${names}; public product source available`
        : `收錄依據：${names}提供品名／規格；產品資料另有公開來源`;
    }
    return locale === "en"
      ? `Listed from name and package data provided by ${names}; product details pending verification`
      : `收錄依據：${names}提供品名／規格；產品資料待驗證`;
  }
  if (result.drug.source?.kind === "partner") {
    return locale === "en"
      ? "Item data provided by a partner pharmacy (not live inventory)"
      : "品項資料：合作藥局提供（非即時庫存）";
  }
  if (result.drug.source) {
    return locale === "en" ? "Item data: public product source" : `品項資料：${result.drug.source.label}`;
  }
  return locale === "en" ? "Item data source pending verification" : "品項資料來源待驗證";
}

/** 搜尋結果 / 品類列表共用的資料密表格。 */
export async function DrugResults({
  results,
  query = "",
  area,
}: {
  results: DrugResultRow[];
  /** 原始查詢字串。空結果時要送進需求捕捉，所以不能只傳結果。 */
  query?: string;
  area: AreaSlug;
}) {
  const locale = await getRequestLocale();
  if (results.length === 0) {
    return (
      <>
        <div className="border border-line bg-paper px-4 py-14 text-center text-[15px] text-muted">
          {locale === "en" ? "No matching items in the current catalog." : "目前目錄沒有符合的品項。"}
          <br />
          <span className="text-[13px] text-muted-2">
            {locale === "en" ? "Try a product name, ingredient, or daily-wellness need. Recognized common symptoms open safety guidance first." : "試試品名、主要成分或日常保養方向；辨識到的常見症狀會先顯示安全提醒。"}
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
        const reason = r.match ? matchReason(r.match, locale) : drug.nutritionFocus;
        const source = sourceSummary(r, locale);
        return (
        <Link
          key={r.drug.slug}
          href={`${localizedPath(`/drug/${r.drug.slug}`, locale)}?area=${area}`}
          className="history-link block border-b border-line-soft no-underline last:border-b-0 hover:bg-surface-hover"
        >
          <div className="hidden min-h-[84px] grid-cols-[1fr_280px_135px_160px] items-center gap-x-4 px-5 py-4 text-[15px] lg:grid">
            <span>
              <span className="block text-[17px] font-bold text-ink">
                {drug.name} {drug.spec}
              </span>
              <span className="mt-1 block text-[12px] leading-[1.5] text-muted">
                {reason}
              </span>
            </span>
            <span className="text-xs leading-[1.55] text-muted">
              <span className="block">{source}</span>
              {r.nearestStore && (
                <span className="mt-1 block text-muted-2">
                  {locale === "en" ? `Nearest scan record: ${r.nearestStore.name} (${areaCopy(getArea(r.nearestStore.area), locale).shortName}) · ` : `最近掃描資料：${r.nearestStore.name}（${getArea(r.nearestStore.area).shortName}）· `}
                  <span className="num">{formatDistance(r.nearestStore.distanceM)}</span>
                </span>
              )}
            </span>
            <span className="text-right text-xs text-muted-2">
              {drug.drugClass}
            </span>
            <span className="text-right">
              <span className="mb-1 block text-[11px] text-muted-2">
                {locale === "en" ? "SUPPLY SIGNAL" : "供應訊號"}
              </span>
              <StockBadge badge={r.bestBadge} className="justify-end text-xs" />
            </span>
          </div>

          <div className="flex min-h-[84px] flex-col justify-center gap-1.5 px-4 py-3.5 lg:hidden">
            <div>
              <span className="text-[16px] font-bold leading-[1.45] text-ink">
                {drug.name} {drug.spec}
              </span>
            </div>
            <span className="w-fit border border-line-strong px-1.5 py-0.5 text-[11px] text-muted-2">
              {locale === "en" ? `Classification: ${drug.drugClass}` : `分類：${drug.drugClass}`}
            </span>
            <span className="text-[12px] leading-[1.55] text-muted">{reason}</span>
            <span className="text-[12px] leading-[1.55] text-muted-2">{source}</span>
            <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted-2">
              <span>{locale === "en" ? "Supply signal:" : "供應訊號："}</span>
              <StockBadge badge={r.bestBadge} short />
            </div>
          </div>
        </Link>
      );})}
    </div>
  );
}

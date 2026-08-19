import { NotifyMe } from "./NotifyMe";
import { SearchResultLink } from "./SearchResultLink";
import { StockBadge } from "./StockBadge";
import type { DrugSearchMatch, DrugSummary } from "@/lib/data";
import { drugCopy, localizedPath } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { partnersForProduct } from "@/lib/partners";
import { known } from "@/lib/pending";
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
        ? `Source: item data provided by ${names}`
        : `資料來源：${names}提供的品項資料`;
    }
    if (result.drug.source) {
      return locale === "en"
        ? "Source: partner-provided name and package data, with a public product source"
        : "資料來源：合作藥局品名／規格＋公開產品資料";
    }
    return locale === "en"
      ? "Source: partner-provided name and package data; details pending verification"
      : "資料來源：合作藥局品名／規格；詳細資料待驗證";
  }
  if (result.drug.source?.kind === "partner") {
    return locale === "en"
      ? "Source: partner pharmacy item data"
      : "資料來源：合作藥局品項資料";
  }
  if (result.drug.source) {
    return locale === "en" ? "Source: public product data" : "資料來源：公開產品資料";
  }
  return locale === "en" ? "Item data source pending verification" : "品項資料來源待驗證";
}

/** 搜尋結果共用的可解釋品項卡片。 */
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
        <div className="bg-surface px-5 py-12 text-center text-[15px] text-muted">
          {locale === "en" ? "No matching items in the current catalog." : "目前目錄沒有符合的品項。"}
          <br />
          <span className="text-[14px] text-muted-2">
            {locale === "en" ? "Try a product name, ingredient, or daily-wellness need. Recognized common symptoms open safety guidance first." : "試試品名、主要成分或日常保養方向；辨識到的常見症狀會先顯示安全提醒。"}
          </span>
        </div>
        {query ? <NotifyMe kind="catalog_miss" query={query} area={area} /> : null}
      </>
    );
  }

  return (
    <div className="grid max-w-[960px] gap-3">
      {results.map((r) => {
        const drug = drugCopy(r.drug, locale);
        // 規格未知就只印品名 —— 搜尋結果原本直接把「規格待確認」接在品名後面。
        const title = [drug.name, known(drug.spec)].filter(Boolean).join(" ");
        const reason = r.match ? matchReason(r.match, locale) : known(drug.nutritionFocus);
        const source = sourceSummary(r, locale);
        return (
          <SearchResultLink
            key={r.drug.slug}
            href={`${localizedPath(`/drug/${r.drug.slug}`, locale)}?area=${area}`}
            drugSlug={r.drug.slug}
            query={query}
            className="history-link group block bg-paper px-5 py-5 no-underline transition-[background-color,transform] hover:-translate-y-px hover:bg-surface-hover sm:px-6"
          >
            <span className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <span className="min-w-0">
                <span className="block text-[18px] font-bold leading-[1.45] text-ink sm:text-[19px]">
                  {title}
                </span>
                <span className="mt-1.5 block text-[14px] leading-[1.65] text-muted">
                  {reason}
                </span>
              </span>
              <span className="flex items-center gap-2 sm:flex-col sm:items-end">
                <span className="text-[14px] text-muted-2">
                  {locale === "en" ? "SUPPLY SIGNAL" : "供應訊號"}
                </span>
                <StockBadge badge={r.bestBadge} className="text-[14px] sm:justify-end" />
              </span>
            </span>
            <span className="mt-4 flex items-center justify-between gap-4 text-[14px] leading-[1.55] text-muted-2">
              <span>{source}</span>
              <span className="flex-none text-forest transition-transform group-hover:translate-x-1" aria-hidden>
                →
              </span>
            </span>
          </SearchResultLink>
        );
      })}
    </div>
  );
}

import Link from "next/link";

import { drugCopy, localizedPath, type Locale } from "@/lib/i18n";
import type { AreaSlug, Drug } from "@/lib/types";

/**
 * 卡片上的資料出處。沒有出處就回 null —— 呼叫端整段不顯示。
 *
 * 不要回「資料待確認」：那是把一個空欄位講成一則待辦，對讀的人沒有意義，
 * 又像是在替品項掛一個問號。有出處才講出處，沒有就別佔位。
 */
export function catalogSourceStatus(drug: Drug, locale: Locale): string | null {
  if (drug.source?.kind === "partner") {
    return locale === "en" ? "Partner pharmacy data" : "合作藥局提供";
  }
  if (drug.source) {
    return locale === "en" ? "Public source checked" : "公開資料已核對";
  }
  return null;
}

export function CatalogItemGrid({
  drugs,
  area,
  locale,
  featured = false,
}: {
  drugs: Drug[];
  area: AreaSlug;
  locale: Locale;
  featured?: boolean;
}) {
  if (drugs.length === 0) {
    return (
      <div className="border border-line bg-paper px-5 py-14 text-center">
        <p className="m-0 text-[16px] font-bold text-ink">
          {locale === "en" ? "No matching catalog items" : "目前沒有符合的品項"}
        </p>
        <p className="mx-auto mb-0 mt-2 max-w-[460px] text-[14px] leading-[1.7] text-muted">
          {locale === "en"
            ? "Try a product name, ingredient, manufacturer, or a different category."
            : "可改用品名、成分、廠商名稱搜尋，或切換其他分類。"}
        </p>
      </div>
    );
  }

  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${featured ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {drugs.map((item) => {
        const drug = drugCopy(item, locale);
        return (
          <Link
            key={item.slug}
            href={`${localizedPath(`/drug/${item.slug}`, locale)}?area=${area}`}
            className="history-link group flex min-h-[136px] min-w-0 flex-col justify-between bg-paper px-5 py-5 no-underline transition-[background-color,transform] hover:-translate-y-px hover:bg-surface-hover"
          >
            <span>
              <span className="block text-[16px] font-bold leading-[1.45] text-ink sm:text-[17px]">
                {drug.name}
              </span>
              <span className="mt-2 block text-[14px] leading-[1.55] text-muted">
                {locale === "en" ? item.nutritionFocusEn : item.nutritionFocus}
              </span>
            </span>
            <span className="mt-4 flex items-center justify-between gap-3 text-[14px] leading-[1.5] text-muted-2">
              <span className="text-forest">{catalogSourceStatus(item, locale) ?? ""}</span>
              <span className="text-[15px] text-forest transition-transform group-hover:translate-x-1" aria-hidden>
                →
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

import Link from "next/link";

import { drugCopy, localizedPath, type Locale } from "@/lib/i18n";
import type { AreaSlug, Drug } from "@/lib/types";

export function catalogSourceStatus(drug: Drug, locale: Locale): string {
  if (drug.source?.kind === "partner") {
    return locale === "en" ? "Partner pharmacy data" : "合作藥局提供";
  }
  if (drug.source) {
    return locale === "en" ? "Public source checked" : "公開資料已核對";
  }
  return locale === "en" ? "Source pending" : "資料待確認";
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
        <p className="mx-auto mb-0 mt-2 max-w-[460px] text-[13px] leading-[1.7] text-muted">
          {locale === "en"
            ? "Try a product name, ingredient, manufacturer, or a different category."
            : "可改用品名、成分、廠商名稱搜尋，或切換其他分類。"}
        </p>
      </div>
    );
  }

  return (
    <div className={`grid border-l border-t border-line bg-paper sm:grid-cols-2 ${featured ? "lg:grid-cols-4" : ""}`}>
      {drugs.map((item, index) => {
        const drug = drugCopy(item, locale);
        return (
          <Link
            key={item.slug}
            href={`${localizedPath(`/drug/${item.slug}`, locale)}?area=${area}`}
            className={`history-link group min-h-[132px] min-w-0 flex-col justify-between border-b border-r border-line px-4 py-4 no-underline transition-colors hover:bg-surface-hover sm:px-5 ${featured && index >= 6 ? "hidden sm:flex" : "flex"}`}
          >
            <span>
              <span className="block text-[16px] font-bold leading-[1.45] text-ink sm:text-[17px]">
                {drug.name}
              </span>
              <span className="mt-2 block truncate text-[12.5px] text-muted">
                {locale === "en" ? item.nutritionFocusEn : item.nutritionFocus}
              </span>
            </span>
            <span className="mt-4 flex items-end justify-between gap-3 text-[11.5px] leading-[1.45] text-muted-2">
              <span>
                <span className="block text-forest">{catalogSourceStatus(item, locale)}</span>
                <span className="mt-0.5 block">{drug.spec}</span>
              </span>
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

"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { CatalogImagePlaceholder } from "./CatalogImagePlaceholder";
import {
  CATALOG_GROUPS,
  filterCatalogDrugs,
  type CatalogGroupSlug,
} from "@/lib/catalog-groups";
import { drugCopy, localizedPath, type Locale } from "@/lib/i18n";
import type { AreaSlug, Drug } from "@/lib/types";

/**
 * 首頁目錄：搜尋 + 分類 pill + 品項卡網格。
 *
 * 取代木櫃輪播。卡片連到既有品項頁，沒有價格、購物車或即時庫存。
 * 「經過研究」只掛在已有公開／合作藥局來源的品項上，沒有來源就不標。
 */
export function CatalogBrowse({
  drugs,
  area,
  locale,
  eyebrow,
  title,
}: {
  drugs: Drug[];
  area: AreaSlug;
  locale: Locale;
  eyebrow?: string;
  title?: string;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<CatalogGroupSlug>("all");

  const results = useMemo(
    () => filterCatalogDrugs(drugs, { query, group }),
    [drugs, query, group],
  );

  return (
    <div className="catalog-browse">
      {eyebrow && <p className="shop-kicker mb-2 text-center">{eyebrow}</p>}
      {title && (
        <h2 className="editorial-display m-0 text-center text-[28px] leading-[1.2] text-ink sm:text-[38px]">
          {title}
        </h2>
      )}

      <form
        role="search"
        className="mx-auto mt-6 max-w-[640px]"
        onSubmit={(event) => event.preventDefault()}
      >
        <label htmlFor="catalog-browse-query" className="sr-only">
          {locale === "en" ? "Search catalog items" : "搜尋目錄品項"}
        </label>
        <input
          id="catalog-browse-query"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            locale === "en"
              ? "Name, ingredient, or wellness need"
              : "品名、成分或保養方向"
          }
          className="min-h-12 w-full border border-line-strong bg-paper px-4 text-[16px] text-ink outline-none placeholder:text-muted focus:border-forest"
        />
      </form>

      <nav
        aria-label={locale === "en" ? "Catalog categories" : "品項分類"}
        className="mt-5 flex flex-wrap justify-center gap-2"
      >
        {CATALOG_GROUPS.map((item) => {
          const active = item.slug === group;
          return (
            <button
              key={item.slug}
              type="button"
              aria-pressed={active}
              onClick={() => setGroup(item.slug)}
              className={`inline-flex min-h-11 items-center border px-3.5 text-[14px] font-semibold transition-colors ${
                active
                  ? "border-forest bg-brand-surface text-on-dark"
                  : "border-line-strong bg-paper text-forest hover:border-forest hover:bg-surface-hover"
              }`}
            >
              {locale === "en" ? item.nameEn : item.name}
            </button>
          );
        })}
      </nav>

      {results.length === 0 ? (
        <div className="mt-8 border border-line bg-paper px-5 py-14 text-center">
          <p className="m-0 text-[16px] font-bold text-ink">
            {locale === "en" ? "No matching catalog items" : "目前沒有符合的品項"}
          </p>
          <p className="mx-auto mb-0 mt-2 max-w-[460px] text-[14px] leading-[1.7] text-muted">
            {locale === "en"
              ? "Try a product name, ingredient, or a different category."
              : "可改用品名、成分或保養方向搜尋，或切換其他分類。"}
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((item) => {
            const copy = drugCopy(item, locale);
            return (
              <li key={item.slug} className="min-w-0">
                <Link
                  href={`${localizedPath(`/drug/${item.slug}`, locale)}?area=${area}`}
                  className="history-link group flex h-full flex-col border border-line bg-paper no-underline transition-[border-color,transform] hover:-translate-y-0.5 hover:border-line-strong"
                >
                  <span className="relative block aspect-[4/3] w-full overflow-hidden border-b border-line bg-surface">
                    {item.source && (
                      <span className="absolute left-3 top-3 z-[1] inline-flex items-center gap-1.5 bg-paper/95 px-2 py-1 text-[11px] font-semibold text-forest">
                        <span
                          aria-hidden
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-green text-[10px] leading-none text-paper"
                        >
                          ✓
                        </span>
                        {locale === "en" ? "Researched" : "經過研究"}
                      </span>
                    )}
                    {item.image ? (
                      <Image
                        src={item.image.src}
                        alt={locale === "en" ? item.image.altEn : item.image.alt}
                        fill
                        sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
                        className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.025]"
                      />
                    ) : (
                      <CatalogImagePlaceholder locale={locale} />
                    )}
                  </span>
                  <span className="flex flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5">
                    <span className="block min-h-[2.9em] line-clamp-2 text-[15px] font-bold leading-[1.45] text-ink sm:text-[17px]">
                      {copy.name}
                    </span>
                    <span className="mt-2 block min-h-[3.1em] line-clamp-2 text-[12.5px] leading-[1.55] text-muted sm:text-[13.5px]">
                      {copy.nutritionFocus}
                    </span>
                    <span className="mt-4 text-[13.5px] font-semibold text-forest transition-transform duration-200 group-hover:translate-x-0.5">
                      {locale === "en" ? "View item →" : "前往查看 →"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

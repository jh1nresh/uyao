import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AreaSwitch } from "@/components/AreaSwitch";
import { CatalogItemGrid } from "@/components/CatalogItemGrid";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  CATALOG_GROUPS,
  filterCatalogDrugs,
  isCatalogGroupSlug,
} from "@/lib/catalog-groups";
import {
  CATEGORIES,
  allDrugs,
  getArea,
  getCategory,
  toAreaSlug,
} from "@/lib/data";
import { areaCopy, categoryName, localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const category = getCategory(slug);
  if (!category) {
    return {
      title: locale === "en" ? "Category not found" : "找不到這個品類",
      robots: { index: false, follow: false },
    };
  }
  const name = categoryName(category.slug, category.name, locale);
  return {
    title: locale === "en" ? `${name} | Early-access catalog` : `${name}｜試營運品項瀏覽`,
    description: locale === "en"
      ? `Browse ${name.toLowerCase()} in the uYao Medicine Finder prototype catalog. Live inventory is not available; confirm products and supply with a pharmacist.`
      : `瀏覽 uYao 找藥試營運目錄中的${name}。即時庫存尚未啟用，品項與供應狀態請向藥局或藥師確認。`,
    // v1 category pages 目前只有品項連結，未通過獨特 editorial value gate。
    robots: { index: false, follow: true },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ area?: string; group?: string; q?: string }>;
}) {
  const { slug } = await params;
  const { area: rawArea, group: rawGroup, q: rawQuery } = await searchParams;
  const locale = await getRequestLocale();
  const area = toAreaSlug(rawArea);
  const group = isCatalogGroupSlug(rawGroup) ? rawGroup : "all";
  const query = rawQuery?.trim() ?? "";
  const category = getCategory(slug);
  if (!category) notFound();
  const displayCategory = categoryName(category.slug, category.name, locale);
  const allCatalogDrugs = allDrugs();
  const results = filterCatalogDrugs(allCatalogDrugs, { query, group });

  function groupHref(nextGroup: string): string {
    const queryParams = new URLSearchParams({ area, group: nextGroup });
    if (query) queryParams.set("q", query);
    return `${localizedPath("/category/partner-item", locale)}?${queryParams.toString()}`;
  }

  return (
    <>
      <SiteHeader showTagline area={area} preserveAreaPath locatable />

      <main className="min-h-[calc(100svh-11rem)]">
        <section className="shop-shell py-10 sm:py-14">
          <div className="mb-3 md:hidden">
            <AreaSwitch area={area} preservePath locatable compact />
          </div>
          <div className="max-w-[760px]">
            <h1 className="editorial-display m-0 text-[34px] leading-[1.2] sm:text-[46px]">
              {displayCategory}
            </h1>
            <p className="mb-0 mt-3 text-[14px] leading-[1.75] text-muted">
              {locale === "en"
                ? "Search and filter partner-provided catalog records. This is not live inventory or a medical recommendation."
                : "搜尋與分類瀏覽合作藥局提供的品項資料；這不是即時庫存，也不是依症狀推薦。"}
            </p>
          </div>

          <form action={localizedPath("/category/partner-item", locale)} className="mt-8 border-y border-line py-5">
            <input type="hidden" name="area" value={area} />
            <input type="hidden" name="group" value={group} />
            <label htmlFor="catalog-query" className="block text-[13px] font-bold text-ink">
              {locale === "en" ? "Search catalog items" : "搜尋目錄品項"}
            </label>
            <p id="catalog-query-help" className="mb-3 mt-1 text-[12px] leading-[1.6] text-muted">
              {locale === "en" ? "Use a product name, ingredient, manufacturer, or product detail." : "可輸入品名、成分、廠商或產品資料。"}
            </p>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input
                id="catalog-query"
                name="q"
                type="search"
                defaultValue={query}
                aria-describedby="catalog-query-help"
                className="min-h-12 w-full border border-line-strong bg-paper px-4 text-[16px] text-ink outline-none transition-colors placeholder:text-muted focus:border-forest"
                placeholder={locale === "en" ? "e.g. fish oil, calcium, manufacturer" : "例如：魚油、鈣、中美醫藥"}
              />
              <button type="submit" className="action-primary min-h-12 px-7">
                {locale === "en" ? "Search" : "搜尋"}
              </button>
            </div>
          </form>

          <nav aria-label={locale === "en" ? "Catalog categories" : "品項分類"} className="mt-6 flex flex-wrap gap-2">
            {CATALOG_GROUPS.map((item) => {
              const active = item.slug === group;
              return (
                <Link
                  key={item.slug}
                  href={groupHref(item.slug)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center border px-3.5 text-[12.5px] font-semibold no-underline transition-colors ${
                    active
                      ? "border-forest bg-forest text-paper"
                      : "border-line-strong bg-paper text-forest hover:border-forest hover:bg-surface-hover"
                  }`}
                >
                  {locale === "en" ? item.nameEn : item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mb-4 mt-7 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-3">
            <p className="m-0 text-[13px] font-bold text-ink">
              {locale === "en" ? `${results.length} results` : `${results.length} 項結果`}
            </p>
            <p className="m-0 text-[12px] text-muted-2">
              {locale === "en"
                ? `${allCatalogDrugs.length} total · ${areaCopy(getArea(area), locale).shortName}`
                : `全部 ${allCatalogDrugs.length} 項 · ${getArea(area).shortName}`}
            </p>
          </div>

          <CatalogItemGrid drugs={results} area={area} locale={locale} />
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

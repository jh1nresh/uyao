import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AreaSwitch } from "@/components/AreaSwitch";
import { CatalogCarousel } from "@/components/CatalogCarousel";
import { CatalogItemGrid } from "@/components/CatalogItemGrid";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  CATALOG_GROUPS,
  filterCatalogDrugs,
  isCatalogGroupSlug,
  paginateCatalogDrugs,
} from "@/lib/catalog-groups";
import {
  CATEGORIES,
  allDrugs,
  getArea,
  getCategory,
  toAreaSlug,
} from "@/lib/data";
import { JsonLd } from "@/components/JsonLd";
import { areaCopy, categoryName, drugCopy, localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { consumerBreadcrumbJsonLd, consumerItemListJsonLd } from "@/lib/seo";
import { SHOP_URL } from "@/lib/shop";
import { consumerIndexablePageRobots } from "@/lib/seo-server";
import { indexableCatalogItems } from "@/lib/shop-index";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ area?: string; group?: string; q?: string; page?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const filters = await searchParams;
  const locale = await getRequestLocale();
  const category = getCategory(slug);
  if (!category) {
    return {
      title: locale === "en" ? "Category not found" : "找不到這個品類",
      robots: { index: false, follow: false },
    };
  }
  const name = categoryName(category.slug, category.name, locale);
  // metadataBase 是公司站，consumer canonical 必須是絕對網址。
  const canonicalUrl = `${SHOP_URL}${localizedPath(`/category/${category.slug}`, locale)}`;
  // 只有沒有任何篩選的乾淨網址進索引。q／group／page 都是同一批品項的
  // facet，收錄它們等於自己製造重複內容，但仍 follow 讓品項頁被爬到。
  const filtered = Boolean(
    filters.q?.trim()
    || (filters.group && filters.group !== "all")
    || (filters.page && filters.page !== "1"),
  );

  return {
    title: locale === "en" ? `${name} | Early-access catalog` : `${name}｜試營運品項瀏覽`,
    description: locale === "en"
      ? `Browse ${name.toLowerCase()} in the uYao Medicine Finder prototype catalog. Live inventory is not available; confirm products and supply with a pharmacist.`
      : `瀏覽 uYao 找藥試營運目錄中的${name}。即時庫存尚未啟用，品項與供應狀態請向藥局或藥師確認。`,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "zh-TW": `${SHOP_URL}/zh-tw/category/${category.slug}`,
        en: `${SHOP_URL}/en/category/${category.slug}`,
        "x-default": `${SHOP_URL}/zh-tw/category/${category.slug}`,
      },
    },
    robots: filtered
      ? { index: false, follow: true }
      : await consumerIndexablePageRobots(),
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ area?: string; group?: string; q?: string; page?: string }>;
}) {
  const { slug } = await params;
  const { area: rawArea, group: rawGroup, q: rawQuery, page: rawPage } = await searchParams;
  const locale = await getRequestLocale();
  const area = toAreaSlug(rawArea);
  const group = isCatalogGroupSlug(rawGroup) ? rawGroup : "all";
  const query = rawQuery?.trim() ?? "";
  const category = getCategory(slug);
  if (!category) notFound();
  const displayCategory = categoryName(category.slug, category.name, locale);
  const allCatalogDrugs = allDrugs();
  const results = filterCatalogDrugs(allCatalogDrugs, { query, group });
  const catalogPage = paginateCatalogDrugs(results, rawPage);

  // 沒有搜尋也沒選分類時，用「每個分類一條橫向列」瀏覽整個目錄。
  // 一旦有查詢或指定分類，就回到網格 —— 篩選結果要一次看完，
  // 橫向列會把結果藏在畫面外，而且分頁的 SEO 連結也還需要網格。
  const browsingAll = query === "" && group === "all";
  const groupRails = browsingAll
    ? CATALOG_GROUPS.filter((item) => item.slug !== "all")
        .map((item) => ({
          group: item,
          // 每條列都讓有圖的排前面，跟首頁一致 —— 一列的開頭要是商品不是文字卡。
          drugs: filterCatalogDrugs(allCatalogDrugs, { group: item.slug }).sort(
            (a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)),
          ),
        }))
        .filter((row) => row.drugs.length > 0)
    : [];

  function groupHref(nextGroup: string): string {
    const queryParams = new URLSearchParams({ area, group: nextGroup });
    if (query) queryParams.set("q", query);
    return `${localizedPath("/category/partner-item", locale)}?${queryParams.toString()}`;
  }

  function pageHref(nextPage: number): string {
    const queryParams = new URLSearchParams({ area, group, page: String(nextPage) });
    if (query) queryParams.set("q", query);
    return `${localizedPath("/category/partner-item", locale)}?${queryParams.toString()}`;
  }

  const canonicalPath = localizedPath(`/category/${category.slug}`, locale);

  return (
    <>
      {/*
        ItemList 只列通過 admission gate 的品項 —— schema 不該宣告一堆
        資料待驗證、且本身 noindex 的 placeholder 頁。
      */}
      <JsonLd
        nodes={[
          consumerItemListJsonLd({
            name: displayCategory,
            description: locale === "en"
              ? "Catalog records provided by partner pharmacies. Not live inventory."
              : "合作藥局提供的目錄品項紀錄；這不是即時庫存。",
            path: canonicalPath,
            inLanguage: locale === "en" ? "en" : "zh-Hant-TW",
            items: indexableCatalogItems(locale).map((drug) => ({
              name: drugCopy(drug, locale).name,
              path: localizedPath(`/drug/${drug.slug}`, locale),
            })),
          }),
          consumerBreadcrumbJsonLd([
            { name: locale === "en" ? "Home" : "首頁", path: localizedPath("/", locale) },
            { name: displayCategory, path: canonicalPath },
          ]),
        ]}
      />

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
            <label htmlFor="catalog-query" className="block text-[14px] font-bold text-ink">
              {locale === "en" ? "Search catalog items" : "搜尋目錄品項"}
            </label>
            <p id="catalog-query-help" className="mb-3 mt-1 text-[14px] leading-[1.6] text-muted">
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
                  className={`inline-flex min-h-11 items-center border px-3.5 text-[14px] font-semibold no-underline transition-colors ${
                    active
                      ? "border-forest bg-brand-surface text-on-dark"
                      : "border-line-strong bg-paper text-forest hover:border-forest hover:bg-surface-hover"
                  }`}
                >
                  {locale === "en" ? item.nameEn : item.name}
                </Link>
              );
            })}
          </nav>

          {browsingAll ? (
            <div className="mt-10 flex flex-col gap-12">
              {groupRails.map((row) => (
                <section key={row.group.slug} aria-labelledby={`rail-${row.group.slug}`}>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 id={`rail-${row.group.slug}`} className="editorial-display m-0 text-[24px] leading-[1.3] sm:text-[28px]">
                      {locale === "en" ? row.group.nameEn : row.group.name}
                    </h2>
                    <Link
                      href={groupHref(row.group.slug)}
                      className="inline-flex min-h-11 items-center border-b border-forest text-[14px] font-bold text-forest no-underline hover:border-green hover:text-green"
                    >
                      {locale === "en"
                        ? `All ${row.drugs.length} →`
                        : `全部 ${row.drugs.length} 項 →`}
                    </Link>
                  </div>
                  <CatalogCarousel
                    drugs={row.drugs}
                    area={area}
                    locale={locale}
                    label={locale === "en" ? row.group.nameEn : row.group.name}
                  />
                </section>
              ))}
            </div>
          ) : (
            <>
              <div className="mb-4 mt-8 flex flex-wrap items-end justify-between gap-2">
                <p className="m-0 text-[14px] font-bold text-ink">
                  {locale === "en" ? `${results.length} results` : `${results.length} 項結果`}
                </p>
                <p className="m-0 text-[14px] text-muted-2">
                  {locale === "en"
                    ? `Page ${catalogPage.page} of ${catalogPage.pageCount} · ${areaCopy(getArea(area), locale).shortName}`
                    : `第 ${catalogPage.page}／${catalogPage.pageCount} 頁 · ${getArea(area).shortName}`}
                </p>
              </div>

              <CatalogItemGrid drugs={catalogPage.drugs} area={area} locale={locale} />
            </>
          )}

          {!browsingAll && catalogPage.pageCount > 1 && (
            <nav
              aria-label={locale === "en" ? "Catalog pages" : "目錄分頁"}
              className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4"
            >
              {catalogPage.page > 1 ? (
                <Link href={pageHref(catalogPage.page - 1)} className="action-secondary justify-self-start text-[14px]">
                  {locale === "en" ? "Previous" : "上一頁"}
                </Link>
              ) : <span aria-hidden />}
              <span className="text-[14px] text-muted">
                {locale === "en"
                  ? `${catalogPage.page} / ${catalogPage.pageCount}`
                  : `${catalogPage.page}／${catalogPage.pageCount}`}
              </span>
              {catalogPage.page < catalogPage.pageCount ? (
                <Link href={pageHref(catalogPage.page + 1)} className="action-primary justify-self-end text-[14px]">
                  {locale === "en" ? "Next" : "下一頁"}
                </Link>
              ) : <span aria-hidden />}
            </nav>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

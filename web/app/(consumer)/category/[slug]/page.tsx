import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AreaSwitch } from "@/components/AreaSwitch";
import { DrugResults } from "@/components/DrugResults";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  CATEGORIES,
  drugSummary,
  drugsInCategory,
  getArea,
  getCategory,
  toAreaSlug,
} from "@/lib/data";
import type { CategorySlug } from "@/lib/types";
import { areaCopy, categoryName } from "@/lib/i18n";
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
    title: locale === "en" ? `${name} — early-access catalog` : `${name}｜試營運品項瀏覽`,
    description: locale === "en"
      ? `Browse ${name.toLowerCase()} in the shop-uYao prototype catalog. Live inventory is not available; confirm products and supply with a pharmacist.`
      : `瀏覽 shop-uYao 試營運目錄中的${name}。即時庫存尚未啟用，品項與供應狀態請向藥局或藥師確認。`,
    // v1 category pages 目前只有品項連結，未通過獨特 editorial value gate。
    robots: { index: false, follow: true },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ area?: string }>;
}) {
  const { slug } = await params;
  const { area: rawArea } = await searchParams;
  const locale = await getRequestLocale();
  const area = toAreaSlug(rawArea);
  const category = getCategory(slug);
  if (!category) notFound();
  const displayCategory = categoryName(category.slug, category.name, locale);

  const results = drugsInCategory(category.slug as CategorySlug)
    .map((d) => drugSummary(d.slug, area))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  return (
    <>
      <SiteHeader showTagline area={area} preserveAreaPath locatable />

      <main className="min-h-[calc(100svh-11rem)]">
      <section className="shop-shell py-10 sm:py-14">
        <div className="mb-3 md:hidden">
          <AreaSwitch area={area} preservePath locatable />
        </div>
        <p className="shop-kicker mb-3">BROWSE BY CATEGORY</p>
        <div className="mb-7 flex flex-wrap items-end gap-3 border-b border-line pb-5">
          <h1 className="editorial-display m-0 text-[30px] leading-[1.25] sm:text-[40px]">{displayCategory}</h1>
          <p className="text-[13px] text-muted-2">
            {locale === "en" ? `${results.length} listed nearby · ${areaCopy(getArea(area), locale).shortName}` : `${results.length} 項在附近有登錄 · ${getArea(area).shortName}`}
          </p>
          <div className="flex-1" />
          <p className="num text-[11px] tracking-[.04em] text-muted-2">{locale === "en" ? "SORT: FRESHNESS → DISTANCE" : "排序：庫存新鮮度 → 距離"}</p>
        </div>

        <DrugResults results={results} area={area} />
      </section>
      </main>

      <SiteFooter />
    </>
  );
}

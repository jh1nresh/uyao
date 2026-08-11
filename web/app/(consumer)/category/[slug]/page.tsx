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
  if (!category) return { title: locale === "en" ? "Category not found" : "找不到這個品類" };
  const name = categoryName(category.slug, category.name, locale);
  return {
    title: locale === "en" ? `${name} near you` : `${name} — 附近藥局現貨查詢`,
    description: locale === "en" ? `Find ${name.toLowerCase()} at nearby pharmacies, sorted by receiving-scan freshness and distance.` : `${name}在附近藥局的庫存狀態，依店內掃描新鮮度排序。可線上預留，到店由藥師確認交付。`,
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

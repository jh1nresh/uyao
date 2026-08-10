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

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return { title: "找不到這個品類" };
  return {
    title: `${category.name} — 附近藥局現貨查詢`,
    description: `${category.name}在附近藥局的庫存狀態，依店內掃描新鮮度排序。可線上預留，到店由藥師確認交付。`,
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
  const area = toAreaSlug(rawArea);
  const category = getCategory(slug);
  if (!category) notFound();

  const results = drugsInCategory(category.slug as CategorySlug)
    .map((d) => drugSummary(d.slug, area))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  return (
    <>
      <SiteHeader showTagline area={area} preserveAreaPath locatable />

      <section className="px-4 pb-6 pt-6 sm:px-7 xl:px-12 2xl:px-16">
        <div className="mb-3 md:hidden">
          <AreaSwitch area={area} preservePath locatable />
        </div>
        <div className="mb-2.5 flex flex-wrap items-baseline gap-2.5">
          <h1 className="text-lg font-black tracking-[-.01em]">{category.name}</h1>
          <p className="text-[13px] text-muted-2">
            {results.length} 項在附近有登錄 · {getArea(area).shortName}
          </p>
          <div className="flex-1" />
          <p className="text-[13px] text-muted-2">排序：庫存新鮮度 → 距離 → 價格</p>
        </div>

        <DrugResults results={results} area={area} />
      </section>

      <SiteFooter />
    </>
  );
}

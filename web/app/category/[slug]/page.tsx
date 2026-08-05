import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DrugResults } from "@/components/DrugResults";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  CATEGORIES,
  SERVICE_AREA_LABEL,
  drugSummary,
  drugsInCategory,
  getCategory,
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
    title: `${category.name} — 附近藥局現貨與價格`,
    description: `${category.name}在附近藥局的價格與庫存狀態，依店內掃描新鮮度排序。可線上預留、到店付款取貨。`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const results = drugsInCategory(category.slug as CategorySlug)
    .map((d) => drugSummary(d.slug))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  return (
    <>
      <SiteHeader showTagline />

      <section className="px-4 pb-6 pt-6 sm:px-7">
        <div className="mb-2.5 flex flex-wrap items-baseline gap-2.5">
          <h1 className="text-sm font-black">{category.name}</h1>
          <p className="text-[11px] text-muted-2">
            {results.length} 項在附近有登錄 · {SERVICE_AREA_LABEL}
          </p>
          <div className="flex-1" />
          <p className="text-[11px] text-muted-2">排序：庫存新鮮度 → 距離 → 價格</p>
        </div>

        <DrugResults results={results} />
      </section>

      <SiteFooter />
    </>
  );
}

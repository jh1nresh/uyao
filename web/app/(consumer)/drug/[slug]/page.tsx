import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NoInventoryYet } from "@/components/NoInventoryYet";
import { PharmacyList } from "@/components/PharmacyList";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  allDrugs,
  DEFAULT_AREA,
  alternativesFor,
  getArea,
  getCategory,
  getDrug,
  storesForDrug,
  storesInArea,
} from "@/lib/data";

export function generateStaticParams() {
  return allDrugs().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const drug = getDrug(slug);
  if (!drug) return { title: "找不到這個藥品" };
  const rows = storesForDrug(drug.slug);
  const inStock = rows.filter((r) => r.badge.tier === "fresh").length;
  return {
    title: `${drug.name} ${drug.spec} — 附近哪家藥局有貨`,
    description: `${drug.name}（${drug.form} · ${drug.spec}）附近 ${rows.length} 家藥局的庫存狀態，其中 ${inStock} 家今日掃描確認有貨。可線上預留，到店由藥師確認交付。`,
  };
}

export default async function DrugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const drug = getDrug(slug);
  if (!drug) notFound();

  const rows = storesForDrug(drug.slug);
  const alternatives = alternativesFor(drug.slug);
  const category = getCategory(drug.category);

  return (
    <>
      <SiteHeader query={drug.name} showTagline />

      <nav aria-label="麵包屑" className="px-4 pt-6 text-xs text-muted-2 sm:px-7 xl:px-12 2xl:px-16">
        <Link href="/find" className="-my-3 inline-flex min-h-11 items-center text-muted-2 no-underline hover:text-ink">
          首頁
        </Link>
        {category && (
          <>
            {" / "}
            <Link
              href={`/category/${category.slug}`}
              className="-my-3 inline-flex min-h-11 items-center text-muted-2 no-underline hover:text-ink"
            >
              {category.name}
            </Link>
          </>
        )}
        {" / "}
        {drug.name}
      </nav>

      <div className="flex gap-5 border-b border-line px-4 pb-[22px] pt-3.5 sm:px-7 xl:px-12 2xl:px-16">
        <div
          aria-hidden
          className="flex h-[104px] w-[104px] flex-none items-center justify-center border border-line bg-surface text-[13px] text-muted-2 max-sm:h-14 max-sm:w-14 max-sm:text-[12px]"
        >
          商品圖
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-lg font-black leading-[1.25] sm:text-2xl">
            {drug.name}{" "}
            {drug.nameEn && (
              <span className="num text-sm font-medium text-muted">{drug.nameEn}</span>
            )}
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 text-[15px] text-ink-2">
            <span>
              {drug.form} · {drug.spec}
            </span>
            {/* 許可證字號在行動端收起來 — 小螢幕先讓「規格 + 藥品分類」站穩 */}
            {drug.licenseNo && (
              <>
                <span className="hidden text-line-strong sm:inline" aria-hidden>
                  |
                </span>
                <span className="num hidden text-xs sm:inline">{drug.licenseNo}</span>
              </>
            )}
            <span className="text-line-strong" aria-hidden>
              |
            </span>
            <span className="border border-green px-[7px] py-px text-[13px] font-bold text-green">
              {drug.drugClass}
            </span>
          </div>
          <p className="text-xs text-muted-2">
            主成分：{drug.ingredients.join("、")} · 適用：{drug.indications.join("、")}
          </p>
        </div>
      </div>

      {rows.length > 0 ? (
        <PharmacyList
          drug={{ slug: drug.slug, name: drug.name, spec: drug.spec }}
          rows={rows}
        />
      ) : (
        <NoInventoryYet
          drugName={drug.name}
          drugSlug={drug.slug}
          area={DEFAULT_AREA}
          areaLabel={getArea(DEFAULT_AREA).shortName}
          stores={storesInArea(DEFAULT_AREA)}
        />
      )}

      {alternatives.length > 0 && (
        <section className="px-4 pb-[26px] pt-5 sm:px-7 xl:px-12 2xl:px-16">
          <div className="mb-2.5 flex flex-wrap items-baseline gap-2">
            <h2 className="text-sm font-black">同成分替代品</h2>
            <p className="text-[13px] font-normal text-muted-2">
              {drug.ingredients.join("＋")} · 沒貨時的出路
            </p>
          </div>
          <div className="border border-line">
            {alternatives.map((a) => (
              <div
                key={a.drug.slug}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line-soft px-3.5 py-2.5 text-[15px] last:border-b-0"
              >
                <Link href={`/drug/${a.drug.slug}`} className="font-medium text-ink no-underline hover:text-green">
                  {a.drug.name} {a.drug.spec}
                </Link>
                <span className="text-[13px] text-muted-2">{a.drug.form}</span>
                <div className="flex-1" />
                <span className="text-xs font-medium text-green">
                  <span className="num" aria-hidden>
                    ●
                  </span>{" "}
                  附近 {a.storesWithStock} 家有貨
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <SiteFooter />

      <script
        type="application/ld+json"
        // SEO：藥品頁是索引入口，把品名/規格/許可證餵給 Google。
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Drug",
            name: drug.name,
            alternateName: drug.nameEn,
            dosageForm: drug.form,
            activeIngredient: drug.ingredients,
            legalStatus: drug.drugClass,
          }),
        }}
      />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AreaSwitch } from "@/components/AreaSwitch";
import { NoInventoryYet } from "@/components/NoInventoryYet";
import { PharmacyList } from "@/components/PharmacyList";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  allDrugs,
  alternativesFor,
  getArea,
  getCategory,
  getDrug,
  storesForDrug,
  storesInArea,
  toAreaSlug,
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
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ area?: string }>;
}) {
  const { slug } = await params;
  const { area: rawArea } = await searchParams;
  const area = toAreaSlug(rawArea);
  const drug = getDrug(slug);
  if (!drug) notFound();

  const rows = storesForDrug(drug.slug, area);
  const alternatives = alternativesFor(drug.slug, area);
  const category = getCategory(drug.category);

  return (
    <>
      <SiteHeader query={drug.name} showTagline area={area} preserveAreaPath locatable />

      <div className="shop-shell pt-3 md:hidden">
        <AreaSwitch area={area} preservePath locatable />
      </div>

      <nav aria-label="麵包屑" className="shop-shell pt-6 text-xs text-muted-2">
        <Link href={`/app?area=${area}`} className="-my-3 inline-flex min-h-11 items-center text-muted-2 no-underline hover:text-ink">
          首頁
        </Link>
        {category && (
          <>
            {" / "}
            <Link
              href={`/category/${category.slug}?area=${area}`}
              className="-my-3 inline-flex min-h-11 items-center text-muted-2 no-underline hover:text-ink"
            >
              {category.name}
            </Link>
          </>
        )}
        {" / "}
        {drug.name}
      </nav>

      <section className="border-b border-line bg-paper">
      <div className="shop-shell py-8 sm:py-10">
        <div className="flex max-w-[900px] flex-col gap-2 border-l-2 border-forest pl-4 sm:pl-6">
          <p className="num mb-1 text-[11px] font-semibold tracking-[.12em] text-green">
            VERIFIED PRODUCT RECORD
          </p>
          <h1 className="editorial-display m-0 text-[32px] leading-[1.2] sm:text-[44px]">
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
      </section>

      {rows.length > 0 ? (
        <PharmacyList
          drug={{ slug: drug.slug, name: drug.name, spec: drug.spec }}
          rows={rows}
        />
      ) : (
        <NoInventoryYet
          drugName={drug.name}
          drugSlug={drug.slug}
          area={area}
          areaLabel={getArea(area).shortName}
          stores={storesInArea(area)}
        />
      )}

      {alternatives.length > 0 && (
        <section className="bg-ivory">
          <div className="shop-shell py-10 sm:py-14">
          <p className="shop-kicker mb-3">ALTERNATIVES</p>
          <div className="mb-6 flex flex-wrap items-end gap-2">
            <h2 className="editorial-display m-0 text-[28px] sm:text-[34px]">同成分替代品</h2>
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
                <Link href={`/drug/${a.drug.slug}?area=${area}`} className="font-medium text-ink no-underline hover:text-green">
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

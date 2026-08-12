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
import { areaCopy, categoryName, drugCopy, localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { SHOP_URL } from "@/lib/shop";

export function generateStaticParams() {
  return allDrugs().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const drug = getDrug(slug);
  if (!drug) {
    return {
      title: locale === "en" ? "Medicine not found" : "找不到這個藥品",
      robots: { index: false, follow: false },
    };
  }
  const displayDrug = drugCopy(drug, locale);
  return {
    title: locale === "en" ? `${displayDrug.name} ${drug.spec} — early-access record` : `${drug.name} ${drug.spec}｜找藥資料（試營運）`,
    description: locale === "en"
      ? `${displayDrug.name} (${displayDrug.form} · ${drug.spec}) identification in the uYao Medicine Finder prototype catalog. Live supply is not available; confirm the product, supply, and pickup with a pharmacist.`
      : `${drug.name}（${drug.form} · ${drug.spec}）的試營運辨識資料。即時供應資料尚未上線，品項、供應與預留仍須由藥局或藥師確認。`,
    // 藥品 identity/source/freshness 尚未通過 Drug Page Admission Gate。
    robots: { index: false, follow: true },
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
  const locale = await getRequestLocale();
  const drug = getDrug(slug);
  if (!drug) notFound();
  const displayDrug = drugCopy(drug, locale);

  const rows = storesForDrug(drug.slug, area);
  const alternatives = alternativesFor(drug.slug, area);
  const category = getCategory(drug.category);

  return (
    <>
      <SiteHeader query={displayDrug.name} showTagline area={area} preserveAreaPath locatable />

      <div className="shop-shell pt-3 md:hidden">
        <AreaSwitch area={area} preservePath locatable />
      </div>

      <nav aria-label={locale === "en" ? "Breadcrumb" : "麵包屑"} className="shop-shell pt-6 text-xs text-muted-2">
        <Link href={`${SHOP_URL}${localizedPath("/", locale)}?area=${area}`} className="-my-3 inline-flex min-h-11 items-center text-muted-2 no-underline hover:text-ink">
          {locale === "en" ? "Home" : "首頁"}
        </Link>
        {category && (
          <>
            {" / "}
            <Link
              href={`${localizedPath(`/category/${category.slug}`, locale)}?area=${area}`}
              className="-my-3 inline-flex min-h-11 items-center text-muted-2 no-underline hover:text-ink"
            >
              {categoryName(category.slug, category.name, locale)}
            </Link>
          </>
        )}
        {" / "}
        {displayDrug.name}
      </nav>

      <section className="border-b border-line bg-paper">
      <div className="shop-shell py-8 sm:py-10">
        <div className="flex max-w-[900px] flex-col gap-2 border-l-2 border-forest pl-4 sm:pl-6">
          <p className="num mb-1 text-[11px] font-semibold tracking-[.12em] text-green">
            VERIFIED PRODUCT RECORD
          </p>
          <h1 className="editorial-display m-0 text-[32px] leading-[1.2] sm:text-[44px]">
            {displayDrug.name}{" "}
            {locale !== "en" && drug.nameEn && (
              <span className="num text-sm font-medium text-muted">{drug.nameEn}</span>
            )}
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 text-[15px] text-ink-2">
            <span>
              {displayDrug.form} · {drug.spec}
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
              {displayDrug.drugClass}
            </span>
          </div>
          <p className="text-xs text-muted-2">
            {locale === "en" ? "Active ingredients" : "主成分"}：{displayDrug.ingredients.join(locale === "en" ? ", " : "、")} · {locale === "en" ? "Used for" : "適用"}：{displayDrug.indications.join(locale === "en" ? ", " : "、")}
          </p>
        </div>
      </div>
      </section>

      {rows.length > 0 ? (
        <PharmacyList
          drug={{ slug: drug.slug, name: displayDrug.name, spec: drug.spec }}
          rows={rows}
        />
      ) : (
        <NoInventoryYet
          drugName={displayDrug.name}
          drugSlug={drug.slug}
          area={area}
          areaLabel={areaCopy(getArea(area), locale).shortName}
          stores={storesInArea(area)}
        />
      )}

      {alternatives.length > 0 && (
        <section className="bg-ivory">
          <div className="shop-shell py-10 sm:py-14">
          <p className="shop-kicker mb-3">ALTERNATIVES</p>
          <div className="mb-6 flex flex-wrap items-end gap-2">
            <h2 className="editorial-display m-0 text-[28px] sm:text-[34px]">{locale === "en" ? "Same-ingredient alternatives" : "同成分替代品"}</h2>
            <p className="text-[13px] font-normal text-muted-2">
              {displayDrug.ingredients.join(locale === "en" ? " + " : "＋")} · {locale === "en" ? "options when unavailable" : "沒貨時的出路"}
            </p>
          </div>
          <div className="border border-line">
            {alternatives.map((a) => (
              <div
                key={a.drug.slug}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line-soft px-3.5 py-2.5 text-[15px] last:border-b-0"
              >
                <Link href={`${localizedPath(`/drug/${a.drug.slug}`, locale)}?area=${area}`} className="font-medium text-ink no-underline hover:text-green">
                  {drugCopy(a.drug, locale).name} {a.drug.spec}
                </Link>
                <span className="text-[13px] text-muted-2">{drugCopy(a.drug, locale).form}</span>
                <div className="flex-1" />
                <span className="text-xs font-medium text-green">
                  <span className="num" aria-hidden>
                    ●
                  </span>{" "}
                  {locale === "en" ? `${a.storesWithStock} nearby stores` : `附近 ${a.storesWithStock} 家有貨`}
                </span>
              </div>
            ))}
          </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </>
  );
}

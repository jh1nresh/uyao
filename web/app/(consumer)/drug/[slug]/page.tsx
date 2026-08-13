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
  getStore,
  storesForDrug,
  storesInArea,
  toAreaSlug,
} from "@/lib/data";
import { areaCopy, categoryName, drugCopy, localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { partnersForProduct } from "@/lib/partners";
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
      title: locale === "en" ? "Item not found" : "找不到這個品項",
      robots: { index: false, follow: false },
    };
  }
  const displayDrug = drugCopy(drug, locale);
  const label = drug.spec === "規格待確認" ? displayDrug.name : `${displayDrug.name} ${displayDrug.spec}`;
  return {
    title: locale === "en" ? `${label} — partner-listed item` : `${label}｜合作藥局提供品項`,
    description: locale === "en"
      ? `${label} is a partner-listed non-drug product. See its sourced nutrition focus and ingredients; live supply still requires pharmacy confirmation.`
      : `${label}由合作藥局提供並收錄於 uYao 試營運目錄；頁面列出有來源的營養補充方向與成分，即時供應仍待藥局確認。`,
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
  const productLabel = drug.spec === "規格待確認" ? drug.name : `${drug.name} ${drug.spec}`;
  const displayLabel = drug.spec === "規格待確認" ? displayDrug.name : `${displayDrug.name} ${displayDrug.spec}`;
  const partnerStores = partnersForProduct(productLabel)
    .map((partner) => getStore(partner.storeSlug))
    .filter((store): store is NonNullable<typeof store> => store !== undefined);

  const rows = storesForDrug(drug.slug, area);
  const alternatives = alternativesFor(drug.slug, area);
  const category = getCategory(drug.category);

  return (
    <>
      <SiteHeader query={displayDrug.name} showTagline area={area} preserveAreaPath locatable />

      <div className="shop-shell pt-3 md:hidden">
        <AreaSwitch area={area} preservePath locatable compact />
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
            PARTNER-LISTED ITEM
          </p>
          <h1 className="editorial-display m-0 text-[32px] leading-[1.2] sm:text-[44px]">
            {displayDrug.name}{" "}
            {locale !== "en" && drug.nameEn && (
              <span className="num text-sm font-medium text-muted">{drug.nameEn}</span>
            )}
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 text-[15px] text-ink-2">
            <span>
              {displayDrug.form} · {displayDrug.spec}
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
            {locale === "en"
              ? "The public product source presents this as a food or nutrition supplement, not an approved medicine. Its nutrition focus is not a treatment indication. Live inventory still requires pharmacy confirmation."
              : "公開商品資料將此品項列為食品類營養補充品，而非核准藥品；下方是營養補充／日常保養定位，不是治療用途或藥品適應症。即時庫存仍待藥局確認。"}
          </p>
          {partnerStores.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-2">
              <span>{locale === "en" ? "Provided by:" : "提供品項的合作藥局："}</span>
              {partnerStores.map((store) => (
                <Link
                  key={store.slug}
                  href={localizedPath(`/store/${store.slug}`, locale)}
                  className="font-medium text-green"
                >
                  {store.name}
                </Link>
              ))}
            </p>
          )}
        </div>
      </div>
      </section>

      <section className="border-b border-line bg-ivory" aria-labelledby="nutrition-focus-heading">
        <div className="shop-shell py-8 sm:py-10">
          <div className="grid max-w-[900px] gap-6 sm:grid-cols-[1.15fr_.85fr]">
            <div>
              <p className="shop-kicker mb-2">NUTRITION FOCUS · NOT A TREATMENT CLAIM</p>
              <h2 id="nutrition-focus-heading" className="editorial-display m-0 text-[26px] leading-[1.3] sm:text-[32px]">
                {locale === "en" ? "Nutrition and daily-wellness focus" : "營養補充／日常保養方向"}
              </h2>
              <p className="mb-0 mt-3 text-[16px] leading-[1.8] text-ink-2">
                {displayDrug.nutritionFocus}
              </p>
            </div>
            <div className="border border-line bg-paper px-4 py-4">
              <p className="m-0 text-[12px] font-bold tracking-[.04em] text-forest">
                {locale === "en" ? "MAIN INGREDIENTS LISTED BY SOURCE" : "公開商品資料所列主要成分"}
              </p>
              <p className="mb-0 mt-2 text-[13px] leading-[1.75] text-muted">
                {displayDrug.ingredients.join(locale === "en" ? ", " : "、")}
              </p>
              <p className="mb-0 mt-3 text-[12px] leading-[1.7] text-muted-2">
                {locale === "en" ? "Product source: " : "產品資料來源："}
                <a
                  href={drug.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-green"
                >
                  {drug.source.label} ↗
                </a>
              </p>
            </div>
          </div>
          <p className="mb-0 mt-5 max-w-[900px] border-l-2 border-oxblood pl-3 text-[12.5px] leading-[1.75] text-muted">
            {locale === "en"
              ? "Food and supplement positioning cannot be read as prevention or treatment of disease. If you have symptoms, take medicines, are pregnant, or have a chronic condition, ask a pharmacist or physician before choosing a product."
              : "食品與營養補充品的保養定位不能解讀為預防或治療疾病。若已有症狀、正在用藥、懷孕或有慢性病，選購前請先問藥師或醫師。"}{" "}
            <a
              href="https://www.fda.gov.tw/tc/siteContent.aspx?sid=1776"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-green"
            >
              {locale === "en" ? "TFDA guidance ↗" : "TFDA 食品標示與廣告說明 ↗"}
            </a>
          </p>
        </div>
      </section>

      {rows.length > 0 ? (
        <PharmacyList
          drug={{ slug: drug.slug, name: displayDrug.name, spec: drug.spec }}
          rows={rows}
        />
      ) : (
        <NoInventoryYet
          drugName={displayLabel}
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

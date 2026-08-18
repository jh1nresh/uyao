import type { Metadata } from "next";
import Image from "next/image";
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
  const partnerProvidedDetails = drug.source?.kind === "partner";
  return {
    title: locale === "en" ? `${label} — partner-listed item` : `${label}｜合作藥局提供品項`,
    description: partnerProvidedDetails
      ? locale === "en"
        ? `${label} is listed from information provided by a partner pharmacy. Product classification, details, and live supply still require confirmation.`
        : `${label}由合作藥局提供並收錄於 uYao 試營運目錄；成分、產地與供應資訊仍應以實際包裝及藥師確認為準。`
      : drug.source
      ? locale === "en"
        ? `${label} is a partner-listed non-drug product. See its sourced nutrition focus and ingredients; live supply still requires pharmacy confirmation.`
        : `${label}由合作藥局提供並收錄於 uYao 試營運目錄；頁面列出有來源的營養補充方向與成分，即時供應仍待藥局確認。`
      : locale === "en"
        ? `${label} is a partner-listed item whose product details still await public-source verification; live supply still requires pharmacy confirmation.`
        : `${label}由合作藥局提供並收錄於 uYao 試營運目錄；產品資料來源仍待驗證，即時供應仍待藥局確認。`,
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
  const partnerProvidedDetails = drug.source?.kind === "partner";
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
      <div className="shop-shell grid max-w-[900px] gap-6 py-8 sm:py-10 md:grid-cols-[minmax(0,1fr)_280px] md:items-start">
        <div className="flex flex-col gap-2 border-l-2 border-forest pl-4 sm:pl-6">
          <p className="mb-1 text-[14px] font-bold text-forest">
            {locale === "en" ? "Partner-listed item" : "合作藥局提供品項"}
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
            <span className="border border-green px-[7px] py-px text-[14px] font-bold text-green">
              {displayDrug.drugClass}
            </span>
          </div>
          <p className="text-xs text-muted-2">
            {partnerProvidedDetails
              ? locale === "en"
                ? "The product name, ingredients, origin, and supplier details below were provided by a partner pharmacy and have not been independently verified against a public source. They do not establish live stock, approved medicine classification, or treatment efficacy."
                : "下方品名、成分、產地與供應資訊由合作藥局提供，尚未以公開來源獨立驗證；不代表即時庫存、核准藥品分類或療效。"
              : drug.source
              ? locale === "en"
                ? "The public product source presents this as a food or nutrition supplement, not an approved medicine. Its nutrition focus is not a treatment indication. Live inventory still requires pharmacy confirmation."
                : "公開商品資料將此品項列為食品類營養補充品，而非核准藥品；下方是營養補充／日常保養定位，不是治療用途或藥品適應症。即時庫存仍待藥局確認。"
              : locale === "en"
                ? "Product details are pending public-source verification. We only show the partner-confirmed item name and package size; live inventory still requires pharmacy confirmation."
                : "產品資料來源仍待驗證；目前只顯示合作藥局確認的品名與規格，即時庫存仍待藥局確認。"}
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
        {/* 標題在 DOM 裡先於圖：手機上 h1 要先進眼，圖再跟上。 */}
        {drug.image && (
          <figure className="m-0 max-w-[280px]">
            <div className="border border-line bg-ivory">
              <Image
                src={drug.image.src}
                alt={locale === "en" ? drug.image.altEn : drug.image.alt}
                width={drug.image.width}
                height={drug.image.height}
                sizes="(min-width: 768px) 280px, 100vw"
                className="block h-auto w-full"
                priority
              />
            </div>
            {/* 生成圖一定要標示，否則使用者會以為看到的是實際包裝。 */}
            <figcaption className="mt-2 text-xs leading-[1.6] text-muted-2">
              {/* 圖裡已經印了「示意圖，非實際包裝」，這裡不重複同一句，改補
                  它沒說的部分；純文字版的免責仍在 alt 與這行裡。 */}
              {drug.image.kind === "illustration"
                ? locale === "en"
                  ? "Not the actual packaging. Confirm the product, its package size, and availability in store."
                  : "非實際包裝；品項、規格與供應以門市實際商品和藥師確認為準。"
                : locale === "en"
                  ? "Packaging photo provided by the partner pharmacy."
                  : "合作藥局提供的包裝照片。"}
            </figcaption>
          </figure>
        )}
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

      <section className="border-b border-line bg-ivory" aria-labelledby="nutrition-focus-heading">
        <div className="shop-shell py-8 sm:py-10">
          <div className="grid max-w-[900px] gap-6 sm:grid-cols-[1.15fr_.85fr]">
            <div>
              <h2 id="nutrition-focus-heading" className="editorial-display m-0 text-[26px] leading-[1.3] sm:text-[32px]">
                {partnerProvidedDetails
                  ? locale === "en" ? "Product composition provided by the pharmacy" : "合作藥局提供的產品組成"
                  : drug.source
                  ? locale === "en" ? "Nutrition and daily-wellness focus" : "營養補充／日常保養方向"
                  : locale === "en" ? "Product details pending verification" : "產品資料待驗證"}
              </h2>
              <p className="mb-0 mt-3 text-[16px] leading-[1.8] text-ink-2">
                {displayDrug.nutritionFocus}
              </p>
            </div>
            <div className="border border-line bg-paper px-4 py-4">
              {drug.source ? (
                <>
                  <p className="m-0 text-[14px] font-bold text-forest">
                    {partnerProvidedDetails
                      ? locale === "en" ? "INGREDIENTS PROVIDED BY THE PHARMACY" : "合作藥局提供的成分"
                      : locale === "en" ? "MAIN INGREDIENTS LISTED BY SOURCE" : "公開商品資料所列主要成分"}
                  </p>
                  <p className="mb-0 mt-2 text-[14.5px] leading-[1.75] text-muted">
                    {displayDrug.ingredients.join(locale === "en" ? ", " : "、")}
                  </p>
                  <p className="mb-0 mt-3 text-[14px] leading-[1.7] text-muted-2">
                    {locale === "en" ? "Product source: " : "產品資料來源："}
                    {drug.source.url ? (
                      <a
                        href={drug.source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-green"
                      >
                        {drug.source.label} ↗
                      </a>
                    ) : (
                      <span className="font-medium text-ink-2">{drug.source.label}</span>
                    )}
                  </p>
                  {(drug.manufacturer || drug.origin) && (
                    <dl className="mb-0 mt-3 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 pt-3 text-[14px] leading-[1.7] text-muted-2">
                      {drug.manufacturer && (
                        <>
                          <dt>{locale === "en" ? "Company" : "廠商／供應資訊"}</dt>
                          <dd className="m-0 text-ink-2">{drug.manufacturer}</dd>
                        </>
                      )}
                      {drug.origin && (
                        <>
                          <dt>{locale === "en" ? "Origin" : "產地"}</dt>
                          <dd className="m-0 text-ink-2">{drug.origin}</dd>
                        </>
                      )}
                    </dl>
                  )}
                </>
              ) : (
                <p className="m-0 text-[14px] leading-[1.75] text-muted">
                  {locale === "en"
                    ? "No public product source has been verified for this package size."
                    : "此規格尚未驗證公開產品資料來源。"}
                </p>
              )}
            </div>
          </div>
          <p className="mb-0 mt-5 max-w-[900px] border-l-2 border-oxblood pl-3 text-[14px] leading-[1.75] text-muted">
            {partnerProvidedDetails ? (
              locale === "en"
                ? "Partner-provided product details must be checked against the actual package and confirmed with a pharmacist. Ingredient or wellness wording cannot be interpreted as prevention or treatment of disease."
                : "合作藥局提供的產品資料仍須以實際包裝並向藥師確認；成分或保養文字不能解讀為預防或治療疾病。"
            ) : drug.source ? (
              <>
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
              </>
            ) : locale === "en"
              ? "This package has no verified public product source. Do not infer its ingredients, food or supplement classification, or suitability; ask a pharmacist before choosing it."
              : "此規格尚無已驗證的公開產品資料來源；請勿推定其成分、食品或營養補充品分類及適用性，選購前請先詢問藥師。"}
          </p>
        </div>
      </section>

      {alternatives.length > 0 && (
        <section className="bg-ivory">
          <div className="shop-shell py-10 sm:py-14">
          <div className="mb-6 flex flex-wrap items-end gap-2">
            <h2 className="editorial-display m-0 text-[28px] sm:text-[34px]">{locale === "en" ? "Same-ingredient alternatives" : "同成分替代品"}</h2>
            <p className="text-[14px] font-normal text-muted-2">
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
                <span className="text-[14px] text-muted-2">{drugCopy(a.drug, locale).form}</span>
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

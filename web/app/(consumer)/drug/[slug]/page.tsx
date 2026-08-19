import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AreaSwitch } from "@/components/AreaSwitch";
import { StoreBuyBox } from "@/components/StoreBuyBox";
import { NoInventoryYet } from "@/components/NoInventoryYet";
import { PharmacyList } from "@/components/PharmacyList";
import { ProductGallery, type GalleryImage } from "@/components/ProductGallery";
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
import { JsonLd } from "@/components/JsonLd";
import { areaCopy, categoryName, drugCopy, localizedPath } from "@/lib/i18n";
import { hasAmounts, ingredientRows } from "@/lib/ingredients";
import { getRequestLocale } from "@/lib/locale-server";
import { isPending, known } from "@/lib/pending";
import { partnersForProduct } from "@/lib/partners";
import { consumerBreadcrumbJsonLd, consumerProductJsonLd } from "@/lib/seo";
import { consumerIndexablePageRobots } from "@/lib/seo-server";
import { SHOP_URL } from "@/lib/shop";
import { isIndexableCatalogItemSlug } from "@/lib/shop-index";

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
  // metadataBase 是公司站，所以 consumer canonical 必須寫成絕對網址，
  // 否則 /zh-tw/drug/x 會被解析成 uyaohealth.com 上不存在的頁面。
  //
  // 沒有英文品名時，/en 這頁其實就是中文頁 —— canonical 指回 zh-tw，
  // 不要留一個自我 canonical 的英文副本。補上 nameEn 就會自動分家。
  const canonicalLocale = locale === "en" && !drug.nameEn ? "zh" : locale;
  const canonicalUrl = `${SHOP_URL}${localizedPath(`/drug/${drug.slug}`, canonicalLocale)}`;
  return {
    title: locale === "en" ? `${label} — partner-listed item` : `${label}｜合作藥局提供品項`,
    description: partnerProvidedDetails
      ? locale === "en"
        ? `${label} is listed from information provided by a partner pharmacy.`
        : `${label}由合作藥局提供並收錄於 uYao 試營運目錄；成分與產地請以實際包裝及藥師確認為準。`
      : drug.source
      ? locale === "en"
        ? `${label} is a partner-listed non-drug product. See its sourced nutrition focus and ingredients.`
        : `${label}由合作藥局提供並收錄於 uYao 試營運目錄；頁面列出有來源的營養補充方向與成分。`
      : locale === "en"
        ? `${label} is a partner-listed item provided by a partner pharmacy.`
        : `${label}由合作藥局提供並收錄於 uYao 試營運目錄。`,
    // `?area=` 只換附近藥局清單，不換品項內容 —— canonical 一律指沒有
    // query 的乾淨網址，否則十個服務區會變成同一頁的十份副本。
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "zh-TW": `${SHOP_URL}/zh-tw/drug/${drug.slug}`,
        ...(drug.nameEn ? { en: `${SHOP_URL}/en/drug/${drug.slug}` } : {}),
        "x-default": `${SHOP_URL}/zh-tw/drug/${drug.slug}`,
      },
    },
    // Drug Page Admission Gate：只有帶來源或自有實拍的品項可以收錄，
    // 其餘仍是資料待驗證的 placeholder，維持 noindex（見 lib/shop-index.ts）。
    robots: isIndexableCatalogItemSlug(drug.slug, locale)
      ? await consumerIndexablePageRobots()
      : { index: false, follow: true },
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
  // 劑型、規格與藥品分類都可能還沒查證。未知就整段不顯示 —— 目錄卡、輪播與
  // 搜尋結果本來就這樣收，品項頁跟上。空欄位不該被講成一則「待確認」待辦。
  const classPending = isPending(drug.drugClass);
  const metaLine = [known(displayDrug.form), known(displayDrug.spec)]
    .filter(Boolean)
    .join(" · ");
  const partnerProvidedDetails = drug.source?.kind === "partner";
  const partnerStores = partnersForProduct(productLabel)
    .map((partner) => getStore(partner.storeSlug))
    .filter((store): store is NonNullable<typeof store> => store !== undefined);

  // 圖廊 = 包裝實拍 +（電商）商品說明圖。實拍排第一，那才是「這盒長什麼樣」。
  const galleryImages: GalleryImage[] = [
    ...(drug.image
      ? [{
          src: drug.image.src,
          alt: locale === "en" ? drug.image.altEn : drug.image.alt,
          label: locale === "en" ? "Packaging photo" : "包裝照",
        }]
      : []),
    ...(drug.detailImages ?? []).map((item, i) => ({
      src: item.src,
      alt: locale === "en" ? item.altEn : item.alt,
      label:
        locale === "en"
          ? ["Hero", "Features", "Ingredients"][i] ?? `Image ${i + 1}`
          : ["主圖", "產品特色", "成分規格"][i] ?? `圖 ${i + 1}`,
    })),
  ];

  const rows = storesForDrug(drug.slug, area);
  const areaStores = storesInArea(area);
  const areaShortName = areaCopy(getArea(area), locale).shortName;
  const alternatives = alternativesFor(drug.slug, area);
  const category = getCategory(drug.category);

  const canonicalPath = localizedPath(`/drug/${drug.slug}`, locale);

  // 寬螢幕把「哪裡拿得到」抬成獨立一欄，跟品名同一屏 —— 不必先讀完成分
  // 摘要才看到藥局。lg 以下欄寬切不出三欄，維持疊在品項資料下面。
  // 沒有圖廊的品項少一欄，欄位表要跟著少一格，否則第一欄會空著。
  const heroGridClass = galleryImages.length > 0
    ? "lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)_minmax(300px,340px)]"
    : "xl:grid-cols-[minmax(0,1fr)_minmax(300px,340px)]";
  const buyBoxPlacement = galleryImages.length > 0
    ? "lg:col-start-2 lg:row-start-2 xl:col-start-3 xl:row-start-1"
    : "xl:col-start-2 xl:row-start-1";

  return (
    <>
      {isIndexableCatalogItemSlug(drug.slug, locale) && (
        <JsonLd
          nodes={[
            consumerProductJsonLd({
              name: displayLabel,
              // Same sentence the page shows, minus any claim about supply.
              description: known(displayDrug.nutritionFocus)
                ?? (locale === "en"
                  ? "Partner-listed catalog item. Product details and supply require pharmacy confirmation."
                  : "合作藥局提供的目錄品項；產品資料與供應狀態仍須由藥局確認。"),
              path: canonicalPath,
              inLanguage: locale === "en" ? "en" : "zh-Hant-TW",
              image: drug.image?.src,
              category: category
                ? categoryName(category.slug, category.name, locale)
                : undefined,
            }),
            consumerBreadcrumbJsonLd([
              { name: locale === "en" ? "Home" : "首頁", path: localizedPath("/", locale) },
              ...(category
                ? [{
                    name: categoryName(category.slug, category.name, locale),
                    path: localizedPath(`/category/${category.slug}`, locale),
                  }]
                : []),
              { name: displayLabel, path: canonicalPath },
            ]),
          ]}
        />
      )}

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
      <div className={`shop-shell grid max-w-[1040px] gap-7 py-8 sm:py-10 lg:items-start xl:max-w-[1280px] xl:gap-8 ${heroGridClass}`}>
        {galleryImages.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <ProductGallery images={galleryImages} locale={locale} />
            {drug.image && (
              <p className="m-0 text-xs leading-[1.7] text-muted-2">
                {drug.image.kind === "packshot"
                  ? locale === "en"
                    ? "The first image is packaging supplied by the partner pharmacy, cut out on a transparent background."
                    : "第一張是合作藥局提供的包裝照片，已去背為透明背景。"
                  : locale === "en"
                    ? "Illustration only — not the actual packaging."
                    : "示意圖，非實際包裝。"}
              </p>
            )}
            {/*
              圖廊裡除了包裝圖，還有排了文案的商品說明圖，歸屬要跟著**底圖**走：
              說明圖是拿上面那張當底再排字的，底圖是實拍就沿用原廠標示的歸屬，
              底圖是示意圖就不能借用它 —— 掛「原廠標示」等於替一張生成的盒子
              背書，跟把生成圖標成 packshot 是同一種錯。
            */}
            {drug.detailImages && drug.detailImages.length > 0 && (
              <p className="m-0 text-xs leading-[1.7] text-muted-2">
                <span className="mr-1.5 border border-oxblood px-[5px] py-px text-[11px] font-bold text-oxblood">
                  {drug.image?.kind === "illustration"
                    ? locale === "en" ? "ILLUSTRATION" : "示意圖"
                    : locale === "en" ? "MANUFACTURER'S OWN WORDING" : "原廠標示"}
                </span>
                {drug.image?.kind === "illustration"
                  ? locale === "en"
                    ? "Detail images are laid out over the illustration above — not real packaging — with text typeset from this item's own record. Nothing on the rendered carton is a citable product label."
                    : "說明圖以上方的示意圖為底（非實際包裝），文字依本品項的資料排版；盒面上的字不是可引用的包裝標示。"
                  : locale === "en"
                    ? "Detail images combine partner-supplied product photos with text copied from the package or the manufacturer's own material. uYao has not independently verified those claims."
                    : "說明圖是合作藥局提供的商品照，加上照抄自包裝或原廠資料的排版文字；uYao 未獨立驗證其中的說法，也不構成背書。"}
              </p>
            )}
          </div>
        )}
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
          {(metaLine || drug.licenseNo || !classPending) && (
            <div className="flex flex-wrap items-center gap-2.5 text-[15px] text-ink-2">
              {metaLine && <span>{metaLine}</span>}
              {/* 許可證字號在行動端收起來 — 小螢幕先讓「規格 + 藥品分類」站穩 */}
              {drug.licenseNo && (
                <>
                  <span className="hidden text-line-strong sm:inline" aria-hidden>
                    |
                  </span>
                  <span className="num hidden text-xs sm:inline">{drug.licenseNo}</span>
                </>
              )}
              {!classPending && (
                <>
                  {metaLine && (
                    <span className="text-line-strong" aria-hidden>
                      |
                    </span>
                  )}
                  <span className="border border-green px-[7px] py-px text-[14px] font-bold text-green">
                    {displayDrug.drugClass}
                  </span>
                </>
              )}
            </div>
          )}
          <p className="text-xs text-muted-2">
            {partnerProvidedDetails
              ? locale === "en"
                ? "The product name, ingredients, origin, and supplier details below were provided by a partner pharmacy and have not been independently verified against a public source. They do not establish approved medicine classification or treatment efficacy."
                : "下方品名、成分、產地與供應資訊由合作藥局提供，尚未以公開來源獨立驗證；不代表核准藥品分類或療效。"
              : drug.source
              ? locale === "en"
                ? "The public product source presents this as a food or nutrition supplement, not an approved medicine. Its nutrition focus is not a treatment indication."
                : "公開商品資料將此品項列為食品類營養補充品，而非核准藥品；下方是營養補充／日常保養定位，不是治療用途或藥品適應症。"
              : locale === "en"
                ? "We only show the partner-confirmed item name and package size."
                : "目前只顯示合作藥局確認的品名與規格。"}
          </p>
          {/* 內文與成分摘要直接放右欄：打開頁面第一屏就該知道這是什麼、
              裡面有什麼 —— 不必捲到頁面下段。成分細節與來源仍在下方區塊。 */}
          {known(displayDrug.nutritionFocus) && (
            <p className="mb-0 mt-1 text-[15.5px] leading-[1.85] text-ink-2">
              {displayDrug.nutritionFocus}
            </p>
          )}
          {drug.source && displayDrug.ingredients.length > 0 && (
            <p className="m-0 line-clamp-2 text-[14px] leading-[1.7] text-muted">
              <span className="font-bold text-forest">
                {locale === "en" ? "Main ingredients: " : "主要成分："}
              </span>
              {displayDrug.ingredients.join(locale === "en" ? ", " : "、")}
            </p>
          )}
        </div>

        {/* 這頁只要回答一件事：哪家藥局有這個藥、電話幾號。
            有掃描庫存就用庫存 rows；還沒有掃描流時，用合作藥局自己確認過的
            販售品項 —— 44 個品項都講得出至少一家，不必讓人捲到頁尾。 */}
        <div className={buyBoxPlacement}>
          <StoreBuyBox
            drug={{ slug: drug.slug, name: displayDrug.name, spec: drug.spec }}
            rows={rows}
            carryingStores={partnerStores}
            otherStores={areaStores}
            areaLabel={areaShortName}
          />
        </div>
      </div>
      </section>

      {/* 成分與來源緊跟 hero：右欄的摘要在這裡展開成對照表。
          完整藥局清單移到本區之後 —— 第一屏的精簡卡已經接住「哪裡拿得到」。 */}
      <section id="ingredients" className="scroll-mt-24 border-b border-line bg-ivory" aria-labelledby="nutrition-focus-heading">
        <div className="shop-shell py-8 sm:py-10">
          <h2 id="nutrition-focus-heading" className="editorial-display m-0 max-w-[900px] text-[26px] leading-[1.3] sm:text-[32px]">
            {partnerProvidedDetails
              ? locale === "en" ? "Product composition provided by the pharmacy" : "合作藥局提供的產品組成"
              : drug.source
              ? locale === "en" ? "Ingredients and product source" : "成分與資料來源"
              : locale === "en" ? "Product details pending verification" : "產品資料待驗證"}
          </h2>
          <div className="mt-5 max-w-[900px]">
            <div className="max-w-[560px] border border-line bg-paper px-4 py-4">
              {drug.source ? (
                <>
                  <p className="m-0 text-[14px] font-bold text-forest">
                    {partnerProvidedDetails
                      ? locale === "en" ? "INGREDIENTS PROVIDED BY THE PHARMACY" : "合作藥局提供的成分"
                      : locale === "en" ? "MAIN INGREDIENTS LISTED BY SOURCE" : "公開商品資料所列主要成分"}
                  </p>
                  {/* 有標示含量就排成對照表，看得出每項各多少；沒有含量的維持一行式列舉。 */}
                  {hasAmounts(displayDrug.ingredients) ? (
                    <dl className="mb-0 mt-2 grid grid-cols-[1fr_max-content] gap-x-3 text-[14.5px] leading-[1.75]">
                      {ingredientRows(displayDrug.ingredients).map((row) => (
                        <Fragment key={row.name}>
                          <dt className="border-b border-line-soft py-1 text-muted">{row.name}</dt>
                          <dd className="num m-0 border-b border-line-soft py-1 text-right font-bold text-forest">
                            {row.amount ?? ""}
                          </dd>
                        </Fragment>
                      ))}
                    </dl>
                  ) : (
                    <p className="mb-0 mt-2 text-[14.5px] leading-[1.75] text-muted">
                      {displayDrug.ingredients.join(locale === "en" ? ", " : "、")}
                    </p>
                  )}
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
                  {(known(drug.manufacturer) || known(drug.origin)) && (
                    <dl className="mb-0 mt-3 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 pt-3 text-[14px] leading-[1.7] text-muted-2">
                      {known(drug.manufacturer) && (
                        <>
                          <dt>{locale === "en" ? "Company" : "廠商／供應資訊"}</dt>
                          <dd className="m-0 text-ink-2">{drug.manufacturer}</dd>
                        </>
                      )}
                      {known(drug.origin) && (
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
          areaLabel={areaShortName}
          stores={areaStores}
        />
      )}

      {/* 產品特色、建議用量與注意事項全部照包裝或原廠標示逐條收，不是 uYao 的評價。
          標題上的「原廠標示」標籤是宣告，不是裝飾 —— 把廠商說法呈現成本站說法會誤導。 */}
      {(drug.highlights?.length || drug.dosage || drug.cautions) && (
        <section className="border-b border-line bg-paper" aria-labelledby="pack-detail-heading">
          <div className="shop-shell py-8 sm:py-10">
            <div className="flex max-w-[900px] flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 id="pack-detail-heading" className="editorial-display m-0 text-[26px] leading-[1.3] sm:text-[32px]">
                {locale === "en" ? "As stated on the package" : "包裝標示內容"}
              </h2>
              <span className="border border-oxblood px-[7px] py-px text-[13px] font-bold text-oxblood">
                {locale === "en" ? "MANUFACTURER'S OWN WORDING" : "原廠標示，非 uYao 評價"}
              </span>
            </div>

            {drug.highlights && drug.highlights.length > 0 && (
              <ol className="m-0 mt-6 grid max-w-[900px] list-none gap-4 p-0 sm:grid-cols-2">
                {drug.highlights.map((item, i) => (
                  <li key={item.title} className="flex gap-3 border border-line bg-ivory px-4 py-3.5">
                    <span className="num flex h-7 w-7 flex-none items-center justify-center rounded-full bg-forest text-[13px] font-bold text-paper">
                      {i + 1}
                    </span>
                    <span>
                      <span className="block text-[16px] font-bold text-ink">{item.title}</span>
                      <span className="mt-1 block text-[14.5px] leading-[1.7] text-muted">{item.body}</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {(drug.dosage || drug.cautions) && (
              <div className="mt-5 grid max-w-[900px] gap-4 sm:grid-cols-2">
                {drug.dosage && (
                  <div className="border-l-2 border-forest bg-ivory px-4 py-3.5">
                    <p className="m-0 text-[14px] font-bold text-forest">
                      {locale === "en" ? "SUGGESTED USE" : "建議用量"}
                    </p>
                    <p className="mb-0 mt-1.5 text-[14.5px] leading-[1.75] text-ink-2">{drug.dosage}</p>
                  </div>
                )}
                {drug.cautions && (
                  <div className="border-l-2 border-oxblood bg-ivory px-4 py-3.5">
                    <p className="m-0 text-[14px] font-bold text-oxblood">
                      {locale === "en" ? "CAUTIONS AND ALLERGENS" : "注意事項與過敏原"}
                    </p>
                    <p className="mb-0 mt-1.5 text-[14.5px] leading-[1.75] text-ink-2">{drug.cautions}</p>
                  </div>
                )}
              </div>
            )}

            <p className="mb-0 mt-5 max-w-[900px] border-l-2 border-oxblood pl-3 text-[14px] leading-[1.75] text-muted">
              {locale === "en"
                ? "The wording above is copied from the product package or the manufacturer's own material. uYao has not independently verified it, and it is not an endorsement. Food and supplement wording cannot be read as prevention or treatment of disease — check the actual package and ask a pharmacist."
                : "以上文字照抄自產品包裝或原廠資料，uYao 未獨立驗證，也不構成背書。食品與營養補充品的文字不能解讀為預防或治療疾病；請以實際包裝為準並向藥師確認。"}
            </p>
          </div>
        </section>
      )}

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

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AreaSwitch } from "@/components/AreaSwitch";
import { StoreBuyBox } from "@/components/StoreBuyBox";
import { NoInventoryYet } from "@/components/NoInventoryYet";
import { PharmacyList } from "@/components/PharmacyList";
import { ProductGallery } from "@/components/ProductGallery";
import { SearchInput } from "@/components/SearchInput";
import styles from "@/components/ProductDetail.module.css";
import { productShowcaseScene } from "@/lib/product-showcase";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  allDrugs,
  alternativesFor,
  getCategory,
  getDrug,
  getStore,
  storesForDrug,
  toAreaSlug,
} from "@/lib/data";
import { JsonLd } from "@/components/JsonLd";
import { categoryName, drugCopy, localizedPath, secondaryProductName } from "@/lib/i18n";
import { ProductDetails } from "@/components/ProductDetails";
import infoImages from "@/lib/product-info-images.generated.json";
import type { ProductInfoPanel } from "@/lib/product-info-content";
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
  const secondaryName = secondaryProductName(drug, locale);
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

  const shelfScene = productShowcaseScene(drug.slug);
  const english = locale === "en";
  const images = (infoImages as Record<string, { src: string; width: number; height: number; content: ProductInfoPanel }[]>)[`${drug.slug}:${locale}`];
  const featureImage = images.find((image) => image.content.kind === "features");
  const factsImage = images.find((image) => image.content.kind === "facts")!;
  const rows = storesForDrug(drug.slug, area);
  const alternatives = alternativesFor(drug.slug, area);
  const category = getCategory(drug.category);

  const canonicalPath = localizedPath(`/drug/${drug.slug}`, locale);

  return (
    <div className="uyao-consumer-world min-h-screen text-ink">
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
              // Source packshots are kept in the catalog record, not displayed on this page.
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

      <SiteHeader tone="cabinet" showSearch={false} showTagline={false} activeWorkspace="shop" area={area} preserveAreaPath locatable />
      <main className={styles.page}>
        <div className={`shop-shell ${styles.toolbar}`}>
          <nav aria-label={english ? "Breadcrumb" : "麵包屑"} className={styles.breadcrumb}>
            <Link href={`${SHOP_URL}${localizedPath("/", locale)}?area=${area}#catalog`}>{english ? "← Back to the cabinet" : "← 回到藥櫃"}</Link>
            {category && <span>{categoryName(category.slug, category.name, locale)}</span>}
          </nav>
          <div className="hidden md:block xl:hidden"><AreaSwitch area={area} preservePath locatable compact /></div>
          <details className={styles.search}>
            <summary>{english ? "Find another item ⌕" : "找其他品項 ⌕"}</summary>
            <SearchInput size="sm" area={area} defaultValue="" />
          </details>
        </div>

        <section className={`shop-shell ${styles.hero} ${shelfScene ? "" : styles.withoutGallery}`} aria-labelledby="product-heading">
          <div className={styles.heading}>
            <p className="shop-kicker">{english ? "FROM THE UYAO CABINET" : "uYao 藥櫃選品"}</p>
            <h1 id="product-heading" className={styles.title}>{displayDrug.name}</h1>
            {secondaryName && <p className={styles.secondary}>{secondaryName}</p>}
            {(metaLine || !classPending || drug.licenseNo) && (
              <p className={styles.meta}>{[metaLine, !classPending ? displayDrug.drugClass : null, drug.licenseNo].filter(Boolean).join(" · ")}</p>
            )}
          </div>
          {shelfScene && (
            <div className={styles.gallery}>
              <ProductGallery image={{ src: shelfScene.src, alt: english ? `${displayDrug.name} — shelf illustration` : `${displayDrug.name}：木架商品示意圖` }} locale={locale} />
              <p className={styles.imageNote}>{english ? "Product illustration. Packaging and labels must be checked against the actual item." : "商品示意，包裝與標示以實品為準。"}</p>
            </div>
          )}
          <div className={styles.overview}>
            {known(displayDrug.nutritionFocus) && <p className={styles.focus}>{displayDrug.nutritionFocus}</p>}
            <p className={styles.confirmation}>{english ? "A partner-listed catalog item. Ask a pharmacist to confirm supply, price and suitability." : "合作藥局提供的目錄品項。供應、價格與適用性，仍須向藥師確認。"}</p>
            <a href="#contact-pharmacy" className={styles.primaryAction}>{english ? "Ask a pharmacy" : "向藥局詢問"}<span aria-hidden>↗</span></a>
            <ProductDetails features={featureImage?.content} facts={factsImage.content} english={english}>
              <div className={styles.provenance}>
                <h3 className={styles.smallHeading}>{english ? "Product source" : "產品資料來源"}</h3>
                {drug.source ? (drug.source.url ? <a href={drug.source.url} target="_blank" rel="noreferrer">{drug.source.label} ↗</a> : <p>{drug.source.label}</p>) : <p>{english ? "No public product source has been verified for this package size." : "此規格尚未驗證公開產品資料來源。"}</p>}
                <p>{partnerProvidedDetails ? (english ? "Names, ingredients, origin and supply information are partner-provided and have not been independently verified against a public source. They do not establish approved medicine classification or treatment efficacy." : "品名、成分、產地與供應資訊由合作藥局提供，尚未以公開來源獨立驗證；不代表核准藥品分類或療效。") : drug.source ? (english ? "The public product source describes a food or nutrition supplement, not an approved medicine. Its wellness positioning is not a treatment indication." : "公開商品資料將此品項列為食品類營養補充品，而非核准藥品；保養定位不是治療用途或藥品適應症。") : (english ? "Do not infer ingredients, classification or suitability without a verified source." : "缺少可核對的來源時，請勿推定成分、分類與適用性。")}</p>
                <p>{english ? "Check the actual package and ask a pharmacist. If you have symptoms, take medicines, are pregnant or have a chronic condition, consult a pharmacist or physician before choosing a product." : "請以實際包裝並向藥師確認。若已有症狀、正在用藥、懷孕或有慢性病，選購前請先問藥師或醫師。"} <a href="https://www.fda.gov.tw/tc/siteContent.aspx?sid=1776" target="_blank" rel="noreferrer">{english ? "TFDA guidance ↗" : "TFDA 說明 ↗"}</a></p>
              </div>
            </ProductDetails>
          </div>
        </section>

        <section id="contact-pharmacy" className={`shop-shell ${styles.editorialSection}`} aria-labelledby="contact-heading">
          <header className={styles.sectionHeading}>
            <p className="shop-kicker">{english ? "ASK BEFORE YOU GO" : "出門前，先問一聲"}</p>
            <h2 id="contact-heading">{english ? "Talk to a pharmacy" : "交給藥師確認"}</h2>
            <p>{english ? "A listed item does not mean it is currently in stock. Contact the pharmacy to confirm." : "收錄品項不代表即時有貨。先聯絡藥局，確認後再前往。"}</p>
          </header>
          <div className={styles.sectionContent}>
            <StoreBuyBox drug={{ slug: drug.slug, name: displayDrug.name, spec: drug.spec }} rows={rows} carryingStores={partnerStores} />
            <Link className={styles.textAction} href={`${localizedPath("/agent", locale)}?${new URLSearchParams({ draft: drug.name, area })}`}>{english ? "Ask uYao about this item ↗" : "帶著這個品項，問 uYao ↗"}</Link>
          </div>
        </section>
        {rows.length > 0 ? <PharmacyList drug={{ slug: drug.slug, name: displayDrug.name, spec: drug.spec }} rows={rows} /> : <NoInventoryYet drugName={displayLabel} drugSlug={drug.slug} area={area} />}
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

      </main>
      <div className={styles.contactBar}>
        <div className="shop-shell">
          <span>{displayDrug.name}</span>
          <a href="#contact-pharmacy" className={styles.primaryAction}>{english ? "Ask a pharmacist" : "交給藥師確認"}<span aria-hidden>↗</span></a>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

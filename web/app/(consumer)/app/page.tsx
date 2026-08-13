import type { Metadata } from "next";
import Link from "next/link";

import { AreaSwitch } from "@/components/AreaSwitch";
import { CatalogItemGrid } from "@/components/CatalogItemGrid";
import { JsonLd } from "@/components/JsonLd";
import { SearchInput } from "@/components/SearchInput";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PartnerMarquee } from "@/components/landing/PartnerMarquee";
import {
  AREAS,
  CATEGORIES,
  allStores,
  allDrugs,
  drugsInCategory,
  getArea,
  storesInArea,
  toAreaSlug,
} from "@/lib/data";
import { CATALOG_GROUPS, featuredCatalogDrugs } from "@/lib/catalog-groups";
import { areaCopy, categoryName, localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { PARTNER_STORE_ITEMS } from "@/lib/partner-stores";
import {
  CONSUMER_DESCRIPTION,
  SITE_URL,
  consumerWebPageJsonLd,
  consumerWebSiteJsonLd,
  socialPreviewImages,
} from "@/lib/seo";
import { consumerIndexablePageRobots } from "@/lib/seo-server";
import { SHOP_URL } from "@/lib/shop";

const UPDATED_AT = "2026-08-12";

// `/app` 只保留為內部 implementation route；公開 canonical 是 shop host
// 的 `/zh-tw` 與 `/en`，由 proxy rewrite 到這裡。
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const robots = await consumerIndexablePageRobots();
  const canonical = `${SHOP_URL}${locale === "en" ? "/en" : "/zh-tw"}`;
  const title = locale === "en"
    ? "Find medicine nearby and leave a request | uYao Medicine Finder"
    : "附近藥局找藥與到貨通知｜uYao 找藥";
  const images = socialPreviewImages("shop", locale);
  return locale === "en"
    ? {
        title: { absolute: title },
        description: CONSUMER_DESCRIPTION.en,
        alternates: {
          canonical,
          languages: {
            "zh-TW": `${SHOP_URL}/zh-tw`,
            en: `${SHOP_URL}/en`,
            "x-default": `${SHOP_URL}/zh-tw`,
          },
        },
        openGraph: {
          title,
          description: CONSUMER_DESCRIPTION.en,
          locale: "en_US",
          url: canonical,
          images: images.openGraph,
        },
        twitter: {
          card: "summary_large_image",
          title,
          description: CONSUMER_DESCRIPTION.en,
          images: images.twitter,
        },
        robots,
      }
    : {
        title: { absolute: title },
        description: CONSUMER_DESCRIPTION.zh,
        alternates: {
          canonical,
          languages: {
            "zh-TW": `${SHOP_URL}/zh-tw`,
            en: `${SHOP_URL}/en`,
            "x-default": `${SHOP_URL}/zh-tw`,
          },
        },
        openGraph: {
          title,
          description: CONSUMER_DESCRIPTION.zh,
          locale: "zh_TW",
          url: canonical,
          images: images.openGraph,
        },
        twitter: {
          card: "summary_large_image",
          title,
          description: CONSUMER_DESCRIPTION.zh,
          images: images.twitter,
        },
        robots,
      };
}

const STEPS_ZH = [
  { title: "搜尋", body: "輸入品名、成分或保養需求；辨識到的常見症狀只顯示安全提醒，不會自動帶商品。" },
  { title: "留下需求", body: "送出找藥或預留需求，等待藥局確認是否能供應。" },
  { title: "依回覆前往", body: "藥局確認後再依回覆前往；到店付款並由藥師交付。" },
];

const STEPS_EN = [
  { title: "Search", body: "Enter a name, ingredient, or wellness need. Recognized common symptoms show safety guidance without automatic product results." },
  { title: "Leave a request", body: "Send a medicine or pickup request and wait for a pharmacy to confirm supply." },
  { title: "Follow the reply", body: "Travel only after confirmation; pay in store and receive the item from a pharmacist." },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area: rawArea } = await searchParams;
  const locale = await getRequestLocale();
  const area = toAreaSlug(rawArea);
  const storeCount = storesInArea(area).length;
  const listedStores = allStores();
  const drugs = allDrugs();
  const featuredDrugs = featuredCatalogDrugs(drugs);
  const currentArea = areaCopy(getArea(area), locale);
  const steps = locale === "en" ? STEPS_EN : STEPS_ZH;

  return (
    <>
      <JsonLd nodes={[consumerWebSiteJsonLd(locale), consumerWebPageJsonLd(locale)]} />
      <SiteHeader showSearch={false} area={area} preserveAreaPath locatable />

      {/*
        第一屏只有一件事：搜尋。
        原本這裡列了該區 91 家藥局，那是目錄不是產品，而且連電話鈕都沒有
        （`showPhone` 預設 false），使用者看完什麼也做不了。更糟的是它定義了
        第一印象「這是藥局名錄」，而名錄 Google Maps 做得更好。
        藥局家數留下來當可信度證據，但收成一行字。
      */}
      <section className="bg-ivory">
        <div className="shop-shell flex flex-col pb-14 pt-12 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
          <div className="mx-auto w-full max-w-[1120px] text-center">
            <p className="shop-kicker mb-5 mt-0">NEARBY SEARCH · REQUEST · PHARMACY CONFIRMATION</p>
            <h1 className="editorial-display m-0 text-[clamp(40px,4.4vw,62px)] leading-[1.08]">
              {locale === "en" ? "You do not need to know the product name." : "不用先知道品名。描述需求就能開始。"}
            </h1>
            <p className="mx-auto mt-5 max-w-[620px] text-[15px] leading-[1.8] text-ink-2 sm:text-[16px]">
              {locale === "en" ? "Search by product, ingredient, or daily-wellness need. Recognized common symptoms open safety guidance instead of automatic product results." : "可輸入品名、成分或日常保養方向；辨識到常見症狀時，會先顯示安全提醒，不會自動帶商品。"}
            </p>
          </div>

          <div className="search-hero-panel relative mx-auto mt-9 w-full max-w-5xl">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
              <div>
                <p className="num m-0 text-[11px] font-semibold tracking-[.12em] text-oxblood">
                  {currentArea.shortName} · PHARMACY SEARCH
                </p>
                <h2 className="editorial-display mb-0 mt-2 text-[25px] leading-[1.25] text-forest sm:text-[30px]">
                  {locale === "en" ? "What do you need today?" : "今天哪裡不舒服？"}
                </h2>
              </div>
              <p className="m-0 max-w-[360px] text-[13px] leading-[1.7] text-muted">
                {locale === "en" ? "You can also search by product name, ingredient, or package size." : "也可以直接輸入品名、主要成分或規格。"}
              </p>
            </div>

            <div className="search-hero-field mt-7">
              <SearchInput size="xl" area={area} className="w-full shadow-none" />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-muted">
              <span className="num tracking-[.08em]">{locale === "en" ? "QUICK START" : "快速開始"}</span>
              <nav aria-label="品類" className="contents">
                {CATEGORIES.map((c, index) => (
                  <Link
                    key={c.slug}
                    href={`${localizedPath(`/category/${c.slug}`, locale)}?area=${area}`}
                    className="search-hero-option history-link inline-flex min-h-11 items-center gap-2 border-b border-line-strong font-medium text-forest no-underline transition-[border-color,color] hover:border-green hover:text-green"
                    style={{ animationDelay: `${240 + index * 70}ms` }}
                  >
                    {categoryName(c.slug, c.name, locale)}
                    <span className="num text-muted-2">{drugsInCategory(c.slug).length}</span>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="search-hero-steps mt-5 grid border-y border-line py-4 text-[12px] leading-[1.65] text-muted sm:grid-cols-3">
              <span><b className="num mr-2 text-oxblood">01</b>{locale === "en" ? "Search a product, symptom, or need" : "輸入品名、症狀或需求"}</span>
              <span className="mt-2 sm:mt-0"><b className="num mr-2 text-oxblood">02</b>{locale === "en" ? "Review the data source and status" : "查看資料來源與狀態"}</span>
              <span className="mt-2 sm:mt-0"><b className="num mr-2 text-oxblood">03</b>{locale === "en" ? "Leave a request and wait for confirmation" : "留下需求，等待藥局確認"}</span>
            </div>
          </div>

          <div className="mx-auto mt-6 w-full max-w-5xl">
            <dl className="grid grid-cols-3 border-y border-line py-4">
              <div>
                <dt className="num text-[20px] font-semibold text-forest">{AREAS.length}</dt>
                <dd className="mt-1 text-[12px] text-muted">{locale === "en" ? "service areas" : "服務區"}</dd>
              </div>
              <div className="border-l border-line pl-4 sm:pl-6">
                <dt className="num text-[20px] font-semibold text-forest">{listedStores.length}</dt>
                <dd className="mt-1 text-[12px] text-muted">{locale === "en" ? "listed stores" : "首波店家"}</dd>
              </div>
              <div className="border-l border-line pl-4 sm:pl-6">
                <dt className="text-[15px] font-bold text-forest">{locale === "en" ? "Pharmacy confirmation" : "藥局確認"}</dt>
                <dd className="mt-1 text-[12px] text-muted">{locale === "en" ? "Supply and pickup" : "供應與到店安排"}</dd>
              </div>
            </dl>
            <p className="mb-0 mt-4 text-[12.5px] leading-[1.7] text-muted-2">
              {locale === "en" ? `${currentArea.shortName} currently lists ${storeCount} stores. Live inventory has not started; every data state is labeled.` : `${currentArea.shortName}目前收錄 ${storeCount} 家店家；即時庫存尚未開始，我們會誠實標示資料狀態。`}
            </p>
            <div className="mt-4 md:hidden">
              <AreaSwitch area={area} preservePath locatable compact />
            </div>
          </div>
        </div>
      </section>

      <PartnerMarquee
        id="pharmacies"
        items={PARTNER_STORE_ITEMS}
        locale={locale}
        evidenceHref={`${SITE_URL}${locale === "en" ? "/en" : "/zh-tw"}/evidence#partners`}
      />

      {/* 首頁只放固定精選；完整目錄交給可搜尋、可分類的列表頁。 */}
      <section className="border-t border-line bg-ivory">
        <div className="shop-shell py-14 sm:py-20">
          <div className="mb-6 max-w-[720px]">
            <h2 className="editorial-display m-0 text-[32px] leading-[1.25] sm:text-[40px]">
              {locale === "en" ? "Items provided by partner pharmacies" : "合作藥局提供品項"}
            </h2>
            <p className="mb-0 mt-3 text-[13px] leading-[1.7] text-muted">
              {locale === "en" ? "Browse verified catalog records. Supply and pickup still require pharmacy confirmation." : "先瀏覽已整理的品項資料；是否供應與到店安排，仍需由藥局確認。"}
            </p>
          </div>
          <nav aria-label={locale === "en" ? "Catalog categories" : "品項分類"} className="mb-7 flex flex-wrap gap-2">
            {CATALOG_GROUPS.map((group) => (
              <Link
                key={group.slug}
                href={`${localizedPath("/category/partner-item", locale)}?area=${area}&group=${group.slug}`}
                className="inline-flex min-h-11 items-center border border-line-strong bg-paper px-3.5 text-[12.5px] font-semibold text-forest no-underline transition-colors hover:border-forest hover:bg-surface-hover"
              >
                {locale === "en" ? group.nameEn : group.name}
              </Link>
            ))}
          </nav>
          <CatalogItemGrid drugs={featuredDrugs} area={area} locale={locale} featured />
          <div className="mt-6 flex justify-end">
            <Link
              href={`${localizedPath("/category/partner-item", locale)}?area=${area}`}
              className="inline-flex min-h-11 items-center border-b border-forest text-[14px] font-bold text-forest no-underline hover:border-green hover:text-green"
            >
              {locale === "en" ? `View all ${drugs.length} items →` : `查看全部 ${drugs.length} 項 →`}
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper">
        <div className="shop-shell py-14 sm:py-20">
          <p className="shop-kicker mb-3">HOW IT WORKS</p>
          <h2 className="editorial-display mb-7 mt-0 text-[32px] leading-[1.25] sm:text-[40px]">{locale === "en" ? "Three steps to the next reliable action" : "三步找到可靠的下一步"}</h2>
          <ol className="m-0 grid list-none border border-line p-0 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="flex min-h-[150px] gap-5 border-b border-line-soft px-5 py-6 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
            >
              <span className="num flex-none text-[24px] font-semibold text-oxblood">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="text-[17px] font-bold text-ink">{s.title}</div>
                <p className="mt-2 text-[14px] leading-[1.7] text-muted">{s.body}</p>
              </div>
            </li>
          ))}
          </ol>
          <p className="mt-3 text-[13px] leading-[1.6] text-muted-2">
            {locale === "en" ? "How should I read availability?" : "庫存狀態怎麼讀？"}
            <Link href={localizedPath("/stock-badges", locale)} className="-my-3 ml-1 inline-flex min-h-11 items-center text-green">
              {locale === "en" ? "Read the freshness labels →" : "看徽章分級說明 →"}
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-line bg-ivory" aria-labelledby="consumer-answer-heading">
        <div className="shop-shell py-14 sm:py-20">
          <p className="shop-kicker mb-3">DIRECT ANSWER · SOURCES · LIMITS</p>
          <h2 id="consumer-answer-heading" className="editorial-display mb-5 mt-0 text-[30px] leading-[1.25] [text-wrap:balance] sm:text-[40px]">
            {locale === "en" ? "What can this service help you confirm?" : "現在可以幫你確認哪些資訊？"}
          </h2>
          <p className="m-0 max-w-[760px] text-[16px] leading-[1.85] text-ink-2">
            {CONSUMER_DESCRIPTION[locale]}
          </p>
          <dl className="mt-8 grid border-l border-t border-line bg-paper sm:grid-cols-3">
            <div className="border-b border-r border-line p-5">
              <dt className="text-[14px] font-bold text-forest">{locale === "en" ? "Known" : "目前可確認"}</dt>
              <dd className="mb-0 mt-2 text-[13.5px] leading-[1.75] text-muted">
                {locale === "en" ? "Trial catalog records, public pharmacy listings, and the request you submit." : "試營運目錄、公開藥局收錄資料，以及你送出的找藥需求。"}
              </dd>
            </div>
            <div className="border-b border-r border-line p-5">
              <dt className="text-[14px] font-bold text-forest">{locale === "en" ? "Not yet known" : "目前不能確認"}</dt>
              <dd className="mb-0 mt-2 text-[13.5px] leading-[1.75] text-muted">
                {locale === "en" ? "Live stock, guaranteed availability, price, hold time, or medical suitability." : "即時庫存、保證供應、價格、保留時間或個人是否適合使用。"}
              </dd>
            </div>
            <div className="border-b border-r border-line p-5">
              <dt className="text-[14px] font-bold text-forest">{locale === "en" ? "Next step" : "下一步"}</dt>
              <dd className="mb-0 mt-2 text-[13.5px] leading-[1.75] text-muted">
                {locale === "en" ? "Search or leave a request, then wait for a pharmacy or pharmacist to confirm." : "搜尋或留下需求，再等待藥局或藥師確認供應與用藥問題。"}
              </dd>
            </div>
          </dl>
          <div className="mt-6 grid gap-5 border-t border-line pt-6 sm:grid-cols-[1fr,1fr]">
            <div>
              <h3 className="m-0 text-[16px] font-bold text-ink">{locale === "en" ? "Sources and freshness" : "資料來源與更新"}</h3>
              <p className="mb-0 mt-2 text-[13px] leading-[1.75] text-muted">
                {locale === "en" ? `Trial catalog and public pharmacy records. This page was last updated ${UPDATED_AT}.` : `試營運藥品目錄與公開藥局資料；本頁最後更新：${UPDATED_AT}。`}{" "}
                <a href={`${SITE_URL}/zh-tw/evidence`} className="text-forest underline underline-offset-2 hover:text-green">
                  {locale === "en" ? "Read product evidence" : "查看產品證據"}
                </a>
              </p>
            </div>
            <div>
              <h3 className="m-0 text-[16px] font-bold text-ink">{locale === "en" ? "Biotech partner" : "生技合作夥伴"}</h3>
              <p className="mb-0 mt-2 text-[13px] leading-[1.75] text-muted">
                {locale === "en" ? "uYao partners with WE STRONG CO., LTD. (維淳有限公司). This does not imply product availability, online sales, or medical endorsement." : "uYao 與維淳有限公司（WeStrong／WE STRONG CO., LTD.）為合作夥伴；這不代表任何商品已有庫存、可在線購買或構成醫療背書。"}{" "}
                <a href={`${SITE_URL}/zh-tw/evidence#partners`} className="text-forest underline underline-offset-2 hover:text-green">
                  {locale === "en" ? "Partnership evidence" : "合作與證據"}
                </a>
                {" · "}
                <a href="https://taiwanwestrong.com/info.html" className="text-forest underline underline-offset-2 hover:text-green">
                  {locale === "en" ? "Public website" : "公開網站"}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-forest text-white">
        <div className="shop-shell py-14 sm:py-20">
          <div className="max-w-[700px] border-l border-green pl-5 sm:pl-7">
          <p className="num m-0 text-[11px] font-semibold tracking-[.14em] text-[#A9B5AA]">FOR PHARMACIES</p>
          <h2 className="editorial-display mb-0 mt-3 text-[34px] sm:text-[44px]">{locale === "en" ? "Run an independent pharmacy?" : "開藥局的？"}</h2>
          <p className="mt-3 text-[15px] leading-[1.8] text-[#C4CEC7]">
            {locale === "en" ? "A small box connects to your existing scanner, captures batch and expiry evidence during receiving, and sends the next action in LINE without changing the in-store workflow." : "一個小盒子串在你現有的條碼掃描器上，自動記下每批藥的效期。快過退貨期限就用 LINE 提醒你，店內流程一個字都不用改。"}
          </p>
          <Link
            href={localizedPath("/pharmacy", locale)}
            className="mt-5 inline-flex min-h-12 items-center bg-paper px-5 text-[13px] font-bold text-forest no-underline hover:bg-surface-hover"
          >
            {locale === "en" ? "See how the box works →" : "看盒子怎麼運作 →"}
          </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

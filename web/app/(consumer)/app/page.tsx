import type { Metadata } from "next";
import Link from "next/link";

import { AreaSwitch } from "@/components/AreaSwitch";
import { CatalogCarousel } from "@/components/CatalogCarousel";
import { JsonLd } from "@/components/JsonLd";
import { SearchInput } from "@/components/SearchInput";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PartnerMarquee } from "@/components/landing/PartnerMarquee";
import { allDrugs, toAreaSlug } from "@/lib/data";
import { CATALOG_GROUPS } from "@/lib/catalog-groups";
import { drugCopy, localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { PARTNER_STORE_ITEMS } from "@/lib/partner-stores";
import {
  CONSUMER_DESCRIPTION,
  SITE_URL,
  STORE_URL,
  consumerWebPageJsonLd,
  consumerWebSiteJsonLd,
  organizationJsonLd,
  socialPreviewImages,
} from "@/lib/seo";
import { consumerIndexablePageRobots } from "@/lib/seo-server";
import { SHOP_URL } from "@/lib/shop";

const UPDATED_AT = "2026-08-12";
const HOME_CABINET_SLUGS = [
  "greenplus-elgucare",
  "chungchi-yiyuansu-gastrodia-100",
  "yuanding-puregps-defense-450",
] as const;

// `/app` 只保留為內部 implementation route；公開 canonical 是主網域的
// `/zh-tw` 與 `/en`，由 proxy rewrite 到這裡。
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
  const drugs = allDrugs();
  // 有商品圖的排前面 —— 橫向列第一眼要看到商品，不是一排文字卡。
  // 同組內維持目錄原順序，才不會每次進站順序都在跳。
  const catalogRail = [...drugs].sort(
    (a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)),
  );
  // 上層櫃格只放少量真實品項作為瀏覽入口；完整目錄仍在下方，
  // 避免把陳列品誤讀成搜尋結果或即時推薦。
  const shelfDrugs = HOME_CABINET_SLUGS.flatMap((slug) => {
    const drug = drugs.find((item) => item.slug === slug);
    return drug?.image ? [drug] : [];
  });
  const steps = locale === "en" ? STEPS_EN : STEPS_ZH;

  return (
    <>
      <JsonLd nodes={[
        organizationJsonLd(),
        consumerWebSiteJsonLd(locale),
        consumerWebPageJsonLd(locale),
      ]} />
      <div className="medicine-cabinet-stage relative">
        <SiteHeader showSearch={false} area={area} preserveAreaPath locatable tone="cabinet" />

        {/* 商品與櫃體共用同一張陳列影像；透明熱區提供品項連結，問藥入口嵌在下層牆面。 */}
        <section className="medicine-cabinet-hero overflow-hidden border-b border-line">
          <nav
            className="medicine-cabinet-products"
            aria-label={locale === "en" ? "Browse items in the cabinet" : "瀏覽藥櫃品項"}
          >
            {shelfDrugs.map((drug) => {
              const copy = drugCopy(drug, locale);
              return (
                <Link
                  key={drug.slug}
                  href={`${localizedPath(`/drug/${drug.slug}`, locale)}?area=${area}`}
                  className="medicine-cabinet-product relative min-w-0 no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                >
                  <span className="sr-only">{copy.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="medicine-cabinet-search min-w-0">
            <p className="medicine-cabinet-kicker m-0 font-bold text-oxblood">
              {locale === "en" ? "YOUR HOUSEHOLD MEDICINE CABINET, NOW WITH ANSWERS" : "家裡的藥箱，現在會找答案"}
            </p>
            <h1 className="editorial-display medicine-cabinet-heading mb-0 mt-2 leading-[1.06] text-ink">
              {locale === "en" ? "Open uYao. Ask before you go." : "打開 uYao，先問再出門。"}
            </h1>
            <p className="medicine-cabinet-copy mb-0 mt-3 text-ink-2">
              {locale === "en"
                ? "Tell uYao what your household needs. We organize the request, then a pharmacist confirms the next step."
                : "你說家裡需要什麼，uYao 整理需求，再由藥師確認下一步。"}
            </p>
            <SearchInput size="xl" area={area} submitLabel={locale === "en" ? "Ask uYao" : "問 uYao"} className="medicine-cabinet-input mt-5 w-full shadow-none" />
            <div className="mt-3 md:hidden">
              <AreaSwitch area={area} preservePath locatable compact />
            </div>
          </div>
        </section>
      </div>

      <PartnerMarquee
        id="pharmacies"
        items={PARTNER_STORE_ITEMS}
        locale={locale}
        evidenceHref={`${SITE_URL}${locale === "en" ? "/en" : "/zh-tw"}/evidence#partners`}
      />

      {/* 首頁直接橫向瀏覽整個目錄；要搜尋與篩選時再進列表頁。 */}
      <section id="catalog" className="scroll-mt-20 bg-paper">
        <div className="shop-shell py-12 sm:py-16">
          <div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end lg:gap-12">
            <div>
              <p className="shop-kicker m-0">
                {locale === "en" ? `BROWSE THE SHELF / ${drugs.length} ITEMS` : `逛逛藥局貨架 / ${drugs.length} 項`}
              </p>
              <h2 className="editorial-display mb-0 mt-3 text-[36px] leading-[1.12] sm:text-[48px]">
                {locale === "en" ? "Browse first. Let uYao ask next." : "先逛品項，再交給 uYao 去問。"}
              </h2>
            </div>
            <p className="m-0 border-l border-oxblood pl-4 text-[13.5px] leading-[1.7] text-muted sm:text-[14px]">
              {locale === "en"
                ? "These are browsable catalog records, not live inventory or recommendations. A pharmacy still confirms supply and pickup."
                : "這裡是可瀏覽的品項資料，不代表即時庫存或推薦。是否供應與到店安排，仍由藥局確認。"}
            </p>
          </div>
          <nav aria-label={locale === "en" ? "Catalog categories" : "品項分類"} className="mb-7 flex overflow-x-auto border-y border-line">
            {CATALOG_GROUPS.map((group) => (
              <Link
                key={group.slug}
                href={`${localizedPath("/category/partner-item", locale)}?area=${area}&group=${group.slug}`}
                className="inline-flex min-h-12 shrink-0 items-center border-r border-line px-4 text-[13px] font-semibold text-forest no-underline transition-colors hover:bg-surface sm:px-5 sm:text-[14px]"
              >
                {locale === "en" ? group.nameEn : group.name}
              </Link>
            ))}
          </nav>
          {/* 整個目錄橫向瀏覽：有圖的品項排前面，讓第一眼就看到商品而不是文字卡。 */}
          <CatalogCarousel
            drugs={catalogRail}
            area={area}
            locale={locale}
            label={locale === "en" ? "Catalog items" : "目錄品項"}
          />
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

      <section className="bg-paper">
        <div className="shop-shell py-14 sm:py-20">
          <h2 className="editorial-display mb-7 mt-0 text-[32px] leading-[1.25] sm:text-[40px]">{locale === "en" ? "Three steps to the next reliable action" : "三步找到可靠的下一步"}</h2>
          <ol className="m-0 grid list-none gap-7 p-0 sm:grid-cols-3 sm:gap-10">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="flex gap-4"
            >
              <span className="num flex-none text-[24px] font-semibold text-oxblood">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="text-[17px] font-bold text-ink">{s.title}</div>
                <p className="mt-2 text-[14.5px] leading-[1.7] text-muted">{s.body}</p>
              </div>
            </li>
          ))}
          </ol>
          <p className="mt-7 text-[14px] leading-[1.6] text-muted-2">
            {locale === "en" ? "How should I read availability?" : "庫存狀態怎麼讀？"}
            <Link href={localizedPath("/stock-badges", locale)} className="-my-3 ml-1 inline-flex min-h-11 items-center text-green">
              {locale === "en" ? "Read the freshness labels →" : "看徽章分級說明 →"}
            </Link>
          </p>
        </div>
      </section>

      <section className="bg-ivory" aria-labelledby="consumer-answer-heading">
        <div className="shop-shell py-14 sm:py-20">
          <h2 id="consumer-answer-heading" className="editorial-display mb-5 mt-0 text-[30px] leading-[1.25] [text-wrap:balance] sm:text-[40px]">
            {locale === "en" ? "What can this service help you confirm?" : "現在可以幫你確認哪些資訊？"}
          </h2>
          <p className="m-0 max-w-[760px] text-[16px] leading-[1.85] text-ink-2">
            {CONSUMER_DESCRIPTION[locale]}
          </p>
          <dl className="mt-8 grid gap-7 sm:grid-cols-3 sm:gap-10">
            <div>
              <dt className="text-[14px] font-bold text-forest">{locale === "en" ? "Known" : "目前可確認"}</dt>
              <dd className="mb-0 mt-2 text-[14px] leading-[1.75] text-muted">
                {locale === "en" ? "Trial catalog records, public pharmacy listings, and the request you submit." : "試營運目錄、公開藥局收錄資料，以及你送出的找藥需求。"}
              </dd>
            </div>
            <div>
              <dt className="text-[14px] font-bold text-forest">{locale === "en" ? "Not yet known" : "目前不能確認"}</dt>
              <dd className="mb-0 mt-2 text-[14px] leading-[1.75] text-muted">
                {locale === "en" ? "Live stock, guaranteed availability, price, hold time, or medical suitability." : "即時庫存、保證供應、價格、保留時間或個人是否適合使用。"}
              </dd>
            </div>
            <div>
              <dt className="text-[14px] font-bold text-forest">{locale === "en" ? "Next step" : "下一步"}</dt>
              <dd className="mb-0 mt-2 text-[14px] leading-[1.75] text-muted">
                {locale === "en" ? "Search or leave a request, then wait for a pharmacy or pharmacist to confirm." : "搜尋或留下需求，再等待藥局或藥師確認供應與用藥問題。"}
              </dd>
            </div>
          </dl>
          <details className="mt-8 max-w-[900px] bg-paper px-5 py-4">
            <summary className="cursor-pointer text-[14px] font-bold text-forest">
              {locale === "en" ? "Sources and freshness" : "資料來源與更新說明"}
            </summary>
            <div className="mt-5 max-w-[38em]">
              <h3 className="m-0 text-[16px] font-bold text-ink">{locale === "en" ? "Sources and freshness" : "資料來源與更新"}</h3>
              <p className="mb-0 mt-2 text-[14px] leading-[1.75] text-muted">
                {locale === "en" ? `Trial catalog and public pharmacy records. This page was last updated ${UPDATED_AT}.` : `試營運藥品目錄與公開藥局資料；本頁最後更新：${UPDATED_AT}。`}{" "}
                <a href={`${SITE_URL}/zh-tw/evidence`} className="text-forest underline underline-offset-2 hover:text-green">
                  {locale === "en" ? "Read product evidence" : "查看產品證據"}
                </a>
              </p>
            </div>
          </details>
        </div>
      </section>

      <section id="store-os-bridge" className="bg-sage text-ink" aria-labelledby="store-os-bridge-heading">
        <div className="shop-shell grid gap-10 py-14 sm:py-20 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
          <div className="border-l border-green pl-5 sm:pl-7">
            <p className="m-0 text-[14px] font-bold text-forest">{locale === "en" ? "FOR PARTNER PHARMACIES" : "給合作藥局"}</p>
            <h2 id="store-os-bridge-heading" className="editorial-display mb-0 mt-3 text-[34px] leading-[1.2] sm:text-[44px]">
              {locale === "en" ? "You ask. A pharmacist takes over in Store OS." : "你提出需求，藥師在 Store OS 接手。"}
            </h2>
            <p className="mb-0 mt-4 text-[15px] leading-[1.8] text-ink-2">
              {locale === "en" ? "uYao organizes the request and safety answers. With your consent, a partner pharmacy can review the source, confirm supply, and reply with the next step." : "uYao 先整理你的需求與安全問答；取得你的同意後，合作藥局可在 Store OS 查看來源、確認供應並回覆下一步。"}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`${localizedPath("/pharmacy", locale)}#store-os-preview`}
                className="inline-flex min-h-12 items-center bg-paper px-5 text-[14px] font-bold text-forest no-underline hover:bg-surface-hover"
              >
                {locale === "en" ? "How Store OS works →" : "了解 Store OS 如何運作 →"}
              </Link>
              <a
                href={STORE_URL}
                className="inline-flex min-h-12 items-center border border-forest px-5 text-[14px] font-bold text-forest no-underline hover:border-green hover:text-green"
              >
                {locale === "en" ? "Partner sign in ↗" : "合作藥局登入 ↗"}
              </a>
            </div>
          </div>
          <ol className="m-0 grid list-none border-l border-t border-forest/25 p-0 sm:grid-cols-3 lg:grid-cols-1">
            {[
              locale === "en" ? ["01", "Request", "The consumer describes a product, ingredient, or wellness need."] : ["01", "提出需求", "消費者描述品項、成分或日常保養方向。"],
              locale === "en" ? ["02", "Consent", "Only an approved handoff sends the relevant context to a partner pharmacy."] : ["02", "同意交接", "只有在你同意後，相關資訊才會交給合作藥局。"],
              locale === "en" ? ["03", "Pharmacist decision", "Store OS organizes the work; supply and guidance stay with the pharmacist."] : ["03", "藥師確認", "Store OS 整理工作；供應與專業判斷仍由藥師負責。"],
            ].map(([number, title, body]) => (
              <li key={number} className="grid gap-2 border-b border-r border-forest/25 bg-paper/45 p-5 sm:grid-rows-[auto_auto_1fr] lg:grid-cols-[48px_140px_1fr] lg:items-start lg:gap-5">
                <span className="num text-[12px] font-bold text-green">{number}</span>
                <strong className="text-[14px] text-ink">{title}</strong>
                <span className="text-[13px] leading-[1.7] text-ink-2">{body}</span>
              </li>
            ))}
          </ol>
          </div>
      </section>

      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/JsonLd";
import { ShopSpatialExperience } from "@/components/ShopSpatialExperience";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { allDrugs, getArea, toAreaSlug } from "@/lib/data";
import { areaCopy, localizedPath } from "@/lib/i18n";
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
  const drugs = allDrugs();
  // 有商品圖的排前面 —— 橫向列第一眼要看到商品，不是一排文字卡。
  // 同組內維持目錄原順序，才不會每次進站順序都在跳。
  const catalogRail = [...drugs].sort(
    (a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)),
  );
  const currentArea = areaCopy(getArea(area), locale);
  const steps = locale === "en" ? STEPS_EN : STEPS_ZH;

  return (
    <div className="shop-pearl-home">
      <JsonLd nodes={[consumerWebSiteJsonLd(locale), consumerWebPageJsonLd(locale)]} />
      <SiteHeader showSearch={false} area={area} preserveAreaPath locatable presentation="pearl" />

      <ShopSpatialExperience
        drugs={catalogRail}
        area={area}
        locale={locale}
        areaName={currentArea.name}
        partnerStores={PARTNER_STORE_ITEMS}
        partnerEvidenceHref={`${SITE_URL}${locale === "en" ? "/en" : "/zh-tw"}/evidence#partners`}
      />

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

      <section className="bg-sage text-ink">
        <div className="shop-shell py-14 sm:py-20">
          <div className="max-w-[700px] border-l border-green pl-5 sm:pl-7">
          <p className="m-0 text-[14px] font-bold text-forest">{locale === "en" ? "For pharmacies" : "給藥局"}</p>
          <h2 className="editorial-display mb-0 mt-3 text-[34px] sm:text-[44px]">{locale === "en" ? "Run an independent pharmacy?" : "開藥局的？"}</h2>
          <p className="mt-3 text-[15px] leading-[1.8] text-ink-2">
            {locale === "en" ? "A small box connects to your existing scanner, captures batch and expiry evidence during receiving, and creates the next action in Store OS." : "一個小盒子串在你現有的條碼掃描器上，自動記下每批藥的效期。快過退貨期限就送進 Store OS，並可提醒已開啟通知的裝置。"}
          </p>
          <Link
            href={localizedPath("/pharmacy", locale)}
            className="mt-5 inline-flex min-h-12 items-center bg-paper px-5 text-[14px] font-bold text-forest no-underline hover:bg-surface-hover"
          >
            {locale === "en" ? "See how the box works →" : "看盒子怎麼運作 →"}
          </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

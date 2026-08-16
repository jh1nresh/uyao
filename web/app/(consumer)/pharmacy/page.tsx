import type { Metadata } from "next";
import Link from "next/link";

import { PilotForm } from "@/components/PilotForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { indexablePageRobots } from "@/lib/seo-server";
import { SHOP_URL } from "@/lib/shop";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const robots = await indexablePageRobots();
  const alternates = {
    canonical: locale === "en" ? "/en/pharmacy" : "/zh-tw/pharmacy",
    languages: {
      "zh-TW": "/zh-tw/pharmacy",
      en: "/en/pharmacy",
      "x-default": "/zh-tw/pharmacy",
    },
  };
  return locale === "en"
    ? {
        title: { absolute: "Pharmacy pilot | Expiry, return, reorder, and demand workflows | uYao" },
        description: "Expiry and local demand signals from the scanner workflow pharmacies already use, with actions delivered in Store OS.",
        alternates,
        robots,
      }
    : {
        title: { absolute: "獨立藥局試點｜效期、退貨、補貨與需求工作流｜uYao" },
        description: "效期雷達：快過退貨期限的品項提前 30 天提醒，過期藥從丟錢變退回藥商。一個盒子串在現有條碼掃描器上，掃描流程不用改。",
        alternates,
        robots,
      };
}

const STATS = [
  { value: "30", unit: "天前", label: "退貨窗口關掉前主動警報" },
  { value: "0", unit: "改變", label: "現有掃描流程不動" },
  { value: "5", unit: "分鐘", label: "裝上就開始" },
];

export default async function PharmacyPage() {
  const locale = await getRequestLocale();
  const stats = locale === "en"
    ? [
        { value: "30", unit: "days", label: "warning before a return window closes" },
        { value: "0", unit: "changes", label: "to the existing scan workflow" },
        { value: "5", unit: "min", label: "to install the pilot box" },
      ]
    : STATS;
  return (
    <>
      <SiteHeader showSearch={false} />

      <section className="shop-shell max-w-[960px] py-12 sm:py-16">
        <p className="shop-kicker mb-3">FOR PHARMACY OWNERS</p>
        <h1 className="editorial-display m-0 max-w-[14em] text-[36px] leading-[1.22] sm:text-[48px]">
          {locale === "en" ? "Expired medicine should not become disposal cost" : "過期藥不該是丟錢，還要再付清運費"}
        </h1>
        <p className="mt-2.5 text-[15px] leading-[1.75] text-muted">
          {locale === "en" ? "uYao captures lot and expiry data from receiving scans, then creates the next action in Store OS before a supplier return window closes." : "效期雷達 — 快過退貨期限的品項，在窗口關掉前主動提醒你。過期藥從「丟錢 + 付清運費」變成「退回藥商」。"}
        </p>

        <div className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="border-t-2 border-green pt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="num text-[30px] font-black leading-none text-ink">
                  {s.value}
                </span>
                <span className="text-[16px] font-black text-ink">{s.unit}</span>
              </div>
              <div className="mt-2 text-xs leading-[1.5] text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="shop-shell max-w-[960px] py-10 sm:py-12">
          <h2 className="editorial-display mb-4 text-[28px]">{locale === "en" ? "What the box does" : "盒子做什麼"}</h2>
          <p className="text-[15px] leading-[1.8] text-ink-2">
            {locale === "en" ? <>A small inline box sits between the existing barcode scanner and POS. Receiving and dispensing continue normally. It records lot and expiry data, then creates time-sensitive work in Store OS and can alert subscribed devices.</> : <>一個小盒子串在你現有的條碼掃描器和電腦之間。對電腦來說它就是原本那支掃描器，進貨、調劑照掃。盒子在旁邊把每批藥的效期記下來 —— 快過退貨期限就送進 Store OS，並可提醒已開啟通知的裝置。</>}
          </p>
        </div>
      </section>

      <section>
        <div className="shop-shell max-w-[960px] py-10 sm:py-12">
          <h2 className="editorial-display mb-4 text-[28px]">{locale === "en" ? "Turn receiving scans into local availability" : "順便被附近的人搜到"}</h2>
          <p className="mb-3 text-[15px] leading-[1.8] text-ink-2">
            {locale === "en" ? "The same receiving scan becomes a fresh availability signal. Nearby customers can see that the item was " : "同一批掃描紀錄會變成你店裡的現貨狀態。附近的人搜一個藥，看到你這裡"}
            {/* 內文連結加底線：只靠綠色跟周圍文字的對比不到 3:1，色盲看不出是連結 */}
            <Link href={localizedPath("/stock-badges", locale)} className="mx-1 text-green underline underline-offset-2">
              {locale === "en" ? "received today" : "今日掃描確認"}
            </Link>
            {locale === "en" ? "and reserve it for pharmacist-confirmed pickup. This is not e-commerce." : "就會按預留、到店付款取貨 —— 不是網購，藥師照樣當面交付。"}
          </p>
          <p className="text-[13px] leading-[1.7] text-muted-2">
            {locale === "en" ? "We never claim an exact quantity; we show only signal freshness." : "我們永遠不顯示確切數量，只顯示掃描新鮮度。"}
            <Link href={`${SHOP_URL}${localizedPath("/", locale)}`} className="ml-1 text-green underline underline-offset-2">
              {locale === "en" ? "See the consumer experience →" : "看消費端長什麼樣 →"}
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-line bg-paper">
        <div className="shop-shell max-w-[960px] py-10 sm:py-12">
          <h2 className="editorial-display mb-1 text-[28px]">{locale === "en" ? "Apply for a free pilot" : "申請免費試點"}</h2>
          <p className="mb-3.5 text-[13px] text-muted-2">
            {locale === "en" ? "We install the box in about five minutes." : "我們帶盒子到店裡接上，現場大約 5 分鐘。"}
          </p>
          <PilotForm />
        </div>
      </section>

      <section className="border-t border-line">
        <div className="shop-shell max-w-[960px] py-8">
        <div className="border border-line bg-surface px-5 py-4 text-[15px] leading-[1.7] text-ink-2">
          <div className="mb-1 font-bold text-ink">{locale === "en" ? "Already a partner pharmacy?" : "已經是合作藥局？"}</div>
          {locale === "en" ? "Reservation decisions arrive under Needs you in Store OS. One tap confirms the hold, and optional Web Push alerts subscribed devices when Store OS is closed." : "預留確認直接進 Store OS 的「需要你」：消費者送出預留後，店家在同一個工作面確認；Store OS 關閉時可用 Web Push 提醒已訂閱裝置。"}
        </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

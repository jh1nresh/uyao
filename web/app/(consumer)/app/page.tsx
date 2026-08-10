import type { Metadata } from "next";
import Link from "next/link";

import { AreaSwitch } from "@/components/AreaSwitch";
import { SearchInput } from "@/components/SearchInput";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  CATEGORIES,
  allStores,
  allDrugs,
  drugsInCategory,
  getArea,
  storesInArea,
  toAreaSlug,
} from "@/lib/data";

// 消費端 app 入口從 `/` 搬到 `/app`：`/` 現在是公司 landing（specs/company-landing）。
// 搜尋、地區參數與所有下游路由行為不變。
export const metadata: Metadata = {
  title: "搜一個藥，看附近哪家藥局有貨",
  description:
    "搜藥品名或症狀，看附近藥局現在有沒有貨，按預留到店取。庫存來自藥局店內掃描，不做線上交易。",
};

const STEPS = [
  { title: "搜尋", body: "輸入藥名或症狀，看附近哪幾家藥局現在有貨。" },
  { title: "預留", body: "一鍵預留，藥局確認後為你保留 4 小時。" },
  { title: "到店取", body: "到店付款，由藥師當面交付 — 不做線上交易。" },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const { area: rawArea } = await searchParams;
  const area = toAreaSlug(rawArea);
  const storeCount = storesInArea(area).length;
  const partnerStores = allStores();
  const drugs = allDrugs();

  return (
    <>
      <SiteHeader showSearch={false} area={area} preserveAreaPath locatable />

      {/*
        第一屏只有一件事：搜尋。
        原本這裡列了該區 91 家藥局 —— 那是目錄不是產品，而且連電話鈕都沒有
        （`showPhone` 預設 false），使用者看完什麼也做不了。更糟的是它定義了
        第一印象「這是藥局名錄」，而名錄 Google Maps 做得更好。
        藥局家數留下來當可信度證據，但收成一行字。
      */}
      <section className="flex min-h-[calc(100svh-6rem)] flex-col items-center justify-center bg-ivory px-4 py-16 text-center sm:px-7 sm:py-20">
        <p className="num mb-5 mt-0 text-[11.5px] font-semibold tracking-[.14em] text-green">
          NEARBY SEARCH · RESERVE · PICK UP
        </p>
        <h1 className="editorial-display m-0 text-[clamp(38px,6vw,58px)] leading-[1.16]">
          搜一個藥，看附近哪家有貨
        </h1>
        <p className="mt-5 max-w-[520px] text-[15px] leading-[1.75] text-muted sm:text-base">
          不用先跑三家藥局 — 查到就預留，到店取貨付款
        </p>

        <SearchInput size="lg" area={area} className="mt-10 w-full max-w-[700px]" />

        <nav
          aria-label="品類"
          className="mt-4 flex w-full max-w-[680px] flex-wrap justify-center gap-2"
        >
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}?area=${area}`}
              className="flex min-h-11 items-center gap-2 border border-line bg-paper px-4 text-xs font-medium text-ink no-underline hover:border-green hover:text-green"
            >
              {c.name}
              <span className="num text-[13px] text-muted-2">
                {drugsInCategory(c.slug).length}
              </span>
            </Link>
          ))}
        </nav>

        <p className="mt-11 max-w-[560px] text-[13px] leading-[1.75] text-muted-2">
          即時庫存還沒開始 —— {getArea(area).shortName}目前收錄 {storeCount} 家店家，
          但還沒有店家裝上盒子。先搜搜看，我們會記下你在找什麼。
        </p>
        <div className="mt-3 md:hidden">
          <AreaSwitch area={area} preservePath locatable />
        </div>
      </section>

      <section className="border-t border-line bg-paper px-4 py-12 sm:px-7 sm:py-16 xl:px-12 2xl:px-16">
        <div className="mb-4 flex flex-wrap items-baseline gap-2.5">
          <h2 className="text-sm font-black">首波收錄店家</h2>
          <p className="text-[13px] text-muted-2">共 {partnerStores.length} 家；尚未啟用即時庫存</p>
        </div>
        <div className="grid border border-line bg-ivory sm:grid-cols-2 lg:grid-cols-3">
          {partnerStores.map((store) => (
            <Link
              key={store.slug}
              href={`/store/${store.slug}`}
              className="flex min-h-20 flex-col justify-center border-b border-line-soft px-4 py-3 no-underline last:border-b-0 hover:bg-surface-hover sm:border-r sm:last:border-r-0 lg:[&:nth-child(3n)]:border-r-0"
            >
              <span className="text-[13px] text-green">{store.district}</span>
              <span className="mt-0.5 text-[15px] font-bold text-ink">{store.name}</span>
              <span className="mt-0.5 text-[13px] leading-[1.5] text-muted">{store.address}</span>
            </Link>
          ))}
        </div>
        <p className="mb-0 mt-3 text-[13px] leading-[1.6] text-muted-2">
          收錄不代表已正式合作、已安裝設備或已有即時庫存；前往門市前請先電話確認。
        </p>
      </section>

      {/* 陳列「藥品」而不是「藥局」：藥品才是產品的單位（搜一個藥 → 誰有貨），
          而且點進去就是 SEO 入口頁。 */}
      <section className="border-t border-line bg-ivory px-4 py-12 sm:px-7 sm:py-16 xl:px-12 2xl:px-16">
        <div className="mb-3 flex flex-wrap items-baseline gap-2.5">
          <h2 className="text-sm font-black">常見品項</h2>
          <p className="text-[13px] text-muted-2">點一支看附近哪家有貨</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {drugs.map((d) => (
            <Link
              key={d.slug}
              href={`/drug/${d.slug}?area=${area}`}
              className="flex flex-col justify-center gap-1 border border-line bg-paper px-3.5 py-3 no-underline hover:border-green"
            >
              <span className="text-[15px] font-medium text-ink">{d.name}</span>
              <span className="text-[13px] text-muted-2">
                {d.spec} · {d.drugClass}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-paper px-4 py-12 sm:px-7 sm:py-16 xl:px-12 2xl:px-16">
        <h2 className="mb-3 text-sm font-black">怎麼拿到藥</h2>
        <ol className="m-0 grid list-none border border-line p-0 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="flex gap-3 border-b border-line-soft px-4 py-3.5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
            >
              <span className="num flex-none text-[15px] font-bold text-green">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="text-[15px] font-bold text-ink">{s.title}</div>
                <p className="mt-0.5 text-[13px] leading-[1.6] text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[13px] leading-[1.6] text-muted-2">
          庫存狀態怎麼讀？
          <Link href="/stock-badges" className="ml-1 text-green">
            看徽章分級說明 →
          </Link>
        </p>
      </section>

      <section className="border-t border-line bg-forest px-4 py-12 text-white sm:px-7 sm:py-16 xl:px-12 2xl:px-16">
        <div className="max-w-[620px]">
          <h2 className="editorial-display text-[28px]">開藥局的？</h2>
          <p className="mt-3 text-[15px] leading-[1.8] text-[#C4CEC7]">
            一個小盒子串在你現有的條碼掃描器上，自動記下每批藥的效期。
            快過退貨期限就用 LINE 提醒你 —— 店內流程一個字都不用改。
          </p>
          <Link
            href="/pharmacy"
            className="mt-5 inline-flex min-h-12 items-center bg-paper px-5 text-[13px] font-bold text-forest no-underline hover:bg-white"
          >
            看盒子怎麼運作 →
          </Link>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

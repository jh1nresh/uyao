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
      <section className="border-b border-line bg-ivory">
        <div className="shop-shell flex flex-col pb-14 pt-12 sm:pb-20 sm:pt-16 lg:pb-24 lg:pt-20">
          <div className="mx-auto w-full max-w-[1120px] text-center">
            <p className="shop-kicker mb-5 mt-0">NEARBY SEARCH · RESERVE · PICK UP</p>
            <h1 className="editorial-display m-0 text-[clamp(40px,4.4vw,62px)] leading-[1.08]">
              不用先知道藥名。從症狀開始找。
            </h1>
            <p className="mx-auto mt-5 max-w-[620px] text-[15px] leading-[1.8] text-ink-2 sm:text-[16px]">
              輸入哪裡不舒服或想改善的問題，我們整理相關的非處方藥品與附近藥局；到店再由藥師確認。
            </p>
          </div>

          <div className="search-hero-panel relative mx-auto mt-9 w-full max-w-5xl">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
              <div>
                <p className="num m-0 text-[11px] font-semibold tracking-[.12em] text-green">
                  {getArea(area).shortName} · PHARMACY SEARCH
                </p>
                <h2 className="editorial-display mb-0 mt-2 text-[25px] leading-[1.25] text-forest sm:text-[30px]">
                  今天哪裡不舒服？
                </h2>
              </div>
              <p className="m-0 max-w-[360px] text-[13px] leading-[1.7] text-muted">
                也可以直接輸入藥名或主成分。
              </p>
            </div>

            <div className="search-hero-field mt-7">
              <SearchInput size="xl" area={area} className="w-full shadow-none" />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-muted">
              <span className="num tracking-[.08em]">快速開始</span>
              <nav aria-label="品類" className="contents">
                {CATEGORIES.map((c, index) => (
                  <Link
                    key={c.slug}
                    href={`/category/${c.slug}?area=${area}`}
                    className="search-hero-option history-link inline-flex min-h-11 items-center gap-2 border-b border-line-strong font-medium text-forest no-underline transition-[border-color,color] hover:border-green hover:text-green"
                    style={{ animationDelay: `${240 + index * 70}ms` }}
                  >
                    {c.name}
                    <span className="num text-muted-2">{drugsInCategory(c.slug).length}</span>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="search-hero-steps mt-5 grid border-y border-line py-4 text-[12px] leading-[1.65] text-muted sm:grid-cols-3">
              <span><b className="num mr-2 text-green">01</b>輸入藥名或症狀</span>
              <span className="mt-2 sm:mt-0"><b className="num mr-2 text-green">02</b>查看附近資料狀態</span>
              <span className="mt-2 sm:mt-0"><b className="num mr-2 text-green">03</b>預留後到店交付</span>
            </div>
          </div>

          <div className="mx-auto mt-6 w-full max-w-5xl">
            <dl className="grid grid-cols-3 border-y border-line py-4">
              <div>
                <dt className="num text-[20px] font-semibold text-forest">4</dt>
                <dd className="mt-1 text-[12px] text-muted">服務區</dd>
              </div>
              <div className="border-l border-line pl-4 sm:pl-6">
                <dt className="num text-[20px] font-semibold text-forest">{partnerStores.length}</dt>
                <dd className="mt-1 text-[12px] text-muted">首波店家</dd>
              </div>
              <div className="border-l border-line pl-4 sm:pl-6">
                <dt className="text-[15px] font-bold text-forest">到店交付</dt>
                <dd className="mt-1 text-[12px] text-muted">藥師確認</dd>
              </div>
            </dl>
            <p className="mb-0 mt-4 text-[12.5px] leading-[1.7] text-muted-2">
              {getArea(area).shortName}目前收錄 {storeCount} 家店家；即時庫存尚未開始，我們會誠實標示資料狀態。
            </p>
            <div className="mt-4 md:hidden">
              <AreaSwitch area={area} preservePath locatable />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper">
        <div className="shop-shell py-14 sm:py-20">
          <p className="shop-kicker mb-3">FIRST PHARMACY NETWORK</p>
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <h2 className="editorial-display m-0 text-[32px] leading-[1.25] sm:text-[40px]">首波收錄店家</h2>
            <p className="m-0 text-[13px] text-muted">共 {partnerStores.length} 家 · 即時庫存尚未啟用</p>
          </div>
          <div className="grid border-l border-t border-line bg-ivory sm:grid-cols-2 lg:grid-cols-3">
          {partnerStores.map((store) => (
            <Link
              key={store.slug}
              href={`/store/${store.slug}`}
              className="history-link group flex min-h-[132px] flex-col justify-between border-b border-r border-line px-5 py-5 no-underline transition-colors hover:bg-surface-hover last:sm:col-span-2"
            >
              <span className="flex items-center justify-between text-[12px] font-medium text-green">
                {store.district}<span className="text-forest transition-transform group-hover:translate-x-1">→</span>
              </span>
              <span>
                <span className="block text-[18px] font-bold text-ink">{store.name}</span>
                <span className="mt-1 block text-[13px] leading-[1.55] text-muted">{store.address}</span>
              </span>
            </Link>
          ))}
          </div>
          <p className="mb-0 mt-4 max-w-[760px] text-[13px] leading-[1.7] text-muted-2">
            收錄不代表已正式合作、已安裝設備或已有即時庫存；前往門市前請先電話確認。
          </p>
        </div>
      </section>

      {/* 陳列「藥品」而不是「藥局」：藥品才是產品的單位（搜一個藥 → 誰有貨），
          而且點進去就是 SEO 入口頁。 */}
      <section className="border-t border-line bg-ivory">
        <div className="shop-shell py-14 sm:py-20">
          <p className="shop-kicker mb-3">COMMON ITEMS</p>
          <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
            <h2 className="editorial-display m-0 text-[32px] leading-[1.25] sm:text-[40px]">常見品項</h2>
            <p className="m-0 text-[13px] text-muted">點一支，看附近哪家有登錄</p>
          </div>
          <div className="grid grid-cols-2 border-l border-t border-line sm:grid-cols-3 lg:grid-cols-5">
          {drugs.map((d) => (
            <Link
              key={d.slug}
              href={`/drug/${d.slug}?area=${area}`}
              className="history-link group flex min-h-[112px] flex-col justify-between border-b border-r border-line bg-paper px-4 py-4 no-underline transition-colors hover:bg-surface-hover"
            >
              <span className="text-[16px] font-bold text-ink">{d.name}</span>
              <span className="flex items-end justify-between gap-2 text-[12px] text-muted-2">
                <span>{d.spec} · {d.drugClass}</span>
                <span className="text-forest transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper">
        <div className="shop-shell py-14 sm:py-20">
          <p className="shop-kicker mb-3">HOW IT WORKS</p>
          <h2 className="editorial-display mb-7 mt-0 text-[32px] leading-[1.25] sm:text-[40px]">三步完成，到店交付</h2>
          <ol className="m-0 grid list-none border border-line p-0 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="flex min-h-[150px] gap-5 border-b border-line-soft px-5 py-6 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
            >
              <span className="num flex-none text-[24px] font-semibold text-green">
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
            庫存狀態怎麼讀？
            <Link href="/stock-badges" className="-my-3 ml-1 inline-flex min-h-11 items-center text-green">
              看徽章分級說明 →
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-line bg-forest text-white">
        <div className="shop-shell py-14 sm:py-20">
          <div className="max-w-[700px] border-l border-green pl-5 sm:pl-7">
          <p className="num m-0 text-[11px] font-semibold tracking-[.14em] text-[#A9B5AA]">FOR PHARMACIES</p>
          <h2 className="editorial-display mb-0 mt-3 text-[34px] sm:text-[44px]">開藥局的？</h2>
          <p className="mt-3 text-[15px] leading-[1.8] text-[#C4CEC7]">
            一個小盒子串在你現有的條碼掃描器上，自動記下每批藥的效期。
            快過退貨期限就用 LINE 提醒你 —— 店內流程一個字都不用改。
          </p>
          <Link
            href="/pharmacy"
            className="mt-5 inline-flex min-h-12 items-center bg-paper px-5 text-[13px] font-bold text-forest no-underline hover:bg-surface-hover"
          >
            看盒子怎麼運作 →
          </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

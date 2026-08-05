import Link from "next/link";

import { AreaStores } from "@/components/AreaStores";
import { AreaSwitch } from "@/components/AreaSwitch";
import { SearchInput } from "@/components/SearchInput";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import {
  CATEGORIES,
  drugsInCategory,
  getArea,
  storesInArea,
  toAreaSlug,
} from "@/lib/data";
import { formatDistance } from "@/lib/format";
import { hoursSummary } from "@/lib/hours";

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
  const stores = storesInArea(area);

  return (
    <>
      <SiteHeader showSearch={false} area={area} />

      <section className="flex flex-col items-center gap-5 border-b border-line px-4 pb-8 pt-8 text-center sm:px-7 sm:pb-10 sm:pt-16">
        <h1 className="m-0 text-2xl font-black tracking-[.02em] sm:text-[30px]">
          搜一個藥，看附近哪家有貨
        </h1>
        <p className="-mt-2.5 text-[13px] text-muted">
          不用先跑三家藥局 — 查到就預留，到店取貨付款
        </p>
        <SearchInput size="lg" className="w-full max-w-[560px]" />
        <nav
          aria-label="品類"
          className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:justify-center sm:gap-3"
        >
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="flex items-baseline justify-center gap-2 border border-line-strong px-2 py-2.5 text-xs font-medium text-ink no-underline hover:border-green hover:text-green sm:px-5 sm:text-[13px]"
            >
              {c.name}
              <span className="num text-[11px] text-muted-2">
                {drugsInCategory(c.slug).length}
              </span>
            </Link>
          ))}
        </nav>
      </section>

      <section className="px-4 pb-6 pt-5 sm:px-7">
        <div className="mb-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <h2 className="text-sm font-black">{getArea(area).shortName}的藥局</h2>
          <p className="text-[11px] text-muted-2">
            {stores.length} 家 · 資料來自食藥署與健保署開放資料
          </p>
          {/* header 的切換器在手機上會收起來，這裡補一個 */}
          <div className="md:hidden">
            <AreaSwitch area={area} />
          </div>
        </div>

        {/* 目前還沒有藥局裝盒子，所以這裡列的是「有哪些藥局」而不是「哪裡有貨」。
            庫存徽章要等掃描流才有意義 —— 先不要假裝。 */}
        <p className="mb-2.5 border border-line-strong bg-surface px-3.5 py-2.5 text-[12px] leading-[1.7] text-muted">
          <b className="font-bold text-ink">即時庫存還沒開始</b> ——
          庫存來自藥局店內的掃描器，目前這兩區還沒有藥局裝上盒子。
          先把{getArea(area).shortName} {stores.length} 家藥局的基本資料整理在這裡，
          有藥局加入之後就會顯示「現在有貨」。
          <br />
          <Link href="/pharmacy" className="font-medium text-green">
            開藥局的？看盒子怎麼運作 →
          </Link>
        </p>

        <AreaStores stores={stores} area={area} areaLabel={getArea(area).shortName} />

        <p className="mt-3 text-[11px] leading-[1.6] text-muted-2">
          庫存狀態怎麼讀？<Link href="/stock-badges" className="text-green">看徽章分級說明 →</Link>
        </p>
      </section>

      <section className="px-4 pb-7 sm:px-7">
        <h2 className="mb-2.5 text-sm font-black">怎麼拿到藥</h2>
        <ol className="m-0 grid list-none border border-line p-0 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              className="flex gap-3 border-b border-line-soft px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
            >
              <span className="num flex-none text-[13px] font-bold text-green">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="text-[13px] font-bold text-ink">{s.title}</div>
                <p className="mt-0.5 text-[11.5px] leading-[1.6] text-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] leading-[1.6] text-muted-2">
          開藥局的？<Link href="/pharmacy" className="text-green">看盒子怎麼幫你顧效期 →</Link>
        </p>
      </section>

      <SiteFooter />
    </>
  );
}

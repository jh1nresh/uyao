import Link from "next/link";

import { SearchInput } from "@/components/SearchInput";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StockBadge } from "@/components/StockBadge";
import { CATEGORIES, USER_AREA, drugsInCategory, nearbyInStock } from "@/lib/data";
import { formatDistance, formatFromPrice } from "@/lib/format";

const STEPS = [
  { title: "搜尋", body: "輸入藥名或症狀，看附近哪幾家藥局現在有貨。" },
  { title: "預留", body: "一鍵預留，藥局確認後為你保留 4 小時。" },
  { title: "到店取", body: "到店付款，由藥師當面交付 — 不做線上交易。" },
];

export default function HomePage() {
  const nearby = nearbyInStock();

  return (
    <>
      <SiteHeader showSearch={false} />

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
        <div className="mb-2.5 flex flex-wrap items-baseline gap-2.5">
          <h2 className="text-sm font-black">附近現在有貨</h2>
          <p className="text-[11px] text-muted-2">依今日掃描紀錄 · {USER_AREA}</p>
        </div>

        <div className="border border-line">
          {nearby.map((n) => (
            <div
              key={`${n.drug.slug}-${n.store.slug}`}
              className="border-b border-line-soft last:border-b-0 hover:bg-surface-hover"
            >
              {/* Desktop */}
              <div className="hidden grid-cols-[1fr_200px_110px_150px] items-center gap-x-3 px-3.5 py-2.5 text-[13px] lg:grid">
                <Link href={`/drug/${n.drug.slug}`} className="font-medium text-ink no-underline hover:text-green">
                  {n.drug.name} {n.drug.spec}
                </Link>
                <Link href={`/store/${n.store.slug}`} className="text-xs text-muted no-underline hover:text-ink">
                  {n.store.name} · <span className="num">{formatDistance(n.store.distanceM)}</span>
                </Link>
                <div className="num text-right text-xs text-ink-2">
                  {formatFromPrice(n.priceTwd)}
                </div>
                <StockBadge badge={n.badge} short className="justify-end text-xs" />
              </div>

              {/* Mobile */}
              <Link
                href={`/drug/${n.drug.slug}`}
                className="flex flex-col gap-0.5 px-4 py-2.5 no-underline lg:hidden"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-medium text-ink">
                    {n.drug.name} {n.drug.spec}
                  </span>
                  <div className="flex-1" />
                  <span className="num text-xs font-semibold text-ink">
                    {formatFromPrice(n.priceTwd)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11.5px] text-muted">
                  {n.store.name} · <span className="num">{formatDistance(n.store.distanceM)}</span>
                  <div className="flex-1" />
                  <StockBadge badge={n.badge} short />
                </div>
              </Link>
            </div>
          ))}
        </div>

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

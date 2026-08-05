import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StockBadge } from "@/components/StockBadge";
import { allStores, drugsForStore, getStore } from "@/lib/data";
import { formatDistance, formatPrice } from "@/lib/format";

export function generateStaticParams() {
  return allStores().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = getStore(slug);
  if (!store) return { title: "找不到這家藥局" };
  const items = drugsForStore(store.slug);
  return {
    title: `${store.name} — ${store.address}`,
    description: `${store.name}（${store.address}，${store.phone}）目前有貨的 ${items.length} 項成藥與指示藥、價格與庫存狀態。可線上預留、到店付款取貨。`,
  };
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = getStore(slug);
  if (!store) notFound();

  const items = drugsForStore(store.slug);

  return (
    <>
      <SiteHeader />

      <div className="flex flex-col gap-6 border-b border-line px-4 pb-[22px] pt-6 sm:px-7 lg:flex-row lg:gap-8">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="m-0 text-xl font-black sm:text-2xl">{store.name}</h1>
            <span className="border border-green-tint-line bg-green-tint px-2 py-0.5 text-[11px] font-bold text-green">
              本店可預留
            </span>
            <span className={`text-xs font-medium ${store.isOpen ? "text-green" : "text-muted-2"}`}>
              {store.openLabel}
            </span>
          </div>
          <p className="text-[13px] text-ink-2">
            {store.address} · <span className="num text-xs">{store.phone}</span>
          </p>
          <p className="text-xs text-muted">
            距離你 <span className="num">{formatDistance(store.distanceM)}</span>
            {store.notes.map((n) => ` · ${n}`)}
          </p>
          <div className="mt-1.5 flex gap-2.5">
            <a
              href={store.mapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center border border-green px-3.5 py-[7px] text-xs font-bold text-green no-underline"
            >
              在 Google Maps 開啟 ↗
            </a>
            <a
              href={`tel:${store.phone.replace(/-/g, "")}`}
              className="inline-flex items-center border border-line-strong px-3.5 py-[7px] text-xs font-medium text-ink-2 no-underline"
            >
              撥打電話
            </a>
          </div>
        </div>

        <div className="w-full flex-none border border-line px-3.5 py-3 text-xs text-ink-2 lg:w-60">
          <div className="mb-1.5 font-bold text-ink">營業時段</div>
          <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-[3px]">
            {store.hours.map((h) => (
              <div key={h.label} className="contents">
                <dt>{h.label}</dt>
                <dd className={`num text-[11.5px] ${h.hours === "公休" ? "text-muted-2" : ""}`}>
                  {h.hours}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 border-t border-line-soft pt-2 text-[11px] text-muted-2">
            庫存最後同步：{store.lastSyncLabel}
          </p>
        </div>
      </div>

      <section className="px-4 pb-[26px] pt-5 sm:px-7">
        <div className="mb-2.5 flex flex-wrap items-baseline gap-2.5">
          <h2 className="text-sm font-black">本店有貨商品</h2>
          <p className="text-[11px] text-muted-2">
            {items.length} 項 · 全部可預留，到店付款
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <Link
              key={it.drug.slug}
              href={`/drug/${it.drug.slug}`}
              className="flex flex-col gap-[5px] border border-line px-3.5 py-3 no-underline hover:border-green"
            >
              <span className="text-[13px] font-medium text-ink">{it.drug.name}</span>
              <span className="text-[11px] text-muted-2">
                {it.drug.spec} · {it.drug.drugClass}
              </span>
              <span className="mt-0.5 flex items-center gap-2">
                <span className="num text-[13px] font-semibold text-ink">
                  {formatPrice(it.priceTwd)}
                </span>
                <span className="flex-1" />
                <StockBadge badge={it.badge} short className="text-[11px]" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter note="價格與庫存由藥局提供與盒子掃描更新，實際以門市為準。處方藥請至門市洽詢藥師。" />

      <script
        type="application/ld+json"
        // 每家藥局免費得到一個會被 Google 索引的網頁 — NAP 結構化。
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Pharmacy",
            name: store.name,
            address: { "@type": "PostalAddress", streetAddress: store.address, addressCountry: "TW" },
            telephone: store.phone,
            url: `https://uyao.tw/store/${store.slug}`,
          }),
        }}
      />
    </>
  );
}

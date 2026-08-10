import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StockBadge } from "@/components/StockBadge";
import { PreviewShelf } from "@/components/PreviewShelf";
import { StorePreviewBanner } from "@/components/StorePreviewBanner";
import { drugsForStore } from "@/lib/data";
import type { Store } from "@/lib/types";
import { formatDistance } from "@/lib/format";
import {
  businessStatusWarning,
  hoursNote,
  hoursTitle,
  nhiTerminationNote,
} from "@/lib/hours";

/**
 * 藥局頁本體。`preview` 由路由決定而不是 query string —— 用 searchParams
 * 會讓整條 /store/[slug] 變成動態渲染，店家 SEO 頁面就靜態不了了。
 */
export function StoreView({ store, preview }: { store: Store; preview: boolean }) {
  const items = drugsForStore(store.slug, preview);

  const statusWarning = businessStatusWarning(store);
  const nhiNote = nhiTerminationNote(store);

  return (
    <>
      <SiteHeader area={store.area} locatable />
      {preview && <StorePreviewBanner storeName={store.name} storeSlug={store.slug} />}

      <div className="flex flex-col gap-6 border-b border-line px-4 pb-[22px] pt-6 sm:px-7 xl:px-12 2xl:px-16 lg:flex-row lg:gap-8">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="m-0 text-xl font-black sm:text-2xl">{store.name}</h1>
            {preview ? (
              <span className="border border-green-tint-line bg-green-tint px-2 py-0.5 text-[13px] font-bold text-green">
                本店可預留
              </span>
            ) : (
              <span className="border border-line-strong px-2 py-0.5 text-[13px] font-bold text-muted">
                尚未加入
              </span>
            )}
            <span className="text-xs text-muted-2">{store.district}</span>
          </div>

          <p className="text-[15px] text-ink-2">
            {store.address}
            {store.phone && (
              <>
                {" · "}
                <span className="num text-xs">{store.phone}</span>
              </>
            )}
          </p>

          <p className="text-xs text-muted">
            {store.distanceM !== null && (
              <>
                距{store.district}中心 <span className="num">{formatDistance(store.distanceM)}</span>
              </>
            )}
            {store.notes.map((n) => (store.distanceM !== null ? ` · ${n}` : n))}
          </p>

          {(statusWarning || nhiNote) && (
            <p className="border border-line-strong bg-surface px-3 py-2 text-[13px] leading-[1.6] text-muted">
              {statusWarning ?? nhiNote}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap gap-2.5">
            <a
              href={store.mapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-11 items-center border border-green px-3.5 text-xs font-bold text-green no-underline sm:h-auto sm:py-[7px]"
            >
              在 Google Maps 開啟 ↗
            </a>
            {store.phone && (
              <a
                href={`tel:${store.phone.split("、")[0].replace(/-/g, "")}`}
                className="inline-flex h-11 items-center border border-line-strong px-3.5 text-xs font-medium text-ink-2 no-underline sm:h-auto sm:py-[7px]"
              >
                撥打電話
              </a>
            )}
          </div>
        </div>

        <div className="w-full flex-none border border-line px-3.5 py-3 text-xs text-ink-2 lg:w-60">
          <div className="mb-1.5 font-bold text-ink">{hoursTitle(store.hoursSource)}</div>
          {/* 標籤欄用 auto 且不換行 —— Google 的多時段字串
              （09:00–12:00、14:00–17:00、18:00–21:00）會把 1fr 的標籤欄
              壓到「星期一」直接斷成三行。 */}
          {store.hours.length > 0 ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-[3px]">
              {store.hours.map((h) => (
                <div key={h.label} className="contents">
                  <dt className="whitespace-nowrap">{h.label}</dt>
                  <dd
                    className={`text-[13px] ${
                      h.hours === "公休" || h.hours === "休息" ? "text-muted-2" : ""
                    }`}
                  >
                    {h.hours}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-[13px] text-muted-2">尚無資料，建議先電話確認</p>
          )}
          {hoursNote(store.hoursSource) && (
            <p className="mt-2 border-t border-line-soft pt-2 text-[13px] leading-[1.5] text-muted-2">
              {hoursNote(store.hoursSource)}
            </p>
          )}
        </div>
      </div>

      {preview ? (
        <section className="px-4 pb-[26px] pt-5 sm:px-7 xl:px-12 2xl:px-16">
          <div className="mb-2.5 flex flex-wrap items-baseline gap-2.5">
            <h2 className="text-sm font-black">本店有貨商品</h2>
            <p className="text-[13px] text-muted-2">
              {items.length} 項 · 全部可預留，到店付款
            </p>
          </div>
          {/* 示範是封閉世界：卡片不連到讀真庫存的 /drug/[slug]，預留直接在卡上 */}
          <PreviewShelf store={store} items={items} />
        </section>
      ) : (
        <section className="px-4 pb-[26px] pt-5 sm:px-7 xl:px-12 2xl:px-16">
          <h2 className="mb-2.5 text-sm font-black">本店有貨商品</h2>
          <div className="border border-line px-4 py-6">
            <p className="text-[15px] leading-[1.7] text-ink-2">
              這家藥局還沒有即時庫存。
              <br />
              <span className="text-muted">
                庫存來自店內掃描器 —— 裝上盒子之後，這裡會自動列出有貨商品，
                消費者可以直接預留。藥局端不用改任何流程。
              </span>
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              <Link
                href="/pharmacy"
                className="inline-flex min-h-11 items-center bg-green px-4 text-xs font-bold text-white no-underline hover:bg-green-hover"
              >
                我是這家藥局 · 申請免費試裝
              </Link>
              <Link
                href={`/store/${store.slug}/preview`}
                className="inline-flex min-h-11 items-center border border-line-strong px-4 text-xs font-medium text-ink-2 no-underline hover:border-green hover:text-green"
              >
                預覽裝上盒子後的樣子 →
              </Link>
            </div>
          </div>
        </section>
      )}

      <SiteFooter
        note={
          preview
            ? "以上為示範資料。實際庫存由盒子掃描更新；售價僅在此示範頁呈現，消費端不顯示價格。"
            : "藥局基本資料來自食藥署與健保署開放資料，如有錯誤請來信更正。處方藥請至門市洽詢藥師。"
        }
      />

      {/* 每家藥局免費得到一個會被 Google 索引的網頁 — NAP 結構化。
          資料來自政府開放資料，所以這裡可以放心給搜尋引擎。 */}
      {!preview && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Pharmacy",
              name: store.name,
              address: {
                "@type": "PostalAddress",
                streetAddress: store.address,
                addressLocality: store.district,
                addressRegion: "臺北市",
                addressCountry: "TW",
              },
              ...(store.phone ? { telephone: store.phone.split("、")[0] } : {}),
              ...(store.lat && store.lng
                ? { geo: { "@type": "GeoCoordinates", latitude: store.lat, longitude: store.lng } }
                : {}),
              url: `https://uyao.tw/store/${store.slug}`,
            }),
          }}
        />
      )}
    </>
  );
}

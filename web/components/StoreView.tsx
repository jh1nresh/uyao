import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StockBadge } from "@/components/StockBadge";
import { PreviewShelf } from "@/components/PreviewShelf";
import { StorePreviewBanner } from "@/components/StorePreviewBanner";
import { drugsForStore, getArea, previewDrugsForStore } from "@/lib/data";
import { scanSummary } from "@/lib/box";
import type { Store } from "@/lib/types";
import { formatDistance } from "@/lib/format";
import { areaCopy, localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { partnerForStore } from "@/lib/partners";
import { STORE_DEMO_SANDBOX_SLUG } from "@/lib/store-demo";
import { stockBadge } from "@/lib/stock";
import {
  businessStatusWarning,
  hoursNote,
  hoursTitle,
  nhiTerminationNote,
  openingHoursValue,
  openingLabel,
} from "@/lib/hours";

/**
 * 藥局頁本體。`preview` 由路由決定而不是 query string —— 用 searchParams
 * 會讓整條 /store/[slug] 變成動態渲染，店家 SEO 頁面就靜態不了了。
 */
export async function StoreView({ store, preview, demo = false }: { store: Store; preview: boolean; demo?: boolean }) {
  const locale = await getRequestLocale();
  const displayArea = areaCopy(getArea(store.area), locale);
  const baseItems = demo ? previewDrugsForStore(store) : drugsForStore(store.slug, preview);
  const scans = preview ? await scanSummary() : [];
  const received = new Map(
    scans
      .filter((scan) => scan.storeSlug === store.slug)
      .map((scan) => [scan.drugSlug, scan.daysSinceScan]),
  );
  const items = baseItems.map((item) => {
    const daysSinceScan = received.get(item.drug.slug);
    return daysSinceScan === undefined
      ? item
      : { ...item, daysSinceScan, badge: stockBadge(daysSinceScan) };
  });

  const statusWarning = businessStatusWarning(store, locale);
  const nhiNote = nhiTerminationNote(store, locale);
  const partner = partnerForStore(store.slug);

  return (
    <>
      <SiteHeader area={store.area} locatable />
      {preview && <StorePreviewBanner storeName={store.name} storeSlug={store.slug} demo={demo} />}

      <section className="border-b border-line bg-ivory">
        <div className="shop-shell py-10 sm:py-14">
          <p className="shop-kicker mb-3">{demo ? "DEMO PHARMACY" : "PHARMACY RECORD"}</p>
          <div className="flex flex-col gap-7 border border-line bg-paper p-5 sm:p-7 lg:flex-row lg:gap-10">
        <div className="flex flex-1 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="editorial-display m-0 text-[32px] leading-[1.2] sm:text-[42px]">{store.name}</h1>
            {demo ? (
              <span className="border border-green-tint-line bg-green-tint px-2 py-0.5 text-[13px] font-bold text-green">
                {locale === "en" ? "Demo pharmacy" : "示範藥局"}
              </span>
            ) : preview ? (
              <span className="border border-green-tint-line bg-green-tint px-2 py-0.5 text-[13px] font-bold text-green">
                {locale === "en" ? "Pickup available" : "本店可預留"}
              </span>
            ) : partner ? (
              <span className="border border-green-tint-line bg-green-tint px-2 py-0.5 text-[13px] font-bold text-green">
                {locale === "en" ? "Partner pharmacy" : "合作藥局"}
              </span>
            ) : (
              <span className="border border-line-strong px-2 py-0.5 text-[13px] font-bold text-muted">
                {locale === "en" ? "Not connected" : "尚未加入"}
              </span>
            )}
            <span className="text-xs text-muted-2">{locale === "en" ? displayArea.shortName : store.district}</span>
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
                {locale === "en" ? `From ${displayArea.shortName} center ` : `距${store.district}中心 `}<span className="num">{formatDistance(store.distanceM)}</span>
              </>
            )}
            {locale === "zh" && store.notes.map((n) => (store.distanceM !== null ? ` · ${n}` : n))}
          </p>

          {(statusWarning || nhiNote) && (
            <p className="border border-line-strong bg-surface px-3 py-2 text-[13px] leading-[1.6] text-muted">
              {statusWarning ?? nhiNote}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap gap-2.5">
            {!demo && (
              <a
                href={store.mapsUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="action-secondary h-11 px-3.5 text-xs"
              >
                {locale === "en" ? "Open in Google Maps ↗" : "在 Google Maps 開啟 ↗"}
              </a>
            )}
            {store.phone && (
              <a
                href={`tel:${store.phone.split("、")[0].replace(/-/g, "")}`}
                className="action-secondary h-11 px-3.5 text-xs font-medium"
              >
                {locale === "en" ? "Call pharmacy" : "撥打電話"}
              </a>
            )}
          </div>
        </div>

        <div className="w-full flex-none border border-line bg-surface px-4 py-4 text-xs text-ink-2 lg:w-[280px]">
          <div className="mb-3 border-b border-line pb-2 text-[13px] font-bold text-ink">{hoursTitle(store.hoursSource, locale)}</div>
          {/* 標籤欄用 auto 且不換行 —— Google 的多時段字串
              （09:00–12:00、14:00–17:00、18:00–21:00）會把 1fr 的標籤欄
              壓到「星期一」直接斷成三行。 */}
          {store.hours.length > 0 ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-[3px]">
              {store.hours.map((h) => (
                <div key={h.label} className="contents">
                  <dt className="whitespace-nowrap">{openingLabel(h.label, locale)}</dt>
                  <dd
                    className={`text-[13px] ${
                      h.hours === "公休" || h.hours === "休息" ? "text-muted-2" : ""
                    }`}
                  >
                    {openingHoursValue(h.hours, locale)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-[13px] text-muted-2">{locale === "en" ? "No hours listed; call first" : "尚無資料，建議先電話確認"}</p>
          )}
          {hoursNote(store.hoursSource, locale) && (
            <p className="mt-2 border-t border-line-soft pt-2 text-[13px] leading-[1.5] text-muted-2">
              {hoursNote(store.hoursSource, locale)}
            </p>
          )}
        </div>
          </div>
        </div>
      </section>

      {preview ? (
        <section className="bg-paper">
          <div className="shop-shell py-12 sm:py-16">
          <p className="shop-kicker mb-3">AVAILABLE HERE</p>
          <div className="mb-6 flex flex-wrap items-end gap-3">
            <h2 className="editorial-display m-0 text-[30px] sm:text-[38px]">{locale === "en" ? "Products available here" : "本店有貨商品"}</h2>
            <p className="text-[13px] text-muted-2">
              {locale === "en" ? `${items.length} items · Reserve for pickup and pay in store` : `${items.length} 項 · 全部可預留，到店付款`}
            </p>
          </div>
          {/* 示範是封閉世界：卡片不連到讀真庫存的 /drug/[slug]，預留直接在卡上 */}
          <PreviewShelf store={store} items={items} />
          </div>
        </section>
      ) : partner && partner.confirmedProducts.length > 0 ? (
        <section className="bg-paper">
          <div className="shop-shell py-12 sm:py-16">
            <p className="shop-kicker mb-3">PARTNER ASSORTMENT</p>
            <h2 className="editorial-display mb-3 mt-0 text-[30px] sm:text-[38px]">
              {locale === "en" ? "Partner assortment" : "合作販售品項"}
            </h2>
            <p className="mb-6 max-w-[760px] text-[15px] leading-[1.8] text-ink-2">
              {locale === "en"
                ? "This list was provided by the pharmacy and is not live inventory. Confirm current stock and price with the pharmacy before visiting."
                : "以下品項由合作藥局提供，並非即時庫存。前往前請向門市確認目前庫存與價格。"}
            </p>
            <ul className="m-0 flex list-none flex-wrap gap-2.5 p-0">
              {partner.confirmedProducts.map((product) => (
                <li
                  key={product}
                  className="max-w-full break-words border border-line bg-ivory px-3.5 py-2 text-[14px] font-medium text-ink-2"
                >
                  {product}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : partner ? (
        <section className="bg-paper">
          <div className="shop-shell py-12 sm:py-16">
            <p className="shop-kicker mb-3">PARTNER ASSORTMENT</p>
            <h2 className="editorial-display mb-6 mt-0 text-[30px] sm:text-[38px]">
              {locale === "en" ? "Partner assortment" : "合作販售品項"}
            </h2>
            <div className="border border-line bg-ivory px-5 py-7 sm:px-7 sm:py-8">
              <p className="max-w-[760px] text-[15px] leading-[1.8] text-ink-2">
                {locale === "en"
                  ? "Our partnership with this pharmacy is confirmed, but its product list and live inventory are not available yet. Please call before visiting."
                  : "這家藥局的合作關係已確認，但目前尚無販售品項清單與即時庫存。前往前建議先電話確認。"}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-paper">
          <div className="shop-shell py-12 sm:py-16">
          <p className="shop-kicker mb-3">INVENTORY STATUS</p>
          <h2 className="editorial-display mb-6 mt-0 text-[30px] sm:text-[38px]">{locale === "en" ? "Available products" : "本店有貨商品"}</h2>
          <div className="border border-line bg-ivory px-5 py-7 sm:px-7 sm:py-8">
            <p className="max-w-[760px] text-[15px] leading-[1.8] text-ink-2">
              {locale === "en" ? "This pharmacy does not have live availability yet." : "這家藥局還沒有即時庫存。"}
              <br />
              <span className="text-muted">
                {locale === "en" ? "Availability comes from in-store receiving scans. After installation, recently received products appear here for pickup reservations without changing the pharmacy workflow." : "庫存來自店內掃描器 —— 裝上盒子之後，這裡會自動列出有貨商品，消費者可以直接預留。藥局端不用改任何流程。"}
              </span>
            </p>
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              <Link
                href={localizedPath("/pharmacy", locale)}
                className="action-primary min-h-11 px-4 text-xs"
              >
                {locale === "en" ? "I run this pharmacy · Apply for a free pilot" : "我是這家藥局 · 申請免費試裝"}
              </Link>
              <Link
                href={localizedPath(`/demo/${STORE_DEMO_SANDBOX_SLUG}`, locale)}
                className="action-secondary min-h-11 px-4 text-xs font-medium"
              >
                {locale === "en" ? "Preview the connected experience →" : "預覽裝上盒子後的樣子 →"}
              </Link>
            </div>
          </div>
          </div>
        </section>
      )}

      <SiteFooter
        note={
          demo
            ? locale === "en" ? "This is a synthetic pharmacy. Products are selected from the website catalog; store identity, availability, and prices are simulated and are not connected to any real pharmacy." : "這是獨立示範藥局。品項取自網站目錄；門市身分、供應狀態與售價皆為模擬，不代表任何真實合作藥局。"
            : preview
            ? locale === "en" ? "Demo data. Product names come from the partner-provided catalog; availability and prices are simulated. Receiving-scan freshness comes from the demo pipeline. Consumer pages do not show medicine prices." : "以上為示範資料。品項名稱來自合作藥局提供的目錄；供應狀態與售價為模擬資料，進貨掃描新鮮度來自 demo pipeline。消費端不顯示藥品價格。"
            : locale === "en" ? "Store records come from Taiwan government open data. Contact us to correct errors. Ask a pharmacist in store about prescription medicines." : "藥局基本資料來自食藥署與健保署開放資料，如有錯誤請來信更正。處方藥請至門市洽詢藥師。"
        }
      />
    </>
  );
}

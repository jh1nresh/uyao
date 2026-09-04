"use client";

import Link from "next/link";
import { useState } from "react";

import { useLocale } from "./LocaleProvider";
import { ReserveSheet, type ReserveTarget } from "./ReserveSheet";
import { StockBadge } from "./StockBadge";
import type { StoreRow } from "@/lib/data";
import { formatDistance } from "@/lib/format";
import { hoursSummary } from "@/lib/hours";
import { localizedPath } from "@/lib/i18n";
import { isStoreOsLive } from "@/lib/store-os-live";
import type { Store } from "@/lib/types";

/**
 * 品項頁右欄的「哪裡拿得到」。
 *
 * 只列確認有這個品項的藥局：掃描紀錄或合作藥局自己提供的品項清單。
 * 同區但沒有品項證據的藥局不出現在這裡，避免把「登記在這一區」講成
 * 「這裡買得到」。後端也是同一條線（`partnersForProduct`），畫面能按的
 * 就是 API 收得下的。
 *
 * 而且只給**已經在 Store OS 上接單**的店（`isStoreOsLive`）。收不到預留的店
 * 給的是打得通的電話，不是一顆會把人晾在那裡的預留鈕 —— 目前一家都還沒裝，
 * 所以這張卡實際上是電話優先。
 *
 * 沒有掃描流，所以這裡不出現價格與現貨保證 —— 送出的是「請幫我留一份」。
 */
export function StoreBuyBox({
  drug,
  rows,
  carryingStores,
}: {
  drug: { slug: string; name: string; spec: string };
  /** 有掃描庫存時的 rows；有值就優先用，帶得出新鮮度與價格。 */
  rows: StoreRow[];
  /** 合作藥局確認販售這個品項的店。 */
  carryingStores: Store[];
}) {
  const [target, setTarget] = useState<ReserveTarget | null>(null);
  const locale = useLocale();

  const scanned = new Set(rows.map((r) => r.store.slug));
  // 掃描過的店排前面（有新鮮度可講），其餘用合作藥局確認的名單補上。
  const carrying = carryingStores.filter((s) => !scanned.has(s.slug));

  if (rows.length === 0 && carrying.length === 0) return null;

  const total = rows.length + carrying.length;

  return (
    <>
      {/* 位置與外距交給呼叫端 —— 這張卡在寬螢幕是獨立一欄，不是接在內文後面。 */}
      <div className="border border-forest bg-ivory">
        <p className="m-0 border-b border-line bg-surface px-3.5 py-2 text-[14px] font-bold text-forest">
          {total === 1
            ? locale === "en" ? "This pharmacy carries it" : "這家藥局有這個品項"
            : locale === "en" ? `${total} pharmacies carry it` : `${total} 家藥局有這個品項`}
        </p>

        {rows.map((r) => (
          <StoreLine
            key={r.store.slug}
            store={r.store}
            badge={<StockBadge badge={r.badge} className="text-xs" />}
            carries
            onReserve={
              isStoreOsLive(r.store.slug) ? () => setTarget({ ...r, drug }) : undefined
            }
          />
        ))}

        {carrying.map((store) => (
          <StoreLine
            key={store.slug}
            store={store}
            carries
            onReserve={
              isStoreOsLive(store.slug)
                ? () => setTarget({ store, drug, priceTwd: null })
                : undefined
            }
          />
        ))}

      </div>

      {target && <ReserveSheet target={target} onClose={() => setTarget(null)} />}
    </>
  );
}

/**
 * 一列店家：店名／距離／營業時段，右邊是電話。
 *
 * 底部那顆主要動作只有一顆，看這家店現在能做到什麼：
 *   - 收得到預留 → 預留鈕
 *   - 確認有這支但還沒上 Store OS → 直接撥號（號碼就印在鈕上）
 * 撥號鈕出現時不再重複右上角的小電話 —— 同一列不要兩個電話控制項。
 */
function StoreLine({
  store,
  badge,
  carries = false,
  onReserve,
}: {
  store: Store;
  badge?: React.ReactNode;
  /** 合作藥局確認販售這支 —— 值得一顆主要動作。 */
  carries?: boolean;
  onReserve?: () => void;
}) {
  const locale = useLocale();
  const phone = store.phone ? store.phone.split("、")[0] : null;
  const callFirst = carries && !onReserve && phone !== null;

  return (
    <div className="border-b border-line-soft px-3.5 py-2.5 last:border-b-0">
      <div className="flex items-baseline gap-2">
        <Link
          href={localizedPath(`/store/${store.slug}`, locale)}
          className="history-link min-w-0 truncate text-[15px] font-medium text-ink no-underline"
        >
          {store.name}
        </Link>
        {/* 沒有座標的店距離是 null —— 留白，不要用「0 m」假裝就在旁邊。 */}
        {store.distanceM !== null && (
          <span className="num ml-auto flex-none text-[13px] text-ink-2">
            {formatDistance(store.distanceM)}
          </span>
        )}
      </div>

      <div className="mt-1 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
          {hoursSummary(store, locale)}
        </span>
        {phone && !callFirst ? (
          <a
            href={`tel:${phone.replace(/-/g, "")}`}
            className="num -my-1 inline-flex min-h-11 flex-none items-center border border-forest px-2.5 text-[13px] font-bold text-forest no-underline hover:bg-surface"
          >
            {phone}
          </a>
        ) : !phone ? (
          <span className="flex-none text-[13px] text-muted-2">
            {locale === "en" ? "No phone listed" : "未提供電話"}
          </span>
        ) : null}
      </div>

      {badge && <div className="mt-1">{badge}</div>}

      {/* 還沒上 Store OS 的店：唯一真的會有人接的動作就是這通電話。
          不要在這裡放預留鈕假裝送得出去 —— 那頭沒有人會按確認。 */}
      {callFirst && phone && (
        <a
          href={`tel:${phone.replace(/-/g, "")}`}
          aria-label={
            locale === "en"
              ? `Call ${store.name} at ${phone} to ask about this item`
              : `打電話問${store.name}，號碼 ${phone}`
          }
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 border border-forest bg-brand-surface px-3 text-[14px] font-bold text-on-dark no-underline transition-[background-color,transform] hover:bg-brand-surface-strong active:translate-y-px"
        >
          {locale === "en" ? "Call to ask" : "打電話問這家"}
          <span className="num">{phone}</span>
        </a>
      )}

      {onReserve && (
        <>
          <button
            type="button"
            onClick={onReserve}
            aria-label={
              locale === "en"
                ? `Ask ${store.name} to hold one`
                : `請${store.name}留一份`
            }
            className="mt-2 min-h-11 w-full border border-forest bg-brand-surface px-3 text-[14px] font-bold text-on-dark transition-[background-color,transform] hover:bg-brand-surface-strong active:translate-y-px"
          >
            {locale === "en" ? "Ask this pharmacy to hold one" : "請這家藥局留一份"}
          </button>
          <p className="mb-0 mt-1.5 text-[11.5px] leading-[1.5] text-muted">
            {locale === "en"
              ? "The pharmacy confirms in Store OS. Calling is still available if you need to talk to staff now."
              : "藥局會在 Store OS 確認這筆預留；若要立刻問人，仍可打電話。"}
          </p>
        </>
      )}
    </div>
  );
}

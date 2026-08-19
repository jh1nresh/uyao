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
import type { Store } from "@/lib/types";

/**
 * 品項頁右欄的「哪裡拿得到」。
 *
 * 兩區刻意分開，不混成一份賣家清單：
 *   1. 確認有這個品項的藥局 —— 合作藥局自己報過這支，可以直接請它預留
 *   2. 這一區其他藥局 —— 沒說過自己有，只能打電話問
 *
 * 混在一起列會讓第二區看起來也有貨，那是把「登記在這一區」講成「這裡買得到」。
 * 預留鈕只給第一區：後端也是同一條線（`partnersForProduct`），畫面能按的
 * 就是 API 收得下的。
 *
 * 沒有掃描流，所以這裡不出現價格與現貨保證 —— 送出的是「請幫我留一份」。
 */
export function StoreBuyBox({
  drug,
  rows,
  carryingStores,
  otherStores,
  areaLabel,
}: {
  drug: { slug: string; name: string; spec: string };
  /** 有掃描庫存時的 rows；有值就優先用，帶得出新鮮度與價格。 */
  rows: StoreRow[];
  /** 合作藥局確認販售這個品項的店。 */
  carryingStores: Store[];
  /** 同一區、但沒有確認販售這個品項的店。 */
  otherStores: Store[];
  areaLabel: string;
}) {
  const [target, setTarget] = useState<ReserveTarget | null>(null);
  const [showOthers, setShowOthers] = useState(false);
  const locale = useLocale();

  const scanned = new Set(rows.map((r) => r.store.slug));
  // 掃描過的店排前面（有新鮮度可講），其餘用合作藥局確認的名單補上。
  const carrying = carryingStores.filter((s) => !scanned.has(s.slug));
  const others = otherStores.filter(
    (s) => !scanned.has(s.slug) && !carryingStores.some((c) => c.slug === s.slug),
  );

  if (rows.length === 0 && carrying.length === 0 && others.length === 0) return null;

  const total = rows.length + carrying.length;

  return (
    <>
      <div className="mt-2 border border-forest bg-ivory">
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
            onReserve={() => setTarget({ ...r, drug })}
          />
        ))}

        {carrying.map((store) => (
          <StoreLine
            key={store.slug}
            store={store}
            onReserve={() => setTarget({ store, drug, priceTwd: null })}
          />
        ))}

        {others.length > 0 && (
          <div className="border-t border-line">
            <button
              type="button"
              onClick={() => setShowOthers((v) => !v)}
              aria-expanded={showOthers}
              className="flex min-h-11 w-full items-center gap-2 px-3.5 text-left text-[14px] font-medium text-green hover:bg-surface-hover"
            >
              {locale === "en"
                ? `${others.length} other pharmacies in ${areaLabel} — call to ask`
                : `${areaLabel}另有 ${others.length} 家藥局，可以打去問`}
              <span className="ml-auto" aria-hidden>{showOthers ? "▴" : "▾"}</span>
            </button>

            {showOthers && (
              <div className="border-t border-line-soft">
                {/* 這一區其他藥局沒有說過自己有這支，所以只給電話，沒有預留鈕。 */}
                {others.map((store) => (
                  <StoreLine key={store.slug} store={store} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {target && <ReserveSheet target={target} onClose={() => setTarget(null)} />}
    </>
  );
}

/** 一列店家：店名／距離／營業時段，右邊是電話，可預留時多一顆預留鈕。 */
function StoreLine({
  store,
  badge,
  onReserve,
}: {
  store: Store;
  badge?: React.ReactNode;
  onReserve?: () => void;
}) {
  const locale = useLocale();
  const phone = store.phone ? store.phone.split("、")[0] : null;

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
        {phone ? (
          <a
            href={`tel:${phone.replace(/-/g, "")}`}
            className="num -my-1 inline-flex min-h-11 flex-none items-center border border-forest px-2.5 text-[13px] font-bold text-forest no-underline hover:bg-surface"
          >
            {phone}
          </a>
        ) : (
          <span className="flex-none text-[13px] text-muted-2">
            {locale === "en" ? "No phone listed" : "未提供電話"}
          </span>
        )}
      </div>

      {badge && <div className="mt-1">{badge}</div>}

      {onReserve && (
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
      )}
    </div>
  );
}

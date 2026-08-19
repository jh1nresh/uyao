"use client";

import Link from "next/link";
import { useState } from "react";

import { useLocale } from "./LocaleProvider";
import { ReserveSheet, type ReserveTarget } from "./ReserveSheet";
import { StockBadge } from "./StockBadge";
import type { StoreRow } from "@/lib/data";
import { getArea } from "@/lib/data";
import { formatDistance } from "@/lib/format";
import { hoursSummary } from "@/lib/hours";
import { areaCopy, localizedPath } from "@/lib/i18n";

// 拿掉價格欄之後重新配比例
const COLS = "grid-cols-[1fr_88px_1fr_180px_92px]";

/**
 * 藥品頁的核心單位：附近藥局 rows（列表 ⇄ 地圖）＋ 預留。
 * 排序在 server 就做好了（新鮮度 → 距離 → 價格），這裡不再重排。
 */
export function PharmacyList({
  drug,
  rows,
}: {
  drug: { slug: string; name: string; spec: string };
  rows: StoreRow[];
}) {
  const [target, setTarget] = useState<ReserveTarget | null>(null);
  const locale = useLocale();

  return (
    <>
      {/* id 給 hero 右欄的「附近藥局」卡當錨點；scroll-mt 留給 sticky header 的高度。 */}
      <section id="pharmacy-list" className="scroll-mt-24 border-b border-line bg-paper">
      <div className="shop-shell py-10 sm:py-14">
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <h2 className="editorial-display m-0 text-[28px] sm:text-[34px]">{locale === "en" ? `${rows.length} nearby pharmacies` : `附近 ${rows.length} 家藥局`}</h2>
        <div className="flex-1" />
        <p className="text-[14px] text-muted-2">{locale === "en" ? "Sorted by: freshness → distance" : "排序：庫存新鮮度 → 距離"}</p>
      </div>

      <div className="mb-1.5 border border-line bg-ivory">
          {/* Desktop: 資料密表格 */}
          <div
            className={`hidden ${COLS} items-center gap-x-3 border-b border-line bg-surface px-3.5 py-2 text-[14px] font-bold text-muted lg:grid`}
          >
            <div>{locale === "en" ? "Pharmacy" : "店家"}</div>
            <div className="text-right">{locale === "en" ? "Distance" : "距離"}</div>
            <div>{locale === "en" ? "Hours" : "營業狀態"}</div>
            <div>{locale === "en" ? "Availability" : "庫存狀態"}</div>
            <div />
          </div>

          {rows.map((r) => (
            <div key={r.store.slug}>
              <div
                className={`hidden ${COLS} items-center gap-x-3 border-b border-line-soft px-3.5 py-2.5 text-[15px] last:border-b-0 hover:bg-surface-hover lg:grid`}
              >
                <Link href={localizedPath(`/store/${r.store.slug}`, locale)} className="history-link font-medium text-ink no-underline hover:text-green">
                  {r.store.name}
                  <span className="ml-1.5 text-[14px] font-normal text-muted-2">
                    {areaCopy(getArea(r.store.area), locale).shortName}
                  </span>
                </Link>
                <div className="num text-right text-xs text-ink-2">
                  {formatDistance(r.store.distanceM)}
                </div>
                <div className="text-xs text-muted">{hoursSummary(r.store, locale)}</div>
                <StockBadge badge={r.badge} className="text-xs" />
                <ReserveButton row={r} onClick={() => setTarget({ ...r, drug })} />
              </div>

              {/* 行動端：單手可預留 — 主按鈕 44px+ */}
              <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-2.5 last:border-b-0 lg:hidden">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={localizedPath(`/store/${r.store.slug}`, locale)}
                      className="history-link text-[15px] font-medium text-ink no-underline"
                    >
                      {r.store.name}
                    </Link>
                    <span className="text-[14px] text-muted-2">
                      {areaCopy(getArea(r.store.area), locale).shortName}
                    </span>
                    <span className="num text-[14px] text-ink-2">
                      {formatDistance(r.store.distanceM)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[14px]">
                    <span className="text-muted">{hoursSummary(r.store, locale)}</span>
                    <StockBadge badge={r.badge} />
                  </div>
                </div>
                <ReserveButton row={r} mobile onClick={() => setTarget({ ...r, drug })} />
              </div>
            </div>
          ))}
      </div>

      <p className="pt-3 text-[14px] leading-[1.65] text-muted-2">
        {locale === "en" ? "? = no recent receiving scan. Reserve to ask the pharmacy to confirm · Prices and medicine guidance are provided in store · No online checkout" : "？＝該店尚無近期掃描紀錄，按「預留」由藥局確認 · 價格與用藥說明由藥師於門市提供 · 本服務僅供預留，不提供線上交易"}
      </p>
      </div>
      </section>

      {target && <ReserveSheet target={target} onClose={() => setTarget(null)} />}
    </>
  );
}

function ReserveButton({
  row,
  mobile = false,
  onClick,
}: {
  row: StoreRow;
  mobile?: boolean;
  onClick: () => void;
}) {
  const locale = useLocale();
  // 沒有近期掃描紀錄 → 外框樣式：不假裝有貨，這是一次「請藥局幫我確認」。
  const outline = row.badge.tier === "unknown";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={locale === "en" ? `Reserve from ${row.store.name}${outline ? "; pharmacy confirmation required" : ""}` : `向${row.store.name}預留${outline ? "（由藥局確認有無現貨）" : ""}`}
      className={`min-h-11 flex-none border px-3.5 font-bold transition-[background-color,border-color,transform] active:translate-y-px ${
        mobile ? "text-[15px]" : "text-xs"
      } ${
        outline
          ? "border-forest bg-paper text-forest hover:bg-surface"
          : "border-forest bg-brand-surface text-on-dark hover:bg-brand-surface-strong"
      }`}
    >
      {locale === "en" ? "Reserve" : "預留"}
    </button>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";

import { ReserveSheet, type ReserveTarget } from "./ReserveSheet";
import { StockBadge } from "./StockBadge";
import { StoreMap } from "./StoreMap";
import { useLocation } from "./LocationProvider";
import type { StoreRow } from "@/lib/data";
import { getArea } from "@/lib/data";
import { formatDistance, formatPrice } from "@/lib/format";
import { hoursSummary } from "@/lib/hours";

const COLS = "grid-cols-[1fr_88px_150px_96px_168px_92px]";

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
  const [view, setView] = useState<"list" | "map">("list");
  const { position } = useLocation();
  const [target, setTarget] = useState<ReserveTarget | null>(null);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-7">
        <h2 className="text-[13px] font-bold">附近 {rows.length} 家藥局</h2>
        <div
          role="tablist"
          aria-label="檢視方式"
          className="flex border border-line-strong text-xs font-medium"
        >
          {(["list", "map"] as const).map((v, i) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`px-3.5 py-[5px] ${i > 0 ? "border-l border-line-strong" : ""} ${
                view === v ? "bg-ink text-white" : "bg-white text-muted"
              }`}
            >
              {v === "list" ? "列表" : "地圖"}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <p className="text-[11px] text-muted-2">排序：庫存新鮮度 → 距離 → 價格</p>
      </div>

      {view === "map" ? (
        <div className="mx-4 mb-1.5 sm:mx-7">
          <StoreMap
            stores={rows.map((r) => r.store)}
            annotations={Object.fromEntries(
              rows.map((r) => [r.store.slug, { priceTwd: r.priceTwd, badge: r.badge }]),
            )}
            userPosition={position}
          />
        </div>
      ) : (
        <div className="crossfade mx-4 mb-1.5 border border-line sm:mx-7">
          {/* Desktop: 資料密表格 */}
          <div
            className={`hidden ${COLS} items-center gap-x-3 border-b border-line bg-surface px-3.5 py-2 text-[11px] font-bold text-muted lg:grid`}
          >
            <div>店家</div>
            <div className="text-right">距離</div>
            <div>營業狀態</div>
            <div className="text-right">價格</div>
            <div>庫存狀態</div>
            <div />
          </div>

          {rows.map((r) => (
            <div key={r.store.slug}>
              <div
                className={`hidden ${COLS} items-center gap-x-3 border-b border-line-soft px-3.5 py-2.5 text-[13px] last:border-b-0 hover:bg-surface-hover lg:grid`}
              >
                <Link href={`/store/${r.store.slug}`} className="font-medium text-ink no-underline hover:text-green">
                  {r.store.name}
                  <span className="ml-1.5 text-[11px] font-normal text-muted-2">
                    {getArea(r.store.area).shortName}
                  </span>
                </Link>
                <div className="num text-right text-xs text-ink-2">
                  {formatDistance(r.store.distanceM)}
                </div>
                <div className="text-xs text-muted">{hoursSummary(r.store)}</div>
                <div className="num text-right text-[13px] font-semibold">
                  {formatPrice(r.priceTwd)}
                </div>
                <StockBadge badge={r.badge} className="text-xs" />
                <ReserveButton row={r} onClick={() => setTarget({ ...r, drug })} />
              </div>

              {/* 行動端：單手可預留 — 主按鈕 44px+ */}
              <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-2.5 last:border-b-0 lg:hidden">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={`/store/${r.store.slug}`}
                      className="text-[13.5px] font-medium text-ink no-underline"
                    >
                      {r.store.name}
                    </Link>
                    <span className="text-[11px] text-muted-2">
                      {getArea(r.store.area).shortName}
                    </span>
                    <span className="num text-[11px] text-ink-2">
                      {formatDistance(r.store.distanceM)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
                    <span className="text-muted">{hoursSummary(r.store)}</span>
                    <StockBadge badge={r.badge} />
                  </div>
                </div>
                <span className="num text-[13px] font-semibold">{formatPrice(r.priceTwd)}</span>
                <ReserveButton row={r} mobile onClick={() => setTarget({ ...r, drug })} />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="px-4 pt-2 text-[11px] leading-[1.6] text-muted-2 sm:px-7">
        ？＝該店尚無近期掃描紀錄，按「預留」由藥局確認 · 價格為藥局自報，以門市為準 ·
        本服務僅提供預留取貨，不提供線上交易
      </p>

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
  // 沒有近期掃描紀錄 → 外框樣式：不假裝有貨，這是一次「請藥局幫我確認」。
  const outline = row.badge.tier === "unknown";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`向${row.store.name}預留${outline ? "（由藥局確認有無現貨）" : ""}`}
      className={`flex-none border border-green font-bold hover:opacity-85 ${
        mobile ? "h-11 px-3.5 text-[13px]" : "h-[30px] text-xs"
      } ${outline ? "bg-white text-green" : "bg-green text-white"}`}
    >
      預留
    </button>
  );
}

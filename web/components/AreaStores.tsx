"use client";

import Link from "next/link";
import { useState } from "react";

import { LocateButton } from "./LocateButton";
import { useLocation } from "./LocationProvider";
import { StoreMap } from "./StoreMap";
import { formatDistance } from "@/lib/format";
import { byDistance, distanceFor } from "@/lib/geo";
import { hoursSummary } from "@/lib/hours";
import type { AreaSlug, Store } from "@/lib/types";

/**
 * 一個服務區的藥局列表 ⇄ 地圖。
 *
 * 沒有定位時，距離是 seed 算好的「距區中心」，伺服器渲染的結果就是最終
 * 結果 —— 這一段必須跟 server 一致，否則 hydration 會錯。使用者按下定位
 * 之後才在 client 重算距離並重排；靜態 HTML 不受影響，166 個藥局頁照樣
 * 靜態產生。
 */
export function AreaStores({
  stores,
  area,
  areaLabel,
  limit = 12,
  showPhone = false,
}: {
  stores: Store[];
  area: AreaSlug;
  areaLabel: string;
  limit?: number;
  /** 藥品頁的空狀態用 —— 那裡的下一步是打電話問，不是逛藥局頁。 */
  showPhone?: boolean;
}) {
  const [view, setView] = useState<"list" | "map">("list");
  const [expanded, setExpanded] = useState(false);
  const { position } = useLocation();

  const sorted = position ? [...stores].sort(byDistance(position)) : stores;
  const shown = view === "map" || expanded ? sorted : sorted.slice(0, limit);

  return (
    <>
      <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
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
        <LocateButton area={area} />
      </div>

      {view === "map" ? (
        <StoreMap stores={sorted} userPosition={position} height={380} />
      ) : (
        <div className="crossfade border border-line">
          {shown.map((s) => {
            const d = distanceFor(s, position);
            return (
              <div
                key={s.slug}
                className="flex items-center gap-3 border-b border-line-soft px-3.5 py-2.5 last:border-b-0 hover:bg-surface-hover"
              >
                <Link href={`/store/${s.slug}`} className="min-w-0 flex-1 no-underline">
                  <span className="block text-[13.5px] font-medium text-ink">{s.name}</span>
                  <span className="block text-[11.5px] text-muted">{s.address}</span>
                </Link>
                {d !== null && (
                  <span className="num flex-none text-[11.5px] text-ink-2">
                    {formatDistance(d)}
                  </span>
                )}
                <span className="hidden flex-none text-[11px] text-muted-2 sm:block">
                  {hoursSummary(s)}
                </span>
                {showPhone &&
                  (s.phone ? (
                    <a
                      href={`tel:${s.phone.split("、")[0].replace(/-/g, "")}`}
                      className="num flex-none border border-green px-3 py-1.5 text-[12px] font-bold text-green no-underline"
                    >
                      {s.phone.split("、")[0]}
                    </a>
                  ) : (
                    <span className="flex-none text-[11px] text-muted-2">未提供電話</span>
                  ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-2">
        <span>
          {position ? "距離你" : `距${areaLabel}中心`} ·{" "}
          {position ? "已依你的位置重新排序" : "按上面的定位鈕改用實際距離"}
        </span>
        {view === "list" && !expanded && sorted.length > limit && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-green underline"
          >
            顯示其餘 {sorted.length - limit} 家
          </button>
        )}
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";

import { LocateButton } from "./LocateButton";
import { useLocation } from "./LocationProvider";
import { useLocale } from "./LocaleProvider";
import { formatDistance } from "@/lib/format";
import { byDistance, distanceFor } from "@/lib/geo";
import { hoursSummary } from "@/lib/hours";
import { localizedPath } from "@/lib/i18n";
import type { AreaSlug, Store } from "@/lib/types";

/**
 * 一個服務區的藥局列表。
 *
 * 刻意沒有地圖：消費者要的是「多遠、幾點關、電話幾號」，真的要導航時
 * 藥局頁與 LINE 通知裡都有 Google Maps 連結，那件事 Google 做得比我們好。
 *
 * 沒有定位時，距離是 seed 算好的「距區中心」，伺服器渲染的結果就是最終
 * 結果 —— 這一段必須跟 server 一致，否則 hydration 會錯。使用者按下定位
 * 之後才在 client 重算距離並重排；靜態 HTML 不受影響，收錄店家頁照樣
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
  const [expanded, setExpanded] = useState(false);
  const { position } = useLocation();
  const locale = useLocale();

  const sorted = position ? [...stores].sort(byDistance(position)) : stores;
  const shown = expanded ? sorted : sorted.slice(0, limit);

  return (
    <>
      <div className="mb-2.5">
        <LocateButton area={area} />
      </div>

      <div className="border border-line">
        {shown.map((s) => {
          const d = distanceFor(s, position);
          return (
            <div
              key={s.slug}
              className="flex items-center gap-3 border-b border-line-soft px-3.5 py-2.5 last:border-b-0 hover:bg-surface-hover"
            >
              <Link
                href={localizedPath(`/store/${s.slug}`, locale)}
                className="history-link -my-2.5 flex min-h-11 min-w-0 flex-1 flex-col justify-center py-2.5 no-underline"
              >
                <span className="block text-[15px] font-medium text-ink">{s.name}</span>
                <span className="block text-[13px] text-muted">{s.address}</span>
              </Link>
              {d !== null && (
                <span className="num flex-none text-[13px] text-ink-2">{formatDistance(d)}</span>
              )}
              <span className="hidden flex-none text-[13px] text-muted-2 sm:block">
                {hoursSummary(s, locale)}
              </span>
              {showPhone &&
                (s.phone ? (
                  <a
                    href={`tel:${s.phone.split("、")[0].replace(/-/g, "")}`}
                    className="num inline-flex min-h-11 flex-none items-center border border-forest px-3 text-[13px] font-bold text-forest no-underline hover:bg-surface"
                  >
                    {s.phone.split("、")[0]}
                  </a>
                ) : (
                  <span className="flex-none text-[13px] text-muted-2">{locale === "en" ? "No phone listed" : "未提供電話"}</span>
                ))}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-2">
        <span>
          {position ? (locale === "en" ? "Distance from you" : "距離你") : (locale === "en" ? `From ${areaLabel} center` : `距${areaLabel}中心`)} ·{" "}
          {position ? (locale === "en" ? "Sorted using your location" : "已依你的位置重新排序") : (locale === "en" ? "Use the location button for actual distance" : "按上面的定位鈕改用實際距離")}
        </span>
        {!expanded && sorted.length > limit && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="-my-3 inline-flex min-h-11 items-center text-green underline"
          >
            {locale === "en" ? `Show ${sorted.length - limit} more` : `顯示其餘 ${sorted.length - limit} 家`}
          </button>
        )}
      </div>
    </>
  );
}

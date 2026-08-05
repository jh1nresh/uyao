"use client";

import { useLocation } from "./LocationProvider";
import { AREAS } from "@/lib/data";
import { distanceToArea } from "@/lib/geo";
import { formatDistance } from "@/lib/format";
import type { AreaSlug } from "@/lib/types";

const MESSAGES: Record<string, string> = {
  denied: "瀏覽器擋住定位了。要開的話到網址列左邊的鎖頭圖示改權限，或繼續用下面的行政區切換。",
  unavailable: "這個瀏覽器不支援定位，用行政區切換就好。",
  timeout: "定位逾時，再試一次或直接用行政區切換。",
};

/**
 * 定位開關。使用者按了才要權限 —— 見 LocationProvider 的說明。
 *
 * 服務區只有中山與信義兩區，所以定位成功後還要誠實告訴使用者他離這區
 * 多遠：人在板橋卻看到「距離你 8.2 km」的排序，比沒有定位更誤導。
 */
export function LocateButton({ area }: { area: AreaSlug }) {
  const { position, status, request, clear } = useLocation();

  if (position) {
    const away = distanceToArea(area, position);
    const areaName = AREAS.find((a) => a.slug === area)?.shortName ?? "";
    const farAway = away > 3000;
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px]">
        <span className="font-medium text-green">
          <span aria-hidden>◉</span> 已定位
        </span>
        <span className={farAway ? "text-ink" : "text-muted"}>
          距{areaName}中心 <span className="num">{formatDistance(away)}</span>
          {farAway && "　（這一區可能不是你的生活圈，距離僅供參考）"}
        </span>
        <button type="button" onClick={clear} className="text-muted-2 underline">
          關閉定位
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px]">
      <button
        type="button"
        onClick={request}
        disabled={status === "prompting"}
        className="border border-line-strong px-2.5 py-[3px] font-medium text-ink-2 hover:border-green hover:text-green disabled:text-muted-2"
      >
        <span aria-hidden>◎</span> {status === "prompting" ? "定位中…" : "用我的位置排序"}
      </button>
      {MESSAGES[status] && <span className="text-muted">{MESSAGES[status]}</span>}
    </div>
  );
}

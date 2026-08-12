"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { useLocation } from "./LocationProvider";
import { useLocale } from "./LocaleProvider";
import { withArea } from "@/lib/area-route";
import { AREAS } from "@/lib/data";
import { distanceToArea } from "@/lib/geo";
import { formatDistance } from "@/lib/format";
import { areaCopy } from "@/lib/i18n";
import type { AreaSlug } from "@/lib/types";

const MESSAGES_ZH: Record<string, string> = {
  denied: "瀏覽器擋住定位了。要開的話到網址列左邊的鎖頭圖示改權限，或繼續用下面的行政區切換。",
  unavailable: "這個瀏覽器不支援定位，用行政區切換就好。",
  timeout: "定位逾時，再試一次或直接用行政區切換。",
};

const MESSAGES_EN: Record<string, string> = {
  denied: "Location access is blocked. Change the permission in your browser or choose an area below.",
  unavailable: "This browser does not support location. Choose an area instead.",
  timeout: "Location timed out. Try again or choose an area.",
};

/**
 * 定位開關。使用者按了才要權限 —— 見 LocationProvider 的說明。
 *
 * 服務區只涵蓋目前收錄店家所在區域，所以定位成功後還要誠實告訴使用者他離這區
 * 多遠：人在板橋卻看到「距離你 8.2 km」的排序，比沒有定位更誤導。
 */
export function LocateButton({ area }: { area: AreaSlug }) {
  const { position, status, request, clear } = useLocation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const messages = locale === "en" ? MESSAGES_EN : MESSAGES_ZH;

  if (position) {
    const away = distanceToArea(area, position);
    const areaData = AREAS.find((a) => a.slug === area);
    const areaName = areaData ? areaCopy(areaData, locale).shortName : "";

    // 離另一區比較近就直接給一鍵切換 —— 比警告有用。
    const nearer = AREAS.filter((a) => a.slug !== area)
      .map((a) => ({ area: a, away: distanceToArea(a.slug, position) }))
      .filter((c) => c.away < away)
      .sort((a, b) => a.away - b.away)[0];

    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
        <span className="font-medium text-green">
          <span aria-hidden>◉</span> {locale === "en" ? "Located" : "已定位"}
        </span>
        {/* 距離就是精確的 —— 不加「僅供參考」這種會讓人不信任正確資料的字眼。
            真正的限制是只涵蓋目前收錄店家所在區域，該講的是那個。 */}
        <span className="text-muted">
          {locale === "en" ? `From ${areaName} center ` : `距${areaName}中心 `}<span className="num">{formatDistance(away)}</span>
        </span>
        {nearer && (
          <Link
            href={withArea(pathname, searchParams.toString(), nearer.area.slug)}
            scroll={false}
            className="inline-flex min-h-11 items-center font-medium text-green"
          >
            {locale === "en" ? `${areaCopy(nearer.area, locale).shortName} is closer (` : `${nearer.area.shortName}離你更近（`}<span className="num">
              {formatDistance(nearer.away)}
            </span>{locale === "en" ? ") →" : "）→"}
          </Link>
        )}
        <button type="button" onClick={clear} className="inline-flex min-h-11 items-center text-muted underline">
          {locale === "en" ? "Turn off location" : "關閉定位"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
      <button
        type="button"
        onClick={request}
        disabled={status === "prompting"}
        className="inline-flex min-h-11 items-center border border-line-strong bg-paper px-3 font-medium text-ink-2 transition-colors hover:border-forest hover:text-forest disabled:text-muted-2"
      >
        <span aria-hidden>◎</span> {status === "prompting" ? (locale === "en" ? "Locating…" : "定位中…") : (locale === "en" ? "Sort by my location" : "用我的位置排序")}
      </button>
      {messages[status] && <span className="text-muted">{messages[status]}</span>}
    </div>
  );
}

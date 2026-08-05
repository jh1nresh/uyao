import { BADGE_COLOR } from "@/lib/stock";
import type { StockBadgeSpec } from "@/lib/types";

/**
 * 全站唯一一套庫存視覺語言：● 今日掃描確認 / ○ N 天前確認 / ？ 請預留確認。
 * 只用墨色與同一個綠 — 不引入紅/黃警示色。
 */
export function StockBadge({
  badge,
  short = false,
  className = "",
}: {
  badge: StockBadgeSpec;
  short?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium ${BADGE_COLOR[badge.tier]} ${className}`}
    >
      <span className="num" aria-hidden>
        {badge.char}
      </span>
      {short ? badge.shortText : badge.text}
    </span>
  );
}

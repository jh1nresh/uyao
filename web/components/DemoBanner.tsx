/**
 * 示範資料橫幅 — 接上真實藥局掃描流之前，站上的藥局名稱、地址、電話、
 * 價格、庫存全部是虛構的。公開 demo 一定要講清楚，不然就是假門市資訊。
 * 上真資料時連同 layout.tsx 的 robots noindex 一起移除。
 */
export function DemoBanner() {
  return (
    <div className="border-b border-line bg-surface px-4 py-1.5 text-[11px] leading-[1.6] text-muted sm:px-7">
      <b className="font-bold text-ink">示範資料</b> · 站上所有藥局、價格與庫存皆為虛構，
      僅供介面展示 — 請勿依此前往門市。
    </div>
  );
}

/**
 * 資料狀態橫幅。
 *
 * 藥局資料現在是**真的**（食藥署 + 健保署開放資料），庫存則是還沒開始 ——
 * 所以文案要精準區分這兩件事。之前寫「所有藥局皆為虛構」在導入真實名單
 * 之後就變成錯的了，反而會讓人不信任真實資料。
 *
 * 有藥局裝上盒子、開始有掃描流之後，這個橫幅連同 layout.tsx 的 noindex
 * 一起移除。
 */
export function DemoBanner() {
  return (
    <div className="border-b border-line bg-surface px-4 py-1.5 text-[11px] leading-[1.6] text-muted sm:px-7">
      <b className="font-bold text-ink">試營運</b> · 藥局基本資料來自食藥署與健保署開放資料；
      即時庫存與價格尚未開始 — 前往門市前請先電話確認。
    </div>
  );
}

/**
 * 資料狀態橫幅。
 *
 * 店家資料現在是**真的**（政府開放資料 + 商業登記），庫存則是還沒開始 ——
 * 所以文案要精準區分這兩件事。之前寫「所有藥局皆為虛構」在導入真實名單
 * 之後就變成錯的了，反而會讓人不信任真實資料。
 *
 * 有藥局裝上盒子、開始有掃描流之後，這個橫幅連同 layout.tsx 的 noindex
 * 一起移除。
 */
export function DemoBanner() {
  return (
    <div className="border-b border-green-tint-line bg-sage/70 text-[12.5px] leading-[1.65] text-muted">
      <div className="shop-shell py-2">
        <b className="mr-2 inline-flex border border-green-tint-line bg-green-tint px-2 py-0.5 font-bold text-forest">
          試營運
        </b>
        店家資料來自政府開放資料；即時庫存尚未開始，前往門市前請先電話確認。售價與用藥說明由藥師於門市提供。
      </div>
    </div>
  );
}

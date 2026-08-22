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
import { getRequestLocale } from "@/lib/locale-server";

export async function DemoBanner() {
  const locale = await getRequestLocale();
  return (
    <div className="consumer-demo-banner border-b border-green-tint-line bg-sage/70 text-muted">
      <details className="group shop-shell">
        <summary className="cursor-pointer py-3 text-[14px] font-medium leading-[1.55] marker:text-green">
          <b className="mr-2 inline-flex bg-green-tint px-2 py-0.5 font-bold text-forest">
            {locale === "en" ? "EARLY ACCESS" : "試營運"}
          </b>
          {locale === "en"
            ? "Public pharmacy records; call the pharmacy before visiting."
            : "公開藥局資料；前往門市前請先打電話。"}
        </summary>
        <p className="m-0 pb-3 text-[14px] leading-[1.7] text-muted">
          {locale === "en"
            ? "Store records come from government open data. Call before visiting. Pharmacists provide prices and medicine guidance in store."
            : "店家資料來自政府開放資料；前往門市前請先電話確認。售價與用藥說明由藥師於門市提供。"}
        </p>
      </details>
    </div>
  );
}

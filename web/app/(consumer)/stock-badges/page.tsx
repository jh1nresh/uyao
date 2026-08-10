import type { Metadata } from "next";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StockBadge } from "@/components/StockBadge";
import { stockBadge } from "@/lib/stock";

export const metadata: Metadata = {
  title: "庫存徽章怎麼讀",
  description:
    "有藥的庫存狀態來自藥局店內掃描的新鮮度，誠實分級：今日掃描確認、N 天前確認、請預留確認。我們永遠不顯示確切數量。",
};

const TIERS = [
  {
    badge: stockBadge(0),
    desc: "24 小時內有掃描紀錄。實心綠 — 全站唯一的「放心去」訊號。",
  },
  {
    badge: stockBadge(3),
    desc: "1–7 天內的紀錄，空心灰綠 + 實際天數。可能還有，但別跑遠路賭。",
  },
  {
    badge: stockBadge(null),
    desc: "無近期紀錄。不假裝有貨 — 按預留由藥局人工確認，此時預留鈕轉為外框樣式。",
  },
];

export default function StockBadgesPage() {
  return (
    <>
      <SiteHeader showTagline />

      <main className="min-h-[calc(100svh-11rem)]">
      <section className="shop-shell max-w-[760px] py-10 sm:py-14">
        <p className="shop-kicker mb-3">INVENTORY CONFIDENCE</p>
        <h1 className="editorial-display mb-2 text-[32px] leading-[1.25] sm:text-[42px]">誠實分級：來自盒子掃描新鮮度</h1>
        <p className="mb-4 text-[13px] text-muted-2">
          永遠不顯示確切數量（是估計值），只顯示狀態。全站同一套字符：● ○ ？
        </p>

        <div className="mt-7 border border-line bg-paper">
          {TIERS.map((t) => (
            <div
              key={t.badge.tier}
              className="flex flex-col gap-1 border-b border-line-soft px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-3.5"
            >
              <StockBadge badge={t.badge} className="w-[150px] flex-none text-[15px]" />
              <p className="text-xs leading-[1.5] text-muted">{t.desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-3.5 text-[13px] leading-[1.7] text-muted">
          排序規則跟比價網站相反：<b className="text-ink">有貨新鮮度 → 距離 → 價格</b>
          。買貼布的人要「現在拿到」，不是省 5 塊。
          <br />
          徽章顏色只用墨色與同一個綠 — 不引入紅/黃警示色。
        </p>
      </section>
      </main>

      <SiteFooter />
    </>
  );
}

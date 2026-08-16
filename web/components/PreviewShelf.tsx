"use client";

import { useState } from "react";

import { ReserveSheet, type ReserveTarget } from "./ReserveSheet";
import { StockBadge } from "./StockBadge";
import { useLocale } from "./LocaleProvider";
import type { DrugRow } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { drugCopy } from "@/lib/i18n";
import type { Store } from "@/lib/types";

/**
 * 示範頁的商品架。跟正式頁的差別：
 *
 * 1. 卡片不連到 /drug/[slug] —— 那裡讀的是真庫存（目前是空的），
 *    示範走到一半會掉進「查不到即時庫存」，整個故事斷在最關鍵的一步。
 *    示範是一個封閉世界，不能有通往空資料的出口。
 * 2. 每張卡直接放預留鈕，開 ReserveSheet 並帶 demo flag ——
 *    後端改走 previewOffers 驗證、整筆標示 demo，並只送進 uYao Store
 *    sandbox。公開 preview 永遠不觸發真實藥局的 LINE。
 */
export function PreviewShelf({ store, items }: { store: Store; items: DrugRow[] }) {
  const locale = useLocale();
  const [target, setTarget] = useState<ReserveTarget | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it) => {
          const drug = drugCopy(it.drug, locale);
          return (
          <div
            key={it.drug.slug}
            className="flex flex-col gap-[5px] border border-line px-3.5 py-3"
          >
            <span className="text-[15px] font-medium text-ink">{drug.name}</span>
            <span className="text-[13px] text-muted-2">
              {drug.spec} · {drug.drugClass}
            </span>
            <span className="mt-0.5 flex items-center gap-2">
              <span className="num text-[15px] font-semibold text-ink">
                {formatPrice(it.priceTwd)}
              </span>
              <span className="flex-1" />
              <StockBadge badge={it.badge} short className="text-[13px]" />
            </span>
            <button
              type="button"
              onClick={() =>
                setTarget({
                  drug: { slug: it.drug.slug, name: drug.name, spec: drug.spec },
                  store,
                  priceTwd: it.priceTwd,
                  badge: it.badge,
                })
              }
              // 44px 觸控目標：這顆是拿手機遞給藥局老闆自己按的那一顆，
              // 漏掉它等於整場示範卡在最後一步。桌機用 sm: 還原原本的密度。
              className={`mt-1.5 flex min-h-11 items-center justify-center border px-3 text-xs font-bold transition-[background-color,border-color,transform] active:translate-y-px ${
                it.badge.tier === "unknown"
                  ? "border-line-strong text-muted hover:border-green hover:text-green"
                  : "border-forest bg-forest text-paper hover:bg-ink"
              }`}
            >
              {locale === "en" ? "Reserve" : "預留"}
            </button>
          </div>
        );})}
      </div>

      {target && (
        <ReserveSheet target={target} onClose={() => setTarget(null)} demo />
      )}
    </>
  );
}

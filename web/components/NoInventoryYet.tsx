import Link from "next/link";

import { formatDistance } from "@/lib/format";
import { hoursSummary } from "@/lib/hours";
import type { Store } from "@/lib/types";

/**
 * 藥品頁的空狀態。
 *
 * 沒有任何藥局裝盒子，所以沒有庫存可以列。這裡不假裝有貨，而是把這一區
 * 已經登錄的藥局列出來讓人直接打電話 —— 對消費者是可用的退路，對我們
 * 是把「有人在找這個藥」變成看得見的需求。
 */
export function NoInventoryYet({
  drugName,
  areaLabel,
  stores,
}: {
  drugName: string;
  areaLabel: string;
  stores: Store[];
}) {
  return (
    <section className="px-4 pb-6 pt-3.5 sm:px-7">
      <div className="border border-line-strong bg-surface px-4 py-3.5">
        <p className="text-[13px] font-bold text-ink">目前查不到即時庫存</p>
        <p className="mt-1 text-[12px] leading-[1.7] text-muted">
          庫存來自藥局店內掃描器，{areaLabel}還沒有藥局裝上盒子。
          下面是這一區的藥局，可以直接打電話問有沒有「{drugName}」。
        </p>
      </div>

      <div className="mt-2.5 flex flex-wrap items-baseline gap-2.5">
        <h2 className="text-sm font-black">{areaLabel}的藥局</h2>
        <p className="text-[11px] text-muted-2">{stores.length} 家 · 打電話前先看營業時段</p>
      </div>

      <div className="mt-2 border border-line">
        {stores.slice(0, 10).map((s) => (
          <div
            key={s.slug}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line-soft px-3.5 py-2.5 last:border-b-0 hover:bg-surface-hover"
          >
            <Link
              href={`/store/${s.slug}`}
              className="text-[13.5px] font-medium text-ink no-underline hover:text-green"
            >
              {s.name}
            </Link>
            {s.distanceM !== null && (
              <span className="num text-[11.5px] text-ink-2">{formatDistance(s.distanceM)}</span>
            )}
            <span className="text-[11.5px] text-muted">{hoursSummary(s)}</span>
            <div className="flex-1" />
            {s.phone ? (
              <a
                href={`tel:${s.phone.split("、")[0].replace(/-/g, "")}`}
                className="num flex-none border border-green px-3 py-1.5 text-[12px] font-bold text-green no-underline"
              >
                {s.phone.split("、")[0]}
              </a>
            ) : (
              <span className="text-[11px] text-muted-2">未提供電話</span>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-[1.6] text-muted-2">
        開藥局的？
        <Link href="/pharmacy" className="text-green">
          裝上盒子，你的庫存就會出現在這裡 →
        </Link>
      </p>
    </section>
  );
}

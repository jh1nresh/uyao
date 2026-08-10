import Link from "next/link";

import { AreaStores } from "./AreaStores";
import { NotifyMe } from "./NotifyMe";
import { formatDistance } from "@/lib/format";
import { hoursSummary } from "@/lib/hours";
import type { AreaSlug, Store } from "@/lib/types";

/**
 * 藥品頁的空狀態。
 *
 * 沒有任何藥局裝盒子，所以沒有庫存可以列。這裡不假裝有貨，而是把這一區
 * 已經登錄的藥局列出來讓人直接打電話 —— 對消費者是可用的退路，對我們
 * 是把「有人在找這個藥」變成看得見的需求。
 */
export function NoInventoryYet({
  drugName,
  drugSlug,
  area,
  areaLabel,
  stores,
}: {
  drugName: string;
  drugSlug: string;
  area: AreaSlug;
  areaLabel: string;
  stores: Store[];
}) {
  return (
    <section className="shop-shell py-10 sm:py-14">
      <p className="shop-kicker mb-3">INVENTORY STATUS</p>
      <div className="border border-line-strong bg-surface px-5 py-5 sm:px-6">
        <p className="text-[18px] font-bold text-ink">目前查不到即時庫存</p>
        <p className="mt-1 text-[13px] leading-[1.7] text-muted">
          庫存來自藥局店內掃描器，{areaLabel}還沒有藥局裝上盒子。
          下面是這一區的藥局，可以直接打電話問有沒有「{drugName}」。
        </p>
      </div>

      <NotifyMe
        kind="inventory_miss"
        query={drugName}
        drugSlug={drugSlug}
        drugName={drugName}
        area={area}
      />

      <div className="mt-2.5 flex flex-wrap items-baseline gap-2.5">
        <h2 className="text-sm font-black">{areaLabel}的藥局</h2>
        <p className="text-[13px] text-muted-2">{stores.length} 家 · 打電話前先看營業時段</p>
      </div>

      <div className="mt-2">
        <AreaStores
          stores={stores}
          area={area}
          areaLabel={areaLabel}
          limit={10}
          showPhone
        />
      </div>

      <p className="mt-3 text-[13px] leading-[1.6] text-muted-2">
        開藥局的？
        <Link href="/pharmacy" className="-my-3 ml-1 inline-flex min-h-11 items-center text-green">
          裝上盒子，你的庫存就會出現在這裡 →
        </Link>
      </p>
    </section>
  );
}

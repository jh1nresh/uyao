import Link from "next/link";

import { AreaStores } from "./AreaStores";
import { NotifyMe } from "./NotifyMe";
import { formatDistance } from "@/lib/format";
import { hoursSummary } from "@/lib/hours";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import type { AreaSlug, Store } from "@/lib/types";

/**
 * 藥品頁的空狀態。
 *
 * 沒有任何藥局裝盒子，所以沒有庫存可以列。這裡不假裝有貨，而是把這一區
 * 已經登錄的藥局列出來讓人直接打電話 —— 對消費者是可用的退路，對我們
 * 是把「有人在找這個藥」變成看得見的需求。
 */
export async function NoInventoryYet({
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
  const locale = await getRequestLocale();
  return (
    <section className="shop-shell py-10 sm:py-14">
      <NotifyMe
        kind="inventory_miss"
        query={drugName}
        drugSlug={drugSlug}
        drugName={drugName}
        area={area}
      />

      <div className="mt-2.5 flex flex-wrap items-baseline gap-2.5">
        <h2 className="text-[17px] font-black">{locale === "en" ? `Pharmacies in ${areaLabel}` : `${areaLabel}的藥局`}</h2>
        <p className="text-[14px] text-muted-2">{locale === "en" ? `${stores.length} stores · Check hours before calling` : `${stores.length} 家 · 打電話前先看營業時段`}</p>
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

      <p className="mt-3 text-[14px] leading-[1.6] text-muted-2">
        {locale === "en" ? "Run a pharmacy?" : "開藥局的？"}
        <Link href={localizedPath("/pharmacy", locale)} className="-my-3 ml-1 inline-flex min-h-11 items-center text-green">
          {locale === "en" ? "Install the box and make your inventory visible →" : "裝上盒子，你的庫存就會出現在這裡 →"}
        </Link>
      </p>
    </section>
  );
}

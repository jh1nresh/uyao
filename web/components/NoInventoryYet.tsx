import { NotifyMe } from "./NotifyMe";
import type { AreaSlug } from "@/lib/types";

/**
 * 藥品頁的空狀態。
 *
 * 沒有任何藥局裝盒子，所以沒有庫存可以列。這裡不拿同區但未確認販售的
 * 藥局來填空，只保留找藥需求，避免商品頁暗示那些店家有這個品項。
 */
export function NoInventoryYet({
  drugName,
  drugSlug,
  area,
}: {
  drugName: string;
  drugSlug: string;
  area: AreaSlug;
}) {
  return (
    <section id="pharmacy-list" className="shop-shell scroll-mt-24 py-10 sm:py-14">
      <NotifyMe
        kind="inventory_miss"
        query={drugName}
        drugSlug={drugSlug}
        drugName={drugName}
        area={area}
      />
    </section>
  );
}

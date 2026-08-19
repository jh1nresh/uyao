import Link from "next/link";

import { formatDistance } from "@/lib/format";
import { hoursSummary } from "@/lib/hours";
import { localizedPath } from "@/lib/i18n";
import type { Store } from "@/lib/types";

/**
 * 品項頁 hero 右欄的藥局卡（沒有庫存 rows 時）。
 *
 * 一個服務區最多四家，所以這裡列**全部**，不做「前三家 + 看更多」——
 * 逼人捲到頁尾才看得到電話，就是把唯一的下一步藏起來。
 *
 * 沒有掃描流就沒有庫存可講，這張卡只回答「哪幾家、多遠、幾點關、電話幾號」。
 * 地址、定位重排與需求登記留在下方完整區塊，那些是查資料，不是打電話。
 */
export function AreaStorePeek({
  stores,
  areaLabel,
  locale,
}: {
  stores: Store[];
  areaLabel: string;
  locale: "zh" | "en";
}) {
  if (stores.length === 0) return null;

  return (
    <div className="mt-2 border border-line bg-ivory">
      <p className="m-0 flex flex-wrap items-baseline gap-x-2 border-b border-line bg-surface px-3.5 py-2 text-[14px] font-bold text-forest">
        {locale === "en" ? `Pharmacies in ${areaLabel}` : `${areaLabel}的藥局`}
        <span className="text-[13px] font-normal text-muted-2">
          {locale === "en"
            ? `${stores.length} listed · call to check`
            : `${stores.length} 家 · 打電話問有沒有`}
        </span>
      </p>

      {stores.map((store) => (
        <div key={store.slug} className="border-b border-line-soft px-3.5 py-2.5 last:border-b-0">
          <div className="flex items-baseline gap-2">
            <Link
              href={localizedPath(`/store/${store.slug}`, locale)}
              className="history-link min-w-0 truncate text-[15px] font-medium text-ink no-underline"
            >
              {store.name}
            </Link>
            {/* 沒有座標的店距離是 null —— 留白，不要用「0 m」假裝就在旁邊。 */}
            {store.distanceM !== null && (
              <span className="num ml-auto flex-none text-[13px] text-ink-2">
                {formatDistance(store.distanceM)}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[13px] text-muted">
              {hoursSummary(store, locale)}
            </span>
            {/* 一家店可能登記多支號碼，撥號只給第一支 —— 撥不通還有藥局頁。 */}
            {store.phone ? (
              <a
                href={`tel:${store.phone.split("、")[0].replace(/-/g, "")}`}
                className="num -my-1 inline-flex min-h-11 flex-none items-center border border-forest px-2.5 text-[13px] font-bold text-forest no-underline hover:bg-surface"
              >
                {store.phone.split("、")[0]}
              </a>
            ) : (
              <span className="flex-none text-[13px] text-muted-2">
                {locale === "en" ? "No phone listed" : "未提供電話"}
              </span>
            )}
          </div>
        </div>
      ))}

      <a
        href="#pharmacy-list"
        className="flex min-h-11 items-center border-t border-line px-3.5 text-[14px] font-medium text-green no-underline hover:bg-surface-hover"
      >
        {locale === "en" ? "Addresses and demand sign-up ↓" : "看地址與登記需求 ↓"}
      </a>
    </div>
  );
}

import Link from "next/link";

import { formatDistance } from "@/lib/format";
import { hoursSummary } from "@/lib/hours";
import { localizedPath } from "@/lib/i18n";
import type { Store } from "@/lib/types";

/**
 * 品項頁 hero 右欄：**有這個品項的藥局**。
 *
 * 這頁只需要回答一件事 —— 哪家藥局有這個藥、電話幾號。資料是合作藥局自己
 * 確認過的販售品項（`partnersForProduct`），每個品項一到三家，整份列得完，
 * 不必只給前幾家再要人捲到頁尾。
 *
 * 刻意不列「這一區的所有藥局」：那些店沒有說過自己有這個品項，混在同一張
 * 卡裡會讓人以為打過去就問得到。其他店留在下方區塊。
 */
export function ProductStorePeek({
  stores,
  locale,
}: {
  stores: Store[];
  locale: "zh" | "en";
}) {
  if (stores.length === 0) return null;

  return (
    <div className="mt-2 border border-forest bg-ivory">
      <p className="m-0 border-b border-line bg-surface px-3.5 py-2 text-[14px] font-bold text-forest">
        {stores.length === 1
          ? locale === "en"
            ? "This pharmacy carries it"
            : "這家藥局有這個品項"
          : locale === "en"
            ? `${stores.length} pharmacies carry it`
            : `${stores.length} 家藥局有這個品項`}
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
                className="num -my-1 inline-flex min-h-11 flex-none items-center border border-forest bg-brand-surface px-2.5 text-[13px] font-bold text-on-dark no-underline"
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
        {locale === "en" ? "Other pharmacies nearby ↓" : "看這一區其他藥局 ↓"}
      </a>
    </div>
  );
}

import Link from "next/link";

import { AREAS } from "@/lib/data";
import type { AreaSlug } from "@/lib/types";

/**
 * 服務區切換。用純連結（?area=）不用 client state ——
 * 沒有 JS 也能切，而且切換後的網址可以直接分享。
 * v1 沒有真的定位，所以標「示範定位」而不是「已定位」。
 */
export function AreaSwitch({ area }: { area: AreaSlug }) {
  return (
    <div className="flex items-center gap-1.5 border border-line px-2.5 py-[5px] text-xs text-muted">
      <span aria-hidden>◎</span>
      <span className="hidden sm:inline">示範定位</span>
      <div role="group" aria-label="選擇服務區" className="flex items-center gap-1">
        {AREAS.map((a) => {
          const active = a.slug === area;
          return (
            <Link
              key={a.slug}
              href={`/?area=${a.slug}`}
              aria-current={active ? "true" : undefined}
              className={
                active
                  ? "font-medium text-green no-underline"
                  : "text-muted-2 no-underline hover:text-ink"
              }
            >
              {a.shortName}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

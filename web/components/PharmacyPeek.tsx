"use client";

import Link from "next/link";
import { useState } from "react";

import { useLocale } from "./LocaleProvider";
import { ReserveButton } from "./PharmacyList";
import { ReserveSheet, type ReserveTarget } from "./ReserveSheet";
import { StockBadge } from "./StockBadge";
import type { StoreRow } from "@/lib/data";
import { getArea } from "@/lib/data";
import { formatDistance } from "@/lib/format";
import { areaCopy, localizedPath } from "@/lib/i18n";

/** 卡片只放前幾家，完整清單（營業時段、排序說明）留在下方表格。 */
const PEEK_COUNT = 3;

/**
 * 品項頁 hero 右欄的「附近藥局」精簡卡：讓「哪裡拿得到」不用捲到頁面
 * 中下段才看到。只列店名、距離、庫存狀態與預留 —— 五欄大表塞不進側欄，
 * 也不該塞；其餘資訊用錨點跳到下方完整清單。
 */
export function PharmacyPeek({
  drug,
  rows,
}: {
  drug: { slug: string; name: string; spec: string };
  rows: StoreRow[];
}) {
  const [target, setTarget] = useState<ReserveTarget | null>(null);
  const locale = useLocale();

  if (rows.length === 0) return null;
  const top = rows.slice(0, PEEK_COUNT);

  return (
    <>
      <div className="mt-2 border border-line bg-ivory">
        <p className="m-0 border-b border-line bg-surface px-3.5 py-2 text-[14px] font-bold text-forest">
          {locale === "en" ? `${rows.length} nearby pharmacies` : `附近 ${rows.length} 家藥局`}
        </p>
        {top.map((r) => (
          <div
            key={r.store.slug}
            className="flex items-center gap-2.5 border-b border-line-soft px-3.5 py-2.5"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <Link
                  href={localizedPath(`/store/${r.store.slug}`, locale)}
                  className="history-link truncate text-[15px] font-medium text-ink no-underline"
                >
                  {r.store.name}
                </Link>
                <span className="text-[13px] text-muted-2">
                  {areaCopy(getArea(r.store.area), locale).shortName}
                </span>
                <span className="num text-[13px] text-ink-2">
                  {formatDistance(r.store.distanceM)}
                </span>
              </div>
              <StockBadge badge={r.badge} className="text-xs" />
            </div>
            <ReserveButton row={r} onClick={() => setTarget({ ...r, drug })} />
          </div>
        ))}
        <a
          href="#pharmacy-list"
          className="flex min-h-11 items-center px-3.5 text-[14px] font-medium text-green no-underline hover:bg-surface-hover"
        >
          {locale === "en"
            ? "See the full list: hours and availability ↓"
            : "看完整清單：營業時段與庫存狀態 ↓"}
        </a>
      </div>
      {target && <ReserveSheet target={target} onClose={() => setTarget(null)} />}
    </>
  );
}

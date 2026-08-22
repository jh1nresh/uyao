"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { CatalogImagePlaceholder } from "./CatalogImagePlaceholder";
import { catalogSourceStatus } from "./CatalogItemGrid";
import { known } from "@/lib/pending";
import { drugCopy, localizedPath, type Locale } from "@/lib/i18n";
import type { AreaSlug, Drug } from "@/lib/types";

/**
 * 目錄橫向瀏覽：左右滑動看不同商品。
 *
 * 用原生 scroll-snap 而不是 JS 輪播 —— 手機直接吃慣用的觸控慣性，桌機仍可
 * 用滾輪與左右鍵，而且沒有 JS 也還能捲。箭頭鈕只是加分項。
 *
 * 站上不做交易，所以卡片沒有價格與加入購物車；點下去是進品項頁看資料。
 */
export function CatalogCarousel({
  drugs,
  area,
  locale,
  label,
}: {
  drugs: Drug[];
  area: AreaSlug;
  locale: Locale;
  label: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    // 容差要蓋過容器的 px-1 內距：snap 到第一張時 scrollLeft 會停在 4 而不是 0，
    // 容差設 2 的話「往左」在最左端仍是可按的。12 遠小於卡片寬度，不會誤判。
    const EDGE = 12;
    setAtStart(el.scrollLeft <= EDGE);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - EDGE);
  }, []);

  useEffect(() => {
    sync();
    const el = railRef.current;
    if (!el) return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync]);

  function nudge(direction: 1 | -1) {
    const el = railRef.current;
    if (!el) return;
    // 一次捲一個「可視寬度的八成」，留一點重疊讓人知道是同一條列
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  if (drugs.length === 0) return null;

  const arrow =
    "flex h-11 w-11 items-center justify-center border border-line bg-paper text-forest transition-colors hover:border-forest disabled:cursor-default disabled:opacity-35 disabled:hover:border-line";

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={atStart}
          aria-label={locale === "en" ? "Scroll left" : "往左"}
          className={arrow}
        >
          <span aria-hidden>←</span>
        </button>
        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={atEnd}
          aria-label={locale === "en" ? "Scroll right" : "往右"}
          className={arrow}
        >
          <span aria-hidden>→</span>
        </button>
      </div>

      <div
        ref={railRef}
        onScroll={sync}
        aria-label={label}
        // tabIndex 讓鍵盤使用者能聚焦這條列並用左右鍵捲動
        tabIndex={0}
        className="catalog-rail -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2"
      >
        {drugs.map((item) => {
          const drug = drugCopy(item, locale);
          return (
            <Link
              key={item.slug}
              href={`${localizedPath(`/drug/${item.slug}`, locale)}?area=${area}`}
              className="history-link group flex shrink-0 snap-start flex-col border border-line-soft bg-paper no-underline transition-[background-color,border-color,transform] hover:-translate-y-px hover:border-line-strong hover:bg-surface-hover w-[calc((100%-12px)/2)] sm:w-[calc((100%-24px)/3)] md:w-[calc((100%-36px)/4)]"
            >
              <span className="relative block aspect-square w-full border-b border-line">
                {item.image ? (
                  <Image
                    src={item.image.src}
                    alt=""
                    fill
                    sizes="196px"
                    className="object-contain p-3"
                  />
                ) : (
                  <CatalogImagePlaceholder locale={locale} />
                )}
              </span>
              <span className="flex flex-1 flex-col justify-between gap-2 px-3.5 py-3">
                <span className="block text-[14.5px] font-bold leading-[1.45] text-ink">
                  {drug.name}
                </span>
                {/* 規格與出處都可能是空的 —— 有什麼講什麼，兩個都沒有就整行不留。 */}
                <span className="block text-[12.5px] leading-[1.5] text-muted-2">
                  {[known(drug.spec), catalogSourceStatus(item, locale)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

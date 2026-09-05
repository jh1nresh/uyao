"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { CatalogImagePlaceholder } from "./CatalogImagePlaceholder";
import { catalogSourceStatus } from "./CatalogItemGrid";
import { CATALOG_GROUPS, catalogGroupForDrug } from "@/lib/catalog-groups";
import { known } from "@/lib/pending";
import { productShowcaseScene } from "@/lib/product-showcase";
import { drugCopy, localizedPath, type Locale } from "@/lib/i18n";
import type { AreaSlug, Drug } from "@/lib/types";

const DRAG_THRESHOLD = 6;

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startScrollLeft: number;
};

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
  expanded = false,
}: {
  drugs: Drug[];
  area: AreaSlug;
  locale: Locale;
  label: string;
  /** 完整展開所有卡片；預設仍是原本的橫向瀏覽列。 */
  expanded?: boolean;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
    if (expanded) return;
    sync();
    const el = railRef.current;
    if (!el) return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded, sync]);

  function nudge(direction: 1 | -1) {
    const el = railRef.current;
    if (!el) return;
    // 一次捲一個「可視寬度的八成」，留一點重疊讓人知道是同一條列
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
    // Touch already gets native scrolling and momentum from the overflow rail.
    if (event.pointerType === "touch" || event.button !== 0 || !event.isPrimary) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: event.currentTarget.scrollLeft,
    };
    didDragRef.current = false;
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!didDragRef.current) {
      if (Math.abs(deltaX) < DRAG_THRESHOLD) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        dragRef.current = null;
        return;
      }

      didDragRef.current = true;
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      // Snap fights the pointer while it is down. Restore it on release.
      event.currentTarget.style.scrollSnapType = "none";
    }

    event.preventDefault();
    event.currentTarget.scrollLeft = drag.startScrollLeft - deltaX;
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const el = event.currentTarget;
    if (el.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    el.style.scrollSnapType = "";
    dragRef.current = null;
    setIsDragging(false);

    // A click is dispatched immediately after pointerup. Keep the flag for that
    // click, then clear it so a later intentional link click still works.
    if (didDragRef.current) {
      window.setTimeout(() => {
        didDragRef.current = false;
      }, 0);
    }
  }

  function cancelDrag(event: ReactPointerEvent<HTMLDivElement>) {
    finishDrag(event);
    didDragRef.current = false;
  }

  function suppressDraggedClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (!didDragRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    didDragRef.current = false;
  }

  if (drugs.length === 0) return null;

  const arrow =
    "flex h-11 w-11 items-center justify-center border border-line bg-paper text-forest transition-colors hover:border-forest disabled:cursor-default disabled:opacity-35 disabled:hover:border-line";

  return (
    <div className="relative">
      {!expanded && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="m-0 text-[12.5px] font-medium text-muted-2">
            {locale === "en" ? "Swipe or drag to browse" : "左右滑動或按住拖曳瀏覽"}
          </p>
          <div className="flex shrink-0 items-center gap-2">
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
        </div>
      )}

      <div
        ref={railRef}
        onScroll={expanded ? undefined : sync}
        onPointerDown={expanded ? undefined : startDrag}
        onPointerMove={expanded ? undefined : moveDrag}
        onPointerUp={expanded ? undefined : finishDrag}
        onPointerCancel={expanded ? undefined : cancelDrag}
        onClickCapture={expanded ? undefined : suppressDraggedClick}
        onDragStart={expanded ? undefined : (event) => event.preventDefault()}
        data-dragging={expanded ? undefined : isDragging}
        aria-label={label}
        // tabIndex 讓鍵盤使用者能聚焦這條列並用左右鍵捲動
        tabIndex={expanded ? undefined : 0}
        className={expanded
          ? "grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          : "catalog-rail -mx-1 flex cursor-grab snap-x snap-mandatory select-none gap-3 overflow-x-auto px-1 pb-2 data-[dragging=true]:cursor-grabbing"}
      >
        {drugs.map((item) => {
          const drug = drugCopy(item, locale);
          const scene = productShowcaseScene(item.slug);
          const groupSlug = catalogGroupForDrug(item);
          const group = CATALOG_GROUPS.find((candidate) => candidate.slug === groupSlug);
          const groupName = group
            ? locale === "en" ? group.nameEn : group.name
            : locale === "en" ? "Catalog item" : "品項資料";
          return (
            <Link
              key={item.slug}
              href={`${localizedPath(`/drug/${item.slug}`, locale)}?area=${area}`}
              className={`history-link group flex flex-col border border-line bg-paper no-underline transition-[border-color,transform] hover:-translate-y-0.5 hover:border-line-strong ${expanded
                ? "w-full"
                : "w-[calc((100%-12px)/2)] shrink-0 snap-start sm:w-[calc((100%-24px)/3)] lg:w-[calc((100%-36px)/4)]"}`}
            >
              <span className="relative block aspect-[4/3] w-full overflow-hidden border-b border-line bg-surface">
                <span className="num absolute left-3 top-3 z-[1] bg-paper/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-oxblood">
                  {groupName}
                </span>
                {scene ? (
                  <Image
                    src={scene.src}
                    alt=""
                    fill
                    sizes="(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 23vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                  />
                ) : (
                  <CatalogImagePlaceholder locale={locale} />
                )}
                {scene && <span className="absolute bottom-0 left-0 bg-paper/95 px-1.5 py-0.5 text-[11px] text-muted">{locale === "en" ? "Illustration" : "示意圖"}</span>}
              </span>
              <span className="flex flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5">
                <span className="block min-h-[2.9em] line-clamp-2 text-[15px] font-bold leading-[1.45] text-ink sm:text-[17px]">
                  {drug.name}
                </span>
                <span className="mt-2 block min-h-[3.1em] line-clamp-2 text-[12.5px] leading-[1.55] text-muted sm:text-[13.5px]">
                  {locale === "en" ? item.nutritionFocusEn : item.nutritionFocus}
                </span>
                {/* 規格與出處都可能是空的 —— 有什麼講什麼，兩個都沒有就整行不留。 */}
                <span className="mt-4 block text-[11.5px] leading-[1.5] text-muted-2 sm:text-[12.5px]">
                  {[known(drug.spec), catalogSourceStatus(item, locale)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="flex min-h-12 items-center justify-between gap-2 border-t border-line px-4 text-[11.5px] font-semibold text-oxblood sm:px-5 sm:text-[12.5px]">
                <span>{locale === "en" ? "Supply requires confirmation" : "供應需確認"}</span>
                <span className="text-forest transition-transform duration-200 group-hover:translate-x-1">
                  {locale === "en" ? "View item →" : "查看品項 →"}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

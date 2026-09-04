"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useLocale } from "./LocaleProvider";
import { drugCopy } from "@/lib/i18n";
import type { ShowcaseItem } from "@/lib/product-showcase";

/**
 * 品項橫向展示：每一張完成的實拍藥櫃整幅入鏡，櫃格、進深與鄰格包裝
 * 都在照片裡，瀏覽器只負責左右換主角。不要裁成單格再用 CSS 木條拼接。
 *
 * 消費端仍不顯示價格，這一排只用來瀏覽目錄，不是結帳漏斗。
 *
 * 互動一律三條路都通：觸控滑動（pointer drag）、左右鍵、下方箭頭鈕。
 */

export type { ShowcaseItem } from "@/lib/product-showcase";

const DRAG_THRESHOLD = 6;

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startScrollLeft: number;
};

export function ProductSwipeShowcase({
  items,
  eyebrow,
  title,
  hrefPrefix,
  hrefQuery = "",
}: {
  items: readonly ShowcaseItem[];
  eyebrow?: string;
  title?: string;
  /**
   * 主角連結的前綴，例如 `/zh-tw/drug`。給字串而不是函式 —— Server
   * Component 不能把函式傳進 Client Component。沒給就只展示不導流。
   */
  hrefPrefix?: string;
  /** 保留首頁選定的地區等查詢條件。 */
  hrefQuery?: string;
}) {
  const locale = useLocale();
  const [active, setActive] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const activeRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  const scrollFrameRef = useRef<number | null>(null);
  const sceneRailRef = useRef<HTMLDivElement>(null);
  const bayRefs = useRef<Array<HTMLDivElement | null>>([]);
  const pillRailRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const count = items.length;
  const indexedItems = items.map((item, logicalIndex) => ({
    item,
    logicalIndex,
    clone: false,
    key: item.drug.slug,
  }));
  const visualItems = count > 2
    ? [
        ...indexedItems.slice(-2).map((entry) => ({
          ...entry,
          clone: true,
          key: `leading-${entry.key}`,
        })),
        ...indexedItems,
        ...indexedItems.slice(0, 2).map((entry) => ({
          ...entry,
          clone: true,
          key: `trailing-${entry.key}`,
        })),
      ]
    : indexedItems;

  const nearestBayIndex = useCallback((rail: HTMLDivElement) => {
    const railCenter = rail.scrollLeft + rail.clientWidth / 2;
    let nearest = activeRef.current;
    let nearestDistance = Number.POSITIVE_INFINITY;

    rail.querySelectorAll<HTMLElement>("[data-showcase-index]").forEach((bay) => {
      const distance = Math.abs(bay.offsetLeft + bay.clientWidth / 2 - railCenter);
      if (distance < nearestDistance) {
        nearest = Number(bay.dataset.showcaseIndex);
        nearestDistance = distance;
      }
    });

    return nearest;
  }, []);

  const syncActive = useCallback(() => {
    const rail = sceneRailRef.current;
    if (!rail || rail.clientWidth === 0) return;
    const next = nearestBayIndex(rail);
    if (next === activeRef.current) return;
    activeRef.current = next;
    setActive(next);
  }, [nearestBayIndex]);

  const go = useCallback((next: number) => {
    const rail = sceneRailRef.current;
    if (!rail || count === 0) return;
    const resolved = ((next % count) + count) % count;
    const bay = bayRefs.current[resolved];
    if (!bay) return;
    rail.scrollTo({
      left: bay.offsetLeft - (rail.clientWidth - bay.clientWidth) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [count]);

  useEffect(() => {
    const rail = pillRailRef.current;
    const pill = pillRefs.current[active];
    if (!rail || !pill) return;
    rail.scrollTo({
      left: pill.offsetLeft - (rail.clientWidth - pill.clientWidth) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [active]);

  useLayoutEffect(() => {
    const rail = sceneRailRef.current;
    if (!rail) return;
    const centerActiveBay = () => {
      const bay = bayRefs.current[activeRef.current];
      if (!bay) return;
      rail.scrollLeft = bay.offsetLeft - (rail.clientWidth - bay.clientWidth) / 2;
    };
    const observer = new ResizeObserver(() => {
      centerActiveBay();
    });
    centerActiveBay();
    observer.observe(rail);
    return () => {
      observer.disconnect();
      if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    };
  }, []);

  function onScroll() {
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      syncActive();
    });
  }

  // Touch uses the browser's native scrolling and momentum. Mouse dragging mirrors
  // that rail instead of waiting until pointer-up and swapping an invisible image.
  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || !event.isPrimary || event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: event.currentTarget.scrollLeft,
    };
    didDragRef.current = false;
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
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
      event.currentTarget.style.scrollSnapType = "none";
    }

    event.preventDefault();
    event.currentTarget.scrollLeft = drag.startScrollLeft - deltaX;
  }

  function resetPointer(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rail = event.currentTarget;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    didDragRef.current = false;
    setIsDragging(false);
    rail.style.scrollSnapType = "";

    const next = nearestBayIndex(rail);
    go(next);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    resetPointer(event);
  }

  function onPointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    resetPointer(event);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(active + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(active - 1);
    }
  }

  if (count === 0) return null;
  const current = items[active];
  const copy = drugCopy(current.drug, locale);

  return (
    <div className="product-showcase-canvas relative">
      <div className="relative px-5 pb-7 pt-8 sm:px-8 sm:pb-9 sm:pt-10">
        {eyebrow && <p className="shop-kicker mb-2 text-center !text-[#74352f]">{eyebrow}</p>}
        {title && (
          <h2 className="editorial-display m-0 text-center text-[28px] leading-[1.2] text-[#1c2722] sm:text-[38px]">
            {title}
          </h2>
        )}

        {/* 品項膠囊：只切換主角，不濾清單 —— 這一排是導覽，不是篩選器。
            手機不換行：換行會變成四排色塊蓋住貨架，改成單排橫向捲動。 */}
        <div ref={pillRailRef} className="-mx-5 mt-4 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:mt-2 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
          {items.map((item, i) => (
            <button
              key={item.drug.slug}
              ref={(node) => {
                pillRefs.current[i] = node;
              }}
              type="button"
              onClick={() => go(i)}
              aria-current={i === active}
              className="h-11 max-w-[164px] shrink-0 text-[13px] font-medium"
            >
              <span
                className={`flex h-8 max-w-full items-center truncate rounded-full border px-3.5 transition-colors motion-reduce:transition-none ${
                  i === active
                    ? "border-[#17392c] bg-[#17392c] text-[#f8f4e9]"
                    : "border-[#b8b1a4] bg-[#f8f4e9] text-[#3e4b44] hover:border-[#17392c] hover:text-[#17392c]"
                }`}
              >
                {drugCopy(item.drug, locale).name}
              </span>
            </button>
          ))}
        </div>

        <div
          className="product-showcase-stage relative mt-5 overflow-hidden"
        >
          <div
            ref={sceneRailRef}
            role="group"
            aria-roledescription={locale === "en" ? "carousel" : "輪播"}
            aria-label={locale === "en" ? "Featured product cabinet" : "精選品項藥櫃場景"}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onScroll={onScroll}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            data-dragging={isDragging}
            className="product-showcase-rail relative flex h-full snap-x snap-mandatory overflow-x-auto touch-pan-x touch-pan-y select-none outline-offset-4"
          >
            {visualItems.map(({ item, logicalIndex, clone, key }) => (
              <div
                key={key}
                ref={(node) => {
                  if (!clone) bayRefs.current[logicalIndex] = node;
                }}
                data-showcase-index={logicalIndex}
                aria-hidden={clone || undefined}
                role={clone ? undefined : "group"}
                aria-roledescription={clone ? undefined : locale === "en" ? "slide" : "投影片"}
                aria-label={clone ? undefined : `${logicalIndex + 1} / ${count}: ${drugCopy(item.drug, locale).name}`}
                className="product-showcase-bay relative"
              >
                {/* 來源是寬幅場景；sizes 描述裁切前的繪製寬度，避免中央櫃格失真。 */}
                <Image
                  src={item.sceneSrc}
                  alt={clone
                    ? ""
                    : locale === "en"
                      ? `Wide uYao medicine cabinet with ${drugCopy(item.drug, locale).name} featured in the center`
                      : `以${drugCopy(item.drug, locale).name}為中央主角的 uYao 橫幅商品藥櫃`}
                  fill
                  sizes="(max-width: 767px) 100vw, min(100vw, 1600px)"
                  loading={!clone && logicalIndex === 0 ? "eager" : "lazy"}
                  draggable={false}
                  className="product-showcase-scene"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 sm:mt-1" aria-live="polite">
          <div className="mx-auto min-w-0 max-w-[520px] text-center">
            <p className="m-0 text-[19px] font-bold leading-[1.35] text-ink sm:text-[22px]">
              {copy.name}
            </p>
            <p className="mx-auto mb-0 mt-1 line-clamp-2 max-w-[460px] text-[13px] leading-[1.6] text-muted-2">
              {locale === "en"
                ? current.drug.nutritionFocusEn
                : current.drug.nutritionFocus}
            </p>
            {hrefPrefix && (
              <Link
                href={`${hrefPrefix}/${current.drug.slug}${hrefQuery}`}
                className="action-secondary mt-3.5 inline-flex min-h-11 items-center px-4 text-xs font-medium"
              >
                {locale === "en" ? "View item →" : "看這一項 →"}
              </Link>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-4 sm:mt-2">
          <ArrowButton
            dir="prev"
            label={locale === "en" ? "Previous product" : "上一項"}
            onClick={() => go(active - 1)}
          />
          <div className="flex gap-1.5">
            {items.map((item, i) => (
              <span
                key={item.drug.slug}
                aria-hidden
                className={`transition-colors motion-reduce:transition-none ${
                  i === active ? "h-[3px] w-7 bg-ink sm:w-8" : "h-px w-5 bg-[#c4bdb0] sm:w-6"
                }`}
              />
            ))}
          </div>
          <ArrowButton
            dir="next"
            label={locale === "en" ? "Next product" : "下一項"}
            onClick={() => go(active + 1)}
          />
        </div>
      </div>
    </div>
  );
}

function ArrowButton({
  dir,
  label,
  onClick,
}: {
  dir: "prev" | "next";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center border border-line-strong bg-paper text-[16px] text-ink-2 transition-colors hover:border-forest hover:text-forest"
    >
      {dir === "prev" ? "‹" : "›"}
    </button>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useLocale } from "./LocaleProvider";
import { drugCopy } from "@/lib/i18n";
import type { ShowcaseItem } from "@/lib/product-showcase";

/**
 * 品項展示：每一張完成的實拍藥櫃整幅入鏡，櫃格與鄰格包裝都在照片裡。
 * 換主角用淡入淡出，不要把兩張整幅櫃景橫向對切滑過 —— 那會露出木紋接縫，
 * 滑起來不順。互動：觸控／滑鼠滑動、鍵盤方向鍵、舞台左右箭頭鈕。
 *
 * 品名導覽仍靠上方 pill rail；箭頭只掛在櫃景兩側，方便一眼換項。
 */

export type { ShowcaseItem } from "@/lib/product-showcase";

const SWIPE_THRESHOLD = 48;
const DRAG_THRESHOLD = 6;

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
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
  const pillRailRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const count = items.length;

  const go = useCallback((next: number) => {
    if (count === 0) return;
    const resolved = ((next % count) + count) % count;
    activeRef.current = resolved;
    setActive(resolved);
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

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
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
    }

    event.preventDefault();
  }

  function finishPointer(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const deltaX = event.clientX - drag.startX;
    dragRef.current = null;
    const swiped = didDragRef.current;
    didDragRef.current = false;
    setIsDragging(false);

    if (!swiped || Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    go(activeRef.current + (deltaX < 0 ? 1 : -1));
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
        {eyebrow && <p className="shop-kicker mb-2 text-center text-oxblood">{eyebrow}</p>}
        {title && (
          <h2 className="editorial-display m-0 text-center text-[28px] leading-[1.2] text-ink sm:text-[38px]">
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
                className={`flex h-8 max-w-full items-center truncate border px-3.5 transition-colors motion-reduce:transition-none ${
                  i === active
                    ? "border-forest bg-forest text-paper"
                    : "border-line-strong bg-paper text-ink-2 hover:border-forest hover:text-forest"
                }`}
              >
                {drugCopy(item.drug, locale).name}
              </span>
            </button>
          ))}
        </div>

        <div className="product-showcase-stage relative mt-5 overflow-hidden">
          <div
            role="group"
            aria-roledescription={locale === "en" ? "carousel" : "輪播"}
            aria-label={locale === "en" ? "Featured product cabinet" : "精選品項藥櫃場景"}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finishPointer}
            onPointerCancel={finishPointer}
            data-dragging={isDragging}
            className="product-showcase-rail relative h-full touch-pan-y select-none outline-offset-4"
          >
            {items.map((item, logicalIndex) => {
              const nearActive = Math.abs(logicalIndex - active) <= 1
                || (active === 0 && logicalIndex === count - 1)
                || (active === count - 1 && logicalIndex === 0);
              return (
                <div
                  key={item.drug.slug}
                  data-showcase-index={logicalIndex}
                  data-active={logicalIndex === active}
                  role="group"
                  aria-roledescription={locale === "en" ? "slide" : "投影片"}
                  aria-label={`${logicalIndex + 1} / ${count}: ${drugCopy(item.drug, locale).name}`}
                  aria-hidden={logicalIndex !== active}
                  className="product-showcase-bay"
                >
                  <Image
                    src={item.sceneSrc}
                    alt={locale === "en"
                      ? `Wide uYao medicine cabinet with ${drugCopy(item.drug, locale).name} featured in the center`
                      : `以${drugCopy(item.drug, locale).name}為中央主角的 uYao 橫幅商品藥櫃`}
                    fill
                    sizes="(max-width: 767px) 100vw, min(100vw, 1600px)"
                    priority={logicalIndex === 0}
                    loading={nearActive ? "eager" : "lazy"}
                    draggable={false}
                    className="product-showcase-scene"
                  />
                </div>
              );
            })}
          </div>

          <ArrowButton
            dir="prev"
            label={locale === "en" ? "Previous product" : "上一項"}
            onClick={() => go(active - 1)}
            className="product-showcase-arrow product-showcase-arrow-prev"
          />
          <ArrowButton
            dir="next"
            label={locale === "en" ? "Next product" : "下一項"}
            onClick={() => go(active + 1)}
            className="product-showcase-arrow product-showcase-arrow-next"
          />
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

        <div className="mt-5 flex items-center justify-center gap-1.5 sm:mt-2" aria-hidden>
          {items.map((item, i) => (
            <span
              key={item.drug.slug}
              className={`transition-colors motion-reduce:transition-none ${
                i === active ? "h-[3px] w-7 bg-ink sm:w-8" : "h-px w-5 bg-line-strong sm:w-6"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ArrowButton({
  dir,
  label,
  onClick,
  className,
}: {
  dir: "prev" | "next";
  label: string;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={className}
    >
      <span aria-hidden>{dir === "prev" ? "‹" : "›"}</span>
    </button>
  );
}

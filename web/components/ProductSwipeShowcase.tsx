"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useLocale } from "./LocaleProvider";
import { drugCopy } from "@/lib/i18n";
import { known } from "@/lib/pending";
import type { ShowcaseItem } from "@/lib/product-showcase";

/** 商品與櫃格共用同一條原生捲動軌道；觸控保留瀏覽器慣性。 */
export type { ShowcaseItem } from "@/lib/product-showcase";

type DragState = {
  pointerId: number;
  x: number;
  y: number;
  scrollLeft: number;
  moved: boolean;
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
  const activeRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const scrollFrame = useRef<number | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pillRailRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const count = items.length;
  // Copies preserve neighbouring bays at the seam. Only the middle set is exposed
  // to assistive technology; after settling, recenter on its identical original.
  const cycles = count > 1 ? [0, 1, 2] : [1];

  const nearestBay = useCallback(() => {
    const rail = stageRef.current;
    if (!rail) return null;
    const center = rail.scrollLeft + rail.clientWidth / 2;
    return Array.from(rail.querySelectorAll<HTMLElement>("[data-showcase-index]"))
      .reduce<HTMLElement | null>((nearest, bay) => {
        const distance = (node: HTMLElement) => Math.abs(node.offsetLeft + node.clientWidth / 2 - center);
        return !nearest || distance(bay) < distance(nearest) ? bay : nearest;
      }, null);
  }, []);

  const centerBay = useCallback((bay: HTMLElement, smooth: boolean) => {
    const rail = stageRef.current;
    if (!rail) return;
    rail.scrollTo({
      left: bay.offsetLeft - (rail.clientWidth - bay.clientWidth) / 2,
      behavior: smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "smooth" : "instant",
    });
  }, []);

  const settle = useCallback(() => {
    if (dragRef.current) return;
    const bay = nearestBay();
    if (!bay || bay.dataset.cycle === "1") return;
    const original = stageRef.current?.querySelector<HTMLElement>(
      `[data-cycle="1"][data-showcase-index="${bay.dataset.showcaseIndex}"]`,
    );
    if (original) centerBay(original, false);
  }, [centerBay, nearestBay]);

  const go = useCallback((next: number) => {
    const rail = stageRef.current;
    if (!rail || !count) return;
    const resolved = ((next % count) + count) % count;
    const center = rail.scrollLeft + rail.clientWidth / 2;
    const bays = Array.from(rail.querySelectorAll<HTMLElement>(`[data-showcase-index="${resolved}"]`));
    const bay = bays.sort((a, b) =>
      Math.abs(a.offsetLeft + a.clientWidth / 2 - center) - Math.abs(b.offsetLeft + b.clientWidth / 2 - center),
    )[0];
    if (bay) centerBay(bay, true);
  }, [centerBay, count]);

  useLayoutEffect(() => {
    const rail = stageRef.current;
    if (!rail) return;
    const resize = () => {
      const bay = rail.querySelector<HTMLElement>(`[data-cycle="1"][data-showcase-index="${activeRef.current}"]`);
      if (bay) centerBay(bay, false);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(rail);
    rail.addEventListener("scrollend", settle);
    return () => {
      observer.disconnect();
      rail.removeEventListener("scrollend", settle);
      if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
      if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    };
  }, [centerBay, count, settle]);

  useEffect(() => {
    const rail = pillRailRef.current;
    const pill = pillRefs.current[active];
    if (!rail || !pill) return;
    rail.scrollTo({
      left: pill.offsetLeft - (rail.clientWidth - pill.clientWidth) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }, [active]);

  function onScroll() {
    if (scrollFrame.current === null) {
      scrollFrame.current = requestAnimationFrame(() => {
        scrollFrame.current = null;
        const bay = nearestBay();
        if (!bay) return;
        const next = Number(bay.dataset.showcaseIndex);
        activeRef.current = next;
        setActive(next);
      });
    }
    // Fallback for browsers without scrollend; scrolling momentum resets this timer.
    if (settleTimer.current !== null) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(settle, 180);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    suppressClick.current = false;
    if (event.pointerType === "touch" || !event.isPrimary || event.button !== 0) return;
    const rail = event.currentTarget;
    rail.scrollTo({ left: rail.scrollLeft, behavior: "instant" });
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, scrollLeft: rail.scrollLeft, moved: false };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.x;
    if (!drag.moved) {
      if (Math.max(Math.abs(deltaX), Math.abs(event.clientY - drag.y)) < 6) return;
      if (Math.abs(deltaX) <= Math.abs(event.clientY - drag.y)) {
        dragRef.current = null;
        return;
      }
      drag.moved = true;
      suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.dataset.dragging = "true";
    }
    event.preventDefault();
    event.currentTarget.scrollLeft = drag.scrollLeft - deltaX;
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const bay = nearestBay();
    dragRef.current = null;
    event.currentTarget.dataset.dragging = "false";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.moved && bay) centerBay(bay, true);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    go(activeRef.current + (event.key === "ArrowRight" ? 1 : -1));
  }

  if (count === 0) return null;
  const current = items[active] ?? items[0];
  const copy = drugCopy(current.drug, locale);
  const metaLine = [known(copy.spec), known(copy.drugClass)].filter(Boolean).join(" · ") || null;

  return (
    <div className="product-showcase-canvas relative">
      <div className="relative px-5 pb-7 pt-8 sm:px-8 sm:pb-9 sm:pt-10">
        {eyebrow && <p className="shop-kicker mb-2 text-center text-oxblood">{eyebrow}</p>}
        {title && (
          <h2 className="editorial-display m-0 text-center text-[28px] leading-[1.2] text-ink sm:text-[38px]">
            {title}
          </h2>
        )}

        {/* 品項膠囊：只切換主角，不濾清單。手機單排橫向捲動。 */}
        <div
          ref={pillRailRef}
          className="product-showcase-pills relative -mx-5 mt-4 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:mt-2 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
        >
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

        <div className="product-showcase-stage relative mt-5">
          <div
            ref={stageRef}
            role="group"
            aria-roledescription={locale === "en" ? "carousel" : "輪播"}
            aria-label={locale === "en" ? "Featured products" : "精選品項"}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onScroll={onScroll}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={endDrag}
            onPointerLeave={(event) => { if (!dragRef.current?.moved) endDrag(event); }}
            data-lenis-prevent
            className="product-showcase-rail"
          >
            {cycles.flatMap((cycle) => items.map((item, i) => (
              <div
                key={`${cycle}-${item.drug.slug}`}
                data-showcase-index={i}
                data-cycle={cycle}
                data-active={i === active}
                aria-hidden={cycle !== 1}
                role="group"
                aria-label={`${i + 1} / ${count}: ${drugCopy(item.drug, locale).name}`}
                className="product-showcase-bay"
                style={{
                  "--bay-width": item.bay === "wide" ? "1.6743" : "1.24",
                  "--bay-offset": item.bay === "wide" ? "-1.64" : item.bay === "sunlit" ? "-3.32" : "-0.4",
                  "--packshot-height": `${item.shelfHeight}%`,
                } as CSSProperties}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => { if (!suppressClick.current) go(i); }}
                  aria-label={drugCopy(item.drug, locale).name}
                  className="product-showcase-item"
                >
                  <Image
                    src={item.cutout.src}
                    alt={cycle === 1 ? `${drugCopy(item.drug, locale).name}${locale === "en" ? " product illustration" : "商品示意圖"}` : ""}
                    width={item.cutout.width}
                    height={item.cutout.height}
                    sizes="(min-width: 768px) 360px, 240px"
                    loading={cycle === 1 && i < 2 ? "eager" : "lazy"}
                    draggable={false}
                    className="product-showcase-packshot"
                  />
                </button>
              </div>
            )))}
          </div>
        </div>

        <div className="mt-5 sm:mt-1" aria-live="polite">
          <div className="mx-auto min-w-0 max-w-[520px] text-center">
            <p className="m-0 text-[19px] font-bold leading-[1.35] text-ink sm:text-[22px]">
              {copy.name}
            </p>
            {metaLine && (
              <p className="mx-auto mb-0 mt-1.5 max-w-[460px] text-[14px] leading-[1.6] text-muted">
                {metaLine}
              </p>
            )}
            <p className="mx-auto mb-0 mt-1 line-clamp-2 max-w-[460px] text-[13px] leading-[1.6] text-muted-2">
              {copy.nutritionFocus}
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

        <p className="mb-0 mt-3 text-center text-xs text-muted-2">
          {locale === "en" ? "Product illustrations; refer to actual packaging." : "商品示意，包裝以實品為準。"}
        </p>

        <div className="mt-5 flex items-center justify-center gap-4">
          <ArrowButton
            dir="prev"
            label={locale === "en" ? "Previous product" : "上一項"}
            onClick={() => go(activeRef.current - 1)}
          />
          <div className="flex gap-1.5" aria-hidden>
            {items.map((item, i) => (
              <span
                key={item.drug.slug}
                className={`transition-colors motion-reduce:transition-none ${
                  i === active ? "h-[3px] w-7 bg-ink sm:w-8" : "h-px w-5 bg-line-strong sm:w-6"
                }`}
              />
            ))}
          </div>
          <ArrowButton
            dir="next"
            label={locale === "en" ? "Next product" : "下一項"}
            onClick={() => go(activeRef.current + 1)}
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
      className="product-showcase-arrow flex h-11 w-11 shrink-0 items-center justify-center border border-line-strong bg-paper text-[16px] text-ink-2 transition-colors hover:border-forest hover:text-forest"
    >
      <span aria-hidden>{dir === "prev" ? "‹" : "›"}</span>
    </button>
  );
}

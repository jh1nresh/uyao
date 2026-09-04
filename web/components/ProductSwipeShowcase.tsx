"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";

import { useLocale } from "./LocaleProvider";
import { drugCopy } from "@/lib/i18n";
import { known } from "@/lib/pending";
import type { ShowcaseItem } from "@/lib/product-showcase";

/**
 * 品項橫向展示：用從原本櫃景獨立抠出的去背商品圖，不要整幅櫃景、也不貼回木板。
 * 左右滑動換主角，中央那一支放大，側邊縮小 —— 回到先前的貨架滑動放大特效。
 *
 * 互動三條路都通：觸控／滑鼠拖曳、鍵盤方向鍵、下方左右箭頭。
 */

export type { ShowcaseItem } from "@/lib/product-showcase";

/** 可視範圍內主角左右各放幾支。手機縮成 1，桌機 2。 */
const SIDE_DESKTOP = 2;

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
  // SSR 採手機優先，避免 hydration 前把桌機五支擠進窄螢幕。
  const [side, setSide] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<number | null>(null);
  // 換項判斷讀 ref：pointermove 與 pointerup 同批時，closure 還看得到舊 delta。
  const dragDelta = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const pillRailRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const count = items.length;
  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setActive(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setSide(mq.matches ? SIDE_DESKTOP : 1);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
    dragStart.current = event.clientX;
    dragDelta.current = 0;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStart.current === null) return;
    dragDelta.current = event.clientX - dragStart.current;
    // 連續 pointermove 直接改 compositor transform，不讓 React 每格重畫整排。
    event.currentTarget.style.setProperty(
      "--showcase-drag-x",
      `${dragDelta.current * 0.42}px`,
    );
  }

  function resetPointer(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.currentTarget.style.setProperty("--showcase-drag-x", "0px");
    dragStart.current = null;
    dragDelta.current = 0;
    setIsDragging(false);
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStart.current === null) return;
    if (dragDelta.current <= -60) go(active + 1);
    else if (dragDelta.current >= 60) go(active - 1);
    resetPointer(event);
  }

  function onPointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStart.current === null) return;
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
  // 規格與分類都還沒確認時整行不顯示，避免「規格待確認 · 待確認」像頁面沒做完。
  const metaLine =
    [known(copy.spec), known(copy.drugClass)].filter(Boolean).join(" · ") || null;

  /** 環狀位移：-side…+side 之外的品項不畫。 */
  function offsetOf(index: number): number | null {
    let d = index - active;
    if (d > count / 2) d -= count;
    if (d < -count / 2) d += count;
    return Math.abs(d) <= side ? d : null;
  }

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

        <div
          ref={stageRef}
          role="group"
          aria-roledescription={locale === "en" ? "carousel" : "輪播"}
          aria-label={locale === "en" ? "Featured products" : "精選品項"}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          data-dragging={isDragging}
          style={{ "--showcase-drag-x": "0px" } as CSSProperties}
          className="product-showcase-stage relative mt-5 cursor-grab touch-pan-y select-none outline-offset-4 active:cursor-grabbing"
        >
          {items.map((item, i) => {
            const offset = offsetOf(i);
            if (offset === null) return null;
            const isActive = offset === 0;
            const { cutout } = item;
            const altImage = item.drug.image;
            // 位移用舞台寬度百分比，側邊才不會疊在主角後面看不見。
            const step = side === 1 ? 40 : 19;
            const scale = isActive ? 1 : Math.abs(offset) === 1 ? 0.66 : 0.48;
            return (
              <button
                key={item.drug.slug}
                type="button"
                tabIndex={-1}
                aria-hidden={!isActive}
                data-showcase-index={i}
                data-active={isActive}
                data-offset={String(offset)}
                onClick={() => go(i)}
                className={`product-showcase-item absolute bottom-0 left-1/2 block border-0 bg-transparent p-0 transition-[transform,opacity,filter] ease-out motion-reduce:transition-none ${
                  isDragging ? "duration-0 will-change-transform" : "duration-500"
                }`}
                style={{
                  transformOrigin: "bottom center",
                  transform: `translate3d(calc(-50% + ${offset * step}cqw + var(--showcase-drag-x)), 0, 0) scale(${scale})`,
                  opacity: isActive ? 1 : Math.abs(offset) === 1 ? 0.9 : 0.62,
                  zIndex: 10 - Math.abs(offset),
                  filter: isActive ? "none" : "brightness(0.96)",
                }}
              >
                <span className="product-showcase-packshot-frame relative block">
                  <Image
                    src={cutout.src}
                    alt={
                      locale === "en"
                        ? (altImage?.altEn ?? item.drug.nameEn ?? item.drug.name)
                        : (altImage?.alt ?? item.drug.name)
                    }
                    width={cutout.width}
                    height={cutout.height}
                    sizes="(min-width: 768px) 230px, 180px"
                    {...(Math.abs(offset) <= 1
                      ? i === active
                        ? { priority: true as const }
                        : { loading: "eager" as const }
                      : { loading: "lazy" as const })}
                    draggable={false}
                    className="product-showcase-packshot"
                  />
                </span>
              </button>
            );
          })}
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

        <div className="mt-5 flex items-center justify-center gap-4">
          <ArrowButton
            dir="prev"
            label={locale === "en" ? "Previous product" : "上一項"}
            onClick={() => go(active - 1)}
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
      className="product-showcase-arrow flex h-11 w-11 shrink-0 items-center justify-center border border-line-strong bg-paper text-[16px] text-ink-2 transition-colors hover:border-forest hover:text-forest"
    >
      <span aria-hidden>{dir === "prev" ? "‹" : "›"}</span>
    </button>
  );
}

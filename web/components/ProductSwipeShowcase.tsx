"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";

import { useLocale } from "./LocaleProvider";
import { drugCopy } from "@/lib/i18n";
import { known } from "@/lib/pending";
import type { ShowcaseItem } from "@/lib/product-showcase";

/**
 * 品項橫向展示：左右滑動換品項，中央那一支放大，全部落在同一層藥櫃上。
 *
 * 這是 vidrate 那種「一排商品、滑動換主角」的貨架感，但拿掉電商的價格與
 * 購物車 —— 消費端頁面不顯示藥品價格，這一排是用來「看清楚有哪些品項」，
 * 不是結帳漏斗。
 *
 * 互動一律三條路都通：觸控滑動（pointer drag）、左右鍵、下方箭頭鈕。
 * 只做觸控滑動的話，桌機與鍵盤使用者會沒有出口。
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
  const [side, setSide] = useState(SIDE_DESKTOP);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<number | null>(null);
  // 判斷要不要換品項時讀 ref 而不是 state：pointermove 與 pointerup 落在
  // 同一個批次時，pointerup 的 closure 還看得到舊的 drag，滑動就會失效。
  const dragDelta = useRef(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const pillRailRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const count = items.length;
  const go = useCallback(
    (next: number) => setActive(((next % count) + count) % count),
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

  // 指標拖曳：桌機滑鼠、手機手指同一條路。超過 60px 才換，避免點擊被誤判成滑動。
  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    dragStart.current = event.clientX;
    dragDelta.current = 0;
    setIsDragging(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStart.current === null) return;
    dragDelta.current = event.clientX - dragStart.current;
    // 連續 pointermove 直接更新 compositor transform，不讓 React 每格重畫整排。
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
  // 規格與分類都還沒確認時整行不顯示。「規格待確認 · 待確認」並排出現在
  // 品名正下方，看起來像頁面沒做完，而不是像誠實揭露。
  const metaLine =
    [known(copy.spec), known(copy.drugClass)].filter(Boolean).join(" · ") || null;

  /** 環狀位移：-side…+side 之外的品項不畫，DOM 不會因為目錄變長而爆掉。 */
  function offsetOf(index: number): number | null {
    let d = index - active;
    if (d > count / 2) d -= count;
    if (d < -count / 2) d += count;
    return Math.abs(d) <= side ? d : null;
  }

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
            手機不換行：換行會變成四排色塊蓋住背景三角，改成單排橫向捲動。 */}
        <div ref={pillRailRef} className="-mx-5 mt-4 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0">
          {items.map((item, i) => (
            <button
              key={item.drug.slug}
              ref={(node) => {
                pillRefs.current[i] = node;
              }}
              type="button"
              onClick={() => go(i)}
              aria-current={i === active}
              className={`h-8 max-w-[164px] shrink-0 truncate border px-3 text-[13px] font-medium transition-colors motion-reduce:transition-none ${
                i === active
                  ? "border-[#17392c] bg-[#17392c] text-[#f8f4e9]"
                  : "border-[#b8b1a4] bg-[#f8f4e9]/85 text-[#3e4b44] hover:border-[#17392c] hover:text-[#17392c]"
              }`}
            >
              {drugCopy(item.drug, locale).name}
            </button>
          ))}
        </div>

        {/* 舞台 */}
        <div
          ref={frameRef}
          role="group"
          aria-roledescription={locale === "en" ? "carousel" : "輪播"}
          aria-label={locale === "en" ? "Products at this pharmacy" : "本店品項"}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          style={{ "--showcase-drag-x": "0px" } as CSSProperties}
          className="product-showcase-stage relative mt-5 h-[250px] cursor-grab touch-pan-y select-none outline-offset-4 [container-type:inline-size] active:cursor-grabbing sm:h-[300px]"
        >
          {items.map((item, i) => {
            const offset = offsetOf(i);
            if (offset === null) return null;
            const isActive = offset === 0;
            const image = item.drug.image;
            if (!image) return null;
            // 位移用「舞台寬度的百分比」而不是商品自身的百分比 —— 用後者
            // 時側邊那幾支會疊在主角後面看不見，貨架就只剩一支商品。
            // 手機一側只放一支，間距要拉開，否則側邊品項會壓到主角包裝上。
            const step = side === 1 ? 40 : 19;
            return (
              <button
                key={item.drug.slug}
                type="button"
                tabIndex={-1}
                aria-hidden={!isActive}
                onClick={() => go(i)}
                // 全部站在同一條地板線上（transform-origin: bottom），縮小的
                // 側邊品項才不會浮在半空中。
                className={`absolute bottom-0 left-1/2 block border-0 bg-transparent p-0 transition-[transform,opacity,filter] ease-out motion-reduce:transition-none ${
                  isDragging ? "duration-0 will-change-transform" : "duration-500"
                }`}
                style={{
                  transformOrigin: "bottom center",
                  transform: `translate3d(calc(-50% + ${offset * step}cqw + var(--showcase-drag-x)), 0, 0) scale(${
                    isActive ? 1 : Math.abs(offset) === 1 ? 0.66 : 0.48
                  })`,
                  opacity: isActive ? 1 : Math.abs(offset) === 1 ? 0.9 : 0.62,
                  zIndex: 10 - Math.abs(offset),
                }}
              >
                <span className="relative block h-[230px] w-[180px] sm:h-[290px] sm:w-[230px]">
                  <Image
                    src={image.src}
                    alt={locale === "en" ? image.altEn : image.alt}
                    fill
                    sizes="(min-width: 768px) 230px, 180px"
                    className="object-contain object-bottom drop-shadow-[0_7px_10px_rgba(77,53,29,0.22)]"
                    priority={Math.abs(offset) <= 1}
                    draggable={false}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* 主角資訊。左右鈕改放在下面那排 —— 夾在文字兩側時，手機上的品名
            與描述只剩不到一半寬度，會被擠成三四行。 */}
        <div className="mt-5" aria-live="polite">
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

        {/* 控制列：左右鈕夾著進度條，滑到哪裡與怎麼換都在同一行 */}
        <div className="mt-5 flex items-center justify-center gap-4">
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
                className={`h-[3px] w-5 transition-colors motion-reduce:transition-none sm:w-6 ${
                  i === active ? "bg-forest" : "bg-line-strong"
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
      {dir === "prev" ? "←" : "→"}
    </button>
  );
}

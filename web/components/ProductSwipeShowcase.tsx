"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useLocale } from "./LocaleProvider";
import { drugCopy } from "@/lib/i18n";
import type { ShowcaseItem } from "@/lib/product-showcase";

/**
 * 品項橫向展示：整座藥櫃是一張完成的品牌場景，左右滑動只切換目錄焦點。
 *
 * 商品、櫃格與光影不在瀏覽器裡逐張拼裝；這跟首頁 hero 使用同一種完整場景
 * 資產策略。消費端仍不顯示價格，這一排只用來瀏覽目錄，不是結帳漏斗。
 *
 * 互動一律三條路都通：觸控滑動（pointer drag）、左右鍵、下方箭頭鈕。
 */

export type { ShowcaseItem } from "@/lib/product-showcase";

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
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStart.current === null) return;
    dragDelta.current = event.clientX - dragStart.current;
  }
  function resetPointer(event: React.PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStart.current = null;
    dragDelta.current = 0;
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
                className={`flex h-8 max-w-full items-center truncate border px-3 transition-colors motion-reduce:transition-none ${
                  i === active
                    ? "border-[#17392c] bg-[#17392c] text-[#f8f4e9]"
                    : "border-[#b8b1a4] bg-[#f8f4e9]/85 text-[#3e4b44] hover:border-[#17392c] hover:text-[#17392c]"
                }`}
              >
                {drugCopy(item.drug, locale).name}
              </span>
            </button>
          ))}
        </div>

        <div
          ref={frameRef}
          role="group"
          aria-roledescription={locale === "en" ? "carousel" : "輪播"}
          aria-label={locale === "en" ? "Featured product cabinet" : "精選品項藥櫃場景"}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          className="product-showcase-stage relative mt-5 overflow-hidden cursor-grab touch-pan-y select-none outline-offset-4 active:cursor-grabbing"
        >
          {items.map((item, i) => (
            <Image
              key={item.drug.slug}
              src={item.sceneSrc}
              alt={i === active
                ? locale === "en"
                  ? `Wide uYao medicine cabinet with ${drugCopy(item.drug, locale).name} featured in the center`
                  : `以${drugCopy(item.drug, locale).name}為中央主角的 uYao 橫幅商品藥櫃`
                : ""}
              aria-hidden={i !== active}
              fill
              sizes="100vw"
              priority={i === 0}
              draggable={false}
              className={`product-showcase-scene transition-opacity duration-300 motion-reduce:transition-none ${
                i === active ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            />
          ))}
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

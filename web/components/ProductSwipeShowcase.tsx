"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useLocale } from "./LocaleProvider";
import { drugCopy } from "@/lib/i18n";
import { known } from "@/lib/pending";
import type { ShowcaseItem } from "@/lib/product-showcase";

/**
 * 品項成列展示：目錄去背包裝照排成等寬商品列，點選看詳情。
 * 對齊首頁藥櫃編輯節奏 —— 不要中央放大輪播，也不貼木板／整幅櫃景。
 *
 * 互動：點選品項、鍵盤左右、下方箭頭。
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
  const tileRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const gridRef = useRef<HTMLDivElement>(null);

  const count = items.length;
  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setActive(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    const tile = tileRefs.current[active];
    const grid = gridRef.current;
    if (!tile || !grid) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // 只在手機橫向溢出時把選中項捲進視野；桌機網格不必動。
    if (grid.scrollWidth <= grid.clientWidth + 8) return;
    grid.scrollTo({
      left: tile.offsetLeft - (grid.clientWidth - tile.clientWidth) / 2,
      behavior: reduce ? "auto" : "smooth",
    });
  }, [active]);

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

  return (
    <div className="product-showcase-canvas relative">
      <div className="relative px-5 pb-7 pt-8 sm:px-8 sm:pb-9 sm:pt-10">
        {eyebrow && <p className="shop-kicker mb-2 text-center text-oxblood">{eyebrow}</p>}
        {title && (
          <h2 className="editorial-display m-0 text-center text-[28px] leading-[1.2] text-ink sm:text-[38px]">
            {title}
          </h2>
        )}

        <div
          ref={gridRef}
          role="listbox"
          aria-label={locale === "en" ? "Featured products" : "精選品項"}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="product-showcase-stage product-showcase-row mt-8 outline-offset-4"
        >
          {items.map((item, i) => {
            const isActive = i === active;
            const image = item.drug.image;
            if (!image) return null;
            const name = drugCopy(item.drug, locale).name;
            return (
              <button
                key={item.drug.slug}
                ref={(node) => {
                  tileRefs.current[i] = node;
                }}
                type="button"
                role="option"
                aria-selected={isActive}
                data-showcase-index={i}
                data-active={isActive}
                onClick={() => go(i)}
                className="product-showcase-item group flex snap-center flex-col items-center border-0 bg-transparent p-0 text-left transition-[opacity] duration-300 ease-out motion-reduce:transition-none"
                style={{ opacity: isActive ? 1 : 0.72 }}
              >
                <span className="product-showcase-packshot-frame relative flex w-full items-end justify-center">
                  <Image
                    src={image.src}
                    alt={locale === "en" ? image.altEn : image.alt}
                    width={image.width}
                    height={image.height}
                    sizes="(min-width: 768px) 160px, 42vw"
                    {...(i === active
                      ? { priority: true as const }
                      : i < 4
                        ? { loading: "eager" as const }
                        : { loading: "lazy" as const })}
                    draggable={false}
                    className="product-showcase-packshot"
                  />
                </span>
                <span
                  className={`mt-3 line-clamp-2 w-full text-center text-[12px] leading-[1.35] transition-colors motion-reduce:transition-none sm:text-[13px] ${
                    isActive ? "font-bold text-ink" : "font-medium text-ink-2 group-hover:text-ink"
                  }`}
                >
                  {name}
                </span>
                <span
                  aria-hidden
                  className={`mt-2 h-px w-8 transition-[background-color,width] motion-reduce:transition-none ${
                    isActive ? "w-10 bg-forest" : "bg-transparent"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-6 sm:mt-8" aria-live="polite">
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

"use client";

import { useEffect, useState } from "react";
import type { AreaSlug } from "@/lib/types";

const SEARCH_EXAMPLES = [
  "搜尋藥品，如：曼秀雷敦",
  "描述症狀，如：被蚊子咬",
  "搜尋需求，如：痠痛、止癢",
] as const;

/**
 * 搜尋框。用原生 GET form — 沒有 JS 也能搜，SEO 入口頁不依賴 client bundle。
 */
export function SearchInput({
  defaultValue = "",
  size = "sm",
  className = "",
  autoFocus = false,
  area,
}: {
  defaultValue?: string;
  size?: "sm" | "lg" | "xl";
  className?: string;
  autoFocus?: boolean;
  area?: AreaSlug;
}) {
  const large = size !== "sm";
  const xl = size === "xl";
  const [exampleIndex, setExampleIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(defaultValue.length > 0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(media.matches);

    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!large || isFocused || hasValue || reduceMotion) return;

    const interval = window.setInterval(() => {
      setExampleIndex((current) => (current + 1) % SEARCH_EXAMPLES.length);
    }, 2600);

    return () => window.clearInterval(interval);
  }, [hasValue, isFocused, large, reduceMotion]);

  return (
    <form
      action="/search"
      role="search"
      className={`flex items-center bg-paper transition-[border-color,box-shadow,transform] duration-200 ${
        xl
          ? "h-16 gap-3 border border-line-strong px-2 focus-within:border-green focus-within:shadow-[0_12px_34px_rgba(37,54,45,0.08)] sm:h-20 sm:px-3"
          : large
            ? "paper-elevation h-[60px] gap-2 border border-line px-5"
          : "h-12 border border-line-strong px-3"
      } ${className}`}
    >
      {area && <input type="hidden" name="area" value={area} />}
      <span aria-hidden className={large ? "text-[18px] text-ink" : "text-sm text-muted-2"}>
        ⌕
      </span>
      <label className="sr-only" htmlFor={`q-${size}`}>
        搜尋藥品
      </label>
      <div className="relative h-full min-w-0 flex-1">
        <input
          id={`q-${size}`}
          name="q"
          type="search"
          autoFocus={autoFocus}
          defaultValue={defaultValue}
          placeholder={large ? "" : "搜尋藥品"}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={(event) => setHasValue(event.currentTarget.value.length > 0)}
          // h-full：讓整個框都是點擊區，不是只有文字那 20px
          className={`h-full w-full min-w-0 bg-transparent text-ink outline-none placeholder:text-muted-2 ${
            xl ? "text-[16px] sm:text-[18px]" : large ? "text-[16px]" : "text-[15px]"
          }`}
        />
        {large && !hasValue && (
          <span
            key={exampleIndex}
            aria-hidden
            className={`search-placeholder-swap pointer-events-none absolute inset-0 flex items-center overflow-hidden text-ellipsis whitespace-nowrap text-muted-2 ${
              xl ? "text-[16px] sm:text-[18px]" : "text-[16px]"
            }`}
          >
            {SEARCH_EXAMPLES[exampleIndex]}
          </span>
        )}
      </div>
      {large && (
        <button
          type="submit"
          className={`action-primary flex-none ${xl ? "h-14 px-5 text-[16px] sm:px-9" : "h-12 px-6 text-[15px]"}`}
        >
          搜尋
        </button>
      )}
    </form>
  );
}

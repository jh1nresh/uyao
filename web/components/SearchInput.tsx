"use client";

import { useEffect, useState } from "react";
import { useLocale } from "./LocaleProvider";
import { localizedPath } from "@/lib/i18n";
import type { AreaSlug } from "@/lib/types";

const SEARCH_EXAMPLES_ZH = [
  "搜尋品項，如：護谷鈣素",
  "描述狀況，如：膝蓋不舒服",
  "搜尋需求，如：呼吸道保養、補鈣",
] as const;

const SEARCH_EXAMPLES_EN = [
  "Search a product, e.g. Glucaline",
  "Describe a symptom, e.g. knee discomfort",
  "Search a need, e.g. respiratory wellness or calcium",
] as const;

/**
 * 搜尋框。用原生 GET form — 沒有 JS 也能搜，SEO 入口頁不依賴 client bundle。
 */
export function SearchInput({
  defaultValue = "",
  size = "sm",
  presentation = "default",
  className = "",
  autoFocus = false,
  area,
  onQueryChange,
  onSubmitQuery,
}: {
  defaultValue?: string;
  size?: "sm" | "lg" | "xl";
  presentation?: "default" | "pearl";
  className?: string;
  autoFocus?: boolean;
  area?: AreaSlug;
  onQueryChange?: (query: string) => void;
  /** Return true to keep the query on the current surface. */
  onSubmitQuery?: (query: string) => boolean;
}) {
  const locale = useLocale();
  const examples = locale === "en" ? SEARCH_EXAMPLES_EN : SEARCH_EXAMPLES_ZH;
  const large = size !== "sm";
  const xl = size === "xl";
  const [exampleIndex, setExampleIndex] = useState(0);
  const [isPlaceholderExiting, setIsPlaceholderExiting] = useState(false);
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
    if (!large || reduceMotion) return;

    const interval = window.setInterval(() => {
      setIsPlaceholderExiting(true);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [large, reduceMotion]);

  useEffect(() => {
    if (!large || !isPlaceholderExiting || reduceMotion) return;

    const timeout = window.setTimeout(() => {
      setExampleIndex((current) => (current + 1) % examples.length);
      setIsPlaceholderExiting(false);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [examples.length, isPlaceholderExiting, large, reduceMotion]);

  return (
    <form
      action={localizedPath("/search", locale)}
      role="search"
      onSubmit={(event) => {
        if (!onSubmitQuery) return;
        const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
        if (onSubmitQuery(query)) event.preventDefault();
      }}
      className={`flex items-center bg-paper transition-[border-color,box-shadow,transform] duration-200 ${
        xl
          ? "h-16 gap-3 border border-line-strong px-2 sm:h-20 sm:px-3"
          : large
            ? "paper-elevation h-[60px] gap-2 border border-line px-5"
          : "h-12 border border-line-strong px-3"
      } ${presentation === "pearl" ? "shop-pearl-search" : ""} ${className}`}
    >
      {area && <input type="hidden" name="area" value={area} />}
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        className={`flex-none ${large ? "h-7 w-7 text-forest" : "h-5 w-5 text-muted-2"}`}
      >
        <circle cx="10.75" cy="10.75" r="6.75" stroke="currentColor" strokeWidth="1.75" />
        <path d="m15.75 15.75 4.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
      <label className="sr-only" htmlFor={`q-${size}`}>
        {locale === "en" ? "Search products or describe symptoms" : "搜尋品項或描述症狀"}
      </label>
      <div className="group relative h-full min-w-0 flex-1">
        <input
          id={`q-${size}`}
          name="q"
          type="search"
          autoFocus={autoFocus}
          defaultValue={defaultValue}
          placeholder={large ? "" : locale === "en" ? "Search products or symptoms" : "搜尋品項或症狀"}
          onChange={(event) => {
            const value = event.currentTarget.value;
            setHasValue(value.length > 0);
            if (!(event.nativeEvent as InputEvent).isComposing) {
              onQueryChange?.(value);
            }
          }}
          onCompositionEnd={(event) => onQueryChange?.(event.currentTarget.value)}
          // h-full：讓整個框都是點擊區，不是只有文字那 20px
          className={`h-full w-full min-w-0 bg-transparent text-ink outline-none placeholder:text-muted-2 focus:outline-none focus-visible:outline-none ${
            xl ? "text-[16px] sm:text-[18px]" : large ? "text-[16px]" : "text-[15px]"
          }`}
        />
        {large && !hasValue && (
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-0 flex items-center overflow-hidden text-ellipsis whitespace-nowrap text-muted-2 transition-opacity duration-150 group-focus-within:opacity-0 ${
              xl ? "text-[16px] sm:text-[18px]" : "text-[16px]"
            }`}
          >
            <span
              key={exampleIndex}
              className={
                isPlaceholderExiting
                  ? "search-placeholder-exit"
                  : "search-placeholder-enter"
              }
            >
              {examples[exampleIndex]}
            </span>
          </div>
        )}
      </div>
      {large && (
        <button
          type="submit"
          className={`action-primary flex-none ${xl ? "h-14 px-5 text-[16px] sm:px-9" : "h-12 px-6 text-[15px]"}`}
        >
          {locale === "en" ? "Search" : "搜尋"}
        </button>
      )}
    </form>
  );
}

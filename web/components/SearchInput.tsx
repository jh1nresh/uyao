"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale } from "./LocaleProvider";
import { localizedPath } from "@/lib/i18n";
import {
  RESERVATION_INTAKE_ALLERGENS_MAX,
  SHOP_SEARCH_INTAKE_STORAGE_KEY,
  createShopSearchIntakeDraft,
  type AllergyStatus,
} from "@/lib/reservation-intake";
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
  className = "",
  autoFocus = false,
  area,
  submitLabel,
}: {
  defaultValue?: string;
  size?: "sm" | "lg" | "xl";
  className?: string;
  autoFocus?: boolean;
  area?: AreaSlug;
  submitLabel?: string;
}) {
  const locale = useLocale();
  const router = useRouter();
  const examples = locale === "en" ? SEARCH_EXAMPLES_EN : SEARCH_EXAMPLES_ZH;
  const large = size !== "sm";
  const xl = size === "xl";
  const [exampleIndex, setExampleIndex] = useState(0);
  const [isPlaceholderExiting, setIsPlaceholderExiting] = useState(false);
  const [hasValue, setHasValue] = useState(defaultValue.length > 0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pendingQuery, setPendingQuery] = useState("");
  const [showAllergyPrompt, setShowAllergyPrompt] = useState(false);
  const [allergyStatus, setAllergyStatus] = useState<"" | AllergyStatus>("");
  const [allergens, setAllergens] = useState("");
  const firstAllergyRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!showAllergyPrompt) return;
    const frame = window.requestAnimationFrame(() => firstAllergyRef.current?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowAllergyPrompt(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [showAllergyPrompt]);

  function askAllergies(event: FormEvent<HTMLFormElement>) {
    const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    if (!query) return;
    event.preventDefault();
    setPendingQuery(query);
    setAllergyStatus("");
    setAllergens("");
    setShowAllergyPrompt(true);
  }

  function continueToResults() {
    if (!allergyStatus) return;
    const draft = createShopSearchIntakeDraft(pendingQuery, allergyStatus, allergens);
    if (!draft) return;
    try {
      sessionStorage.setItem(SHOP_SEARCH_INTAKE_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // 儲存不可用時仍可搜尋；若之後預留，表單會再次要求過敏回答。
    }
    const params = new URLSearchParams({ q: draft.searchQuery });
    if (area) params.set("area", area);
    setShowAllergyPrompt(false);
    router.push(`${localizedPath("/search", locale)}?${params.toString()}`);
  }

  const allergyIncomplete = allergyStatus === ""
    || (allergyStatus === "has_allergies" && !allergens.trim());

  return (
    <>
      <form
        action={localizedPath("/search", locale)}
        role="search"
        onSubmit={askAllergies}
        className={`flex items-center bg-paper transition-[border-color,box-shadow,transform] duration-200 ${
          xl
            ? "h-16 gap-3 border border-line-strong px-2 sm:h-20 sm:px-3"
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
          {locale === "en" ? "Search products or describe symptoms" : "搜尋品項或描述症狀"}
        </label>
        <div className="group relative h-full w-0 min-w-0 flex-1">
          <input
            id={`q-${size}`}
            name="q"
            type="search"
            autoFocus={autoFocus}
            defaultValue={defaultValue}
            placeholder={large ? "" : locale === "en" ? "Search products or symptoms" : "搜尋品項或症狀"}
            onChange={(event) => setHasValue(event.currentTarget.value.length > 0)}
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
            {submitLabel ?? (locale === "en" ? "Search" : "搜尋")}
          </button>
        )}
      </form>

      {showAllergyPrompt && (
        <div
          className="allergy-dialog-layer fixed inset-0 z-[70] flex items-end justify-center px-3 pb-3 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-allergy-title"
        >
          <button
            type="button"
            aria-label={locale === "en" ? "Close allergy question" : "關閉過敏問題"}
            onClick={() => setShowAllergyPrompt(false)}
            className="allergy-dialog-backdrop absolute inset-0"
          />
          <section className="allergy-dialog-panel sheet-in paper-elevation relative w-full max-w-[460px] border border-line-strong border-t-2 border-t-forest bg-paper px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 sm:px-8 sm:pb-8 sm:pt-7">
            <button
              type="button"
              aria-label={locale === "en" ? "Close allergy question" : "關閉過敏問題"}
              onClick={() => setShowAllergyPrompt(false)}
              className="allergy-dialog-close absolute right-2 top-2 inline-flex h-11 w-11 items-center justify-center border border-transparent text-muted transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:border-line hover:bg-surface hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green sm:right-3 sm:top-3"
            >
              <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4" fill="none">
                <path d="M4 4l12 12M16 4 4 16" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>

            <p className="shop-kicker m-0 pr-12">{locale === "en" ? "Before product results" : "顯示藥品前"}</p>
            <h2 id="search-allergy-title" className="editorial-display mb-0 mt-2.5 pr-9 text-[27px] leading-[1.25] sm:text-[31px]">
              {locale === "en" ? "First, check known allergies" : "先確認已知過敏原"}
            </h2>
            <p className="mb-0 mt-3 max-w-[38rem] text-[14px] leading-[1.7] text-muted">
              {locale === "en"
                ? "This answer stays in this tab and can be shared with the pharmacist only if you later consent when making a reservation."
                : "答案只暫存在這個分頁；之後預留時，會再由你同意後提供給藥師查看。"}
            </p>

            <fieldset className="allergy-dialog-fieldset mt-6 border-0 p-0">
              <legend className="w-full border-t border-line pt-5 text-[13px] font-bold leading-[1.55] text-ink">
                {locale === "en" ? "Any known medication, food, or other allergies?" : "是否有已知的藥物、食物或其他過敏？"}
              </legend>
              <div className="mt-3 grid gap-2">
                <label
                  data-selected={allergyStatus === "none"}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 border px-4 py-3 text-[14px] text-ink transition-[background-color,border-color] duration-200 ${
                    allergyStatus === "none"
                      ? "border-forest bg-green-tint"
                      : "border-line bg-paper hover:border-line-strong hover:bg-surface"
                  }`}
                >
                  <input
                    ref={firstAllergyRef}
                    type="radio"
                    name="search-allergy-status"
                    value="none"
                    required
                    checked={allergyStatus === "none"}
                    onChange={() => {
                      setAllergyStatus("none");
                      setAllergens("");
                    }}
                    className="allergy-dialog-radio h-4 w-4 flex-none appearance-none rounded-full border border-line-strong bg-paper transition-[border-color,box-shadow] duration-200 checked:border-4 checked:border-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
                  />
                  {locale === "en" ? "No known allergies" : "目前沒有已知過敏"}
                </label>
                <label
                  data-selected={allergyStatus === "has_allergies"}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 border px-4 py-3 text-[14px] text-ink transition-[background-color,border-color] duration-200 ${
                    allergyStatus === "has_allergies"
                      ? "border-forest bg-green-tint"
                      : "border-line bg-paper hover:border-line-strong hover:bg-surface"
                  }`}
                >
                  <input
                    type="radio"
                    name="search-allergy-status"
                    value="has_allergies"
                    checked={allergyStatus === "has_allergies"}
                    onChange={() => setAllergyStatus("has_allergies")}
                    className="allergy-dialog-radio h-4 w-4 flex-none appearance-none rounded-full border border-line-strong bg-paper transition-[border-color,box-shadow] duration-200 checked:border-4 checked:border-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green"
                  />
                  {locale === "en" ? "Yes, I have allergies" : "有已知過敏"}
                </label>
              </div>
              {allergyStatus === "has_allergies" && (
                <label htmlFor="search-allergens" className="mt-4 block border-t border-line pt-4 text-[12px] font-bold text-ink">
                  {locale === "en" ? "List known allergens" : "請填寫已知過敏原"}
                  <input
                    id="search-allergens"
                    value={allergens}
                    required
                    maxLength={RESERVATION_INTAKE_ALLERGENS_MAX}
                    onChange={(event) => setAllergens(event.target.value)}
                    placeholder={locale === "en" ? "For example: penicillin, peanuts" : "例如：青黴素、花生"}
                    className="allergy-dialog-text-input mt-2 h-12 w-full border border-line-strong bg-ivory px-4 text-[14px] font-normal text-ink outline-none placeholder:text-muted-2 focus:border-forest focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-green"
                  />
                </label>
              )}
            </fieldset>

            <button
              type="button"
              disabled={allergyIncomplete}
              onClick={continueToResults}
              className="allergy-dialog-action action-primary mt-6 h-12 w-full text-[15px] disabled:border disabled:border-line-strong disabled:bg-surface disabled:text-muted disabled:opacity-100 disabled:shadow-none"
            >
              {locale === "en" ? "Continue to product results" : "繼續查看藥品"}
            </button>
          </section>
        </div>
      )}
    </>
  );
}

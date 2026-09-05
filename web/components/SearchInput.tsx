"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "./LocaleProvider";
import { localizedPath } from "@/lib/i18n";
import {
  RESERVATION_INTAKE_ALLERGENS_MAX,
  SHOP_SEARCH_INTAKE_STORAGE_KEY,
  createShopSearchIntakeDraft,
  readLatestShopSearchIntakeDraft,
  type AllergyStatus,
  type ShopSearchIntakeDraft,
} from "@/lib/reservation-intake";
import { SHOP_SEARCH_CONVERSATION_STORAGE_KEY } from "@/lib/search-conversation";
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

const CONVERSATION_ENTRY_DURATION_MS = 720;
const INPUT_REDIRECT_DELAY_MS = 300;

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
  submitLabel,
  continueConversation = false,
  resultsPath = "/search",
  redirectOnInput = false,
}: {
  defaultValue?: string;
  size?: "sm" | "lg" | "xl";
  presentation?: "default" | "cabinet" | "agent";
  className?: string;
  autoFocus?: boolean;
  area?: AreaSlug;
  submitLabel?: string;
  /** Reuse this tab's fresh safety answer and preserve its private search thread. */
  continueConversation?: boolean;
  /** Consumer result surface; the homepage can enter uYao Agent. */
  resultsPath?: "/search" | "/agent";
  /** Move the first completed input into the destination composer without submitting it. */
  redirectOnInput?: boolean;
}) {
  const locale = useLocale();
  const router = useRouter();
  const examples = locale === "en" ? SEARCH_EXAMPLES_EN : SEARCH_EXAMPLES_ZH;
  const large = size !== "sm";
  const xl = size === "xl";
  const agentPresentation = presentation === "agent";
  const [exampleIndex, setExampleIndex] = useState(0);
  const [isPlaceholderExiting, setIsPlaceholderExiting] = useState(false);
  const [hasValue, setHasValue] = useState(defaultValue.length > 0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pendingQuery, setPendingQuery] = useState("");
  const [showAllergyPrompt, setShowAllergyPrompt] = useState(false);
  const [entryTarget, setEntryTarget] = useState("");
  const [allergyStatus, setAllergyStatus] = useState<"" | AllergyStatus>("");
  const [allergens, setAllergens] = useState("");
  const firstAllergyRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const hasRedirectedInputRef = useRef(false);
  const inputRedirectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(media.matches);

    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!large || agentPresentation || reduceMotion) return;

    const interval = window.setInterval(() => {
      setIsPlaceholderExiting(true);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [agentPresentation, large, reduceMotion]);

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

  useEffect(() => {
    if (!entryTarget) return;
    router.prefetch(entryTarget);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timeout = window.setTimeout(() => router.push(entryTarget), CONVERSATION_ENTRY_DURATION_MS);

    return () => {
      window.clearTimeout(timeout);
      document.body.style.overflow = previousOverflow;
    };
  }, [entryTarget, router]);

  useEffect(() => () => {
    if (inputRedirectTimerRef.current !== null) {
      window.clearTimeout(inputRedirectTimerRef.current);
    }
  }, []);

  function askAllergies(event: FormEvent<HTMLFormElement>) {
    const query = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    if (!query) return;
    event.preventDefault();
    if (resultsPath === "/agent") {
      const params = new URLSearchParams({ q: query });
      if (area) params.set("area", area);
      router.push(`${localizedPath(resultsPath, locale)}?${params.toString()}`);
      return;
    }
    if (continueConversation) {
      try {
        const previousDraft = readLatestShopSearchIntakeDraft(
          sessionStorage.getItem(SHOP_SEARCH_INTAKE_STORAGE_KEY),
        );
        if (previousDraft) {
          const nextDraft = createShopSearchIntakeDraft(
            query,
            previousDraft.allergyStatus,
            previousDraft.allergens,
          );
          if (nextDraft) {
            openResults(nextDraft);
            return;
          }
        }
      } catch {
        // Storage 不可用或答案已失效時，回到原本的安全提問。
      }
    }
    setPendingQuery(query);
    setAllergyStatus("");
    setAllergens("");
    setShowAllergyPrompt(true);
  }

  function openResults(draft: ShopSearchIntakeDraft) {
    try {
      sessionStorage.setItem(SHOP_SEARCH_INTAKE_STORAGE_KEY, JSON.stringify(draft));
      if (!continueConversation) sessionStorage.removeItem(SHOP_SEARCH_CONVERSATION_STORAGE_KEY);
    } catch {
      // 儲存不可用時仍可搜尋；若之後預留，表單會再次要求過敏回答。
    }
    const params = new URLSearchParams({ q: draft.searchQuery });
    if (area) params.set("area", area);
    const target = `${localizedPath(resultsPath, locale)}?${params.toString()}`;
    setShowAllergyPrompt(false);
    const shouldReduceMotion = reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (presentation !== "cabinet" || shouldReduceMotion) {
      router.push(target);
      return;
    }
    setEntryTarget(target);
  }

  function continueToResults() {
    if (!allergyStatus) return;
    const draft = createShopSearchIntakeDraft(pendingQuery, allergyStatus, allergens);
    if (draft) openResults(draft);
  }

  function scheduleInputRedirect(value: string) {
    if (!redirectOnInput || hasRedirectedInputRef.current) return;
    if (inputRedirectTimerRef.current !== null) {
      window.clearTimeout(inputRedirectTimerRef.current);
    }
    if (!value.trim()) return;
    inputRedirectTimerRef.current = window.setTimeout(() => {
      hasRedirectedInputRef.current = true;
      const params = new URLSearchParams({ draft: value });
      if (area) params.set("area", area);
      router.push(`${localizedPath(resultsPath, locale)}?${params.toString()}`);
    }, INPUT_REDIRECT_DELAY_MS);
  }

  const allergyIncomplete = allergyStatus === ""
    || (allergyStatus === "has_allergies" && !allergens.trim());

  return (
    <>
      <form
        action={localizedPath(resultsPath, locale)}
        role="search"
        onSubmit={askAllergies}
        className={`flex items-center bg-paper transition-[border-color,box-shadow,transform] duration-200 ${
          agentPresentation
            ? "h-16 gap-3 border-y border-line-strong bg-paper px-2 transition-colors focus-within:border-forest sm:border-x sm:px-3"
            : xl
            ? "h-16 gap-3 border border-line-strong px-2 sm:h-20 sm:px-3"
            : large
              ? "paper-elevation h-[60px] gap-2 border border-line px-5"
            : "h-12 border border-line-strong px-3"
        } ${className}`}
      >
        {area && <input type="hidden" name="area" value={area} />}
        {!agentPresentation && (
          <span aria-hidden className={large ? "text-[18px] text-ink" : "text-sm text-muted-2"}>
            ⌕
          </span>
        )}
        <label className="sr-only" htmlFor={`q-${size}`}>
          {agentPresentation
            ? locale === "en" ? "Ask uYao Agent" : "詢問 uYao Agent"
            : locale === "en" ? "Search products or describe symptoms" : "搜尋品項或描述症狀"}
        </label>
        <div className="group relative h-full w-0 min-w-0 flex-1">
          <input
            id={`q-${size}`}
            name="q"
            type="search"
            autoFocus={autoFocus}
            defaultValue={defaultValue}
            placeholder={agentPresentation
              ? locale === "en" ? "Ask about a product, ingredient, or wellness need" : "輸入品名、成分或日常保養需求"
              : large ? "" : locale === "en" ? "Search products or symptoms" : "搜尋品項或症狀"}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setHasValue(value.length > 0);
              if (!isComposingRef.current) scheduleInputRedirect(value);
            }}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={(event) => {
              isComposingRef.current = false;
              scheduleInputRedirect(event.currentTarget.value);
            }}
            // h-full：讓整個框都是點擊區，不是只有文字那 20px
            className={`h-full w-full min-w-0 bg-transparent text-ink outline-none placeholder:text-muted-2 focus:outline-none focus-visible:outline-none ${
              xl ? "text-[16px] sm:text-[18px]" : large ? "text-[16px]" : "text-[15px]"
            }`}
          />
          {large && !agentPresentation && !hasValue && (
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
            className={`action-primary flex-none ${
              agentPresentation
                ? "h-12 rounded-none px-5 text-[14px]"
                : xl ? "h-14 px-5 text-[16px] sm:px-9" : "h-12 px-6 text-[15px]"
            }`}
          >
            {submitLabel ?? (locale === "en" ? "Search" : "搜尋")}
          </button>
        )}
      </form>

      {showAllergyPrompt && (
        <div
          className={`allergy-dialog-layer fixed inset-0 z-[70] flex items-end justify-center px-3 pb-3 sm:items-center sm:p-6 ${
            presentation === "cabinet" ? "medicine-cabinet-dialogue-layer" : ""
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-allergy-title"
        >
          <button
            type="button"
            aria-label={locale === "en" ? "Close allergy question" : "關閉過敏問題"}
            onClick={() => setShowAllergyPrompt(false)}
            className={`allergy-dialog-backdrop absolute inset-0 ${
              presentation === "cabinet" ? "medicine-cabinet-dialogue-backdrop" : "bg-ink/45"
            }`}
          />
          <section className={`allergy-dialog-panel sheet-in paper-elevation relative w-full border border-line-strong border-t-2 border-t-forest bg-paper px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5 sm:px-8 sm:pb-8 sm:pt-7 ${
            presentation === "cabinet"
              ? "medicine-cabinet-dialogue-panel max-w-[720px] sm:px-10 sm:py-9"
              : "max-w-[460px]"
          }`}>
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

            {presentation === "cabinet" && (
              <p className="medicine-cabinet-dialogue-query m-0 pr-12 text-[13px] font-semibold text-muted">
                {locale === "en" ? "You asked" : "你剛剛問"}：{pendingQuery}
              </p>
            )}
            <p className={`shop-kicker m-0 pr-12 ${presentation === "cabinet" ? "mt-4" : ""}`}>{locale === "en" ? "Before product results" : "顯示藥品前"}</p>
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

      {entryTarget && createPortal(
        <div className="search-conversation-entry-layer" role="status" aria-live="polite">
          <span className="sr-only">
            {locale === "en" ? "Entering the conversation" : "正在進入對話"}
          </span>
          <div className="search-conversation-entry-scene" aria-hidden="true">
            <div className="search-conversation-entry-image" />
            <div className="search-conversation-entry-wash" />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

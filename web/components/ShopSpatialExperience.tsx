"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { AreaSwitch } from "./AreaSwitch";
import { CatalogCarousel } from "./CatalogCarousel";
import { CatalogImagePlaceholder } from "./CatalogImagePlaceholder";
import { catalogSourceStatus } from "./CatalogItemGrid";
import { SearchInput } from "./SearchInput";
import { CATALOG_GROUPS } from "@/lib/catalog-groups";
import {
  classifyGuidedQuery,
  shouldOpenGuidedComposer,
  wellnessCandidates,
  type GuidedQueryIntent,
} from "@/lib/guided-search";
import { drugCopy, localizedPath, type Locale } from "@/lib/i18n";
import type { AreaSlug, Drug } from "@/lib/types";

type ActiveState =
  | {
      phase: "composing";
      query: string;
    }
  | {
      phase: "safety" | "wellness";
      query: string;
      intent: Exclude<GuidedQueryIntent, { kind: "direct" }>;
    }
  | {
      phase: "handoff";
      query: string;
      title: string;
      body: string;
      urgent: boolean;
    }
  | {
      phase: "results";
      query: string;
      candidates: Drug[];
    };

function SpatialCard({
  drug,
  locale,
  className = "",
  showStatus = true,
}: {
  drug: Drug;
  locale: Locale;
  className?: string;
  showStatus?: boolean;
}) {
  const copy = drugCopy(drug, locale);
  return (
    <div className={`shop-spatial-card overflow-hidden border border-line-soft bg-paper ${className}`}>
      <div className="relative aspect-[4/3] w-full border-b border-line-soft">
        {drug.image ? (
          <Image
            src={drug.image.src}
            alt=""
            fill
            sizes="260px"
            className="object-contain p-3"
          />
        ) : (
          <CatalogImagePlaceholder locale={locale} />
        )}
      </div>
      <div className="px-3.5 py-3">
        <p className="m-0 text-[14px] font-bold leading-[1.45] text-ink">{copy.name}</p>
        {showStatus && (
          <p className="mb-0 mt-1 text-[12px] leading-[1.45] text-muted-2">
            {catalogSourceStatus(drug, locale)}
          </p>
        )}
      </div>
    </div>
  );
}

function SpatialWing({
  drugs,
  locale,
  side,
}: {
  drugs: Drug[];
  locale: Locale;
  side: "left" | "right";
}) {
  return (
    <aside
      aria-hidden="true"
      className={`shop-spatial-wing shop-spatial-wing--${side}`}
    >
      <p className="shop-spatial-wing-label m-0 text-[12px] font-semibold tracking-[.06em] text-muted-2">
        {locale === "en" ? "Candidate items · organizing" : "候選品項・整理中"}
      </p>
      <div className="mt-3 grid gap-4">
        {drugs.map((drug) => (
          <SpatialCard key={drug.slug} drug={drug} locale={locale} showStatus={false} />
        ))}
      </div>
    </aside>
  );
}

export function ShopSpatialExperience({
  drugs,
  area,
  locale,
  areaName,
  storeCount,
}: {
  drugs: Drug[];
  area: AreaSlug;
  locale: Locale;
  areaName: string;
  storeCount: number;
}) {
  const [active, setActive] = useState<ActiveState | null>(null);
  const [draftQuery, setDraftQuery] = useState("");
  const [supplement, setSupplement] = useState("");
  const [focusSearch, setFocusSearch] = useState(false);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const sideCards = useMemo(() => drugs.filter((drug) => drug.image).slice(0, 4), [drugs]);

  useEffect(() => {
    if (!active || active.phase === "composing") return;
    const frame = window.requestAnimationFrame(() => questionRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [active]);

  function compose(query: string) {
    setDraftQuery(query);
    if (!shouldOpenGuidedComposer(query)) {
      setActive(null);
      return;
    }
    setActive({ phase: "composing", query });
  }

  function begin(query: string): boolean {
    const intent = classifyGuidedQuery(query, drugs);
    if (intent.kind === "direct") return false;
    setFocusSearch(false);
    setActive({
      phase: intent.kind === "safety" ? "safety" : "wellness",
      query,
      intent,
    });
    return true;
  }

  function modify() {
    const query = active?.query ?? "";
    setDraftQuery(query);
    setFocusSearch(true);
    setActive(query ? { phase: "composing", query } : null);
  }

  function showHandoff({ urgent }: { urgent: boolean }) {
    if (!active || (active.phase !== "safety" && active.phase !== "wellness")) return;
    const safety = active.intent.kind === "safety" ? active.intent : null;
    setActive({
      phase: "handoff",
      query: active.query,
      urgent,
      title: urgent
        ? locale === "en" ? "Please seek prompt medical help" : "請儘快尋求醫療協助"
        : locale === "en" ? "This still needs professional confirmation" : "這個描述仍需要專業確認",
      body: safety
        ? locale === "en" ? safety.adviceEn : safety.adviceZh
        : locale === "en"
          ? "Because you are dealing with active discomfort, product directions stay hidden. Ask a pharmacist or clinician first."
          : "因為你正在處理不舒服的症狀，品項方向會保持隱藏；請先詢問藥師或醫師。",
    });
  }

  function showWellnessResults() {
    if (!active || active.phase !== "wellness" || active.intent.kind !== "wellness") return;
    const candidates = wellnessCandidates(drugs, active.intent.terms);
    if (candidates.length === 0) {
      setActive({
        phase: "handoff",
        query: active.query,
        urgent: false,
        title: locale === "en" ? "No sourced catalog direction yet" : "目前沒有可查證的品項方向",
        body: locale === "en"
          ? "Ask a pharmacist to help clarify the need. We will not invent a product match."
          : "請交給藥師協助釐清需求；系統不會自行產生不存在的品項關聯。",
      });
      return;
    }
    setActive({ phase: "results", query: active.query, candidates });
  }

  function submitSupplement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = supplement.trim();
    if (!note || !active || (active.phase !== "safety" && active.phase !== "wellness")) return;
    setSupplement("");
    setActive({
      phase: "handoff",
      query: `${active.query}；${note}`,
      urgent: false,
      title: locale === "en" ? "Keep this detail for a professional" : "這段補充請交由藥師確認",
      body: locale === "en"
        ? "This version keeps your added context but does not interpret it into a product direction. A pharmacist or clinician should review it."
        : "目前版本會保留你補充的情況，但不會自行解讀成品項方向；請交由藥師或醫師確認。",
    });
  }

  if (!active) {
    return (
      <>
        <section className="shop-pearl-hero">
          <div className="shop-pearl-hero-content shop-shell">
            <div className="mx-auto w-full max-w-[920px] text-center">
              <h1 className="editorial-display m-0 text-[clamp(36px,3.4vw,42px)] leading-[1.12]">
                {locale === "en" ? "You do not need to know the product name." : "不用先知道品名。描述需求就能開始。"}
              </h1>
              <p className="mx-auto mt-4 max-w-[680px] text-[16px] leading-[1.75] text-ink-2 sm:text-[17px]">
                {locale === "en"
                  ? "Enter a product, ingredient, or daily-wellness need. Recognized symptoms open safety guidance first."
                  : "可輸入品名、成分或日常保養方向；常見症狀會先顯示安全提醒。"}
              </p>
              <div className="mt-8 text-left">
                <SearchInput
                  key={`${draftQuery}-${focusSearch}`}
                  size="xl"
                  presentation="pearl"
                  defaultValue={draftQuery}
                  autoFocus={focusSearch}
                  area={area}
                  className="w-full"
                  onQueryChange={compose}
                  onSubmitQuery={begin}
                />
              </div>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center text-[14px] leading-[1.65] text-muted sm:flex-row">
                <p className="m-0">
                  {locale === "en"
                    ? `${areaName}: ${storeCount} listed pharmacies`
                    : `${areaName}收錄 ${storeCount} 家藥局`}
                </p>
                <div className="md:hidden">
                  <AreaSwitch area={area} preservePath locatable compact />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-paper">
          <div className="shop-shell py-8">
            <div className="mb-4 max-w-[720px]">
              <h2 className="editorial-display m-0 text-[30px] leading-[1.25] sm:text-[34px]">
                {locale === "en" ? "Items provided by partner pharmacies" : "合作藥局提供品項"}
              </h2>
              <p className="mb-0 mt-2 text-[14px] leading-[1.7] text-muted">
                {locale === "en"
                  ? "Browse verified catalog records. Supply and pickup still require pharmacy confirmation."
                  : "先瀏覽已整理的品項資料；是否供應與到店安排，仍需由藥局確認。"}
              </p>
            </div>
            <nav aria-label={locale === "en" ? "Catalog categories" : "品項分類"} className="mb-4 flex flex-wrap gap-2.5">
              {CATALOG_GROUPS.map((group) => (
                <Link
                  key={group.slug}
                  href={`${localizedPath("/category/partner-item", locale)}?area=${area}&group=${group.slug}`}
                  className={`inline-flex min-h-11 items-center rounded-full border px-5 text-[14px] font-semibold no-underline transition-colors ${
                    group.slug === "all"
                      ? "border-green bg-green text-on-dark hover:bg-green-hover"
                      : "border-line-soft bg-paper text-forest hover:border-line-strong hover:bg-surface-hover"
                  }`}
                >
                  {locale === "en" ? group.nameEn : group.name}
                </Link>
              ))}
            </nav>
            <CatalogCarousel
              drugs={drugs}
              area={area}
              locale={locale}
              label={locale === "en" ? "Catalog items" : "目錄品項"}
              presentation="showcase"
            />
          </div>
        </section>
      </>
    );
  }

  const isQuestion = active.phase === "safety" || active.phase === "wellness";
  const isComposing = active.phase === "composing";
  const showWings = isComposing || isQuestion;
  const leftCards = sideCards.slice(0, 2);
  const rightCards = sideCards.slice(2, 4);

  return (
    <section
      className={`shop-spatial-stage ${isComposing ? "shop-spatial-stage--composing" : ""} ${showWings ? "" : "shop-spatial-stage--resolved"}`}
      aria-live="polite"
    >
      <div className="shop-shell py-8 sm:py-10">
        {!isComposing && (
          <div className="shop-spatial-query mx-auto flex min-h-[66px] max-w-[720px] items-center gap-3 px-4 sm:px-8">
            <svg aria-hidden viewBox="0 0 24 24" fill="none" className="h-7 w-7 flex-none text-forest">
              <circle cx="10.75" cy="10.75" r="6.75" stroke="currentColor" strokeWidth="1.75" />
              <path d="m15.75 15.75 4.5 4.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            <span className="min-w-0 flex-1 truncate text-[16px] text-ink sm:text-[18px]">{active.query}</span>
            <button type="button" onClick={modify} className="action-secondary min-h-10 rounded-full px-4 text-[14px]">
              {locale === "en" ? "Edit" : "修改"}
            </button>
          </div>
        )}

        <div className={`shop-spatial-grid ${isComposing ? "" : "mt-8"}`}>
          {showWings && <SpatialWing drugs={leftCards} locale={locale} side="left" />}

          <div className={`shop-spatial-dialogue border border-line-strong bg-paper px-5 py-6 sm:px-14 sm:py-12 ${isComposing ? "shop-spatial-dialogue--composing" : ""}`}>
            {active.phase === "composing" && (
              <>
                <p className="shop-kicker m-0">{locale === "en" ? "Describe what you need" : "描述你的需要"}</p>
                <h2 className="editorial-display mb-0 mt-4 text-[32px] leading-[1.2] sm:text-[42px]">
                  {locale === "en" ? "Keep typing in your own words" : "用你自己的話繼續說"}
                </h2>
                <p className="mb-0 mt-4 text-[15px] leading-[1.75] text-muted">
                  {locale === "en"
                    ? "A product name stays a normal search. A symptom opens one necessary safety question after you submit."
                    : "輸入品名會維持一般搜尋；描述症狀時，送出後只會先問一個必要的安全問題。"}
                </p>
                <div className="mt-8">
                  <SearchInput
                    size="xl"
                    presentation="pearl"
                    defaultValue={active.query}
                    autoFocus
                    area={area}
                    className="w-full"
                    onQueryChange={compose}
                    onSubmitQuery={begin}
                  />
                </div>
                <p className="mb-0 mt-4 text-center text-[13px] leading-[1.6] text-muted-2">
                  {locale === "en" ? "Press Enter to continue" : "按 Enter 繼續"}
                </p>
              </>
            )}
            {active.phase === "safety" && (
              <>
                <p className="shop-kicker m-0">{locale === "en" ? "Organizing your need · 1 / 3" : "正在整理你的需求・1 / 3"}</p>
                <h2 ref={questionRef} tabIndex={-1} className="editorial-display mb-0 mt-4 text-[32px] leading-[1.2] outline-none sm:text-[42px]">
                  {locale === "en" ? "First, a safety check" : "先確認一下"}
                </h2>
                <p className="mb-0 mt-6 text-[17px] font-medium leading-[1.75] text-ink sm:text-[19px]">
                  {locale === "en"
                    ? "Are you having breathing trouble, chest pain, coughing blood, confusion, or symptoms that are clearly worsening?"
                    : "目前有沒有呼吸困難、胸痛、咳血、意識不清，或症狀明顯惡化？"}
                </p>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => showHandoff({ urgent: false })} className="shop-spatial-answer">
                    {locale === "en" ? "None of these" : "以上都沒有"}
                  </button>
                  <button type="button" onClick={() => showHandoff({ urgent: true })} className="shop-spatial-answer">
                    {locale === "en" ? "One or more applies" : "有其中一項"}
                  </button>
                </div>
              </>
            )}

            {active.phase === "wellness" && (
              <>
                <p className="shop-kicker m-0">{locale === "en" ? "Organizing your need · 1 / 2" : "正在整理你的需求・1 / 2"}</p>
                <h2 ref={questionRef} tabIndex={-1} className="editorial-display mb-0 mt-4 text-[32px] leading-[1.2] outline-none sm:text-[42px]">
                  {locale === "en" ? "Confirm the direction" : "先確認需求方向"}
                </h2>
                <p className="mb-0 mt-6 text-[17px] font-medium leading-[1.75] text-ink sm:text-[19px]">
                  {locale === "en"
                    ? "Are you looking for daily-wellness information, rather than dealing with active discomfort?"
                    : "你是在找日常保養資料，而不是處理正在發生的不舒服嗎？"}
                </p>
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={showWellnessResults} className="shop-spatial-answer">
                    {locale === "en" ? "Yes, daily wellness" : "是，找日常保養"}
                  </button>
                  <button type="button" onClick={() => showHandoff({ urgent: false })} className="shop-spatial-answer">
                    {locale === "en" ? "No, I feel unwell" : "不是，正在不舒服"}
                  </button>
                </div>
              </>
            )}

            {isQuestion && (
              <form onSubmit={submitSupplement} className="shop-spatial-supplement mt-7 flex items-center gap-2 px-2 sm:px-3">
                <span aria-hidden className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full border border-line-soft text-[25px] font-light text-forest">＋</span>
                <label className="sr-only" htmlFor="shop-spatial-supplement">
                  {locale === "en" ? "Add other context" : "補充其他情況"}
                </label>
                <input
                  id="shop-spatial-supplement"
                  value={supplement}
                  onChange={(event) => setSupplement(event.currentTarget.value)}
                  placeholder={locale === "en" ? "Add other context…" : "補充其他情況…"}
                  className="h-14 min-w-0 flex-1 bg-transparent px-2 text-[15px] text-ink outline-none placeholder:text-muted-2"
                />
                <button
                  type="submit"
                  disabled={!supplement.trim()}
                  aria-label={locale === "en" ? "Send added context" : "送出補充情況"}
                  className="shop-spatial-send inline-flex h-12 w-12 flex-none items-center justify-center rounded-full bg-green text-[23px] text-on-dark transition-transform hover:scale-[1.03] disabled:opacity-35"
                >
                  <span aria-hidden>↗</span>
                </button>
              </form>
            )}

            {active.phase === "handoff" && (
              <>
                <p className={`shop-kicker m-0 ${active.urgent ? "text-oxblood" : ""}`}>
                  {active.urgent
                    ? locale === "en" ? "Safety route" : "安全分流"
                    : locale === "en" ? "Professional confirmation" : "專業確認"}
                </p>
                <h2 ref={questionRef} tabIndex={-1} className="editorial-display mb-0 mt-4 text-[32px] leading-[1.2] outline-none sm:text-[42px]">
                  {active.title}
                </h2>
                <p className="mb-0 mt-6 text-[16px] leading-[1.85] text-ink-2">{active.body}</p>
                <p className="mb-0 mt-4 text-[14px] leading-[1.7] text-muted">
                  {locale === "en"
                    ? "No item has been selected or recommended from this symptom description."
                    : "系統沒有根據這段症狀選擇或推薦任何品項。"}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`${localizedPath("/", locale)}?area=${area}#pharmacies`}
                    className="action-primary text-[14px]"
                  >
                    {locale === "en" ? "Find a nearby pharmacist" : "找附近藥師"}
                  </Link>
                  <button type="button" onClick={modify} className="action-secondary text-[14px]">
                    {locale === "en" ? "Edit the description" : "修改描述"}
                  </button>
                </div>
              </>
            )}

            {active.phase === "results" && (
              <>
                <p className="shop-kicker m-0">{locale === "en" ? "Need summary · complete" : "需求整理・完成"}</p>
                <h2 ref={questionRef} tabIndex={-1} className="editorial-display mb-0 mt-4 text-[32px] leading-[1.2] outline-none sm:text-[42px]">
                  {locale === "en" ? "Item directions to confirm" : "可與藥師確認的品項方向"}
                </h2>
                <p className="mb-0 mt-4 text-[14px] leading-[1.75] text-muted">
                  {locale === "en"
                    ? "These are sourced catalog relationships, not treatment or personal medicine recommendations."
                    : "以下是目錄中可查證的關聯，不是治療或個人用藥推薦。"}
                </p>
                <div
                  className={`mt-7 grid gap-4 ${
                    active.candidates.length === 1
                      ? "mx-auto max-w-[270px] grid-cols-1"
                      : "sm:grid-cols-2 lg:grid-cols-3"
                  }`}
                >
                  {active.candidates.map((drug, index) => {
                    const copy = drugCopy(drug, locale);
                    return (
                      <Link
                        key={drug.slug}
                        href={`${localizedPath(`/drug/${drug.slug}`, locale)}?area=${area}`}
                        className={`shop-spatial-result history-link border border-line-soft bg-paper no-underline transition-[border-color,transform] hover:-translate-y-px hover:border-line-strong shop-spatial-result--${index % 2 === 0 ? "left" : "right"}`}
                      >
                        <SpatialCard drug={drug} locale={locale} className="border-0" />
                        <span className="block border-t border-line-soft px-3.5 py-3 text-[13px] font-bold text-green">
                          {locale === "en" ? `View ${copy.name} →` : `查看${copy.name}資料 →`}
                        </span>
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-7">
                  <button type="button" onClick={modify} className="action-secondary text-[14px]">
                    {locale === "en" ? "Edit the description" : "修改描述"}
                  </button>
                </div>
              </>
            )}
          </div>

          {showWings && <SpatialWing drugs={rightCards} locale={locale} side="right" />}
        </div>
        {isQuestion && (
          <p className="shop-spatial-stage-note mb-0 mt-8 text-center text-[14px] leading-[1.7] text-ink-2 sm:text-[16px]">
            {locale === "en"
              ? "Complete the safety question first. Symptom descriptions never reveal products directly."
              : "先完成安全問題；症狀描述不會直接顯示品項。"}
          </p>
        )}
      </div>
    </section>
  );
}

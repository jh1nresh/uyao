"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import { useLocation } from "./LocationProvider";
import { useLocale } from "./LocaleProvider";
import { withArea } from "@/lib/area-route";
import { AREAS } from "@/lib/data";
import { nearestServiceArea } from "@/lib/geo";
import { areaCopy, localizedPath } from "@/lib/i18n";
import type { AreaSlug } from "@/lib/types";

/**
 * 服務區是 URL state：在區域型頁面保留目前路徑與其他 query，店家頁等
 * 非區域型頁面則回到 app。GPS 只有使用者按下後才會選最近服務區。
 */
type AreaSwitchProps = {
  area: AreaSlug;
  preservePath?: boolean;
  locatable?: boolean;
  /** Header／手機窄版用下拉選單，避免六個行政區撐破畫面。 */
  compact?: boolean;
};

function compactAreaLabel(area: ReturnType<typeof areaCopy>, locale: "zh" | "en"): string {
  if (locale === "en") {
    return area.name
      .replace(" District", "")
      .replace(", New Taipei", " · New Taipei")
      .replace(", Taipei", " · Taipei")
      .replace(", Taichung", " · Taichung");
  }
  return area.name.replace(area.shortName, `・${area.shortName}`);
}

export function AreaSwitch(props: AreaSwitchProps) {
  return (
    <Suspense fallback={<AreaSwitchFallback {...props} />}>
      <AreaSwitchWithRoute {...props} />
    </Suspense>
  );
}

function AreaSwitchWithRoute({
  area,
  preservePath = false,
  locatable = false,
  compact = false,
}: AreaSwitchProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { position, status, request } = useLocation();
  const locale = useLocale();
  const applyWhenReady = useRef(false);

  const targetPath = preservePath ? pathname : localizedPath("/", locale);
  const targetSearch = preservePath ? searchParams.toString() : "";
  const hrefFor = (nextArea: AreaSlug) => withArea(targetPath, targetSearch, nextArea);

  useEffect(() => {
    if (!applyWhenReady.current || !position) return;
    applyWhenReady.current = false;
    router.replace(hrefFor(nearestServiceArea(position)), { scroll: false });
  }, [position, router, targetPath, targetSearch]);

  useEffect(() => {
    if (status === "denied" || status === "unavailable" || status === "timeout") {
      applyWhenReady.current = false;
    }
  }, [status]);

  function locate() {
    if (position) {
      router.replace(hrefFor(nearestServiceArea(position)), { scroll: false });
      return;
    }
    applyWhenReady.current = true;
    request();
  }

  function selectArea(nextArea: AreaSlug) {
    router.replace(hrefFor(nextArea), { scroll: false });
  }

  const locationMessage =
    status === "denied"
      ? locale === "en" ? "Location permission was denied. Choose an area instead." : "定位權限被拒絕，請改用行政區切換"
      : status === "unavailable"
        ? locale === "en" ? "Location is unavailable in this browser. Choose an area instead." : "這個瀏覽器不支援定位，請改用行政區切換"
        : status === "timeout"
          ? locale === "en" ? "Location timed out. Try again or choose an area." : "定位逾時，請重試或改用行政區切換"
          : status === "granted"
            ? locale === "en" ? "Using your location to select the nearest service area." : "已使用你的位置選擇最近服務區"
            : "";

  if (compact) {
    const currentArea = areaCopy(AREAS.find((candidate) => candidate.slug === area) ?? AREAS[0], locale);
    return (
      <div className="flex h-11 w-full flex-none items-center overflow-hidden border border-line-strong bg-paper text-xs text-muted md:w-auto">
        {locatable && (
          <button
            type="button"
            onClick={locate}
            disabled={status === "prompting"}
            title={locationMessage || (locale === "en" ? "Use my location" : "使用我的位置選擇最近服務區")}
            aria-label={status === "prompting" ? (locale === "en" ? "Locating" : "定位中") : (locale === "en" ? "Use my location" : "使用我的位置")}
            className="inline-flex h-full items-center gap-1 border-r border-line px-2.5 text-muted hover:bg-surface hover:text-green disabled:text-muted-2"
          >
            <span aria-hidden>◎</span>
            <span className="hidden lg:inline">
              {status === "prompting" ? (locale === "en" ? "Locating…" : "定位中…") : (locale === "en" ? "Locate" : "定位")}
            </span>
          </button>
        )}
        <span className="sr-only" aria-live="polite">
          {locationMessage}
        </span>
        <label className="relative flex h-full min-w-0 items-center">
          <span className="sr-only">
            {locale === "en" ? `Service area, currently ${currentArea.shortName}` : `服務區，目前是${currentArea.shortName}`}
          </span>
          <select
            value={area}
            onChange={(event) => selectArea(event.currentTarget.value as AreaSlug)}
            aria-label={locale === "en" ? "Choose service area" : "選擇服務區"}
            className="h-full w-full min-w-0 cursor-pointer appearance-none bg-transparent py-0 pl-3 pr-8 font-medium text-forest outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green md:w-[142px] lg:w-[168px]"
          >
            {AREAS.map((candidate) => (
              <option key={candidate.slug} value={candidate.slug}>
                {compactAreaLabel(areaCopy(candidate, locale), locale)}
              </option>
            ))}
          </select>
          <span aria-hidden className="pointer-events-none absolute right-3 text-muted-2">⌄</span>
        </label>
      </div>
    );
  }

  return (
    <div className="flex max-w-full items-center gap-1.5 overflow-x-auto whitespace-nowrap border border-line px-2.5 py-[5px] text-xs text-muted">
      {locatable && (
        <button
          type="button"
          onClick={locate}
          disabled={status === "prompting"}
          title={locationMessage || (locale === "en" ? "Use my location" : "使用我的位置選擇最近服務區")}
          className="-my-3 inline-flex min-h-11 items-center gap-1 pr-1 text-muted hover:text-green disabled:text-muted-2"
        >
          <span aria-hidden>◎</span>
          <span className="hidden sm:inline">{status === "prompting" ? (locale === "en" ? "Locating…" : "定位中…") : (locale === "en" ? "Locate" : "定位")}</span>
        </button>
      )}
      <span className="sr-only" aria-live="polite">
        {locationMessage}
      </span>
      <div role="group" aria-label={locale === "en" ? "Choose service area" : "選擇服務區"} className="flex flex-none items-center gap-1">
        {AREAS.map((a) => {
          const active = a.slug === area;
          return (
            <Link
              key={a.slug}
              href={hrefFor(a.slug)}
              scroll={false}
              aria-current={active ? "true" : undefined}
              className={
                active
                  ? "-my-3 inline-flex min-h-11 items-center px-2 font-medium text-green no-underline"
                  : "-my-3 inline-flex min-h-11 items-center px-2 text-muted-2 no-underline hover:text-ink"
              }
            >
              {areaCopy(a, locale).shortName}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function AreaSwitchFallback({ area, locatable = false, compact = false }: AreaSwitchProps) {
  const locale = useLocale();
  const currentArea = areaCopy(AREAS.find((candidate) => candidate.slug === area) ?? AREAS[0], locale);

  if (compact) {
    return (
      <div className="flex h-11 w-full flex-none items-center overflow-hidden border border-line-strong bg-paper text-xs text-muted md:w-auto">
        {locatable && (
          <span className="inline-flex h-full items-center border-r border-line px-2.5 text-muted-2">
            <span aria-hidden>◎</span>
            <span className="hidden lg:ml-1 lg:inline">{locale === "en" ? "Locate" : "定位"}</span>
          </span>
        )}
        <span className="min-w-0 flex-1 truncate px-3 font-medium text-forest md:w-[142px] md:flex-none lg:w-[168px]">
          {compactAreaLabel(currentArea, locale)}
        </span>
        <span aria-hidden className="pr-3 text-muted-2">⌄</span>
      </div>
    );
  }

  return (
    <div className="flex max-w-full items-center gap-1.5 overflow-x-auto whitespace-nowrap border border-line px-2.5 py-[5px] text-xs text-muted">
      {locatable && (
        <span className="-my-3 inline-flex min-h-11 items-center gap-1 pr-1 text-muted-2">
          <span aria-hidden>◎</span>
          <span className="hidden sm:inline">{locale === "en" ? "Locate" : "定位"}</span>
        </span>
      )}
      <div role="group" aria-label={locale === "en" ? "Choose service area" : "選擇服務區"} className="flex flex-none items-center gap-1">
        {AREAS.map((candidate) => (
          <span
            key={candidate.slug}
            className={
              candidate.slug === area
                ? "-my-3 inline-flex min-h-11 items-center px-2 font-medium text-green"
                : "-my-3 inline-flex min-h-11 items-center px-2 text-muted-2"
            }
          >
            {areaCopy(candidate, locale).shortName}
          </span>
        ))}
      </div>
    </div>
  );
}

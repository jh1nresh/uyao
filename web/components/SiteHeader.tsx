import Link from "next/link";

import { AreaSwitch } from "./AreaSwitch";
import { BrandMark } from "./BrandMark";
import { BrandLogo } from "./BrandLogo";
import { SearchInput } from "./SearchInput";
import { LanguageSwitch } from "./LanguageSwitch";
import { ThemeToggle } from "./ThemeToggle";
import { DEFAULT_AREA } from "@/lib/data";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { SITE_URL } from "@/lib/seo";
import type { AreaSlug } from "@/lib/types";

export async function SiteHeader({
  query,
  showSearch = true,
  showTagline = true,
  area = DEFAULT_AREA,
  preserveAreaPath = false,
  locatable = false,
  presentation = "default",
}: {
  query?: string;
  showSearch?: boolean;
  showTagline?: boolean;
  /** 目前服務區。只有會依地區過濾的頁面（首頁／搜尋）需要傳。 */
  area?: AreaSlug;
  preserveAreaPath?: boolean;
  locatable?: boolean;
  presentation?: "default" | "pearl";
}) {
  const locale = await getRequestLocale();
  const pearl = presentation === "pearl";
  return (
    <header className={`sticky top-0 z-40 border-b border-line-strong backdrop-blur-sm ${pearl ? "shop-pearl-header bg-paper/95" : "bg-ivory/95"}`}>
      <div className={`shop-shell flex items-center gap-3 ${pearl ? "h-[72px] sm:h-[78px]" : "h-[68px] sm:h-[72px]"}`}>
        {/* 品牌 logo 回到 company landing；地區狀態只留在找藥流程。 */}
        <Link
          href={`${SITE_URL}${localizedPath("/", locale)}`}
          aria-label={locale === "en" ? "Back to uYao homepage" : "回到 uYao 首頁"}
          className="flex min-h-11 flex-none items-center gap-2 no-underline"
        >
          {pearl ? (
            <span className="editorial-display whitespace-nowrap text-[25px] font-semibold tracking-[-.035em] text-forest sm:text-[31px]">
              uYao 有藥
            </span>
          ) : showSearch ? (
            <>
              <span className="sm:hidden"><BrandMark size={34} /></span>
              <span className="hidden sm:block"><BrandLogo height={34} /></span>
            </>
          ) : (
            <>
              <span className="sm:hidden"><BrandMark size={34} /></span>
              <span className="hidden sm:block"><BrandLogo height={34} /></span>
            </>
          )}
          {showTagline && (
            <span className={`ml-1 hidden border-l border-line-strong pl-3 font-medium text-muted lg:inline ${pearl ? "text-[14px] tracking-0" : "text-[12px] tracking-[.04em]"}`}>
              {locale === "en" ? "Nearby pharmacies · Medicine requests" : "附近藥局・找藥需求"}
            </span>
          )}
        </Link>

        {showSearch && (
          <SearchInput
            defaultValue={query}
            area={area}
            className="ml-1 min-w-0 flex-1 sm:ml-5 sm:max-w-[520px]"
          />
        )}

        <div className={showSearch ? "hidden flex-1 sm:block" : "flex-1"} />

        <div className="hidden md:block">
          <AreaSwitch area={area} preservePath={preserveAreaPath} locatable={pearl ? false : locatable} compact />
        </div>
        {!pearl && <ThemeToggle locale={locale} />}
        <LanguageSwitch className={pearl ? "shop-pearl-language text-[14px]" : ""} />
        {/* 供給側入口。合作說明留在公司站；已開通店家從 Store OS 網域登入。
            手機有搜尋框時先讓寬度給找藥主流程（頁尾仍有藥局合作入口）；
            沒有搜尋框的頁面則保留這顆 CTA。 */}
        <Link
          href={`${SITE_URL}${localizedPath("/pharmacy", locale)}`}
          className={`${showSearch ? "hidden sm:inline-flex" : "inline-flex"} min-h-11 flex-none items-center border bg-paper px-3 font-bold text-forest no-underline transition-colors hover:border-forest hover:bg-surface ${pearl ? "rounded-[4px] border-forest px-5 text-[14px]" : "border-line-strong text-xs"}`}
        >
          {locale === "en" ? "For pharmacies" : "我是藥局"}
        </Link>
      </div>
    </header>
  );
}

import Link from "next/link";

import { AreaSwitch } from "./AreaSwitch";
import { BrandMark } from "./BrandMark";
import { BrandLogo } from "./BrandLogo";
import { SearchInput } from "./SearchInput";
import { LanguageSwitch } from "./LanguageSwitch";
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
}: {
  query?: string;
  showSearch?: boolean;
  showTagline?: boolean;
  /** 目前服務區。只有會依地區過濾的頁面（首頁／搜尋）需要傳。 */
  area?: AreaSlug;
  preserveAreaPath?: boolean;
  locatable?: boolean;
}) {
  const locale = await getRequestLocale();
  return (
    <header className="sticky top-0 z-40 border-b border-line-strong bg-ivory/95 backdrop-blur-sm">
      <div className="shop-shell flex h-[68px] items-center gap-3 sm:h-[72px]">
        {/* 品牌 logo 回到 company landing；地區狀態只留在找藥流程。 */}
        <Link
          href={`${SITE_URL}${localizedPath("/", locale)}`}
          aria-label={locale === "en" ? "Back to uYao homepage" : "回到 uYao 首頁"}
          className="flex min-h-11 flex-none items-center gap-2 no-underline"
        >
          {showSearch ? (
            <>
              <span className="sm:hidden"><BrandMark size={34} /></span>
              <span className="hidden sm:block"><BrandLogo height={34} /></span>
            </>
          ) : (
            <BrandLogo height={34} />
          )}
          {showTagline && (
            <span className="ml-1 hidden border-l border-line-strong pl-3 text-[12px] font-medium tracking-[.04em] text-muted lg:inline">
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
          <AreaSwitch area={area} preservePath={preserveAreaPath} locatable={locatable} compact />
        </div>
        <LanguageSwitch />
        {/* 供給側入口。藥局端不需要後台帳號（預留確認走 LINE bot），
            所以連的是合作說明頁而不是登入頁。 */}
        <Link
          href={`${SITE_URL}${localizedPath("/pharmacy", locale)}`}
          className="inline-flex min-h-11 flex-none items-center border border-line-strong bg-paper px-3 text-xs font-bold text-forest no-underline transition-colors hover:border-forest hover:bg-surface"
        >
          {locale === "en" ? "For pharmacies" : "我是藥局"}
        </Link>
      </div>
    </header>
  );
}

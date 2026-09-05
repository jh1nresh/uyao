import Link from "next/link";

import { AreaSwitch } from "./AreaSwitch";
import { BrandMark } from "./BrandMark";
import { BrandLogo } from "./BrandLogo";
import { SearchInput } from "./SearchInput";
import { LanguageSwitch } from "./LanguageSwitch";
import { SiteHeaderMobileMenu } from "./SiteHeaderMobileMenu";
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
  tone = "default",
  activeWorkspace,
}: {
  query?: string;
  showSearch?: boolean;
  showTagline?: boolean;
  /** 目前服務區。只有會依地區過濾的頁面（首頁／搜尋）需要傳。 */
  area?: AreaSlug;
  preserveAreaPath?: boolean;
  locatable?: boolean;
  tone?: "default" | "cabinet";
  activeWorkspace?: "shop" | "agent";
}) {
  const locale = await getRequestLocale();
  const cabinetTone = tone === "cabinet";
  const showWorkspaceNavigation = Boolean(activeWorkspace) && !showSearch;
  const showPharmacyCta = !(showSearch || showWorkspaceNavigation);
  const workspaceActiveClass = "border-forest font-bold text-forest";
  const workspaceInactiveClass = "border-transparent font-semibold text-muted hover:border-line-strong hover:text-ink";
  return (
    <header className={cabinetTone
      ? "cabinet-overlay-header cabinet-header-band relative z-40"
      : "sticky top-0 z-40 border-b border-line-strong bg-ivory/95 backdrop-blur-sm"
    }>
      <div className={`shop-shell items-center ${
        showWorkspaceNavigation
          ? "flex gap-2 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-4"
          : "flex gap-3"
      } ${
        cabinetTone ? "h-16 sm:h-[68px]" : "h-[68px] sm:h-[72px]"
      }`}>
        {/* 品牌 logo 回到統一的 consumer-first 首頁；地區狀態只留在找藥流程。 */}
        <Link
          href={`${SITE_URL}${localizedPath("/", locale)}`}
          aria-label={locale === "en" ? "Back to uYao homepage" : "回到 uYao 首頁"}
          className={`flex min-h-11 flex-none items-center gap-2 no-underline ${
            showWorkspaceNavigation ? "md:justify-self-start" : ""
          }`}
        >
          {cabinetTone ? (
            <BrandLogo height={28} />
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
            <span className={`ml-1 hidden border-l pl-3 text-[12px] font-medium tracking-[.04em] lg:inline ${
              "border-line-strong text-muted"
            }`}>
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

        {showWorkspaceNavigation && (
          <nav
            aria-label={locale === "en" ? "uYao destinations" : "uYao 主要導覽"}
            className="cabinet-workspace-nav hidden h-full items-stretch justify-center md:flex"
          >
            <Link
              href={localizedPath("/", locale)}
              aria-current={activeWorkspace === "shop" ? "page" : undefined}
              className={`cabinet-workspace-tab inline-flex min-h-11 items-center border-b-2 px-3 text-[13px] no-underline transition-colors sm:px-4 ${
                activeWorkspace === "shop" ? workspaceActiveClass : workspaceInactiveClass
              }`}
            >
              {locale === "en" ? "Shop" : "找藥"}
            </Link>
            <Link
              href={localizedPath("/agent", locale)}
              aria-current={activeWorkspace === "agent" ? "page" : undefined}
              className={`cabinet-workspace-tab inline-flex min-h-11 items-center border-b-2 px-3 text-[13px] no-underline transition-colors sm:px-4 ${
                activeWorkspace === "agent" ? workspaceActiveClass : workspaceInactiveClass
              }`}
            >
              {locale === "en" ? "Agent" : "問藥"}
            </Link>
          </nav>
        )}

        {!showWorkspaceNavigation && (
          <div className={showSearch ? "hidden flex-1 sm:block" : "flex-1"} />
        )}

        {showWorkspaceNavigation && <div className="min-w-0 flex-1 md:hidden" />}

        <div className={`${
          cabinetTone ? "cabinet-header-controls flex items-center" : "flex items-center gap-3"
        } ${showWorkspaceNavigation ? "md:justify-self-end" : ""}`}>
          <div className={showWorkspaceNavigation ? "hidden xl:block" : "hidden md:block"}>
            <AreaSwitch area={area} preservePath={preserveAreaPath} locatable={locatable} compact />
          </div>
          {!cabinetTone && <ThemeToggle locale={locale} />}
          <LanguageSwitch className={cabinetTone ? "cabinet-header-language" : ""} />
          {/* 供給側入口。合作說明留在公司站；已開通店家從 Store OS 網域登入。
              手機有搜尋框或 workspace 導覽時先讓寬度給主流程（頁尾仍有藥局合作入口）；
              沒有搜尋框的頁面則保留這顆 CTA。手機 hamburger 也會帶同一入口。 */}
          <Link
            href={`${SITE_URL}${localizedPath("/pharmacy", locale)}`}
            className={`${showSearch || showWorkspaceNavigation ? "hidden sm:inline-flex" : "inline-flex"} min-h-11 flex-none items-center border border-line-strong bg-paper px-3 text-xs font-bold text-forest no-underline transition-colors hover:border-forest hover:bg-surface`}
          >
            {locale === "en" ? "For pharmacies" : "我是藥局"}
          </Link>
          <SiteHeaderMobileMenu
            locale={locale}
            area={area}
            preserveAreaPath={preserveAreaPath}
            locatable={locatable}
            tone={tone}
            activeWorkspace={showWorkspaceNavigation ? activeWorkspace : undefined}
            showPharmacyCta={!showPharmacyCta}
          />
        </div>
      </div>
    </header>
  );
}

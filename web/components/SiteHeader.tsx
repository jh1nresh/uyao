import Link from "next/link";

import { AreaSwitch } from "./AreaSwitch";
import { BrandLogo } from "./BrandLogo";
import { SearchInput } from "./SearchInput";
import { DEFAULT_AREA } from "@/lib/data";
import type { AreaSlug } from "@/lib/types";

export function SiteHeader({
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
  return (
    <header className="sticky top-0 z-40 flex h-[60px] items-center gap-3 border-b border-line-strong bg-ivory px-4 sm:h-16 sm:px-7 xl:px-12 2xl:px-16">
      {/* -my-3 py-3：把 lockup 撐成 50px 點擊區，版面高度不變。
          消費端 chrome 的 logo 回 app 首頁 /app，不是公司 landing。 */}
      <Link href={`/app?area=${area}`} className="-my-3 flex flex-none items-center gap-2 py-3 no-underline">
        <BrandLogo height={30} />
        {showTagline && (
          <span className="ml-1 hidden pt-[3px] text-[13px] text-muted lg:inline">
            附近藥局・現貨查詢
          </span>
        )}
      </Link>

      {showSearch && (
        <SearchInput
          defaultValue={query}
          area={area}
          className="ml-2 min-w-0 flex-1 sm:ml-4 sm:max-w-[460px]"
        />
      )}

      <div className="flex-1" />

      <div className="hidden md:block">
        <AreaSwitch area={area} preservePath={preserveAreaPath} locatable={locatable} />
      </div>
      {/* 供給側入口。藥局端不需要後台帳號（預留確認走 LINE bot），
          所以連的是合作說明頁而不是登入頁。 */}
      <Link
        href="/pharmacy"
        className="-my-3.5 -mr-2 flex-none border-b border-transparent px-2 py-3.5 text-xs font-medium text-muted no-underline hover:border-forest hover:text-forest"
      >
        我是藥局
      </Link>
    </header>
  );
}

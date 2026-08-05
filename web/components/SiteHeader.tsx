import Link from "next/link";

import { AreaSwitch } from "./AreaSwitch";
import { CrossMark } from "./CrossMark";
import { SearchInput } from "./SearchInput";
import { DEFAULT_AREA } from "@/lib/data";
import type { AreaSlug } from "@/lib/types";

export function SiteHeader({
  query,
  showSearch = true,
  showTagline = false,
  area = DEFAULT_AREA,
}: {
  query?: string;
  showSearch?: boolean;
  showTagline?: boolean;
  /** 目前服務區。只有會依地區過濾的頁面（首頁／搜尋）需要傳。 */
  area?: AreaSlug;
}) {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-line px-4 sm:px-7">
      {/* -my-3 py-3：把 26px 的 logo 撐成 50px 點擊區，版面高度不變 */}
      <Link href="/" className="-my-3 flex flex-none items-center gap-2 py-3 no-underline">
        <CrossMark />
        <span className="text-[17px] font-black tracking-[.06em] text-ink">有藥</span>
        {showTagline && (
          <span className="ml-0.5 hidden pt-[3px] text-[11px] text-muted lg:inline">
            附近藥局・現貨查詢
          </span>
        )}
      </Link>

      {showSearch && (
        <SearchInput defaultValue={query} className="ml-2 min-w-0 flex-1 sm:ml-4 sm:max-w-[460px]" />
      )}

      <div className="flex-1" />

      <div className="hidden md:block">
        <AreaSwitch area={area} />
      </div>
      {/* 供給側入口。藥局端不需要後台帳號（預留確認走 LINE bot），
          所以連的是合作說明頁而不是登入頁。 */}
      <Link
        href="/pharmacy"
        className="-my-3.5 -mr-2 flex-none px-2 py-3.5 text-xs text-muted no-underline hover:text-ink"
      >
        我是藥局
      </Link>
    </header>
  );
}

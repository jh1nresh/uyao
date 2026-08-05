import Link from "next/link";

import { CrossMark } from "./CrossMark";
import { SearchInput } from "./SearchInput";
import { USER_AREA } from "@/lib/data";

export function SiteHeader({
  query,
  showSearch = true,
  showTagline = false,
}: {
  query?: string;
  showSearch?: boolean;
  showTagline?: boolean;
}) {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-line px-4 sm:px-7">
      <Link href="/" className="flex flex-none items-center gap-2 no-underline">
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

      <div className="hidden items-center gap-1.5 border border-line px-2.5 py-[5px] text-xs text-muted md:flex">
        <span aria-hidden>◎</span>
        {USER_AREA}
        <span className="font-medium text-green">已定位</span>
      </div>
      {/* 供給側入口。藥局端不需要後台帳號（預留確認走 LINE bot），
          所以連的是合作說明頁而不是登入頁。 */}
      <Link href="/pharmacy" className="flex-none text-xs text-muted no-underline hover:text-ink">
        我是藥局
      </Link>
    </header>
  );
}

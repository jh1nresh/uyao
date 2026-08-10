import type { AreaSlug } from "@/lib/types";

/**
 * 搜尋框。用原生 GET form — 沒有 JS 也能搜，SEO 入口頁不依賴 client bundle。
 */
export function SearchInput({
  defaultValue = "",
  size = "sm",
  className = "",
  autoFocus = false,
  area,
}: {
  defaultValue?: string;
  size?: "sm" | "lg" | "xl";
  className?: string;
  autoFocus?: boolean;
  area?: AreaSlug;
}) {
  const large = size !== "sm";
  const xl = size === "xl";
  return (
    <form
      action="/search"
      role="search"
      className={`flex items-center bg-paper transition-[border-color,box-shadow,transform] duration-200 ${
        xl
          ? "h-16 gap-3 border border-line-strong px-2 focus-within:border-green focus-within:shadow-[0_12px_34px_rgba(37,54,45,0.08)] sm:h-20 sm:px-3"
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
        搜尋藥品
      </label>
      <input
        id={`q-${size}`}
        name="q"
        type="search"
        autoFocus={autoFocus}
        defaultValue={defaultValue}
        placeholder={
          // 例子刻意一個商品名、一個口語症狀 —— 症狀查詢現在真的走得通
          // （`lib/symptoms.ts`），不給例子沒人會知道可以這樣打。
          large ? "輸入藥品名或症狀，如：曼秀雷敦、被蚊子咬" : "搜尋藥品"
        }
        // h-full：讓整個框都是點擊區，不是只有文字那 20px
        className={`h-full min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted-2 ${
          xl ? "text-[16px] sm:text-[18px]" : large ? "text-[16px]" : "text-[15px]"
        }`}
      />
      {large && (
        <button
          type="submit"
          className={`action-primary flex-none ${xl ? "h-14 px-5 text-[16px] sm:px-9" : "h-12 px-6 text-[15px]"}`}
        >
          搜尋
        </button>
      )}
    </form>
  );
}

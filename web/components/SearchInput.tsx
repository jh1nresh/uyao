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
  size?: "sm" | "lg";
  className?: string;
  autoFocus?: boolean;
  area?: AreaSlug;
}) {
  const lg = size === "lg";
  return (
    <form
      action="/search"
      role="search"
      className={`flex items-center gap-2 bg-white ${
        lg ? "h-[52px] border-[1.5px] border-ink px-4" : "h-11 border border-line-strong px-3 sm:h-9"
      } ${className}`}
    >
      {area && <input type="hidden" name="area" value={area} />}
      <span aria-hidden className={lg ? "text-[18px] text-ink" : "text-sm text-muted-2"}>
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
          lg ? "輸入藥品名或症狀，如：曼秀雷敦、被蚊子咬" : "搜尋藥品"
        }
        // h-full：讓整個框都是點擊區，不是只有文字那 20px
        className={`h-full min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-muted-2 ${
          lg ? "text-[16px]" : "text-[15px]"
        }`}
      />
      {lg && (
        <button
          type="submit"
          className="h-11 flex-none bg-green px-[18px] text-[15px] font-bold text-white hover:bg-green-hover"
        >
          搜尋
        </button>
      )}
    </form>
  );
}

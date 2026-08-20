import type { Locale } from "@/lib/i18n";

/** 缺少可用商品圖時的中性版位；不重複品名，也不假裝這是實際包裝。 */
export function CatalogImagePlaceholder({ locale }: { locale: Locale }) {
  return (
    <span
      aria-hidden
      className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface px-3 text-center"
    >
      <span className="num text-[11px] font-semibold tracking-[.12em] text-forest">UYAO</span>
      <span className="text-[12.5px] font-medium text-muted-2">
        {locale === "en" ? "Image pending" : "圖片待補"}
      </span>
    </span>
  );
}

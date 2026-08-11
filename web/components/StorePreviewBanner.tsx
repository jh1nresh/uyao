import Link from "next/link";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";

/**
 * 業務示範橫幅。只在 /store/[slug]/preview 出現。
 *
 * 這頁是拿去跟藥局老闆談的：他看到的是自己的店名、自己的地址，配上
 * 「裝了盒子之後會長這樣」的庫存。橫幅必須大聲講清楚庫存是示範的 ——
 * 對方要能一眼分辨哪些是他的真實資料、哪些是我們模擬的。
 */
export async function StorePreviewBanner({ storeName, storeSlug }: { storeName: string; storeSlug: string }) {
  const locale = await getRequestLocale();
  return (
    <div className="border-b-2 border-green bg-green-tint px-4 py-2.5 sm:px-7 xl:px-12 2xl:px-16">
      <p className="text-[14px] leading-[1.6] text-ink">
        {locale === "en" ? (
          <><b className="font-bold">DEMO PREVIEW</b> · The catalog and prices below are simulated. Receiving-scan freshness comes from the live demo pipeline. <span className="text-muted">The store name, address, phone, and hours come from government open data.</span></>
        ) : (
          <><b className="font-bold">示範預覽</b> · 下方的商品與價格是模擬的；進貨掃描新鮮度來自實際 demo pipeline，用來展示{storeName}裝上盒子之後這一頁會長什麼樣。<span className="text-muted">店名、地址、電話與營業時段是政府開放資料的真實內容。</span></>
        )}
      </p>
      <p className="mt-1 text-[13px] text-muted">
        <Link href={localizedPath("/pharmacy", locale)} className="-my-2 inline-block py-2 font-medium text-green">
          {locale === "en" ? "Apply for a free pilot →" : "申請免費試裝 →"}
        </Link>
        <span className="mx-2 text-line-strong">|</span>
        <Link href={localizedPath(`/store/${storeSlug}`, locale)} className="-my-2 inline-block py-2 text-muted">
          {locale === "en" ? "Close preview" : "關閉預覽"}
        </Link>
      </p>
    </div>
  );
}

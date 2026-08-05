import Link from "next/link";

/**
 * 業務示範橫幅。只在 /store/[slug]/preview 出現。
 *
 * 這頁是拿去跟藥局老闆談的：他看到的是自己的店名、自己的地址，配上
 * 「裝了盒子之後會長這樣」的庫存。橫幅必須大聲講清楚庫存是示範的 ——
 * 對方要能一眼分辨哪些是他的真實資料、哪些是我們模擬的。
 */
export function StorePreviewBanner({ storeName, storeSlug }: { storeName: string; storeSlug: string }) {
  return (
    <div className="border-b-2 border-green bg-green-tint px-4 py-2.5 sm:px-7">
      <p className="text-[12.5px] leading-[1.6] text-ink">
        <b className="font-bold">示範預覽</b> · 下方的商品、價格與庫存徽章是模擬的，
        用來展示{storeName}裝上盒子之後這一頁會長什麼樣。
        <span className="text-muted">店名、地址、電話與營業時段是政府開放資料的真實內容。</span>
      </p>
      <p className="mt-1 text-[11.5px] text-muted">
        <Link href="/pharmacy" className="-my-2 inline-block py-2 font-medium text-green">
          申請免費試裝 →
        </Link>
        <span className="mx-2 text-line-strong">|</span>
        <Link href={`/store/${storeSlug}`} className="-my-2 inline-block py-2 text-muted">
          關閉預覽
        </Link>
      </p>
    </div>
  );
}

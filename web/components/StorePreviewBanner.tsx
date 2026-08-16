import Link from "next/link";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";

/**
 * 業務示範橫幅。出現在獨立 demo 藥局與舊版店家 preview。
 *
 * 這頁是拿去跟藥局老闆談的：他看到的是自己的店名、自己的地址，配上
 * 「裝了盒子之後會長這樣」的庫存。橫幅必須大聲講清楚庫存是示範的 ——
 * 對方要能一眼分辨哪些是他的真實資料、哪些是我們模擬的。
 */
export async function StorePreviewBanner({ storeName, storeSlug, demo = false }: { storeName: string; storeSlug: string; demo?: boolean }) {
  const locale = await getRequestLocale();
  return (
    <div className="border-b-2 border-green bg-green-tint px-4 py-2.5 sm:px-7 xl:px-12 2xl:px-16">
      <p className="text-[14px] leading-[1.6] text-ink">
        {demo ? locale === "en" ? (
          <><b className="font-bold">DEMO PHARMACY</b> · This synthetic storefront is separate from every real partner pharmacy. Add a symptom or request in the reservation sheet to see the same context in the demo Store OS inbox. No LINE notification is sent.</>
        ) : (
          <><b className="font-bold">示範藥局</b> · 這是與真實合作藥局完全分開的沙盒。預留時可填入症狀或希望協助的事情，相同脈絡會出現在 Demo Store OS；不會發送 LINE 或要求任何真實藥局留貨。</>
        ) : locale === "en" ? (
          <><b className="font-bold">DEMO PREVIEW</b> · Product names come from the partner-provided catalog; availability and prices below are simulated. Reservations go only to the uYao Store demo sandbox. <span className="text-muted">No real pharmacy is notified or asked to hold stock.</span></>
        ) : (
          <><b className="font-bold">示範預覽</b> · 品項名稱來自合作藥局提供的目錄，下方供應狀態與價格是模擬的；按下預留只會送到 uYao Store 示範沙盒。<span className="text-muted">不會通知或要求{storeName}保留商品。</span></>
        )}
      </p>
      <p className="mt-1 text-[13px] text-muted">
        <Link href={localizedPath("/pharmacy", locale)} className="-my-2 inline-block py-2 font-medium text-green">
          {locale === "en" ? "Apply for a free pilot →" : "申請免費試裝 →"}
        </Link>
        <span className="mx-2 text-line-strong">|</span>
        {demo ? (
          <a href="https://store.uyaohealth.com/" className="-my-2 inline-block py-2 text-muted">
            {locale === "en" ? "Open demo Store OS →" : "開啟 Demo Store OS →"}
          </a>
        ) : (
          <Link href={localizedPath(`/store/${storeSlug}`, locale)} className="-my-2 inline-block py-2 text-muted">
            {locale === "en" ? "Close preview" : "關閉預覽"}
          </Link>
        )}
      </p>
    </div>
  );
}

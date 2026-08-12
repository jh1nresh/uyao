import type { Metadata } from "next";
import Link from "next/link";

import { CancelReservation } from "@/components/CancelReservation";
import { PickupAutoRefresh } from "@/components/PickupAutoRefresh";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { PRICE_NOTICE } from "@/lib/pricing";
import { getDrug } from "@/lib/data";
import { drugCopy, localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { SHOP_URL } from "@/lib/shop";
import {
  TELL_CONSUMER_AFTER_MIN,
  contactTail,
  getByToken,
  isStoreAvailable,
  minutesSince,
  type StoredReservation,
} from "@/lib/reservations-store";

/**
 * 取貨頁。這就是消費者的「憑證」—— 截圖、加書籤都行，到店唸取貨碼即可。
 *
 * 網址用不可猜的 token 而不是取貨碼：A-347 只有 26,000 種組合，直接當網址
 * 會被爆搜出別人的預留（含電話）。取貨碼只是給櫃檯唸的標籤。
 *
 * 刻意不做登入。這是一次性、四小時內、到店付款的流程，登入只是摩擦；
 * 冒領一盒全額付款的成藥沒有動機。到店辨識靠「取貨碼 + 手機尾號」。
 */

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: locale === "en" ? "Pickup receipt" : "取貨憑證",
    robots: { index: false, follow: false, nocache: true },
  };
}

const STATUS_UI: Record<
  StoredReservation["status"],
  { label: string; tone: "wait" | "ok" | "bad"; body: string }
> = {
  pending_store_confirm: {
    label: "等藥局確認",
    tone: "wait",
    // 不能寫「確認後我們會通知你」—— 消費者只留了手機，我們沒有簡訊管道
    // 也還沒接消費者端 LINE，那句是承諾一件做不到的事。
    body: "藥局確認有貨後才開始計算保留時間，通常 10 分鐘內。這一頁會自己更新，先別關掉。",
  },
  confirmed: {
    label: "已確認保留",
    tone: "ok",
    body: "商品已為你留在櫃檯。到店報取貨碼、付款取貨。",
  },
  rejected_no_stock: {
    label: "這家沒貨",
    tone: "bad",
    body: "藥局回報目前沒有這個品項，先別過去。這筆已經記下來了 —— 可以回搜尋看看附近其他家。",
  },
  cancelled_by_user: {
    label: "已取消",
    tone: "bad",
    body: "這筆預留已經取消了。",
  },
  picked_up: {
    label: "已完成",
    tone: "ok",
    body: "已經取貨完成，感謝。",
  },
  expired: {
    label: "已逾期",
    tone: "bad",
    // 兩種逾期在頁面上長一樣，但下面會依 confirmedAt 補一句不同的說明
    body: "保留時間已經過了，商品已放回架上。",
  },
};

const STATUS_UI_EN: typeof STATUS_UI = {
  pending_store_confirm: {
    label: "Waiting for pharmacy",
    tone: "wait",
    body: "The hold window begins after the pharmacy confirms availability, usually within 10 minutes. This page refreshes automatically.",
  },
  confirmed: {
    label: "Pickup confirmed",
    tone: "ok",
    body: "The item is waiting at the counter. Pay when you pick it up.",
  },
  rejected_no_stock: {
    label: "Unavailable at this pharmacy",
    tone: "bad",
    body: "The pharmacy reported no stock. Do not travel there; the missed demand has been recorded.",
  },
  cancelled_by_user: { label: "Cancelled", tone: "bad", body: "This reservation was cancelled." },
  picked_up: { label: "Picked up", tone: "ok", body: "Pickup is complete. Thank you." },
  expired: { label: "Expired", tone: "bad", body: "The hold window ended and the item was returned to the shelf." },
};

export default async function PickupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const locale = await getRequestLocale();
  const r = await getByToken(token).catch(() => null);

  if (!r) {
    return (
      <>
        <SiteHeader showSearch={false} />
        <section className="shop-shell min-h-[calc(100svh-11rem)] py-12">
          <p className="shop-kicker mb-3">PICKUP RECEIPT</p>
          <h1 className="editorial-display mb-2 text-[32px]">{locale === "en" ? "Reservation not found" : "查不到這筆預留"}</h1>
          <p className="text-[15px] leading-[1.7] text-muted">
            {locale === "en" ? "This link may be incomplete or the reservation may have expired." : "連結可能不完整，或這筆預留已經超過保留期限。"}
            {!isStoreAvailable() &&
              (locale === "en" ? " The reservation store may also be temporarily unavailable; contact the pharmacy directly." : "（也可能是系統暫時讀不到資料，請直接聯絡藥局。）")}
            <br />
            <Link href={`${SHOP_URL}${localizedPath("/", locale)}`} className="text-green">
              {locale === "en" ? "Back to search →" : "回到搜尋 →"}
            </Link>
          </p>
        </section>
        <SiteFooter />
      </>
    );
  }

  // 藥局遲遲沒回覆時，不要再叫人乾等一個可能永遠不會來的確認。
  // LINE 沒有已讀回報，我們唯一能依據的就是時間。
  const overdue =
    r.status === "pending_store_confirm" &&
    minutesSince(r.createdAt) > TELL_CONSUMER_AFTER_MIN;

  const ui = overdue
    ? {
        label: locale === "en" ? "Pharmacy has not replied" : "藥局還沒回覆",
        tone: "wait" as const,
        body: locale === "en" ? "The usual reply time has passed. Calling the pharmacy is the fastest way to confirm." : "已經超過一般回覆時間了。想確定的話，直接打電話問這家藥局最快。",
      }
    : (locale === "en" ? STATUS_UI_EN : STATUS_UI)[r.status];
  const storedDrug = getDrug(r.drugSlug);
  const displayDrugName = storedDrug ? drugCopy(storedDrug, locale).name : r.drugName;
  const toneClass =
    ui.tone === "ok"
      ? "border-green bg-green-tint text-green"
      : ui.tone === "bad"
        ? "border-line-strong bg-surface text-muted"
        : "border-line-strong bg-surface text-ink";

  return (
    <>
      <SiteHeader showSearch={false} />
      {/* 終態沒有東西可等，只有 pending 才輪詢 */}
      {r.status === "pending_store_confirm" && <PickupAutoRefresh />}

      <section className="shop-shell max-w-[620px] py-10 sm:py-14">
        <p className="shop-kicker mb-3">PICKUP RECEIPT</p>
        <div className="border-t-2 border-forest bg-paper p-5 shadow-[0_18px_48px_rgba(37,54,45,0.08)] sm:p-7">
        {r.demo && (
          /* 示範單長得跟真單一樣的話，拿去店裡會很尷尬 —— 一定要標出來 */
          <div className="mb-3 border-2 border-green bg-green-tint px-3.5 py-2 text-[14px] leading-[1.6] text-ink">
            <b className="font-bold">{locale === "en" ? "Demo reservation" : "示範預留"}</b> · {locale === "en" ? "This came from a demo preview. Catalog and prices are simulated; receiving freshness may come from the demo scan pipeline. Do not take it to the store." : "這筆來自藥局示範頁。商品與價格是模擬資料；進貨新鮮度可能來自 demo 掃描流程。請勿持此憑證前往門市。"}
          </div>
        )}
        <div className={`mb-3 border px-3.5 py-2 text-[14px] font-bold ${toneClass}`}>
          {ui.label}
        </div>
        <p className="mb-4 text-[14px] leading-[1.7] text-muted">
          {ui.body}
          {r.status === "expired" && !r.confirmedAt && (
            // 藥局從沒確認過 —— 不能讓人以為是自己放鳥
            <> {locale === "en" ? "The pharmacy never replied, so this does not count as a missed pickup." : "這一筆藥局一直沒有回覆，不算你未取。"}</>
          )}
          {r.status === "expired" && r.confirmedAt && (
            <> {locale === "en" ? "Reserve again if you still need it." : "還需要的話請重新預留。"}</>
          )}
        </p>

        {overdue && r.storePhone && (
          <a
            href={`tel:${r.storePhone.split("、")[0].replace(/-/g, "")}`}
            className="action-primary mb-4 h-12 text-[14px]"
          >
            {locale === "en" ? "Call" : "打電話問"} {r.storeName} · {r.storePhone.split("、")[0]}
          </a>
        )}

        {/* 到店只需要唸這個 */}
        <div className="flex flex-col items-center gap-1 border border-line bg-surface px-4 py-6">
          <div className="text-[13px] font-medium text-muted-2">{locale === "en" ? "Pickup code" : "取貨碼"}</div>
          <div className="num text-[44px] font-semibold leading-none tracking-[.12em] text-ink">
            {r.code}
          </div>
          <div className="mt-1 text-[13px] text-muted">
            {locale === "en" ? "Give this code at the counter. The pharmacist will verify phone digits " : "到店請報這組號碼，藥師會核對手機尾號 "}
            <span className="num font-medium text-ink">{contactTail(r)}</span>
          </div>
        </div>

        <div className="mt-3 border border-line">
          <div className="border-b border-line-soft px-3.5 py-3">
            <div className="text-[15px] font-medium text-ink">{displayDrugName}</div>
            <div className="text-[13px] text-muted">{r.drugSpec}</div>
            <div className="mt-1 text-[13px] text-muted">
              {locale === "en" ? "Price shown by the pharmacy; pay at pickup" : `${PRICE_NOTICE}，到店付款`}
            </div>
          </div>

          <div className="px-3.5 py-3">
            <Link
              href={localizedPath(`/store/${r.storeSlug}`, locale)}
              className="text-[15px] font-medium text-ink no-underline hover:text-green"
            >
              {r.storeName}
            </Link>
            <a
              href={r.storeMapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-0.5 block text-[13px] text-green no-underline"
            >
              {r.storeAddress} · {locale === "en" ? "Open map" : "開啟地圖"} ↗
            </a>
            <div className="mt-1 text-[13px] text-muted">{r.storeHours}</div>
          </div>
        </div>

        {/* 已取消／已回報沒貨都沒什麼好取消的了 */}
        {(r.status === "pending_store_confirm" || r.status === "confirmed") && (
          <CancelReservation token={r.token} confirmed={r.status === "confirmed"} />
        )}

        <p className="mt-3 text-[13px] leading-[1.7] text-muted-2">
          {locale === "en" ? "Screenshot or bookmark this page; no account is required." : "把這一頁截圖或加入書籤就好，不需要登入。"}
          <br />
          {locale === "en" ? "Two missed confirmed pickups suspend reservations. There is no online sale; a pharmacist hands over the product in store." : "兩次預留未取將暫停預留權限。不提供線上交易，商品由藥師於門市交付。"}
        </p>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

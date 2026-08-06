import type { Metadata } from "next";
import Link from "next/link";

import { CancelReservation } from "@/components/CancelReservation";
import { PickupAutoRefresh } from "@/components/PickupAutoRefresh";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { formatPrice } from "@/lib/format";
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

export const metadata: Metadata = {
  title: "取貨憑證",
  // 別人的預留單絕對不能進搜尋引擎
  robots: { index: false, follow: false, nocache: true },
};

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
  expired: {
    label: "已逾期",
    tone: "bad",
    // 兩種逾期在頁面上長一樣，但下面會依 confirmedAt 補一句不同的說明
    body: "保留時間已經過了，商品已放回架上。",
  },
};

export default async function PickupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const r = await getByToken(token).catch(() => null);

  if (!r) {
    return (
      <>
        <SiteHeader showSearch={false} />
        <section className="px-4 py-10 sm:px-7 xl:px-12 2xl:px-16">
          <h1 className="mb-2 text-lg font-black">查不到這筆預留</h1>
          <p className="text-[15px] leading-[1.7] text-muted">
            連結可能不完整，或這筆預留已經超過保留期限。
            {!isStoreAvailable() &&
              "（也可能是系統暫時讀不到資料，請直接聯絡藥局。）"}
            <br />
            <Link href="/" className="text-green">
              回到搜尋 →
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
        label: "藥局還沒回覆",
        tone: "wait" as const,
        body: "已經超過一般回覆時間了。想確定的話，直接打電話問這家藥局最快。",
      }
    : STATUS_UI[r.status];
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

      <section className="mx-auto max-w-[520px] px-4 py-6 sm:px-7 xl:px-12 2xl:px-16">
        {r.demo && (
          /* 示範單長得跟真單一樣的話，拿去店裡會很尷尬 —— 一定要標出來 */
          <div className="mb-3 border-2 border-green bg-green-tint px-3.5 py-2 text-[14px] leading-[1.6] text-ink">
            <b className="font-bold">示範預留</b> ·
            這筆來自藥局示範頁，商品與庫存都是模擬的。請勿持此憑證前往門市。
          </div>
        )}
        <div className={`mb-3 border px-3.5 py-2 text-[14px] font-bold ${toneClass}`}>
          {ui.label}
        </div>
        <p className="mb-4 text-[14px] leading-[1.7] text-muted">
          {ui.body}
          {r.status === "expired" && !r.confirmedAt && (
            // 藥局從沒確認過 —— 不能讓人以為是自己放鳥
            <> 這一筆藥局一直沒有回覆，不算你未取。</>
          )}
          {r.status === "expired" && r.confirmedAt && (
            <> 還需要的話請重新預留。</>
          )}
        </p>

        {overdue && r.storePhone && (
          <a
            href={`tel:${r.storePhone.split("、")[0].replace(/-/g, "")}`}
            className="mb-4 flex h-12 items-center justify-center border border-green bg-green text-[14px] font-bold text-white no-underline"
          >
            打電話問 {r.storeName} · {r.storePhone.split("、")[0]}
          </a>
        )}

        {/* 到店只需要唸這個 */}
        <div className="flex flex-col items-center gap-1 border border-line bg-surface px-4 py-6">
          <div className="text-[13px] font-medium text-muted-2">取貨碼</div>
          <div className="num text-[44px] font-semibold leading-none tracking-[.12em] text-ink">
            {r.code}
          </div>
          <div className="mt-1 text-[13px] text-muted">
            到店請報這組號碼，藥師會核對手機尾號{" "}
            <span className="num font-medium text-ink">{contactTail(r)}</span>
          </div>
        </div>

        <div className="mt-3 border border-line">
          <div className="border-b border-line-soft px-3.5 py-3">
            <div className="text-[15px] font-medium text-ink">{r.drugName}</div>
            <div className="text-[13px] text-muted">{r.drugSpec}</div>
            <div className="num mt-1 text-[15px] font-semibold text-ink">
              {formatPrice(r.priceTwd)}
              <span className="ml-1 font-sans text-[13px] font-normal text-muted">到店付款</span>
            </div>
          </div>

          <div className="px-3.5 py-3">
            <Link
              href={`/store/${r.storeSlug}`}
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
              {r.storeAddress} · 開啟地圖 ↗
            </a>
            <div className="mt-1 text-[13px] text-muted">{r.storeHours}</div>
          </div>
        </div>

        {/* 已取消／已回報沒貨都沒什麼好取消的了 */}
        {(r.status === "pending_store_confirm" || r.status === "confirmed") && (
          <CancelReservation token={r.token} confirmed={r.status === "confirmed"} />
        )}

        <p className="mt-3 text-[13px] leading-[1.7] text-muted-2">
          把這一頁截圖或加入書籤就好，不需要登入。
          <br />
          兩次預留未取將暫停預留權限。不提供線上交易，商品由藥師於門市交付。
        </p>
      </section>

      <SiteFooter />
    </>
  );
}

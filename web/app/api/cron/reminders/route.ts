import { NextResponse } from "next/server";

import { logConsole } from "@/lib/box";
import { appendRecord } from "@/lib/record";
import {
  EXPIRE_UNANSWERED_AFTER_HOURS,
  REMIND_STORE_AFTER_MIN,
  allActive,
  bumpNoShow,
  isExpired,
  minutesSince,
  save,
} from "@/lib/reservations-store";
import { STORE_DEMO_SANDBOX_SLUG } from "@/lib/store-demo";
import { sendStorePush } from "@/lib/store-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 催沒回覆的預留。
 *
 * 為什麼需要：Web Push 只負責提醒，不是工作狀態；藥局漏看提醒時仍要由
 * Store OS 的 WorkItem 時間判斷是否催單。老闆在忙、四小時過去消費者白等是營運
 * 問題，而不是理論上的邊界情況。
 *
 * 每筆只催一次（`remindedAt`），因為第二次、第三次提醒不會讓忙碌的藥師
 * 更快看到，只會讓這個通知管道變成他想靜音的東西。催過還是沒回，就該由人
 * 打電話，不是讓機器繼續敲。
 *
 * 排程：`vercel.json` 的 crons。**Vercel Hobby 方案的 cron 一天只跑一次**，
 * 對 15 分鐘的提醒沒有意義 —— 那種情況下改用外部排程（cron-job.org、
 * GitHub Actions）打這個網址，帶上 CRON_SECRET 即可。
 */

/**
 * `x-vercel-cron` 標頭**可以被偽造** —— 任何人都能加這個 header 打進來。
 * 所以線上一律要 CRON_SECRET，沒設就整個關閉（fail closed）而不是退回
 * 只檢查標頭。這個端點會發推播，不該讓外面的人隨便觸發。
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    return request.headers.get("authorization") === `Bearer ${secret}`;
  }
  if (process.env.NODE_ENV === "production") {
    console.error("[cron] CRON_SECRET 未設定，拒絕執行。設好之後排程才會生效。");
    return false;
  }
  // 本機開發方便用
  return request.headers.get("x-vercel-cron") !== null;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const active = await allActive().catch((err) => {
    console.error("[cron] 讀不到預留", String(err).slice(0, 200));
    return [];
  });

  let reminded = 0;
  let unsubscribed = 0;
  let expired = 0;
  let noShow = 0;

  // ── 逾期 ──────────────────────────────────────────────────────
  for (const r of active) {
    if (!isExpired(r)) continue;

    // 藥局已經確認 = 東西真的從架上拿下來了，這才算放鳥
    const wasConfirmed = r.status === "confirmed";
    await save({ ...r, status: "expired", expiredAt: new Date().toISOString() });
    expired += 1;
    logConsole(
      "⏰",
      `${r.demo ? "［示範］" : ""}${r.code} ` +
        (wasConfirmed
          ? `保留 ${r.holdHours} 小時已過 → 自動關單，通知藥局放回架上`
          : `藥局 ${EXPIRE_UNANSWERED_AFTER_HOURS} 小時未回覆 → 自動關單，不算消費者未取`),
      `${r.demo ? "[DEMO] " : ""}${r.code} ` +
        (wasConfirmed
          ? `${r.holdHours}-hour hold expired → reservation closed and pharmacy told to return the item to the shelf`
          : `pharmacy did not reply within ${EXPIRE_UNANSWERED_AFTER_HOURS} hours → reservation closed without counting a missed pickup`),
    );

    if (wasConfirmed && !r.demo) {
      const n = await bumpNoShow(r.contact).catch(() => 0);
      if (n > 0) noShow += 1;
    }

    await sendStorePush(r.demo ? STORE_DEMO_SANDBOX_SLUG : r.storeSlug, {
      title: wasConfirmed ? `${r.code} 已逾期未取` : `${r.code} 已自動關閉`,
      body: wasConfirmed
        ? "保留時間已過，可以放回架上；請開啟 Store OS 查看"
        : "這筆不用處理；請開啟 Store OS 查看",
      tag: `reservation-${r.code}`,
    }).catch((err) => {
      console.error(`[cron] 逾期 Web Push 失敗 ${r.code}`, String(err).slice(0, 200));
    });
  }

  // ── 催單 ──────────────────────────────────────────────────────
  for (const r of active) {
    if (r.status !== "pending_store_confirm" || isExpired(r)) continue;
    if (r.remindedAt) continue;
    if (minutesSince(r.createdAt) < REMIND_STORE_AFTER_MIN) continue;

    const result = await sendStorePush(r.demo ? STORE_DEMO_SANDBOX_SLUG : r.storeSlug, {
      title: `${r.code} 還沒回覆`,
      body: "消費者仍在等待確認；請開啟 Store OS 查看",
      tag: `reservation-${r.code}`,
    }).catch(() => ({ status: "failed" as const, sent: 0, failed: 1, removed: 0 }));
    if (result.status !== "sent") {
      if (result.status === "no_subscriptions") unsubscribed += 1;
      console.log(`[cron] ${r.code} @ ${r.storeSlug} 逾時但 Web Push 未送達（${result.status}）`);
      // 建單時推不出去還可能是剛好沒訂閱；過了催單門檻仍推不出去，就是這筆
      // 確定沒人在看。這一筆才是最該讓人知道的 —— 消費者已經等了 15 分鐘。
      if (!r.demo) {
        await appendRecord("unreachable", {
          code: r.code,
          drugSlug: r.drugSlug,
          drugName: r.drugName,
          storeSlug: r.storeSlug,
          storeName: r.storeName,
          storePhone: r.storePhone,
          pushStatus: result.status,
          createdAt: r.createdAt,
          waitedMin: Math.round(minutesSince(r.createdAt)),
        }).catch((err) => {
          console.error(`[cron] 無人接單訊號寫入失敗 ${r.code}`, String(err).slice(0, 200));
        });
      }
      continue;
    }

    try {
      // 只催一次 —— 標記在推播成功之後，失敗的下一輪還會再試
      await save({ ...r, remindedAt: new Date().toISOString() });
      reminded += 1;
      logConsole(
        "⏳",
        `${r.demo ? "［示範］" : ""}${r.code} 藥局 ${REMIND_STORE_AFTER_MIN} 分鐘未回 → 自動催單（只催這一次）`,
        `${r.demo ? "[DEMO] " : ""}${r.code} pharmacy had not replied after ${REMIND_STORE_AFTER_MIN} minutes → one automatic reminder sent`,
      );
    } catch (err) {
      console.error(`[cron] 催單狀態寫入失敗 ${r.code}`, String(err).slice(0, 200));
    }
  }

  return NextResponse.json({ active: active.length, reminded, unsubscribed, expired, noShow });
}

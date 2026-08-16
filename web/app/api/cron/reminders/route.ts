import { NextResponse } from "next/server";

import { userForStore } from "@/lib/bindings";
import { logConsole } from "@/lib/box";
import { isConfigured, push, text } from "@/lib/line";
import {
  EXPIRE_UNANSWERED_AFTER_HOURS,
  REMIND_STORE_AFTER_MIN,
  allActive,
  bumpNoShow,
  isExpired,
  minutesSince,
  save,
} from "@/lib/reservations-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 催沒回覆的預留。
 *
 * 為什麼需要：LINE 不提供已讀回報，所以藥局漏看那張卡片我們完全無從得知。
 * 卡片推出去了、老闆在忙、四小時過去消費者白等 —— 這是真實會發生的營運
 * 問題，而不是理論上的邊界情況。
 *
 * 每筆只催一次（`remindedAt`），因為第二次、第三次提醒不會讓忙碌的藥師
 * 更快看到，只會讓這個聊天室變成他想靜音的東西。催過還是沒回，就該由人
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
  let unbound = 0;
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

    // Demo 單只存在 Store OS sandbox；可以在這裡更新逾期狀態，但永遠不能
    // 解析真實門市綁定或發 LINE。
    if (r.demo) continue;

    const lineUser = await userForStore(r.storeSlug).catch(() => undefined);
    if (!lineUser || !isConfigured()) continue;
    try {
      await push(lineUser, [
        text(
          (r.demo ? "［示範］" : "") +
            (wasConfirmed
              ? `⏰ ${r.code} 已逾期未取\n\n${r.drugName}\n` +
                `保留 ${r.holdHours} 小時已過，可以放回架上了。`
              : `⏰ ${r.code} 已自動關閉\n\n${r.drugName}\n` +
                "這筆一直沒有回覆，已經幫你關掉，不用處理。"),
        ),
      ]);
    } catch (err) {
      console.error(`[cron] 逾期通知失敗 ${r.code}`, String(err).slice(0, 200));
    }
  }

  // ── 催單 ──────────────────────────────────────────────────────
  for (const r of active) {
    if (r.status !== "pending_store_confirm" || isExpired(r)) continue;
    // Demo inbox 本身就是通知面，沒有任何外部提醒或藥局副作用。
    if (r.demo) continue;
    if (r.remindedAt) continue;
    if (minutesSince(r.createdAt) < REMIND_STORE_AFTER_MIN) continue;

    const lineUser = await userForStore(r.storeSlug).catch(() => undefined);
    if (!lineUser || !isConfigured()) {
      // 沒綁 LINE 的藥局只能靠人工。記下來讓你看得到。
      unbound += 1;
      console.log(`[cron] ${r.code} @ ${r.storeSlug} 逾時但該店未綁定 LINE，需人工聯絡`);
      continue;
    }

    try {
      await push(lineUser, [
        text(
          `⚠️ ${r.code} 還沒回覆\n\n` +
            `${r.drugName} ${r.drugSpec}\n` +
            `${Math.round(minutesSince(r.createdAt))} 分鐘前送出，消費者還在等。\n\n` +
            "回到上面那張卡片按「有貨，確認保留」或「沒貨」就好。",
        ),
      ]);
      // 只催一次 —— 標記在推播成功之後，失敗的下一輪還會再試
      await save({ ...r, remindedAt: new Date().toISOString() });
      reminded += 1;
      logConsole(
        "⏳",
        `${r.demo ? "［示範］" : ""}${r.code} 藥局 ${REMIND_STORE_AFTER_MIN} 分鐘未回 → 自動催單（只催這一次）`,
        `${r.demo ? "[DEMO] " : ""}${r.code} pharmacy had not replied after ${REMIND_STORE_AFTER_MIN} minutes → one automatic reminder sent`,
      );
    } catch (err) {
      console.error(`[cron] 催單推播失敗 ${r.code}`, String(err).slice(0, 200));
    }
  }

  return NextResponse.json({ active: active.length, reminded, unbound, expired, noShow });
}

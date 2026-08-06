"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * 取貨頁在「等藥局確認」時自己重抓。
 *
 * 為什麼需要這個：**我們沒有辦法主動通知消費者。** 他只留了手機號碼，
 * 我們沒有簡訊管道，消費者端也還沒接 LINE。所以藥局按下確認之後，他
 * 唯一會知道的方式就是這一頁自己變 —— 不能叫人手動重整。
 *
 * `router.refresh()` 重跑 server component（頁面是 `force-dynamic`），
 * 不會清掉捲動位置也不會閃白。
 *
 * 三個節流條件，避免變成打自己 KV 的機器人：
 *   - 分頁在背景時跳過（手機切走的時間遠多於看著的時間）
 *   - 超過 STOP_AFTER 就停 —— 那時候本來就該打電話了，不是繼續等
 *   - 只有 pending 才掛載；確認／沒貨／取消都是終態，沒有東西可等
 */
const EVERY_MS = 15_000;
const STOP_AFTER_MS = 30 * 60_000;

export function PickupAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const startedAt = Date.now();
    const id = setInterval(() => {
      if (Date.now() - startedAt > STOP_AFTER_MS) {
        clearInterval(id);
        return;
      }
      if (document.visibilityState !== "visible") return;
      router.refresh();
    }, EVERY_MS);

    // 從背景切回來的當下先抓一次 —— 使用者回到這一頁通常就是想看有沒有變
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}

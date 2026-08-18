"use client";

import { useEffect } from "react";

import { captureAdSource } from "@/lib/attribution-client";

/**
 * 在第一次載入時把網址上的 UTM／click id 收進 sessionStorage。
 *
 * 為什麼一定要在這裡收：廣告點擊落在 `/app?utm_campaign=...`，但真正產生
 * 訊號的 `NotifyMe` 可能是使用者點進 `/drug/[slug]` 之後才掛載——那時候
 * 網址上早就沒有 utm 了。不在落地當下記起來，歸因就永遠對不回去。
 *
 * 只在掛載時跑一次：廣告點擊必定是整頁載入，站內導覽不會憑空多出 utm。
 * 這樣就不必用 useSearchParams，也就不會把整棵樹推進 Suspense bailout。
 */
export function AttributionCapture() {
  useEffect(() => {
    captureAdSource();
  }, []);

  return null;
}

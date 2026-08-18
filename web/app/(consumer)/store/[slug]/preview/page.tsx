import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { allStores } from "@/lib/data";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { STORE_DEMO_SANDBOX_SLUG } from "@/lib/store-demo";

/**
 * 舊的真實藥局 preview URL 只保留作相容轉址。所有業務示範都收斂到
 * 獨立的 uyao-demo，避免把真實店名、地址或合作目錄當成沙盒資料。
 */
export function generateStaticParams() {
  return allStores().map((s) => ({ slug: s.slug }));
}

export const metadata: Metadata = {
  title: "uYao Demo 藥局",
  // 模擬庫存絕不能進搜尋引擎
  robots: { index: false, follow: false },
};

export default async function StorePreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getRequestLocale();
  // 查詢字串要跟著轉址走：掉了 utm 就等於掉了歸因，而歸因掉了不會有任何
  // 錯誤訊息 —— 只會看到一筆來源不明的紀錄（web/lib/attribution.ts）。
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (typeof value === "string") query.append(key, value);
    else if (Array.isArray(value)) for (const v of value) query.append(key, v);
  }
  const search = query.toString();
  redirect(localizedPath(`/demo/${STORE_DEMO_SANDBOX_SLUG}`, locale) + (search ? `?${search}` : ""));
}

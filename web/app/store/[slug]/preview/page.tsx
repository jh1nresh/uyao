import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StoreView } from "@/components/StoreView";
import { allStores, getStore } from "@/lib/data";

/**
 * 業務示範用：`/store/惠民藥局/preview` 讓藥局老闆看到「裝上盒子之後
 * 你這家店長什麼樣」。庫存是模擬的，頁面頂端一定掛示範橫幅。
 *
 * 獨立路由而不是 `?preview=1`，這樣正式頁跟預覽頁都能靜態產生。
 */
export function generateStaticParams() {
  return allStores().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = getStore(slug);
  return {
    title: store ? `${store.name} — 示範預覽` : "示範預覽",
    // 模擬庫存絕不能進搜尋引擎
    robots: { index: false, follow: false },
  };
}

export default async function StorePreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = getStore(slug);
  if (!store) notFound();
  return <StoreView store={store} preview />;
}

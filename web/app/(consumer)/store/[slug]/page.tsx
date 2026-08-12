import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StoreView } from "@/components/StoreView";
import { allStores, getStore } from "@/lib/data";
import { getRequestLocale } from "@/lib/locale-server";

export function generateStaticParams() {
  return allStores().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const store = getStore(slug);
  if (!store) {
    return {
      title: locale === "en" ? "Pharmacy not found" : "找不到這家藥局",
      robots: { index: false, follow: false },
    };
  }
  return {
    title: locale === "en" ? `${store.name} — public pharmacy record` : `${store.name}｜公開藥局資料（試營運）`,
    description: locale === "en"
      ? `${store.name}, ${store.address}. This public listing does not mean a uYao partnership or live inventory; call the pharmacy to confirm before visiting.`
      : `${store.name}，${store.address}。公開收錄不代表 uYao 合作或已有即時庫存；前往門市前請先向藥局確認。`,
    // 合作/公開權限/freshness 尚未通過 Store Page Admission Gate。
    robots: { index: false, follow: true },
  };
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = getStore(slug);
  if (!store) notFound();
  return <StoreView store={store} preview={false} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StoreView } from "@/components/StoreView";
import { allStores, getStore } from "@/lib/data";

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
  if (!store) return { title: "找不到這家藥局" };
  return {
    title: `${store.name} — ${store.address}`,
    description:
      `${store.name}，${store.address}${store.phone ? `，${store.phone}` : ""}。` +
      `${store.district}的社區藥局基本資料與營業時段。`,
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

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StoreView } from "@/components/StoreView";
import { getStore } from "@/lib/data";
import {
  STORE_DEMO_SANDBOX_SLUG,
  STORE_DEMO_SOURCE_STORE_SLUG,
} from "@/lib/store-demo";

export const metadata: Metadata = {
  title: "uYao Store 預留示範",
  description: "在獨立沙盒中示範消費者預留與 Store OS 收單流程。",
  robots: { index: false, follow: false, nocache: true },
};

export function generateStaticParams() {
  return [{ slug: STORE_DEMO_SANDBOX_SLUG }];
}

export default async function StoreDemoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (slug !== STORE_DEMO_SANDBOX_SLUG) notFound();

  const store = getStore(STORE_DEMO_SOURCE_STORE_SLUG);
  if (!store) notFound();

  return <StoreView store={store} preview />;
}

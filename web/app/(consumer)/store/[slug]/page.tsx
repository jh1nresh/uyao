import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/JsonLd";
import { StoreView } from "@/components/StoreView";
import { allStores, getStore } from "@/lib/data";
import { getRequestLocale } from "@/lib/locale-server";
import { consumerBreadcrumbJsonLd, consumerPharmacyJsonLd } from "@/lib/seo";
import { consumerIndexablePageRobots } from "@/lib/seo-server";
import { isIndexableStorePage } from "@/lib/shop-index";
import { storePageMetadata } from "@/lib/store-seo";

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
  // 藥局名是中文，`/en/store/x` 只改標題語意、canonical 仍指回中文版，
  // 不要留一份近似重複的英文副本（見 lib/shop-index.ts）。
  return storePageMetadata(
    getStore(slug),
    locale,
    isIndexableStorePage(locale)
      ? await consumerIndexablePageRobots()
      : { index: false, follow: true },
  );
}

export default async function StorePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const store = getStore(slug);
  if (!store) notFound();

  const canonicalPath = `/zh-tw/store/${store.slug}`;

  return (
    <>
      {isIndexableStorePage(locale) && (
        <JsonLd
          nodes={[
            consumerPharmacyJsonLd({
              name: store.name,
              // 同一句話，跟 meta description 與頁面上的界線文字一致。
              description: `${store.name}，${store.address}。公開收錄不代表 uYao 合作或已有即時庫存；前往門市前請先向藥局確認。`,
              path: canonicalPath,
              address: store.address,
              district: store.district,
              inLanguage: "zh-Hant-TW",
              ...(store.phone ? { telephone: store.phone.split("、")[0] } : {}),
              location:
                store.lat !== null && store.lng !== null
                  ? { lat: store.lat, lng: store.lng }
                  : null,
            }),
            consumerBreadcrumbJsonLd([
              { name: "首頁", path: "/zh-tw" },
              { name: store.name, path: canonicalPath },
            ]),
          ]}
        />
      )}
      <StoreView store={store} preview={false} />
    </>
  );
}

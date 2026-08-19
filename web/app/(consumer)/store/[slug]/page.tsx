import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/JsonLd";
import { StoreView } from "@/components/StoreView";
import { allStores, getStore } from "@/lib/data";
import { getRequestLocale } from "@/lib/locale-server";
import { consumerBreadcrumbJsonLd, consumerPharmacyJsonLd } from "@/lib/seo";
import { consumerIndexablePageRobots } from "@/lib/seo-server";
import { SHOP_URL } from "@/lib/shop";
import { isIndexableStorePage } from "@/lib/shop-index";

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
  // 藥局名是中文，`/en/store/x` 的標題跟中文版一模一樣 —— 只收中文版，
  // 英文版 canonical 指回去，不要留一份近似重複的英文副本（見 lib/shop-index.ts）。
  const canonicalUrl = `${SHOP_URL}/zh-tw/store/${store.slug}`;
  return {
    title: locale === "en" ? `${store.name} — public pharmacy record` : `${store.name}｜公開藥局資料（試營運）`,
    description: locale === "en"
      ? `${store.name}, ${store.address}. This public listing does not mean a uYao partnership or live inventory; call the pharmacy to confirm before visiting.`
      : `${store.name}，${store.address}。公開收錄不代表 uYao 合作或已有即時庫存；前往門市前請先向藥局確認。`,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        "zh-TW": canonicalUrl,
        "x-default": canonicalUrl,
      },
    },
    // 這一頁只有公開藥局資料（店名、地址、電話、營業時間、健保特約），
    // 不列任何品項或供應狀態 —— 那是一則可以被搜尋結果落地的事實記錄。
    // 收錄不代表合作：沒加入的店頁面上標「尚未加入」，也沒有預留入口。
    robots: isIndexableStorePage(locale)
      ? await consumerIndexablePageRobots()
      : { index: false, follow: true },
  };
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

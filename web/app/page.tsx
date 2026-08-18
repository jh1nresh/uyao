import type { Metadata } from "next";

import { JsonLd } from "@/components/JsonLd";
import { AgentLandingExperience } from "@/components/landing/AgentLandingExperience";
import {
  BRAND_NAME,
  organizationJsonLd,
  socialPreviewImages,
  softwareApplicationJsonLd,
  webSiteJsonLd,
} from "@/lib/seo";
import { indexablePageRobots } from "@/lib/seo-server";

const TITLE = `${BRAND_NAME}｜台灣獨立藥局的 AI Operating System`;
// SEO 稽核把 40 字的版本判成 meta description 過短。補到 80 字左右：把「訊號從哪來、
// 產出哪些工作、誰批准」寫進摘要，中文全形在 SERP 仍不會被截掉太多。
const DESCRIPTION = `${BRAND_NAME}把店內掃描、效期與附近搜尋整理成供需訊號，在 Store OS 提出退貨、減量、補貨與預留工作；高影響決定一律由藥師批准，並留下可追溯的處理紀錄。獨立藥局可申請試點。`;

export async function generateMetadata(): Promise<Metadata> {
  const images = socialPreviewImages("company", "zh");
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: {
      canonical: "/zh-tw",
      languages: { "zh-TW": "/zh-tw", en: "/en", "x-default": "/zh-tw" },
    },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      siteName: BRAND_NAME,
      locale: "zh_TW",
      type: "website",
      url: "/zh-tw",
      images: images.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
      images: images.twitter,
    },
    robots: await indexablePageRobots(),
  };
}

export default function CompanyLandingPage() {
  return (
    <>
      <JsonLd nodes={[organizationJsonLd(), webSiteJsonLd("zh"), softwareApplicationJsonLd("zh")]} />
      <AgentLandingExperience locale="zh" />
    </>
  );
}

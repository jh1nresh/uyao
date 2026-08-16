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
const DESCRIPTION = `${BRAND_NAME}主動處理獨立藥局的庫存、效期與附近需求，只把必要決策交給藥師批准。`;

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

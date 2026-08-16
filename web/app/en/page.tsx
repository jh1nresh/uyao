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

const TITLE = "uYao | The AI Operating System for Independent Pharmacies";
const DESCRIPTION =
  "uYao turns inventory, expiry, and local demand into pharmacist-approved return, reorder, and reservation workflows.";

export async function generateMetadata(): Promise<Metadata> {
  const images = socialPreviewImages("company", "en");
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: {
      canonical: "/en",
      languages: { "zh-TW": "/zh-tw", en: "/en", "x-default": "/zh-tw" },
    },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      siteName: BRAND_NAME,
      locale: "en_US",
      type: "website",
      url: "/en",
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

export default function EnglishLandingPage() {
  return (
    <>
      <JsonLd nodes={[organizationJsonLd(), webSiteJsonLd("en"), softwareApplicationJsonLd("en")]} />
      <AgentLandingExperience locale="en" />
    </>
  );
}

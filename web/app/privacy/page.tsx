import type { Metadata } from "next";

import { TrustPage, trustPageMetadata } from "@/components/landing/TrustPage";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return trustPageMetadata("/privacy");
}

export default function PrivacyPage() {
  return <TrustPage path="/privacy" />;
}

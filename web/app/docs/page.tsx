import type { Metadata } from "next";

import { TrustPage, trustPageMetadata } from "@/components/landing/TrustPage";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return trustPageMetadata("/docs");
}

export default function DocsPage() {
  return <TrustPage path="/docs" />;
}

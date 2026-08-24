import type { Metadata } from "next";
import { cookies } from "next/headers";

import { StoreOsLogin } from "@/components/StoreOsLogin";
import { StoreOsPublicContext } from "@/components/StoreOsPublicContext";
import { StoreOsShell } from "@/components/StoreOsShell";
import { JsonLd } from "@/components/JsonLd";
import { listStoreReservations } from "@/lib/reservations-store";
import { isStoreDemoSandbox } from "@/lib/store-demo";
import { webPushPublicKey } from "@/lib/store-push";
import {
  isStoreAuthConfigured,
  readStoreSessionToken,
  resolveStoreSessionIdentity,
  storeSessionCookieName,
} from "@/lib/store-auth";
import {
  BRAND_NAME,
  organizationJsonLd,
  socialPreviewImages,
  STORE_URL,
  storeOsSoftwareApplicationJsonLd,
} from "@/lib/seo";
import { storeIndexablePageRobots } from "@/lib/seo-server";

const TITLE = "uYao Store OS｜藥師授權的獨立藥局工作台";
const DESCRIPTION = "uYao Store OS 是台灣獨立藥局的試點工作台，將掃描、效期與找藥需求整理成由藥師批准並留下結果紀錄的工作。";

export async function generateMetadata(): Promise<Metadata> {
  const images = socialPreviewImages("company", "zh");
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: {
      canonical: `${STORE_URL}/`,
      types: { "text/markdown": `${STORE_URL}/` },
    },
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      siteName: BRAND_NAME,
      locale: "zh_TW",
      type: "website",
      url: `${STORE_URL}/`,
      images: images.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: DESCRIPTION,
      images: images.twitter,
    },
    manifest: "/store-os.webmanifest",
    appleWebApp: {
      capable: true,
      title: "uYao Store",
      statusBarStyle: "black-translucent",
    },
    robots: await storeIndexablePageRobots(),
  };
}

export const dynamic = "force-dynamic";

export default async function StoreOsPage() {
  const cookieStore = await cookies();
  const session = readStoreSessionToken(cookieStore.get(storeSessionCookieName())?.value);
  const identity = session ? await resolveStoreSessionIdentity(session) : null;
  if (!session || !identity) {
    return (
      <>
        <JsonLd nodes={[organizationJsonLd(), storeOsSoftwareApplicationJsonLd()]} />
        <StoreOsLogin configured={isStoreAuthConfigured()} />
        <StoreOsPublicContext />
      </>
    );
  }

  const reservations = await listStoreReservations(session.storeSlug);
  return (
    <StoreOsShell
      storeName={identity.storeName}
      storeSlug={identity.storeSlug}
      operatorName={identity.displayName}
      operatorEmail={identity.email}
      operatorRole={identity.role}
      reservations={reservations}
      demoMode={isStoreDemoSandbox(session.storeSlug)}
      webPushPublicKey={webPushPublicKey()}
    />
  );
}

import type { Metadata } from "next";
import { cookies } from "next/headers";

import { StoreOsLogin } from "@/components/StoreOsLogin";
import { StoreOsShell } from "@/components/StoreOsShell";
import { listStoreReservations } from "@/lib/reservations-store";
import { isStoreDemoSandbox } from "@/lib/store-demo";
import { webPushPublicKey } from "@/lib/store-push";
import {
  isStoreAuthConfigured,
  readStoreSessionToken,
  resolveStoreSessionIdentity,
  storeSessionCookieName,
} from "@/lib/store-auth";

export const metadata: Metadata = {
  title: "Store OS 介面原型",
  description: "uYao Store OS 的多角色藥局工作介面原型。",
  manifest: "/store-os.webmanifest",
  appleWebApp: {
    capable: true,
    title: "uYao Store",
    statusBarStyle: "black-translucent",
  },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function StoreOsPage() {
  const cookieStore = await cookies();
  const session = readStoreSessionToken(cookieStore.get(storeSessionCookieName())?.value);
  const identity = session ? await resolveStoreSessionIdentity(session) : null;
  if (!session || !identity) {
    return <StoreOsLogin configured={isStoreAuthConfigured()} />;
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

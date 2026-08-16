import type { Metadata } from "next";
import { cookies } from "next/headers";

import { StoreOsLogin } from "@/components/StoreOsLogin";
import { StoreOsShell } from "@/components/StoreOsShell";
import { listStoreReservations } from "@/lib/reservations-store";
import { isStoreDemoSandbox } from "@/lib/store-demo";
import {
  isStoreAuthConfigured,
  isStoreSessionActive,
  readStoreSessionToken,
  storeSessionCookieName,
} from "@/lib/store-auth";

export const metadata: Metadata = {
  title: "Store OS 介面原型",
  description: "uYao Store OS 的多角色藥局工作介面原型。",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default async function StoreOsPage() {
  const cookieStore = await cookies();
  const session = readStoreSessionToken(cookieStore.get(storeSessionCookieName())?.value);
  if (!session || !(await isStoreSessionActive(session))) {
    return <StoreOsLogin configured={isStoreAuthConfigured()} />;
  }

  const reservations = await listStoreReservations(session.storeSlug);
  return (
    <StoreOsShell
      storeName={session.storeSlug}
      operatorName={session.displayName}
      reservations={reservations}
      demoMode={isStoreDemoSandbox(session.storeSlug)}
    />
  );
}

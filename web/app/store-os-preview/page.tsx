import { notFound } from "next/navigation";

import { StoreOsShell } from "@/components/StoreOsShell";
import type { StoreReservationSummary } from "@/lib/reservations-store";

// Temporary dev-only visual preview for the Store OS restyle. Not linked anywhere.
export default function StoreOsPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const reservations: StoreReservationSummary[] = [
    {
      code: "A-482",
      drugName: "普拿疼 加強錠",
      drugSpec: "500mg 20 錠",
      priceTwd: 129,
      contactTail: "371",
      status: "pending_store_confirm",
      createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      confirmedAt: null,
      demo: true,
      sourceStoreName: "安心藥局",
      intake: {
        searchQuery: "頭痛 退燒",
        note: "小孩發燒 38.5,想先問有沒有兒童劑型",
      } as StoreReservationSummary["intake"],
    },
    {
      code: "A-481",
      drugName: "斯斯保肝膠囊",
      drugSpec: "60 粒",
      priceTwd: 450,
      contactTail: "208",
      status: "confirmed",
      createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
      confirmedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      demo: true,
    },
    {
      code: "A-479",
      drugName: "維他命 C 發泡錠",
      drugSpec: "20 錠",
      priceTwd: 199,
      contactTail: "664",
      status: "picked_up",
      createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      confirmedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      demo: true,
    },
    {
      code: "A-476",
      drugName: "咳嗽糖漿",
      drugSpec: "120ml",
      priceTwd: 180,
      contactTail: "052",
      status: "rejected_no_stock",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      confirmedAt: null,
      demo: true,
    },
  ];

  return (
    <StoreOsShell
      storeName="uYao 示範藥局"
      storeSlug="uyao-demo"
      operatorName="林藥師"
      operatorEmail="demo@uyaohealth.com"
      operatorRole="owner"
      reservations={reservations}
      demoMode
      webPushPublicKey={null}
    />
  );
}

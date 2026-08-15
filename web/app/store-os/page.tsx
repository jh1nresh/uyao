import type { Metadata } from "next";

import { StoreOsShell } from "@/components/StoreOsShell";

export const metadata: Metadata = {
  title: "Store OS 介面原型",
  description: "uYao Store OS 的多角色藥局工作介面原型。",
  robots: { index: false, follow: false, nocache: true },
};

export default function StoreOsPage() {
  return <StoreOsShell />;
}

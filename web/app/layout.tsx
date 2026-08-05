import type { Metadata } from "next";

import { DemoBanner } from "@/components/DemoBanner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://uyao.tw"),
  title: {
    default: "有藥 — 搜一個藥，看附近哪家藥局有貨",
    template: "%s · 有藥",
  },
  description:
    "搜藥品名或症狀，看附近藥局現在有沒有貨、多少錢，按預留到店取。庫存來自藥局店內掃描，不做線上交易。",
  openGraph: {
    siteName: "有藥",
    locale: "zh_TW",
    type: "website",
  },
  // 全站 noindex — 目前是示範資料，藥局名稱/地址/電話都是虛構的，
  // 帶著 Pharmacy JSON-LD 被 Google 索引會變成假的門市資訊。
  // 接上真實藥局資料後移除這段（藥品頁本來就是 SEO 入口）。
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant-TW">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=IBM+Plex+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="mx-auto min-h-screen max-w-[1200px] bg-white sm:border-x sm:border-line">
          <DemoBanner />
          {children}
        </div>
      </body>
    </html>
  );
}

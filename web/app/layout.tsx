import type { Metadata } from "next";

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
          {children}
        </div>
      </body>
    </html>
  );
}

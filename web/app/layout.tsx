import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";

import { DemoBanner } from "@/components/DemoBanner";
import { LocationProvider } from "@/components/LocationProvider";
import "./globals.css";

/**
 * 自架的 Noto Sans TC subset（見 scripts/subset-fonts.py）。
 * 走 Google Fonts <link> 的話，繁中字型按 unicode-range 切成上百塊，
 * 會拉進 430 個 @font-face、約 134KB gzip 的 render-blocking CSS。
 * 只包站上用到的字之後剩一個 @font-face —— 但改文案要重跑 subset。
 */
const notoSansTC = localFont({
  src: "./fonts/noto-sans-tc-var.woff2",
  weight: "100 900",
  variable: "--font-noto-sans-tc",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

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
    <html
      lang="zh-Hant-TW"
      className={`${notoSansTC.variable} ${plexMono.variable}`}
    >
      <body>
        <div className="mx-auto min-h-screen max-w-[1200px] bg-white sm:border-x sm:border-line">
          <DemoBanner />
          <LocationProvider>{children}</LocationProvider>
        </div>
      </body>
    </html>
  );
}

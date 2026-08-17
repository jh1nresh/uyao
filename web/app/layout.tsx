import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";

import { MotionSystem } from "@/components/MotionSystem";
import { LocaleProvider } from "@/components/LocaleProvider";
import { getRequestLocale } from "@/lib/locale-server";
import { PUBLIC_THEME_INIT_SCRIPT } from "@/lib/public-theme";
import { BRAND_NAME, SITE_URL } from "@/lib/seo";
import { defaultSocialPreview } from "@/lib/seo-server";

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

const notoSerifTC = localFont({
  src: "./fonts/noto-serif-tc-var.woff2",
  weight: "100 900",
  variable: "--font-noto-serif-tc",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const images = await defaultSocialPreview(locale === "en" ? "en" : "zh");
  return {
    metadataBase: new URL(SITE_URL),
    title: locale === "en"
      ? { default: "uYao — AI operating system for independent pharmacies", template: "%s · uYao" }
      : { default: `${BRAND_NAME} — 獨立藥局的供需庫存 Agent`, template: `%s · ${BRAND_NAME}` },
    description: locale === "en"
      ? "uYao turns pharmacy supply and local demand signals into pharmacist-approved work in Store OS and records the outcome."
      : `${BRAND_NAME}從店內掃描與附近搜尋取得供需訊號，在 Store OS 提出退貨、減量、補貨與預留工作，由藥師批准並記錄實際結果。`,
    openGraph: {
      siteName: BRAND_NAME,
      locale: locale === "en" ? "en_US" : "zh_TW",
      type: "website",
      images: images.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      images: images.twitter,
    },
    // 預設 noindex：只有 SEO v1 白名單頁面自己 override 成
    // indexablePageRobots()（production canonical host 才 index）。
    // 消費端 demo 資料頁在 consumer SEO spec 完成前一律不收錄。
    robots: { index: false, follow: false },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
      other: {
        "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
          ?? "F95D60E665CD0E86D0952E5E21050752",
      },
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();
  return (
    <html
      lang={locale === "en" ? "en-US" : "zh-Hant-TW"}
      className={`${notoSansTC.variable} ${notoSerifTC.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PUBLIC_THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <MotionSystem />
        <LocaleProvider locale={locale}>
          <div className="min-h-screen bg-ivory">{children}</div>
        </LocaleProvider>
      </body>
    </html>
  );
}

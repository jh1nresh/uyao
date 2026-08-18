import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { Analytics } from "@/components/Analytics";
import { AttributionCapture } from "@/components/AttributionCapture";
import { MotionSystem } from "@/components/MotionSystem";
import { LocaleProvider } from "@/components/LocaleProvider";
import { getRequestLocale } from "@/lib/locale-server";
import { PUBLIC_THEME_INIT_SCRIPT } from "@/lib/public-theme";
import { BRAND_NAME, SITE_URL } from "@/lib/seo";
import { defaultSocialPreview } from "@/lib/seo-server";

import "./globals.css";

/**
 * 自架的 Noto Sans TC／Noto Serif TC subset（見 scripts/subset-fonts.py）。
 * 走 Google Fonts <link> 的話，繁中字型按 unicode-range 切成上百塊，
 * 會拉進 430 個 @font-face、約 134KB gzip 的 render-blocking CSS。
 * 只包站上用到的字之後剩幾個 @font-face —— 但改文案要重跑 subset。
 *
 * 每個家族切成 core / ext 兩塊：core 是公司首頁那條路徑上的 478 個字，ext 是
 * 其餘全站字符（藥名、藥局名、guides 內文）。globals.css 把兩者串成 fallback
 * chain，瀏覽器只有在頁面真的需要某個字時才去抓對應的檔，所以首頁只付 core
 * 的 204KB，而不是整包 660KB。
 *
 * core 關掉 adjustFontFallback：next/font 會在 CSS 變數裡塞一個
 * 「<family> Fallback」的本機字型，那個 face 排在 ext 前面就可能先接走 CJK，
 * 讓 ext 永遠不被下載。度量補償留給 chain 最後的 ext 做。
 */
const notoSansTC = localFont({
  src: "./fonts/noto-sans-tc-core.woff2",
  weight: "100 900",
  variable: "--font-noto-sans-tc",
  display: "swap",
  adjustFontFallback: false,
});

const notoSansTCExt = localFont({
  src: "./fonts/noto-sans-tc-ext.woff2",
  weight: "100 900",
  variable: "--font-noto-sans-tc-ext",
  display: "swap",
  // 首頁用不到，絕對不要 preload 進關鍵路徑。
  preload: false,
});

/**
 * serif 只服務 globals.css 的 .editorial-display（font-weight: 600），是
 * `--font-serif` 唯一的使用者，所以 subset 之後再把 wght 軸固定成 600：
 * 少掉整張 delta 表，同樣字符集少一半體積。
 */
const notoSerifTC = localFont({
  src: "./fonts/noto-serif-tc-core.woff2",
  weight: "600",
  variable: "--font-noto-serif-tc",
  display: "swap",
  adjustFontFallback: false,
});

const notoSerifTCExt = localFont({
  src: "./fonts/noto-serif-tc-ext.woff2",
  weight: "600",
  variable: "--font-noto-serif-tc-ext",
  display: "swap",
  preload: false,
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
      className={`${notoSansTC.variable} ${notoSansTCExt.variable} ${notoSerifTC.variable} ${notoSerifTCExt.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: PUBLIC_THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <MotionSystem />
        <AttributionCapture />
        <LocaleProvider locale={locale}>
          <div className="min-h-screen bg-ivory">{children}</div>
        </LocaleProvider>
        {/*
          Core Web Vitals（LCP/CLS/INP/FCP/TTFB）真實使用者量測。
          AEO v1 的 live-evidence gate 要看部署後的實際數字，
          在此之前站上沒有任何 RUM 訊號。beacon 走 Vercel 同源
          /_vercel/speed-insights，不引入第三方 analytics domain。
        */}
        <SpeedInsights />
        {/*
          廣告轉換量測。設了 NEXT_PUBLIC_GA4_ID / NEXT_PUBLIC_META_PIXEL_ID
          才會輸出——上面那句「不引入第三方 analytics domain」在沒設 ID 時
          依然成立（specs/ads-launch-v1.md §8）。
        */}
        <Analytics />
      </body>
    </html>
  );
}

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
 * 全站字符切成六塊互斥的 slice：core（公司首頁）、common（跨 surface 的
 * chrome 與共用字）、guides、stores（藥局名與地址）、shop（藥品目錄）、
 * storeos。globals.css 把它們串成 fallback chain，瀏覽器逐字往後找，缺字
 * 才會去抓下一塊。實測每頁抓到的量：
 *
 *   /zh-tw 221KB ／ /zh-tw/guides/* 427KB ／ /zh-tw/evidence 450KB
 *   （切之前一律 738KB；數字含 IBM Plex Mono 的 20KB）
 *
 * 這裡刻意不加 unicode-range。加了之後 Chrome 會改成「範圍有交集就抓」，
 * 連沒有 render 的文字（JSON-LD、prefetch 的內容）都算進去，首頁反而從
 * 201KB 變成 430KB —— 交給預設的「缺字才往下找」比較準。
 *
 * 除了 chain 最後一塊之外都關掉 adjustFontFallback：next/font 會在 CSS 變數
 * 裡塞一個「<family> Fallback」的本機字型，那個 face 排在後面的 slice 前面就
 * 可能先接走 CJK，讓後面的檔永遠不被下載。度量補償留給 chain 最後的 storeos。
 * 非 core 的 slice 一律 preload: false —— 首頁用不到，不能進關鍵路徑。
 */
const notoSansTC = localFont({
  src: "./fonts/noto-sans-tc-core.woff2",
  weight: "100 900",
  variable: "--font-noto-sans-tc",
  display: "swap",
  adjustFontFallback: false,
});

const notoSansTCCommon = localFont({
  src: "./fonts/noto-sans-tc-common.woff2",
  weight: "100 900",
  variable: "--font-noto-sans-tc-common",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
});

const notoSansTCGuides = localFont({
  src: "./fonts/noto-sans-tc-guides.woff2",
  weight: "100 900",
  variable: "--font-noto-sans-tc-guides",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
});

const notoSansTCStores = localFont({
  src: "./fonts/noto-sans-tc-stores.woff2",
  weight: "100 900",
  variable: "--font-noto-sans-tc-stores",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
});

const notoSansTCShop = localFont({
  src: "./fonts/noto-sans-tc-shop.woff2",
  weight: "100 900",
  variable: "--font-noto-sans-tc-shop",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
});

const notoSansTCStoreOs = localFont({
  src: "./fonts/noto-sans-tc-storeos.woff2",
  weight: "100 900",
  variable: "--font-noto-sans-tc-storeos",
  display: "swap",
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

const notoSerifTCCommon = localFont({
  src: "./fonts/noto-serif-tc-common.woff2",
  weight: "600",
  variable: "--font-noto-serif-tc-common",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
});

const notoSerifTCGuides = localFont({
  src: "./fonts/noto-serif-tc-guides.woff2",
  weight: "600",
  variable: "--font-noto-serif-tc-guides",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
});

const notoSerifTCStores = localFont({
  src: "./fonts/noto-serif-tc-stores.woff2",
  weight: "600",
  variable: "--font-noto-serif-tc-stores",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
});

const notoSerifTCShop = localFont({
  src: "./fonts/noto-serif-tc-shop.woff2",
  weight: "600",
  variable: "--font-noto-serif-tc-shop",
  display: "swap",
  adjustFontFallback: false,
  preload: false,
});

const notoSerifTCStoreOs = localFont({
  src: "./fonts/noto-serif-tc-storeos.woff2",
  weight: "600",
  variable: "--font-noto-serif-tc-storeos",
  display: "swap",
  preload: false,
});

const FONT_VARIABLES = [
  notoSansTC,
  notoSansTCCommon,
  notoSansTCGuides,
  notoSansTCStores,
  notoSansTCShop,
  notoSansTCStoreOs,
  notoSerifTC,
  notoSerifTCCommon,
  notoSerifTCGuides,
  notoSerifTCStores,
  notoSerifTCShop,
  notoSerifTCStoreOs,
]
  .map((font) => font.variable)
  .join(" ");

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
    // Bing 有已驗證的預設值，Google 沒有：GSC 的 tag 是每個資源不同的
    // 一次性字串，沒有可以寫死的值。線上沒有 google-site-verification meta
    // 是正常的 —— uyaohealth.com 走 DNS TXT 驗證（見 .env.example），
    // 不要因為「看起來少一個 meta」就去補一個假值。
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
      className={`${FONT_VARIABLES} ${plexMono.variable}`}
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

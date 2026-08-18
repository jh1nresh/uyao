import Script from "next/script";

import { GA4_ID, META_PIXEL_ID } from "@/lib/analytics";

/**
 * GA4 與 Meta Pixel。
 *
 * **沒設 ID 就整段不輸出。** 站上在此之前只有同源的 Vercel Speed Insights，
 * 沒有任何第三方 analytics 網域；這個決定不該因為「先掛著之後再說」被推翻。
 * 要開量測就在環境變數填 ID，要關就清掉——沒有第三種狀態。
 *
 *   NEXT_PUBLIC_GA4_ID         G-XXXXXXXXXX
 *   NEXT_PUBLIC_META_PIXEL_ID  數字 pixel id
 *
 * 兩者都會寫第一方 cookie，這是它們運作的前提。消費端被動記錄那條路
 * （/api/demand + sessionStorage 歸因）不依賴這裡，關掉量測也照常運作。
 */
export function Analytics() {
  if (!GA4_ID && !META_PIXEL_ID) return null;

  return (
    <>
      {GA4_ID && (
        <>
          <Script
            id="ga4-src"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA4_ID}');`}
          </Script>
        </>
      )}

      {META_PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}

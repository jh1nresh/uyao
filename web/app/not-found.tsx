import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getRequestLocale } from "@/lib/locale-server";

export default async function NotFound() {
  const locale = await getRequestLocale();
  return (
    <>
      <SiteHeader />
      <section className="px-4 pb-10 pt-10 sm:px-7 xl:px-12 2xl:px-16">
        <h1 className="mb-2 text-lg font-black">{locale === "en" ? "Page not found" : "找不到這個頁面"}</h1>
        <p className="text-[15px] text-muted">
          {locale === "en"
            ? "This URL is not a uYao page. uYao does not publish live stock and does not diagnose."
            : "這個網址不是 uYao 的頁面。本站不提供即時庫存，也不做診斷。"}
        </p>
        <ul className="mt-4 flex flex-col items-start gap-2 text-[15px]">
          <li><Link href="/" className="text-green">Home</Link></li>
          <li><Link href="/about" className="text-green">About</Link></li>
          <li><Link href="/contact" className="text-green">Contact</Link></li>
          <li><Link href="/docs" className="text-green">Docs</Link></li>
          <li><Link href="/llms.txt" className="text-green">llms.txt</Link></li>
          <li><Link href="/sitemap.xml" className="text-green">Sitemap</Link></li>
        </ul>
      </section>
      <SiteFooter />
    </>
  );
}

import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { SHOP_URL } from "@/lib/shop";

export default async function NotFound() {
  const locale = await getRequestLocale();
  return (
    <>
      <SiteHeader />
      <section className="px-4 pb-10 pt-10 sm:px-7 xl:px-12 2xl:px-16">
        <h1 className="mb-2 text-lg font-black">{locale === "en" ? "Page not found" : "找不到這個頁面"}</h1>
        <p className="text-[15px] text-muted">
          {locale === "en" ? "This product or pharmacy may no longer be listed." : "品項或藥局可能已下架。"}
          <Link href={`${SHOP_URL}${localizedPath("/", locale)}`} className="ml-1 text-green">
            {locale === "en" ? "Back to search →" : "回到搜尋 →"}
          </Link>
        </p>
      </section>
      <SiteFooter />
    </>
  );
}

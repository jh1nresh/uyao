import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <section className="px-4 pb-10 pt-10 sm:px-7 xl:px-12 2xl:px-16">
        <h1 className="mb-2 text-lg font-black">找不到這個頁面</h1>
        <p className="text-[15px] text-muted">
          品項或藥局可能已下架。
          <Link href="/find" className="ml-1 text-green">
            回到搜尋 →
          </Link>
        </p>
      </section>
      <SiteFooter />
    </>
  );
}

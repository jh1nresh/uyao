import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "藥局登入",
  robots: { index: false, follow: false },
};

/**
 * 藥局後台不在消費端 v1 範圍內（預留確認走藥局端 LINE bot）。
 * 這頁只是 header 連結的落點 + 合作洽詢入口。
 */
export default function PharmacyLoginPage() {
  return (
    <>
      <SiteHeader showSearch={false} />

      <section className="max-w-[520px] px-4 pb-8 pt-8 sm:px-7">
        <h1 className="mb-2 text-lg font-black">藥局登入</h1>
        <p className="mb-4 text-[13px] leading-[1.7] text-muted">
          目前預留確認走藥局端 LINE bot：消費者送出預留後，你在 LINE
          按確認即可，不需要另外登入後台。庫存與效期由盒子自動同步，掃描流程不用改。
        </p>
        <div className="border border-line px-4 py-3.5 text-[13px] leading-[1.7] text-ink-2">
          <div className="font-bold text-ink">想讓自家藥局出現在搜尋結果？</div>
          來信 <span className="num">hello@uyao.tw</span>，附上藥局名稱與所在區域。
        </div>
        <p className="mt-4 text-[11.5px] text-muted-2">
          <Link href="/" className="text-green">
            ← 回到搜尋
          </Link>
        </p>
      </section>

      <SiteFooter />
    </>
  );
}

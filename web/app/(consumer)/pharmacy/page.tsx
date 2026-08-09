import type { Metadata } from "next";
import Link from "next/link";

import { PilotForm } from "@/components/PilotForm";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "我是藥局",
  description:
    "效期雷達：快過退貨期限的品項提前 30 天提醒，過期藥從丟錢變退回藥商。一個盒子串在現有條碼掃描器上，掃描流程不用改。",
};

const STATS = [
  { value: "30", unit: "天前", label: "退貨窗口關掉前主動警報" },
  { value: "0", unit: "改變", label: "現有掃描流程不動" },
  { value: "5", unit: "分鐘", label: "裝上就開始" },
];

export default function PharmacyPage() {
  return (
    <>
      <SiteHeader showSearch={false} />

      <section className="max-w-[720px] px-4 pb-8 pt-7 sm:px-7 xl:px-12 2xl:px-16 sm:pt-10">
        <p className="mb-2 text-[13px] font-medium tracking-[.08em] text-green">給藥局主</p>
        <h1 className="m-0 text-xl font-black leading-[1.45] tracking-[.01em] sm:text-[26px]">
          過期藥不該是丟錢，還要再付清運費
        </h1>
        <p className="mt-2.5 text-[15px] leading-[1.75] text-muted">
          效期雷達 — 快過退貨期限的品項，在窗口關掉前主動提醒你。
          過期藥從「丟錢 + 付清運費」變成「退回藥商」。
        </p>

        <div className="mt-7 grid gap-x-6 gap-y-5 sm:grid-cols-3">
          {STATS.map((s) => (
            <div key={s.label} className="border-t-2 border-green pt-3">
              <div className="flex items-baseline gap-1.5">
                <span className="num text-[30px] font-black leading-none text-ink">
                  {s.value}
                </span>
                <span className="text-[16px] font-black text-ink">{s.unit}</span>
              </div>
              <div className="mt-2 text-xs leading-[1.5] text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface px-4 py-7 sm:px-7 xl:px-12 2xl:px-16">
        <div className="max-w-[720px]">
          <h2 className="mb-3 text-sm font-black">盒子做什麼</h2>
          <p className="text-[15px] leading-[1.8] text-ink-2">
            一個小盒子串在你現有的條碼掃描器和電腦之間。對電腦來說它就是原本那支掃描器，
            進貨、調劑照掃，<b className="text-ink">店內流程一個字都不用改</b>。
            盒子在旁邊把每批藥的效期記下來 —— 快過退貨期限就用 LINE 直接提醒你。
          </p>
        </div>
      </section>

      <section className="px-4 py-7 sm:px-7 xl:px-12 2xl:px-16">
        <div className="max-w-[720px]">
          <h2 className="mb-3 text-sm font-black">順便被附近的人搜到</h2>
          <p className="mb-3 text-[15px] leading-[1.8] text-ink-2">
            同一批掃描紀錄會變成你店裡的現貨狀態。附近的人搜一個藥，看到你這裡
            {/* 內文連結加底線：只靠綠色跟周圍文字的對比不到 3:1，色盲看不出是連結 */}
            <Link href="/stock-badges" className="mx-1 text-green underline underline-offset-2">
              今日掃描確認
            </Link>
            就會按預留、到店付款取貨 —— 不是網購，藥師照樣當面交付。
          </p>
          <p className="text-[13px] leading-[1.7] text-muted-2">
            我們永遠不顯示確切數量，只顯示掃描新鮮度。
            <Link href="/app" className="ml-1 text-green underline underline-offset-2">
              看消費端長什麼樣 →
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-line px-4 py-7 sm:px-7 xl:px-12 2xl:px-16">
        <div className="max-w-[720px]">
          <h2 className="mb-1 text-sm font-black">申請免費試點</h2>
          <p className="mb-3.5 text-[13px] text-muted-2">
            我們帶盒子到店裡接上，現場大約 5 分鐘。
          </p>
          <PilotForm />
        </div>
      </section>

      <section className="border-t border-line px-4 py-6 sm:px-7 xl:px-12 2xl:px-16">
        <div className="max-w-[720px] border border-line px-4 py-3.5 text-[15px] leading-[1.7] text-ink-2">
          <div className="mb-1 font-bold text-ink">已經是合作藥局？</div>
          預留確認走藥局端 LINE bot：消費者送出預留後，你在 LINE 按確認即可，
          不需要另外登入後台。庫存與效期由盒子自動同步。
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

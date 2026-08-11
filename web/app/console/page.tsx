import type { Metadata } from "next";
import Link from "next/link";

import { PickupAutoRefresh } from "@/components/PickupAutoRefresh";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { recentEvents, scanSummary } from "@/lib/box";
import { BADGE_COLOR } from "@/lib/stock";
import { allStores, getDrug } from "@/lib/data";
import { drugCopy, localizedPath, stockCopy, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";

/**
 * Agent Console —— 把系統自主做的每一個決定攤開來看。
 *
 * 給兩種人看的：demo 時給投資人／藥局看「掃描進來之後發生了什麼」，
 * 平常給我們自己看系統有沒有在動。這一頁**只讀不寫**，而且每一行都對應
 * 一件真的發生過的事 —— 不是動畫，是 log。
 *
 * 不放個資：流水裡只有取貨碼、藥名、店名。手機號碼在寫入端就擋掉了。
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Agent Console",
  robots: { index: false, follow: false, nocache: true },
};

function fmtTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleTimeString(locale === "en" ? "en-US" : "zh-TW", {
    hour12: false,
    timeZone: "Asia/Taipei",
  });
}

function fmtDay(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-US" : "zh-TW", {
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Taipei",
  });
}

export default async function ConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const locale = await getRequestLocale();
  // 流水裡有真單的取貨碼與店名 —— 設了 CONSOLE_KEY 就要帶 ?key= 才看得到。
  // 沒設就開放（本機開發、純示範環境）。這不是高強度防護，是把「路人
  // 順手看到營運資料」擋掉；正式營運要換成真登入。
  const gate = process.env.CONSOLE_KEY;
  if (gate && (await searchParams).key !== gate) {
    return (
      <>
        <SiteHeader showSearch={false} />
        <section className="px-4 py-10 sm:px-7 xl:px-12 2xl:px-16">
          <h1 className="mb-2 text-lg font-black">{locale === "en" ? "Access key required" : "這一頁需要鑰匙"}</h1>
          <p className="text-[15px] leading-[1.7] text-muted">
            {locale === "en" ? "The Agent Console contains operating data. Open it with an authorized key." : "Agent Console 含營運資料，請用帶 key 的網址開啟。"}
          </p>
        </section>
        <SiteFooter />
      </>
    );
  }

  const [events, scans] = await Promise.all([recentEvents(120), scanSummary()]);
  const storeName = (slug: string) =>
    allStores().find((s) => s.slug === slug)?.name ?? slug;

  return (
    <>
      <SiteHeader showSearch={false} />
      <PickupAutoRefresh />

      <section className="px-4 pb-8 pt-7 sm:px-7 xl:px-12 2xl:px-16">
        <p className="mb-2 text-[13px] font-medium tracking-[.08em] text-green">
          AGENT CONSOLE
        </p>
        <h1 className="m-0 text-xl font-black leading-[1.45] sm:text-[26px]">
          {locale === "en" ? "What the system did after a receiving scan" : "掃描進來之後，系統自己做了什麼"}
        </h1>
        <p className="mt-2.5 max-w-[640px] text-[15px] leading-[1.75] text-muted">
          {locale === "en" ? "This is an internal, read-only system trace—not a pharmacy dashboard. Each row is a recorded event: a receiving scan refreshed an availability signal, a reservation was routed to LINE, or a timed workflow advanced. Pharmacies act in LINE. This page refreshes every 15 seconds." : "這是內部唯讀的系統流水，不是藥局需要學習的新後台。每一行都是實際發生的事件：進貨掃描更新供應訊號、預留單路由到藥局 LINE，或逾時流程推進。藥局仍在 LINE 操作；本頁每 15 秒更新。"}
        </p>
      </section>

      {/* ── 庫存訊號現況 ── */}
      <section className="border-t border-line px-4 py-6 sm:px-7 xl:px-12 2xl:px-16">
        <h2 className="mb-3 text-[15px] font-black">{locale === "en" ? "Receiving signals" : "進貨訊號現況"}</h2>
        {scans.length === 0 ? (
          <p className="text-[14px] leading-[1.7] text-muted">
            {locale === "en" ? "No receiving scans yet. Run setup/demo-sim.sh or connect a box." : "還沒有任何進貨掃描。跑一次 setup/demo-sim.sh 或等盒子上線。"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full max-w-[720px] border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-line-strong text-left text-[12px] text-muted-2">
                  <th className="py-2 pr-4 font-medium">{locale === "en" ? "Pharmacy" : "藥局"}</th>
                  <th className="py-2 pr-4 font-medium">{locale === "en" ? "Item" : "品項"}</th>
                  <th className="py-2 pr-4 font-medium">{locale === "en" ? "Latest receiving scan" : "最後進貨掃描"}</th>
                  <th className="py-2 font-medium">{locale === "en" ? "Consumer signal" : "消費端顯示"}</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((r) => (
                  <tr
                    key={`${r.storeSlug}:${r.drugSlug}`}
                    className="border-b border-line-soft"
                  >
                    <td className="py-2.5 pr-4">{storeName(r.storeSlug)}</td>
                    <td className="py-2.5 pr-4">
                      {getDrug(r.drugSlug) ? drugCopy(getDrug(r.drugSlug)!, locale).name : r.drugSlug}
                    </td>
                    <td className="num py-2.5 pr-4 text-muted">
                      {fmtDay(r.lastScanAt, locale)} {fmtTime(r.lastScanAt, locale)}
                    </td>
                    <td className={`py-2.5 font-bold ${BADGE_COLOR[r.badge.tier]}`}>
                      {stockCopy(r.badge, locale).char} {stockCopy(r.badge, locale).text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 決策流水 ── */}
      <section className="border-t border-line bg-surface px-4 py-6 sm:px-7 xl:px-12 2xl:px-16">
        <h2 className="mb-3 text-[15px] font-black">{locale === "en" ? "Decision trace" : "決策流水"}</h2>
        {events.length === 0 ? (
          <p className="text-[14px] leading-[1.7] text-muted">{locale === "en" ? "No events yet." : "目前沒有事件。"}</p>
        ) : (
          <ol className="m-0 max-w-[720px] list-none p-0">
            {events.map((e, i) => (
              <li
                key={`${e.at}-${i}`}
                className="flex gap-3 border-b border-line-soft py-2 text-[14px] leading-[1.6]"
              >
                <span className="num shrink-0 text-[13px] text-muted-2">
                  {fmtDay(e.at, locale)} {fmtTime(e.at, locale)}
                </span>
                <span className="shrink-0">{e.icon}</span>
                <span className="text-ink">{locale === "en" ? e.msgEn ?? "Legacy event. Reset the demo to regenerate this trace in English." : e.msg}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="border-t border-line px-4 py-5 sm:px-7 xl:px-12 2xl:px-16">
        <p className="text-[13px] leading-[1.7] text-muted-2">
          {locale === "en" ? "Read-only · No personal data · " : "唯讀頁面 · 不含任何個資 · "}
          <Link href={localizedPath("/app", locale)} className="text-green">
            {locale === "en" ? "Back to search →" : "回到搜尋 →"}
          </Link>
        </p>
      </section>

      <SiteFooter />
    </>
  );
}

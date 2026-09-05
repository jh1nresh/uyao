import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "@/components/CommerceAgent.module.css";
import { localizedPath } from "@/lib/i18n";

import { CommerceAgent } from "@/components/CommerceAgent";
import { SearchInput } from "@/components/SearchInput";
import { SiteHeader } from "@/components/SiteHeader";
import { toAreaSlug } from "@/lib/data";
import { getRequestLocale } from "@/lib/locale-server";
import { RESERVATION_INTAKE_QUERY_MAX } from "@/lib/reservation-intake";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return {
    title: "uYao Agent",
    description: locale === "en"
      ? "Ask uYao Agent to search grounded trial-catalog records before a pharmacist confirms the next step."
      : "讓 uYao Agent 查詢有來源的試營運目錄，再由藥師確認下一步。",
    robots: { index: false, follow: true },
  };
}

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; draft?: string; area?: string }>;
}) {
  const { q: rawQuery, draft: rawDraft, area: rawArea } = await searchParams;
  const locale = await getRequestLocale();
  const initialQuery = (rawQuery ?? "").trim().slice(0, RESERVATION_INTAKE_QUERY_MAX);
  const initialDraft = (rawDraft ?? "").slice(0, RESERVATION_INTAKE_QUERY_MAX);
  const area = toAreaSlug(rawArea);
  const english = locale === "en";

  const examples = english
    ? [["Elgucare", "益固康"], ["Calcium supplements", "補鈣"], ["Vitamin B", "維他命B群"]]
    : [["益固康 Elgucare", "益固康"], ["想找補鈣品項", "補鈣"], ["維他命 B 群", "維他命B群"]];

  return (
    <div className="uyao-consumer-world uyao-agent-shell min-h-[100dvh] text-ink">
      <SiteHeader showSearch={false} showTagline={false} tone="cabinet" area={area} activeWorkspace="agent" />
      <main className={initialQuery ? styles.conversation : styles.workspace}>
        {initialQuery ? (
          <>
            <div className={styles.toolbar}>
              <span className="shop-kicker">{english ? "CATALOG CONVERSATION" : "藥櫃裡的對話"}</span>
              <Link href={`${localizedPath("/agent", locale)}?area=${area}`} className="inline-flex min-h-11 items-center text-sm text-forest">
                {english ? "New question ↗" : "重新提問 ↗"}
              </Link>
            </div>
            <CommerceAgent initialQuery={initialQuery} area={area} locale={locale} />
          </>
        ) : (
          <>
            <section className={styles.welcome}>
              <p className="shop-kicker m-0">uYao Agent · {english ? "AT THE COUNTER" : "先查資料，再問藥師"}</p>
              <h1 className={styles.heading}>{english ? "A place to start your question." : "想找的品項，先說給 uYao 聽。"}</h1>
              <p className={styles.intro}>
                {english
                  ? "Start with a product name, ingredient, or everyday wellness need. Browse the sources, then confirm the next step with a pharmacist."
                  : "從品名、成分或日常保養需求開始。一起看目錄、核對來源，再由藥師確認下一步。"}
              </p>
              <div className={styles.entry}>
                <SearchInput key={initialDraft} defaultValue={initialDraft} size="lg" area={area} autoFocus={Boolean(initialDraft)} presentation="agent" resultsPath="/agent" submitLabel={english ? "Ask uYao" : "問 uYao"} className="uyao-agent-composer w-full" />
                <p className="mb-0 mt-3 text-xs leading-relaxed text-muted-2">
                  {english ? "Do not enter names, phone numbers, National Health Insurance data, or prescription details." : "請勿輸入姓名、電話、健保或處方資料。"}
                </p>
              </div>
              <div className={styles.examples}>
                <p className="m-0 text-xs text-muted-2">{english ? "TRY A STARTING POINT" : "也可以從這裡開始"}</p>
                {examples.map(([label, query]) => (
                  <Link key={query} href={`${localizedPath("/agent", locale)}?${new URLSearchParams({ draft: query, area })}`} className={styles.example}>
                    <span>{label}</span><span aria-hidden>↗</span>
                  </Link>
                ))}
              </div>
            </section>
            <aside className={styles.aside}>
              <Image src="/products/shelf-scenes-v2/greenplus-elgucare.webp" alt={english ? "Illustrated Elgucare product on a wooden shelf" : "木架上的益固康商品示意圖"} width={1200} height={800} sizes="(min-width: 900px) 360px, 90vw" className={styles.shelf} />
              <p className="mb-5 mt-2 text-xs text-muted-2">{english ? "Product illustration; refer to actual packaging." : "商品示意，包裝以實品為準。"}</p>
              <h2 className="editorial-display m-0 text-2xl text-forest">{english ? "From a question to a next step." : "從問題，到有依據的下一步。"}</h2>
              <ol className={styles.steps}>
                <li><span>01</span><div><strong>{english ? "Look through the catalog" : "查目錄"}</strong><p>{english ? "Find names, ingredients and their sources." : "找到品名、成分和對應來源。"}</p></div></li>
                <li><span>02</span><div><strong>{english ? "Find a pharmacy contact" : "找聯絡方式"}</strong><p>{english ? "See partner pharmacy details for the item." : "查看該品項的合作藥局資料。"}</p></div></li>
                <li><span>03</span><div><strong>{english ? "Confirm with a pharmacist" : "再由藥師確認"}</strong><p>{english ? "Supply, price and suitability require confirmation." : "供應、價格與適用性，都需要確認。"}</p></div></li>
              </ol>
              <Link href={`${localizedPath("/", locale)}?area=${area}#catalog`} className="inline-flex min-h-11 items-center text-sm font-semibold text-forest">{english ? "Browse the cabinet →" : "先逛藥櫃 →"}</Link>
            </aside>
          </>
        )}
      </main>
    </div>
  );
}

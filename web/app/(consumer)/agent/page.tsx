import type { Metadata } from "next";
import styles from "@/components/CommerceAgent.module.css";

import { CommerceAgent } from "@/components/CommerceAgent";
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

  return (
    <div className={`uyao-consumer-world uyao-agent-shell text-ink ${styles.shell}`}>
      <SiteHeader showSearch={false} showTagline={false} tone="cabinet" area={area} activeWorkspace="agent" />
      <main className={styles.conversation}>
        <CommerceAgent key={`${initialQuery}:${initialDraft}`} initialQuery={initialQuery} initialDraft={initialDraft} area={area} locale={locale} />
      </main>
    </div>
  );
}

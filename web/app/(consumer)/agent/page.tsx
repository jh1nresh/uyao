import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/BrandMark";
import { CommerceAgent } from "@/components/CommerceAgent";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { SearchInput } from "@/components/SearchInput";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toAreaSlug } from "@/lib/data";
import { localizedPath } from "@/lib/i18n";
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

  return (
    <div className="uyao-agent-shell min-h-[100dvh] text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-md">
        <div className="mx-auto grid h-16 w-full max-w-[880px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:gap-4 sm:px-6">
          <Link
            href={localizedPath("/", locale)}
            aria-label={english ? "Back to uYao homepage" : "回到 uYao 首頁"}
            className="flex min-h-11 items-center gap-2 text-[15px] font-bold text-ink no-underline"
          >
            <BrandMark size={30} />
            <span className="hidden sm:inline">uYao</span>
          </Link>

          <nav
            aria-label={english ? "uYao destinations" : "uYao 主要導覽"}
            className="flex h-full items-stretch justify-center"
          >
            <Link
              href={localizedPath("/", locale)}
              className="inline-flex min-h-11 items-center border-b-2 border-transparent px-3 text-[13px] font-semibold text-muted no-underline transition-colors hover:border-line-strong hover:text-ink sm:px-4"
            >
              Shop
            </Link>
            <span
              aria-current="page"
              className="inline-flex min-h-11 items-center border-b-2 border-forest px-3 text-[13px] font-bold text-forest sm:px-4"
            >
              Agent
            </span>
          </nav>

          <div className="flex items-center justify-self-end gap-1 sm:gap-2">
            <ThemeToggle locale={locale} />
            <LanguageSwitch />
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-[880px] flex-col px-3 sm:px-6">
        {initialQuery ? (
          <CommerceAgent initialQuery={initialQuery} area={area} locale={locale} />
        ) : (
          <section className="flex min-h-[calc(100dvh-4rem)] flex-1 flex-col py-5 sm:py-7">
            <div className="mx-auto my-auto w-full max-w-[680px] px-1 pb-16 sm:pb-20">
              <h1 className="text-balance text-[30px] font-semibold leading-[1.25] sm:text-[36px]">
                {english ? "What are you looking for?" : "今天想找什麼？"}
              </h1>
              <p className="mb-0 mt-3 max-w-[48ch] text-pretty text-[15px] leading-[1.7] text-muted">
                {english
                  ? "uYao Agent checks catalog sources. A pharmacist still confirms supply, price, and suitability."
                  : "uYao Agent 只查目錄與來源；供應、價格與適用性仍由藥師確認。"}
              </p>
            </div>

            <div className="sticky bottom-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <SearchInput
                defaultValue={initialDraft}
                size="lg"
                area={area}
                autoFocus={Boolean(initialDraft)}
                presentation="agent"
                resultsPath="/agent"
                submitLabel={english ? "Send" : "送出"}
                className="uyao-agent-composer w-full"
              />
              <p className="mb-0 mt-2 px-3 text-pretty text-[12px] leading-[1.55] text-muted-2">
                {english
                  ? "Do not enter names, phone numbers, National Health Insurance data, or prescription details."
                  : "請勿輸入姓名、電話、健保或處方資料。"}
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

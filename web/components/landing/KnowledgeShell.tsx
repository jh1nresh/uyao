import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { CompanyFooter } from "@/components/landing/CompanyFooter";
import { localizedPath, type Locale } from "@/lib/i18n";

/**
 * SEO/GEO/AEO 知識頁（/evidence、/guides/*、/compare/*）共用外框
 * （spec: company-landing-page-seo-geo-v1.md §4–5）。沿用公司 landing
 * 的視覺系統，不另起 design；主 CTA 固定一個：申請試點。
 */
export function KnowledgeShell({
  kicker,
  children,
  locale = "zh",
}: {
  /** 頁面種類標籤，例：藥局營運指南、產品證據。 */
  kicker: string;
  children: React.ReactNode;
  locale?: Locale;
}) {
  const homeHref = localizedPath("/", locale);

  return (
    <div className="min-w-[320px] bg-ivory text-ink">
      <nav className="sticky top-0 z-50 border-b border-line-strong bg-ivory">
        <div className="mx-auto flex h-[64px] max-w-[880px] items-center justify-between gap-5 px-5 sm:px-8">
          <Link href={homeHref} className="flex min-h-11 flex-none items-center no-underline">
            <BrandLogo height={32} />
          </Link>
          <div className="flex items-center gap-4 text-[14.5px] sm:gap-6">
            <Link
              href={localizedPath("/evidence", locale)}
              className="hidden min-h-11 items-center text-ink no-underline hover:text-green sm:inline-flex"
            >
              {locale === "en" ? "Product evidence" : "產品證據"}
            </Link>
            <Link href={localizedPath("/pharmacy", locale)} className="action-primary text-[14.5px]">
              {locale === "en" ? "Join the pilot" : "申請試點"}
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-[880px] px-5 py-12 sm:px-8 sm:py-16">
        <p className="num m-0 mb-4 text-[12px] font-semibold tracking-[.14em] text-oxblood">
          <Link href={homeHref} className="text-oxblood no-underline hover:text-green">
            uYao
          </Link>
          {" › "}
          {kicker}
        </p>
        {children}
      </main>

      <CompanyFooter locale={locale} />
    </div>
  );
}

/** Guide 頁固定顯示的內容出處欄位（spec §5 content provenance）。 */
export function ProvenanceBox({
  fields,
  locale = "zh",
}: {
  fields: { label: string; value: React.ReactNode }[];
  locale?: Locale;
}) {
  const heading = locale === "en" ? "Sources and review status" : "內容出處與審閱狀態";

  return (
    <section aria-label={heading} className="mt-12 border border-line-strong bg-surface p-6">
      <h2 className="num m-0 mb-4 text-[12px] font-semibold tracking-[.1em] text-muted">
        {heading}
      </h2>
      <dl className="m-0 grid gap-x-8 gap-y-3 text-[14px] leading-[1.7] sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label} className="grid grid-cols-[9.5em,1fr] gap-2">
            <dt className="font-bold text-ink">{f.label}</dt>
            <dd className="m-0 text-ink-2">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** 知識頁唯一主 CTA（spec §7：一頁一個，不混同義按鈕）。 */
export function KnowledgeCta({
  title,
  body,
  locale = "zh",
}: {
  title: string;
  body: string;
  locale?: Locale;
}) {
  return (
    <section className="mt-12 border border-forest bg-sage p-7">
      <h2 className="editorial-display m-0 text-[24px] leading-[1.4]">{title}</h2>
      <p className="mb-5 mt-2 max-w-[36em] text-[15px] leading-[1.8] text-ink-2">{body}</p>
      <Link
        href={localizedPath("/pharmacy", locale)}
        className="action-primary inline-flex px-7 py-3.5 text-[15px]"
      >
        {locale === "en" ? "Join the pilot" : "申請試點"}
      </Link>
    </section>
  );
}

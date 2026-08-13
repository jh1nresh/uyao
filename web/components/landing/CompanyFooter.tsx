import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { CONTACT_EMAIL, X_URL } from "@/lib/seo";
import { SHOP_URL } from "@/lib/shop";

type FooterCopy = {
  tagline: string;
  serviceHeading: string;
  trustHeading: string;
  contactHeading: string;
  medicineFinder: string;
  joinGuide: string;
  pilot: string;
  evidence: string;
  partnership: string;
  xLabel: string;
  email: string;
  disclaimer: string;
};

const COPY: Record<"zh" | "en", FooterCopy> = {
  zh: {
    tagline: "把藥局的庫存、效期與附近需求，轉成由藥師批准的下一步行動。",
    serviceHeading: "服務",
    trustHeading: "信任與證據",
    contactHeading: "社群與聯絡",
    medicineFinder: "附近找藥",
    joinGuide: "藥局如何加入",
    pilot: "申請試點",
    evidence: "產品證據",
    partnership: "WeStrong 合作",
    xLabel: "X（@uyaohealth）",
    email: "Email",
    disclaimer:
      "uYao 不進行藥品網路販售，也不提供醫療或用藥建議。消費者服務僅協助查詢、留下需求與安排到店取貨；供應與實際交付由藥局或藥師確認。",
  },
  en: {
    tagline: "Turn pharmacy inventory, expiry, and local demand into pharmacist-approved actions.",
    serviceHeading: "Services",
    trustHeading: "Trust and evidence",
    contactHeading: "Social and contact",
    medicineFinder: "Medicine finder",
    joinGuide: "How pharmacies join",
    pilot: "Join the pilot",
    evidence: "Product evidence",
    partnership: "WeStrong partnership",
    xLabel: "X (@uyaohealth)",
    email: "Email",
    disclaimer:
      "uYao does not sell medicines online or provide medical advice. The consumer service supports search, requests, and in-store pickup; pharmacies and pharmacists confirm supply and complete every handover.",
  },
};

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const className =
    "inline-flex min-h-11 items-center text-[14px] text-forest underline-offset-4 hover:text-green hover:underline";
  return href.startsWith("/") ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} rel={href === X_URL ? "me" : undefined} className={className}>
      {children}
    </a>
  );
}

export function CompanyFooter({ locale }: { locale: "zh" | "en" }) {
  const copy = COPY[locale];
  const shopUrl = `${SHOP_URL.replace(/\/$/, "")}${locale === "en" ? "/en" : "/zh-tw"}`;
  const companyPrefix = locale === "en" ? "/en" : "/zh-tw";
  const joinGuideUrl = locale === "en" ? "/en#how" : "/zh-tw/guides/join-uyao";

  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.45fr_1fr_1fr_1fr] lg:gap-8">
          <div>
            <Link href={companyPrefix} className="inline-flex min-h-11 items-center no-underline">
              <BrandLogo height={30} />
            </Link>
            <p className="mb-0 mt-3 max-w-[29em] text-[14px] leading-[1.75] text-muted">
              {copy.tagline}
            </p>
          </div>

          <nav aria-label={copy.serviceHeading}>
            <h2 className="num m-0 text-[11px] font-semibold tracking-[.12em] text-oxblood">
              {copy.serviceHeading}
            </h2>
            <div className="mt-2 flex flex-col items-start">
              <FooterLink href={shopUrl}>{copy.medicineFinder}</FooterLink>
              <FooterLink href={joinGuideUrl}>{copy.joinGuide}</FooterLink>
              <FooterLink href={`${companyPrefix}/pharmacy`}>{copy.pilot}</FooterLink>
            </div>
          </nav>

          <nav aria-label={copy.trustHeading}>
            <h2 className="num m-0 text-[11px] font-semibold tracking-[.12em] text-oxblood">
              {copy.trustHeading}
            </h2>
            <div className="mt-2 flex flex-col items-start">
              <FooterLink href={`${companyPrefix}/evidence`}>{copy.evidence}</FooterLink>
              <FooterLink href={`${companyPrefix}/evidence#partners`}>{copy.partnership}</FooterLink>
            </div>
          </nav>

          <nav aria-label={copy.contactHeading}>
            <h2 className="num m-0 text-[11px] font-semibold tracking-[.12em] text-oxblood">
              {copy.contactHeading}
            </h2>
            <div className="mt-2 flex flex-col items-start">
              <FooterLink href={X_URL}>{copy.xLabel}</FooterLink>
              <FooterLink href={`mailto:${CONTACT_EMAIL}`}>{copy.email}</FooterLink>
            </div>
          </nav>
        </div>

        <div className="mt-10 border-t border-line pt-6">
          <p className="m-0 max-w-[72em] text-[12.5px] leading-[1.8] text-muted">
            {copy.disclaimer}
          </p>
        </div>
      </div>
    </footer>
  );
}

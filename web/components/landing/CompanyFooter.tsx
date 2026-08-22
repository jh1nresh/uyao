import Link from "next/link";

import { BrandLogo } from "@/components/BrandLogo";
import { InstagramIcon, XIcon } from "@/components/SocialIcons";
import { CONTACT_EMAIL, INSTAGRAM_URL, X_URL } from "@/lib/seo";
import { SHOP_URL } from "@/lib/shop";

type FooterCopy = {
  tagline: string;
  serviceHeading: string;
  trustHeading: string;
  contactHeading: string;
  medicineFinder: string;
  guidesHub: string;
  findMedicineGuide: string;
  outOfStockGuide: string;
  joinGuide: string;
  pilot: string;
  evidence: string;
  partnership: string;
  about: string;
  contactPage: string;
  privacy: string;
  docs: string;
  llms: string;
  xLabel: string;
  instagramLabel: string;
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
    guidesHub: "藥局營運與找藥指南",
    findMedicineGuide: "附近藥局找藥步驟",
    outOfStockGuide: "藥品缺貨怎麼辦",
    joinGuide: "藥局如何加入",
    pilot: "申請試點",
    evidence: "產品證據",
    partnership: "合作藥局據點",
    about: "關於",
    contactPage: "聯絡",
    privacy: "隱私",
    docs: "文件",
    llms: "llms.txt",
    xLabel: "X（@uyaohealth）",
    instagramLabel: "Instagram（@uyaohealth）",
    email: "電子郵件",
    disclaimer:
      "uYao 不進行藥品網路販售，也不提供醫療或用藥建議。消費者服務僅協助查詢、留下需求與安排到店取貨；供應與實際交付由藥局或藥師確認。",
  },
  en: {
    tagline: "Turn pharmacy inventory, expiry, and local demand into pharmacist-approved actions.",
    serviceHeading: "Services",
    trustHeading: "Trust and evidence",
    contactHeading: "Social and contact",
    medicineFinder: "Medicine finder",
    guidesHub: "Pharmacy and medicine guides",
    findMedicineGuide: "How to find medicine nearby",
    outOfStockGuide: "When medicine is out of stock",
    joinGuide: "How pharmacies join",
    pilot: "Join the pilot",
    evidence: "Product evidence",
    partnership: "Partner pharmacies",
    about: "About",
    contactPage: "Contact",
    privacy: "Privacy",
    docs: "Docs",
    llms: "llms.txt",
    xLabel: "X (@uyaohealth)",
    instagramLabel: "Instagram (@uyaohealth)",
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
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export function CompanyFooter({
  locale,
  children,
}: {
  locale: "zh" | "en";
  children?: React.ReactNode;
}) {
  const copy = COPY[locale];
  const shopUrl = `${SHOP_URL.replace(/\/$/, "")}${locale === "en" ? "/en" : "/zh-tw"}`;
  const companyPrefix = locale === "en" ? "/en" : "/zh-tw";

  return (
    <footer className="bg-paper">
      {children}
      <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.45fr_1fr_1fr_1fr] lg:gap-8">
          <div>
            <Link href={companyPrefix} className="inline-flex min-h-11 items-center no-underline">
              <BrandLogo height={30} />
            </Link>
            <p data-testid="footer-tagline" className="mb-0 mt-3 max-w-[29em] text-[14px] leading-[1.75] text-muted">
              {copy.tagline}
            </p>
          </div>

          <nav aria-label={copy.serviceHeading}>
            <h2 className="m-0 text-[14px] font-bold text-oxblood">
              {copy.serviceHeading}
            </h2>
            <div className="mt-2 flex flex-col items-start">
              <FooterLink href={shopUrl}>{copy.medicineFinder}</FooterLink>
              {/*
                指南 hub 必須留在 footer：它是整個知識叢集唯一的 sitewide 入口，
                拿掉的話 compare 與四篇營運指南又會退回「只有內文一條連結」的孤島。
              */}
              <FooterLink href={`${companyPrefix}/guides`}>{copy.guidesHub}</FooterLink>
              <FooterLink href={`${companyPrefix}/guides/find-medicine-nearby`}>{copy.findMedicineGuide}</FooterLink>
              <FooterLink href={`${companyPrefix}/guides/medicine-out-of-stock`}>{copy.outOfStockGuide}</FooterLink>
              <FooterLink href={`${companyPrefix}/guides/join-uyao`}>{copy.joinGuide}</FooterLink>
              <FooterLink href={`${companyPrefix}/pharmacy`}>{copy.pilot}</FooterLink>
            </div>
          </nav>

          <nav aria-label={copy.trustHeading}>
            <h2 className="m-0 text-[14px] font-bold text-oxblood">
              {copy.trustHeading}
            </h2>
            <div className="mt-2 flex flex-col items-start">
              <FooterLink href={`${companyPrefix}/evidence`}>{copy.evidence}</FooterLink>
              <FooterLink href={`${companyPrefix}/evidence#partners`}>{copy.partnership}</FooterLink>
              <FooterLink href={`${companyPrefix}/about`}>{copy.about}</FooterLink>
              <FooterLink href={`${companyPrefix}/contact`}>{copy.contactPage}</FooterLink>
              <FooterLink href={`${companyPrefix}/privacy`}>{copy.privacy}</FooterLink>
              <FooterLink href="/docs">{copy.docs}</FooterLink>
              <FooterLink href="/llms.txt">{copy.llms}</FooterLink>
            </div>
          </nav>

          <nav aria-label={copy.contactHeading}>
            <h2 className="m-0 text-[14px] font-bold text-oxblood">
              {copy.contactHeading}
            </h2>
            <div className="mt-2 flex flex-col items-start">
              <div className="flex items-center gap-2">
                <a
                  href={X_URL}
                  rel="me"
                  aria-label={copy.xLabel}
                  className="inline-flex min-h-11 min-w-11 items-center justify-start text-forest hover:text-green"
                >
                  <XIcon className="h-[18px] w-[18px]" />
                </a>
                <a
                  href={INSTAGRAM_URL}
                  rel="me"
                  aria-label={copy.instagramLabel}
                  className="inline-flex min-h-11 min-w-11 items-center justify-start text-forest hover:text-green"
                >
                  <InstagramIcon className="h-[19px] w-[19px]" />
                </a>
              </div>
              <FooterLink href={`mailto:${CONTACT_EMAIL}`}>{copy.email}</FooterLink>
            </div>
          </nav>
        </div>

        <div className="mt-10 border-t border-line pt-6">
          <p className="m-0 max-w-[72em] text-[14px] leading-[1.8] text-muted">
            {copy.disclaimer}
          </p>
          <p className="num mb-0 mt-4 text-[11px] text-muted">© 2026 uYao</p>
        </div>
      </div>
    </footer>
  );
}

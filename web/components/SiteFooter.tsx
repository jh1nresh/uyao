import Link from "next/link";

import { BrandLogo } from "./BrandLogo";
import { LanguageSwitch } from "./LanguageSwitch";
import { InstagramIcon, XIcon } from "./SocialIcons";
import { getRequestLocale } from "@/lib/locale-server";
import { CONTACT_EMAIL, INSTAGRAM_URL, SITE_URL, X_URL } from "@/lib/seo";
import { SHOP_URL } from "@/lib/shop";

/**
 * 法規邊界永遠在頁尾：不網售、處方藥不呈現價格、藥品廣告事前審查（藥事法 66 條）。
 */
export async function SiteFooter({ note }: { note?: string }) {
  const locale = await getRequestLocale();
  const shopHome = `${SHOP_URL.replace(/\/$/, "")}${locale === "en" ? "/en" : "/zh-tw"}`;
  const companyHome = `${SITE_URL}${locale === "en" ? "/en" : "/zh-tw"}`;
  const companyPath = (path: string) => `${SITE_URL}${locale === "en" ? "/en" : "/zh-tw"}${path}`;

  return (
    <footer className="border-t border-line bg-paper text-[14px] leading-[1.75] text-muted">
      <div className="shop-shell py-10 sm:py-12">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:gap-8">
          <div>
            <Link href={shopHome} className="inline-flex min-h-11 items-center no-underline">
              <BrandLogo height={30} />
            </Link>
            <p className="mb-0 mt-2 max-w-[30em] text-[14.5px] leading-[1.75]">
              {locale === "en"
                ? "Search public pharmacy listings and leave a medicine request for a pharmacy to confirm."
                : "搜尋公開藥局資料並留下找藥需求，再由藥局或藥師確認供應與領取方式。"}
            </p>
          </div>

          <nav aria-label={locale === "en" ? "Services" : "服務"}>
            <h2 className="m-0 text-[14px] font-bold text-oxblood">
              {locale === "en" ? "SERVICES" : "服務"}
            </h2>
            <div className="mt-2 flex flex-col items-start">
              <Link href={shopHome} className="inline-flex min-h-11 items-center text-forest hover:text-green">
                {locale === "en" ? "Medicine finder" : "附近找藥"}
              </Link>
              <a href={companyPath("/guides")} className="inline-flex min-h-11 items-center text-forest hover:text-green">
                {locale === "en" ? "Pharmacy and medicine guides" : "藥局營運與找藥指南"}
              </a>
              <a href={companyPath("/guides/find-medicine-nearby")} className="inline-flex min-h-11 items-center text-forest hover:text-green">
                {locale === "en" ? "How to find medicine nearby" : "附近藥局找藥步驟"}
              </a>
              <a href={companyPath("/guides/medicine-out-of-stock")} className="inline-flex min-h-11 items-center text-forest hover:text-green">
                {locale === "en" ? "When medicine is out of stock" : "藥品缺貨怎麼辦"}
              </a>
              <a href={companyPath("/guides/join-uyao")} className="inline-flex min-h-11 items-center text-forest hover:text-green">
                {locale === "en" ? "How pharmacies join" : "藥局如何加入"}
              </a>
              <a href={companyPath("/pharmacy")} className="inline-flex min-h-11 items-center text-forest hover:text-green">
                {locale === "en" ? "For pharmacies" : "藥局合作"}
              </a>
            </div>
          </nav>

          <nav aria-label={locale === "en" ? "Trust and evidence" : "信任與證據"}>
            <h2 className="m-0 text-[14px] font-bold text-oxblood">
              {locale === "en" ? "TRUST" : "信任與證據"}
            </h2>
            <div className="mt-2 flex flex-col items-start">
              <a href={companyPath("/evidence")} className="inline-flex min-h-11 items-center text-forest hover:text-green">
                {locale === "en" ? "Product evidence" : "產品證據"}
              </a>
              <a href={`${companyPath("/evidence")}#partners`} className="inline-flex min-h-11 items-center text-forest hover:text-green">
                {locale === "en" ? "Partner pharmacies" : "合作藥局據點"}
              </a>
              <a href={companyPath("/about")} className="inline-flex min-h-11 items-center text-forest hover:text-green">
                {locale === "en" ? "About" : "關於"}
              </a>
              <a href={companyPath("/contact")} className="inline-flex min-h-11 items-center text-forest hover:text-green">
                {locale === "en" ? "Contact" : "聯絡"}
              </a>
              <a href={companyPath("/privacy")} className="inline-flex min-h-11 items-center text-forest hover:text-green">
                {locale === "en" ? "Privacy" : "隱私"}
              </a>
              <a href={`${SITE_URL}/docs`} className="inline-flex min-h-11 items-center text-forest hover:text-green">
                {locale === "en" ? "Docs" : "文件"}
              </a>
              <a href={`${SITE_URL}/llms.txt`} className="inline-flex min-h-11 items-center text-forest hover:text-green">
                llms.txt
              </a>
            </div>
          </nav>

          <nav aria-label={locale === "en" ? "Social and contact" : "社群與聯絡"}>
            <h2 className="m-0 text-[14px] font-bold text-oxblood">
              {locale === "en" ? "CONTACT" : "社群與聯絡"}
            </h2>
            <div className="mt-2 flex flex-col items-start">
              <div className="flex items-center gap-2">
                <a
                  href={X_URL}
                  rel="me"
                  aria-label="X (@uyaohealth)"
                  className="inline-flex min-h-11 min-w-11 items-center justify-start text-forest hover:text-green"
                >
                  <XIcon className="h-[18px] w-[18px]" />
                </a>
                <a
                  href={INSTAGRAM_URL}
                  rel="me"
                  aria-label="Instagram (@uyaohealth)"
                  className="inline-flex min-h-11 min-w-11 items-center justify-start text-forest hover:text-green"
                >
                  <InstagramIcon className="h-[19px] w-[19px]" />
                </a>
              </div>
              <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex min-h-11 items-center text-forest hover:text-green">
                {locale === "en" ? "Email" : "電子郵件"}
              </a>
              <a href={companyHome} className="inline-flex min-h-11 items-center text-forest hover:text-green">
                {locale === "en" ? "About uYao" : "關於 uYao"}
              </a>
            </div>
          </nav>
        </div>

        <div className="mt-9 border-t border-line pt-6">
          <p className="m-0 max-w-[76em] text-[14px] leading-[1.8] text-muted-2">
            {note ?? (locale === "en"
              ? "This service provides trial catalog and public pharmacy information. It does not claim live stock or offer online medicine sales; pharmacies and pharmacists confirm supply, pickup, and medicine questions."
              : "本站提供試營運目錄與公開藥局資料，不代表即時庫存、不呈現藥品價格，也不提供線上交易；供應、預留、交付與用藥問題均由藥局或藥師確認。藥品廣告依藥事法第 66 條事前審查。")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>
              {locale === "en"
                ? "uYao Medicine Finder · Medicine requests only, no online checkout"
                : "uYao 找藥 · 僅協助找藥需求，不提供線上交易"}
            </span>
            <LanguageSwitch />
          </div>
          <p className="num mb-0 mt-4 text-[11px] text-muted-2">© 2026 uYao</p>
        </div>
      </div>
    </footer>
  );
}

import { LanguageSwitch } from "./LanguageSwitch";
import { getRequestLocale } from "@/lib/locale-server";

/**
 * 法規邊界永遠在頁尾：不網售、處方藥不呈現價格、藥品廣告事前審查（藥事法 66 條）。
 */
export async function SiteFooter({ note }: { note?: string }) {
  const locale = await getRequestLocale();
  return (
    <footer className="border-t border-line bg-paper text-[13px] leading-[1.75] text-muted-2">
      <div className="shop-shell py-7">
        {note ?? (locale === "en"
          ? "This service provides trial catalog and public pharmacy information. It does not claim live stock or offer online medicine sales; pharmacies and pharmacists confirm supply, pickup, and medicine questions."
          : "本站提供試營運目錄與公開藥局資料，不代表即時庫存、不呈現藥品價格，也不提供線上交易；供應、預留、交付與用藥問題均由藥局或藥師確認。藥品廣告依藥事法第 66 條事前審查。")}
        <br />
        {locale === "en"
          ? "uYao Medicine Finder · Medicine requests only, no online checkout"
          : "uYao 找藥 · 僅協助找藥需求，不提供線上交易"}
        <span className="ml-2"><LanguageSwitch /></span>
      </div>
    </footer>
  );
}

/**
 * 法規邊界永遠在頁尾：不網售、處方藥不呈現價格、藥品廣告事前審查（藥事法 66 條）。
 */
export function SiteFooter({ note }: { note?: string }) {
  return (
    <footer className="border-t border-line bg-paper px-4 py-6 text-[13px] leading-[1.75] text-muted-2 sm:px-7 xl:px-12 2xl:px-16">
      {note ?? (
        <>
          本站僅呈現庫存與門市資訊，不呈現藥品價格、不提供線上交易；商品一律由藥師於門市確認後交付。處方藥請洽藥局。藥品廣告依藥事法第
          66 條事前審查。
        </>
      )}
      <br />
      有藥 uyao.tw · 藥局合作洽詢 · 僅提供預留取貨，不提供線上交易
    </footer>
  );
}

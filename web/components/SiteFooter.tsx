/**
 * 法規邊界永遠在頁尾：不網售、處方藥不呈現價格、藥品廣告事前審查（藥事法 66 條）。
 */
export function SiteFooter({ note }: { note?: string }) {
  return (
    <footer className="border-t border-line px-4 py-4 text-[13px] leading-[1.7] text-muted-2 sm:px-7 xl:px-12 2xl:px-16">
      {note ?? (
        <>
          本站僅呈現成藥、指示藥及非藥品資訊；處方藥請洽藥局，不於本站呈現價格。藥品廣告依藥事法第
          66 條事前審查。
        </>
      )}
      <br />
      有藥 uyao.tw · 藥局合作洽詢 · 僅提供預留取貨，不提供線上交易
    </footer>
  );
}

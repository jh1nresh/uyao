import { notFound } from "next/navigation";

import { ProductSwipeShowcase } from "@/components/ProductSwipeShowcase";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { allDrugs } from "@/lib/data";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";
import { productShowcaseItems } from "@/lib/product-showcase";

// Dev-only visual preview for the swipeable product showcase. Not linked anywhere.

export default async function ShopShowcasePreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const locale = await getRequestLocale();
  const items = productShowcaseItems(allDrugs());

  return (
    <>
      <SiteHeader area="datong" />
      <section className="medicine-cabinet-showcase-section overflow-hidden">
        <div className="shop-shell py-10 sm:py-14">
          <ProductSwipeShowcase
            items={items}
            eyebrow="AT THIS PHARMACY"
            title={locale === "en" ? "Items at this pharmacy" : "本店品項"}
            hrefPrefix={localizedPath("/drug", locale)}
          />
          <p className="mt-4 text-[13px] leading-[1.7] text-muted-2">
            {locale === "en"
              ? "Dev-only preview. Swipe, drag, arrow keys, or the buttons all move the shelf."
              : "開發預覽頁。左右滑動、拖曳、方向鍵與按鈕都可以換品項。"}
          </p>
        </div>
      </section>
      <SiteFooter note={locale === "en" ? "Internal preview." : "內部預覽頁。"} />
    </>
  );
}

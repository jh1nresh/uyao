import { notFound } from "next/navigation";

import { ProductSwipeShowcase, type ShowcaseItem } from "@/components/ProductSwipeShowcase";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { allDrugs } from "@/lib/data";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale-server";

// Dev-only visual preview for the swipeable product showcase. Not linked anywhere.

/** 每支品項一個固定色塊。取自包裝主色，不是隨機配色。 */
const WEDGE: Record<string, string> = {
  "greenplus-elgucare": "#c9dcc2",
  "huamao-progifted-lp28": "#bcd9c4",
  "tianxia-chan-c-80": "#f0c94f",
  "chungchi-ganmeijia-coral-ca": "#f0b8a8",
  "gaoyouzhi-vitamin-b-60": "#e3a0a0",
  "chungchi-yiyuansu-gastrodia-100": "#e8c98a",
  "yuanding-puregps-defense-450": "#a9c6e0",
  "aob-vitality-beauty-45": "#cfe0b6",
};

export default async function ShopShowcasePreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const locale = await getRequestLocale();
  const items: ShowcaseItem[] = allDrugs()
    .filter((drug) => drug.image?.kind === "packshot" && WEDGE[drug.slug])
    .map((drug) => ({ drug, wedge: WEDGE[drug.slug] }));

  return (
    <>
      <SiteHeader area="datong" />
      <section className="bg-ivory">
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
